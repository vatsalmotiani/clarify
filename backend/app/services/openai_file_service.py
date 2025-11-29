"""
OpenAI File Service - Upload files to OpenAI and get file IDs for use with Responses API.
This allows sending entire documents to OpenAI instead of processing page-by-page.
"""

import time
from typing import List, Dict, Any, Optional
from pathlib import Path

from openai import OpenAI
from app.config import settings
from app.core.logging import get_logger

logger = get_logger("clarify.openai_file_service")


class OpenAIFileService:
    """
    Service to upload files to OpenAI and manage file IDs.
    Files are uploaded once and can be referenced by ID in multiple prompts.
    """

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        if not self.client:
            logger.warning("OpenAI client not configured - file uploads will fail")

    async def upload_files(self, file_paths: List[str]) -> Dict[str, Any]:
        """
        Upload multiple files to OpenAI and return their file IDs.

        Args:
            file_paths: List of paths to PDF files

        Returns:
            Dict with:
                - file_ids: List of OpenAI file IDs
                - files_metadata: List of file metadata (name, size, id)
                - success: bool
                - errors: List of any errors
        """
        if not self.client:
            return {
                "file_ids": [],
                "files_metadata": [],
                "success": False,
                "errors": ["OpenAI client not configured"]
            }

        logger.info(f"Uploading {len(file_paths)} file(s) to OpenAI...")
        start_time = time.time()

        file_ids = []
        files_metadata = []
        errors = []

        for file_path in file_paths:
            try:
                path = Path(file_path)
                file_name = path.name
                file_size = path.stat().st_size

                logger.debug(f"  Uploading: {file_name} ({file_size / 1024:.1f} KB)")

                # Upload file to OpenAI with purpose "assistants"
                # (required for use with Responses API file inputs)
                with open(file_path, "rb") as f:
                    uploaded_file = self.client.files.create(
                        file=f,
                        purpose="assistants"
                    )

                file_ids.append(uploaded_file.id)
                files_metadata.append({
                    "name": file_name,
                    "size": file_size,
                    "openai_file_id": uploaded_file.id,
                    "status": "uploaded"
                })

                logger.info(f"  Uploaded {file_name} -> {uploaded_file.id}")

            except Exception as e:
                logger.error(f"  Failed to upload {file_path}: {e}")
                errors.append(f"Failed to upload {Path(file_path).name}: {str(e)}")

        elapsed = time.time() - start_time
        logger.info(f"File upload complete: {len(file_ids)}/{len(file_paths)} files in {elapsed:.2f}s")

        return {
            "file_ids": file_ids,
            "files_metadata": files_metadata,
            "success": len(file_ids) > 0,
            "errors": errors
        }

    async def upload_file(self, file_path: str) -> Optional[str]:
        """
        Upload a single file and return its OpenAI file ID.

        Args:
            file_path: Path to the PDF file

        Returns:
            OpenAI file ID or None if upload failed
        """
        result = await self.upload_files([file_path])
        if result["file_ids"]:
            return result["file_ids"][0]
        return None

    def delete_file(self, file_id: str) -> bool:
        """
        Delete a file from OpenAI storage.

        Args:
            file_id: The OpenAI file ID to delete

        Returns:
            True if deleted successfully
        """
        if not self.client:
            return False

        try:
            self.client.files.delete(file_id)
            logger.info(f"Deleted file: {file_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file {file_id}: {e}")
            return False

    def delete_files(self, file_ids: List[str]) -> Dict[str, bool]:
        """
        Delete multiple files from OpenAI storage.

        Args:
            file_ids: List of OpenAI file IDs to delete

        Returns:
            Dict mapping file_id to success status
        """
        results = {}
        for file_id in file_ids:
            results[file_id] = self.delete_file(file_id)
        return results

    def get_file_info(self, file_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about an uploaded file.

        Args:
            file_id: The OpenAI file ID

        Returns:
            File info dict or None
        """
        if not self.client:
            return None

        try:
            file_info = self.client.files.retrieve(file_id)
            return {
                "id": file_info.id,
                "filename": file_info.filename,
                "bytes": file_info.bytes,
                "created_at": file_info.created_at,
                "purpose": file_info.purpose,
                "status": file_info.status
            }
        except Exception as e:
            logger.error(f"Failed to get file info for {file_id}: {e}")
            return None
