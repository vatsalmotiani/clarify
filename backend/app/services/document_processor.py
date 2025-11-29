"""
Document Processor - PDF text extraction with multiple fallbacks.
1. PyMuPDF (fitz) - Fast, handles most PDFs including some scanned ones
2. PyPDF2 - Fallback for text-based PDFs
3. OpenAI Vision API - For scanned/image PDFs when text extraction fails
"""

import time
from typing import List, Dict, Any
from pathlib import Path
import io
import base64

# Try PyMuPDF first (best for both text and scanned PDFs)
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

# Fallback to PyPDF2
try:
    from PyPDF2 import PdfReader
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False

try:
    from PIL import Image
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False

from openai import OpenAI
from app.config import settings
from app.core.logging import get_logger

logger = get_logger("clarify.document_processor")


class DocumentProcessor:
    """
    Document processor with multi-method extraction:
    1. PyMuPDF for fast text extraction (works on most PDFs)
    2. PyPDF2 as fallback
    3. Vision API for scanned/image PDFs (if text extraction fails)
    """

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        logger.info(f"DocumentProcessor initialized (PyMuPDF: {'Y' if PYMUPDF_AVAILABLE else 'N'}, PyPDF2: {'Y' if PYPDF2_AVAILABLE else 'N'}, Vision: {'Y' if self.client else 'N'})")

    async def process_documents(self, file_paths: List[str]) -> Dict[str, Any]:
        """
        Main entry point that processes all documents.
        """
        logger.info(f"Processing {len(file_paths)} document(s)...")
        start_time = time.time()

        all_documents = []
        overall_quality = {
            "total_pages": 0,
            "warnings": [],
            "overall_confidence": 1.0
        }

        for file_path in file_paths:
            file_name = Path(file_path).name
            logger.debug(f"Processing: {file_name}")

            doc_result = await self.process_document(file_path)
            all_documents.append(doc_result)

            overall_quality["total_pages"] += doc_result["metadata"]["total_pages"]
            overall_quality["warnings"].extend(doc_result["quality_report"]["warnings"])
            overall_quality["overall_confidence"] = min(
                overall_quality["overall_confidence"],
                doc_result["quality_report"]["overall_confidence"]
            )

        total_time = time.time() - start_time
        total_chars = sum(len(doc.get("full_text", "")) for doc in all_documents)
        logger.info(f"Document processing complete: {overall_quality['total_pages']} pages, {total_chars} chars in {total_time:.2f}s")

        return {
            "documents": all_documents,
            "quality_report": overall_quality
        }

    async def process_document(self, file_path: str) -> Dict[str, Any]:
        """
        Process a single PDF document.
        Tries multiple extraction methods in order of preference.
        """
        file_name = Path(file_path).name
        logger.debug(f"  Processing document: {file_name}")

        # Method 1: Try PyMuPDF first (fastest and most reliable)
        if PYMUPDF_AVAILABLE:
            result = await self._extract_with_pymupdf(file_path)
            total_text = len(result.get("full_text", ""))
            if total_text > 100:
                logger.info(f"  {file_name}: {result['metadata']['total_pages']} pages, {total_text} chars (PyMuPDF)")
                return result
            logger.debug(f"  PyMuPDF extracted only {total_text} chars, trying alternatives...")

        # Method 2: Try PyPDF2 as fallback
        if PYPDF2_AVAILABLE:
            result = await self._extract_with_pypdf2(file_path)
            total_text = len(result.get("full_text", ""))
            if total_text > 100:
                logger.info(f"  {file_name}: {result['metadata']['total_pages']} pages, {total_text} chars (PyPDF2)")
                return result
            logger.debug(f"  PyPDF2 extracted only {total_text} chars, trying Vision API...")

        # Method 3: Use Vision API for scanned documents
        if self.client and PYMUPDF_AVAILABLE:
            logger.info(f"  Using Vision API for scanned document: {file_name}")
            result = await self._extract_with_vision(file_path)
            if result["metadata"]["total_pages"] > 0:
                total_text = len(result.get("full_text", ""))
                logger.info(f"  {file_name}: {result['metadata']['total_pages']} pages, {total_text} chars (Vision API)")
                return result

        # Return whatever we have or empty result
        logger.warning(f"  Failed to extract meaningful text from {file_name}")
        return self._empty_document(file_name, "No extraction method succeeded")

    async def _extract_with_pymupdf(self, file_path: str) -> Dict[str, Any]:
        """Extract text using PyMuPDF (fitz)."""
        file_name = Path(file_path).name

        try:
            doc = fitz.open(file_path)
            num_pages = len(doc)
            logger.debug(f"  PDF has {num_pages} page(s)")

            pages = []
            all_text = []
            warnings = []

            for i in range(num_pages):
                page_num = i + 1
                page = doc[i]

                try:
                    # Extract text
                    text = page.get_text("text") or ""
                    text = self._clean_text(text)

                    if not text:
                        warnings.append(f"Page {page_num}: No text extracted")

                    pages.append({
                        "page_num": page_num,
                        "text": text,
                        "content_types": ["typed_text"],
                        "confidence": 0.9 if text else 0.1,
                        "extraction_method": "pymupdf"
                    })

                    if text:
                        all_text.append(f"--- Page {page_num} ---\n{text}")

                except Exception as e:
                    logger.warning(f"  Failed to extract page {page_num}: {e}")
                    warnings.append(f"Page {page_num}: Extraction failed")
                    pages.append({
                        "page_num": page_num,
                        "text": "",
                        "content_types": ["typed_text"],
                        "confidence": 0.0,
                        "extraction_method": "failed"
                    })

            doc.close()

            avg_confidence = sum(p["confidence"] for p in pages) / len(pages) if pages else 0.0

            return {
                "name": file_name,
                "full_text": "\n\n".join(all_text),
                "pages": pages,
                "quality_report": {
                    "overall_confidence": avg_confidence,
                    "warnings": warnings
                },
                "metadata": {
                    "total_pages": len(pages),
                    "extraction_method": "pymupdf"
                }
            }

        except Exception as e:
            logger.error(f"  PyMuPDF failed for {file_name}: {e}")
            return self._empty_document(file_name, str(e))

    async def _extract_with_pypdf2(self, file_path: str) -> Dict[str, Any]:
        """Extract text using PyPDF2."""
        file_name = Path(file_path).name

        try:
            reader = PdfReader(file_path)
            num_pages = len(reader.pages)
            logger.debug(f"  PDF has {num_pages} page(s)")

            pages = []
            all_text = []
            warnings = []

            for i, page in enumerate(reader.pages):
                page_num = i + 1

                try:
                    text = page.extract_text() or ""
                    text = self._clean_text(text)

                    if not text:
                        warnings.append(f"Page {page_num}: No text extracted")

                    pages.append({
                        "page_num": page_num,
                        "text": text,
                        "content_types": ["typed_text"],
                        "confidence": 0.9 if text else 0.1,
                        "extraction_method": "pypdf2"
                    })

                    if text:
                        all_text.append(f"--- Page {page_num} ---\n{text}")

                except Exception as e:
                    logger.warning(f"  Failed to extract page {page_num}: {e}")
                    warnings.append(f"Page {page_num}: Extraction failed")
                    pages.append({
                        "page_num": page_num,
                        "text": "",
                        "content_types": ["typed_text"],
                        "confidence": 0.0,
                        "extraction_method": "failed"
                    })

            avg_confidence = sum(p["confidence"] for p in pages) / len(pages) if pages else 0.0

            return {
                "name": file_name,
                "full_text": "\n\n".join(all_text),
                "pages": pages,
                "quality_report": {
                    "overall_confidence": avg_confidence,
                    "warnings": warnings
                },
                "metadata": {
                    "total_pages": len(pages),
                    "extraction_method": "pypdf2"
                }
            }

        except Exception as e:
            logger.error(f"  PyPDF2 failed for {file_name}: {e}")
            return self._empty_document(file_name, str(e))

    async def _extract_with_vision(self, file_path: str) -> Dict[str, Any]:
        """Extract text using OpenAI Vision API for scanned documents."""
        file_name = Path(file_path).name

        try:
            # Use PyMuPDF to convert PDF pages to images
            doc = fitz.open(file_path)
            num_pages = len(doc)
            logger.debug(f"  Converting {num_pages} pages to images for Vision API...")

            pages = []
            all_text = []
            warnings = []

            for i in range(num_pages):
                page_num = i + 1
                logger.debug(f"    Processing page {page_num}/{num_pages} with Vision API...")

                try:
                    page = doc[i]
                    # Render page to image (150 DPI is a good balance)
                    mat = fitz.Matrix(150/72, 150/72)  # 150 DPI
                    pix = page.get_pixmap(matrix=mat)

                    # Convert to PNG bytes
                    img_bytes = pix.tobytes("png")
                    img_base64 = base64.b64encode(img_bytes).decode('utf-8')

                    # Call Vision API
                    text = await self._vision_extract_page(img_base64, page_num)
                    text = self._clean_text(text)

                    pages.append({
                        "page_num": page_num,
                        "text": text,
                        "content_types": ["scanned_text"],
                        "confidence": 0.85 if text else 0.1,
                        "extraction_method": "vision"
                    })

                    if text:
                        all_text.append(f"--- Page {page_num} ---\n{text}")

                except Exception as e:
                    logger.warning(f"    Vision API failed for page {page_num}: {e}")
                    warnings.append(f"Page {page_num}: Vision extraction failed")
                    pages.append({
                        "page_num": page_num,
                        "text": "",
                        "content_types": ["scanned_text"],
                        "confidence": 0.0,
                        "extraction_method": "failed"
                    })

            doc.close()

            avg_confidence = sum(p["confidence"] for p in pages) / len(pages) if pages else 0.0

            return {
                "name": file_name,
                "full_text": "\n\n".join(all_text),
                "pages": pages,
                "quality_report": {
                    "overall_confidence": avg_confidence,
                    "warnings": warnings
                },
                "metadata": {
                    "total_pages": len(pages),
                    "extraction_method": "vision"
                }
            }

        except Exception as e:
            logger.error(f"  Vision extraction failed for {file_name}: {e}")
            return self._empty_document(file_name, str(e))

    async def _vision_extract_page(self, img_base64: str, page_num: int) -> str:
        """Extract text from a single page image using Vision API."""
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text from this document page. Preserve the structure including headings, paragraphs, lists, and any tables. Return only the extracted text, no commentary or descriptions."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{img_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=4000
        )

        return response.choices[0].message.content or ""

    def _clean_text(self, text: str) -> str:
        """Clean up extracted text."""
        if not text:
            return ""

        # Remove excessive whitespace
        lines = text.split('\n')
        cleaned_lines = []

        for line in lines:
            line = line.strip()
            if line:
                cleaned_lines.append(line)

        return '\n'.join(cleaned_lines)

    def _empty_document(self, file_name: str, error_msg: str) -> Dict[str, Any]:
        """Return empty document result for failed processing."""
        return {
            "name": file_name,
            "full_text": "",
            "pages": [],
            "quality_report": {
                "overall_confidence": 0.0,
                "warnings": [f"Failed to process: {error_msg}"]
            },
            "metadata": {
                "total_pages": 0,
                "extraction_method": "failed"
            }
        }
