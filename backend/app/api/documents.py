from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from arq import create_pool
import os
import shutil

from ..database import get_db
from ..models import Document
from ..redis_config import redis_settings

router = APIRouter()

# Directory to temporarily store uploaded files before processing
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
        status="Pending"
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
