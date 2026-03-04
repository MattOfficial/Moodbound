from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import shutil

from ..database import get_db
from ..models import Document

router = APIRouter()

# Directory to temporarily store uploaded files before processing
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Endpoint to receive a novel file upload.
    It saves the file locally and creates a 'Pending' record in PostgreSQL.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension not in ['pdf', 'epub', 'txt']:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, EPUB, or TXT.")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # Save the file to our upload directory
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create a new record in our PostgreSQL database
    # Notice how we use the db session injected by Depends(get_db)
    new_doc = Document(
        filename=file.filename,
        content_type=file.content_type,
        file_path=file_path,
        status="Pending"
    )
    
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc) # Get the newly generated UUID
    
    return {
        "message": "File uploaded successfully",
        "document_id": new_doc.id,
        "status": new_doc.status
    }
