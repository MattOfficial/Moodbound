from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from arq import create_pool
import os
import shutil
import uuid

from ..database import get_db
from ..models import Document
from ..redis_config import redis_settings

router = APIRouter()

# Directory to temporarily store uploaded files before processing
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_document(file: UploadFile = File(...), genre: str = "Uncategorized", db: Session = Depends(get_db)):
    """
    Endpoint to receive a novel file upload.
    It saves the file locally and creates a 'Pending' record in PostgreSQL.
    Then, it instantly dispatches a background task to Redis.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension not in ['pdf', 'epub', 'txt']:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, EPUB, or TXT.")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create DB Record
    new_doc = Document(
        filename=file.filename,
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
        # We log the error but still return success for the upload.
        # The document is saved, so a retry mechanism could pick it up later.
        print(f"Error enqueueing job to Redis: {e}")
    
    return {
        "message": "File uploaded successfully and queued for processing.",
        "document_id": new_doc.id,
        "status": new_doc.status
    }


@router.get("/")
def list_documents(db: Session = Depends(get_db)):
    """
    Returns a list of all uploaded documents from PostgreSQL.
    Used by the Library page to show real-time processing status.
    """
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
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
def delete_document(document_id: str, db: Session = Depends(get_db)):
    """
    Deletes a document record from PostgreSQL and removes the file from disk.
    """
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    doc = db.query(Document).filter(Document.id == doc_uuid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove from disk if it still exists
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    db.delete(doc)
    db.commit()
    return {"message": f"Document '{doc.filename}' deleted successfully."}
