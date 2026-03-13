import logging
import os
from pathlib import Path
from pathlib import PurePath
import shutil
import uuid
from arq import create_pool
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Document, User
from ..auth import get_current_user
from ..graph_store import delete_graph
from ..redis_config import redis_settings
from ..vector_store import delete_document_vectors

router = APIRouter()
logger = logging.getLogger(__name__)

# Directory to temporarily store uploaded files before processing
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_document(
    file: UploadFile = File(...),
    genre: str = "Uncategorized",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint to receive a novel file upload.
    It saves the file locally and creates a 'Pending' record in PostgreSQL.
    Then, it instantly dispatches a background task to Redis.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    normalized_filename = file.filename.replace("\\", "/")
    original_filename = PurePath(normalized_filename).name
    if not original_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_extension = original_filename.split('.')[-1].lower()
    if file_extension not in ['pdf', 'epub', 'txt']:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, EPUB, or TXT.")

    document_id = uuid.uuid4()
    stored_filename = f"{document_id}{Path(original_filename).suffix.lower()}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Create DB Record attached to current API user
    new_doc = Document(
        id=document_id,
        user_id=current_user.id,
        filename=original_filename,
        content_type=file.content_type,
        file_path=file_path,
        status="Pending",
        genre=genre
    )

    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # --- NON-BLOCKING BACKGROUND DISPATCH ---
    # Create a connection pool to Redis and enqueue the job.
    # We pass the UUID string to the worker.
    try:
        redis = await create_pool(redis_settings)
        await redis.enqueue_job('process_document', str(new_doc.id))
    except Exception as e:
        logger.exception("Failed to enqueue document %s for processing", new_doc.id)
        new_doc.status = "Failed"
        db.commit()
        raise HTTPException(
            status_code=503,
            detail="File was uploaded, but background processing could not be queued. The document was marked as Failed.",
        ) from e

    return {
        "message": "File uploaded successfully and queued for processing.",
        "document_id": new_doc.id,
        "status": new_doc.status
    }


@router.get("/")
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns a list of all uploaded documents from PostgreSQL.
    Used by the Library page to show real-time processing status.
    """
    docs = db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.created_at.desc()).all()
    return [
        {
            "id": str(doc.id),
            "filename": doc.filename,
            "status": doc.status,
            "genre": doc.genre or "Uncategorized",
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }
        for doc in docs
    ]


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a document record from PostgreSQL and removes the file from disk.
    """
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    # Ensure user owns this document before taking any action
    doc = db.query(Document).filter(Document.id == doc_uuid, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        legacy_vector_cleanup = None
        if doc.file_path and os.path.basename(doc.file_path) == doc.filename:
            legacy_vector_cleanup = doc.filename

        delete_document_vectors(
            document_id=str(doc.id),
            user_id=str(current_user.id),
            legacy_filename=legacy_vector_cleanup,
        )
        delete_graph(str(doc.id), str(current_user.id))
    except Exception as e:
        logger.exception("Failed to delete external data for document %s", doc.id)
        raise HTTPException(status_code=500, detail="Failed to delete document data from external stores.") from e

    # Remove from disk if it still exists
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError as e:
            logger.exception("Failed to remove file for document %s", doc.id)
            raise HTTPException(status_code=500, detail="Failed to remove document file from disk.") from e

    db.delete(doc)
    db.commit()
    return {"message": f"Document '{doc.filename}' deleted successfully."}
