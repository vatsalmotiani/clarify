"""
Embedding Service - Handles text chunking and OpenAI embeddings.
"""

from typing import List, Dict, Any
import tiktoken
from openai import OpenAI
from app.config import settings
from app.core.dependencies import get_supabase_client
from app.core.logging import get_logger

logger = get_logger("clarify.embedding_service")


class EmbeddingService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.supabase = get_supabase_client()
        self.chunk_size = 800  # tokens
        self.overlap = 100  # tokens
        self.encoding = tiktoken.encoding_for_model("gpt-4")
        logger.debug(f"EmbeddingService initialized (OpenAI: {'✓' if self.client else '✗'}, Supabase: {'✓' if self.supabase else '✗'})")

    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        if not text:
            return 0
        return len(self.encoding.encode(text))

    def chunk_text(self, text: str, document_name: str) -> List[Dict[str, Any]]:
        """Split text into chunks with overlap."""
        # Handle empty text
        if not text or not text.strip():
            logger.warning(f"Empty text provided for chunking: {document_name}")
            return []

        # Split by paragraphs first
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

        if not paragraphs:
            logger.warning(f"No paragraphs found in text for: {document_name}")
            return []

        chunks = []
        current_chunk = []
        current_tokens = 0
        chunk_index = 0

        for para in paragraphs:
            para_tokens = self.count_tokens(para)

            # Skip empty paragraphs
            if para_tokens == 0:
                continue

            # If single paragraph exceeds chunk size, split it
            if para_tokens > self.chunk_size:
                # Save current chunk if exists
                if current_chunk:
                    chunk_text = "\n\n".join(current_chunk)
                    if chunk_text.strip():
                        chunks.append({
                            "text": chunk_text,
                            "page_num": 1,
                            "chunk_index": chunk_index,
                            "document_name": document_name,
                            "content_type": "typed_text",
                            "token_count": current_tokens
                        })
                        chunk_index += 1
                    current_chunk = []
                    current_tokens = 0

                # Split large paragraph by sentences
                sentences = para.replace(". ", ".|").split("|")
                for sent in sentences:
                    sent = sent.strip()
                    if not sent:
                        continue
                    sent_tokens = self.count_tokens(sent)
                    if current_tokens + sent_tokens > self.chunk_size:
                        if current_chunk:
                            chunk_text = " ".join(current_chunk)
                            if chunk_text.strip():
                                chunks.append({
                                    "text": chunk_text,
                                    "page_num": 1,
                                    "chunk_index": chunk_index,
                                    "document_name": document_name,
                                    "content_type": "typed_text",
                                    "token_count": current_tokens
                                })
                                chunk_index += 1
                            # Keep overlap
                            overlap_text = " ".join(current_chunk[-2:]) if len(current_chunk) >= 2 else ""
                            current_chunk = [overlap_text] if overlap_text else []
                            current_tokens = self.count_tokens(overlap_text)

                    current_chunk.append(sent)
                    current_tokens += sent_tokens
            else:
                # Check if adding paragraph exceeds limit
                if current_tokens + para_tokens > self.chunk_size:
                    # Save current chunk
                    chunk_text = "\n\n".join(current_chunk)
                    if chunk_text.strip():
                        chunks.append({
                            "text": chunk_text,
                            "page_num": 1,
                            "chunk_index": chunk_index,
                            "document_name": document_name,
                            "content_type": "typed_text",
                            "token_count": current_tokens
                        })
                        chunk_index += 1

                    # Keep last paragraph as overlap
                    overlap_para = current_chunk[-1] if current_chunk else ""
                    current_chunk = [overlap_para, para] if overlap_para else [para]
                    current_tokens = self.count_tokens(overlap_para) + para_tokens
                else:
                    current_chunk.append(para)
                    current_tokens += para_tokens

        # Don't forget the last chunk
        if current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            if chunk_text.strip():
                chunks.append({
                    "text": chunk_text,
                    "page_num": 1,
                    "chunk_index": chunk_index,
                    "document_name": document_name,
                    "content_type": "typed_text",
                    "token_count": current_tokens
                })

        logger.debug(f"Created {len(chunks)} chunks from {document_name}")
        return chunks

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not self.client:
            return []

        if not text or not text.strip():
            logger.warning("Empty text provided for embedding")
            return []

        try:
            response = self.client.embeddings.create(
                model="text-embedding-3-large",
                input=text.strip()
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return []

    async def generate_embeddings_batch(self, chunks: List[Dict]) -> List[Dict]:
        """Generate embeddings for multiple chunks in batches."""
        if not self.client:
            logger.warning("OpenAI client not available for embeddings")
            return chunks

        if not chunks:
            logger.warning("No chunks provided for embedding")
            return chunks

        # Filter out chunks with empty text
        valid_chunks = []
        for chunk in chunks:
            text = chunk.get("text", "").strip()
            if text and len(text) > 10:  # Minimum text length
                valid_chunks.append(chunk)
            else:
                chunk["embedding"] = []  # Empty embedding for invalid chunks

        if not valid_chunks:
            logger.warning("No valid chunks with text found for embedding")
            return chunks

        logger.info(f"Generating embeddings for {len(valid_chunks)} chunks...")

        batch_size = 20
        for i in range(0, len(valid_chunks), batch_size):
            batch = valid_chunks[i:i + batch_size]
            texts = [chunk["text"].strip() for chunk in batch]

            # Validate all texts are non-empty
            if not all(texts):
                logger.error("Found empty text in batch, skipping...")
                for chunk in batch:
                    chunk["embedding"] = []
                continue

            try:
                response = self.client.embeddings.create(
                    model="text-embedding-3-large",
                    input=texts
                )

                for j, embedding_data in enumerate(response.data):
                    batch[j]["embedding"] = embedding_data.embedding

                logger.debug(f"Generated embeddings for batch {i//batch_size + 1}")

            except Exception as e:
                logger.error(f"Batch embedding failed: {e}")
                # Set empty embeddings for failed batch
                for chunk in batch:
                    chunk["embedding"] = []

        return chunks

    async def store_embeddings(self, analysis_id: str, chunks: List[Dict]) -> bool:
        """Store chunks with embeddings in Supabase."""
        if not self.supabase:
            logger.warning("Supabase client not available")
            return False

        if not chunks:
            logger.warning("No chunks to store")
            return False

        try:
            records = []
            for chunk in chunks:
                # Skip chunks without content
                content = chunk.get("text", "").strip()
                if not content:
                    continue

                record = {
                    "analysis_id": analysis_id,
                    "document_name": chunk.get("document_name", "unknown"),
                    "page_number": chunk.get("page_num", 1),
                    "chunk_index": chunk.get("chunk_index", 0),
                    "content": content,
                    "content_type": chunk.get("content_type", "typed_text"),
                    "confidence_score": chunk.get("confidence_score", 1.0)
                }

                # Only add embedding if it exists and is not empty
                embedding = chunk.get("embedding")
                if embedding and len(embedding) > 0:
                    record["embedding"] = embedding

                records.append(record)

            if not records:
                logger.warning("No valid records to store")
                return False

            logger.info(f"Storing {len(records)} chunks in database...")

            # Insert in batches
            batch_size = 50
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                self.supabase.table("document_chunks").insert(batch).execute()
                logger.debug(f"Stored batch {i//batch_size + 1}")

            logger.info(f"✓ Stored {len(records)} chunks successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to store embeddings: {e}")
            return False

    async def search_similar(
        self,
        analysis_id: str,
        query: str,
        limit: int = 10
    ) -> List[Dict]:
        """Search for similar chunks using vector similarity."""
        if not self.supabase or not self.client:
            return []

        if not query or not query.strip():
            return []

        try:
            # Generate query embedding
            query_embedding = self.generate_embedding(query)
            if not query_embedding:
                return []

            # Use Supabase's vector similarity search
            result = self.supabase.rpc(
                "match_documents",
                {
                    "query_embedding": query_embedding,
                    "match_count": limit,
                    "filter_analysis_id": analysis_id
                }
            ).execute()

            return result.data if result.data else []

        except Exception as e:
            logger.warning(f"Vector search failed: {e}")
            # Fallback: return chunks without similarity search
            try:
                result = self.supabase.table("document_chunks").select(
                    "content, document_name, page_number, chunk_index"
                ).eq("analysis_id", analysis_id).limit(limit).execute()
                return [{"content": r.get("content", ""), "similarity_score": 0.5} for r in result.data]
            except Exception as e2:
                logger.error(f"Fallback search also failed: {e2}")
                return []
