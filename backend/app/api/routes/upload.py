from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import uuid
import os
from pathlib import Path
from app.config import settings
from app.models.schemas import UploadResponse, FileMetadata, ErrorResponse
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger("clarify.upload")

# Ensure temp directory exists
TEMP_DIR = Path(settings.TEMP_DIR)
TEMP_DIR.mkdir(exist_ok=True)


def validate_pdf(file: UploadFile) -> tuple[bool, str]:
    """Validate PDF file."""
    # Check content type
    if file.content_type != "application/pdf":
        return False, "Only PDF files are accepted"

    # Check file size (5MB max)
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        return False, f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit"

    return True, ""


@router.post("/upload", response_model=UploadResponse)
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Upload PDF documents for analysis.
    Accepts up to 5 PDF files, max 10MB each.
    """
    logger.info(f"📤 Upload request received: {len(files)} file(s)")

    # Validate file count
    if len(files) > settings.MAX_FILES_PER_UPLOAD:
        logger.warning(f"Too many files: {len(files)} > {settings.MAX_FILES_PER_UPLOAD}")
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.MAX_FILES_PER_UPLOAD} files allowed"
        )

    if len(files) == 0:
        logger.warning("No files provided in upload request")
        raise HTTPException(
            status_code=400,
            detail="At least one file is required"
        )

    # Validate each file
    validated_files = []
    for file in files:
        logger.debug(f"Validating file: {file.filename}")
        is_valid, error_msg = validate_pdf(file)
        if not is_valid:
            logger.error(f"File validation failed: {file.filename} - {error_msg}")
            raise HTTPException(status_code=400, detail=f"{file.filename}: {error_msg}")
        validated_files.append(file)

    # Generate analysis ID
    analysis_id = str(uuid.uuid4())
    logger.info(f"📁 Created analysis_id: {analysis_id}")

    # Create directory for this analysis
    analysis_dir = TEMP_DIR / analysis_id
    analysis_dir.mkdir(exist_ok=True)
    logger.debug(f"Created temp directory: {analysis_dir}")

    # Save files
    file_metadata = []
    for file in validated_files:
        file_path = analysis_dir / file.filename
        content = await file.read()

        with open(file_path, "wb") as f:
            f.write(content)

        logger.info(f"💾 Saved file: {file.filename} ({len(content) / 1024:.1f} KB)")

        # Get page count (basic check)
        page_count = None
        try:
            # Try to count pages using pdf2image
            from pdf2image import pdfinfo_from_path
            info = pdfinfo_from_path(str(file_path))
            page_count = info.get("Pages", None)
            logger.debug(f"PDF page count: {page_count}")
        except Exception as e:
            logger.warning(f"Could not get page count for {file.filename}: {e}")

        file_metadata.append(FileMetadata(
            name=file.filename,
            size=len(content),
            page_count=page_count
        ))

    logger.info(f"✅ Upload complete: {len(validated_files)} file(s), analysis_id={analysis_id}")

    return UploadResponse(
        analysis_id=analysis_id,
        status="success",
        message="Files uploaded successfully",
        file_count=len(validated_files),
        files=file_metadata
    )


@router.get("/upload/{analysis_id}/files")
async def get_uploaded_files(analysis_id: str):
    """Get list of uploaded files for an analysis."""
    analysis_dir = TEMP_DIR / analysis_id

    if not analysis_dir.exists():
        raise HTTPException(status_code=404, detail="Analysis not found")

    files = []
    for file_path in analysis_dir.glob("*.pdf"):
        files.append({
            "name": file_path.name,
            "size": file_path.stat().st_size
        })

    return {"files": files}
