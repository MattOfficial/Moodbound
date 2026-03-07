import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Document
import logging

from app.tasks.parsing import parse_and_chunk_document

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_document(ctx, document_id: str):
    """
    This is the background task that runs asynchronously.
    It takes a document ID, looks it up in PostgreSQL, and simulates heavy processing.
    """
    # ARQ runs in a separate process, so we need our own DB session
    db: Session = SessionLocal()
    
    try:
        # 1. Fetch the document
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found in database.")
            return

        # 2. Update status to 'Processing'
        logger.info(f"Starting ingestion pipeline for document: {doc.filename}")
        doc.status = "Processing"
        db.commit()

        # 3. LlamaIndex Narrative Chunking
        # We parse the file on disk and split it into sentence-aware nodes.
        nodes = parse_and_chunk_document(doc.file_path, doc.filename)
        
        # 4. (Future) Embedding & Qdrant insertion will go here
        await asyncio.sleep(1) # Simulated delay for now
        
        # 5. Mark as Completed
        logger.info(f"Successfully processed document: {doc.filename}. Generated {len(nodes)} chunks.")
        doc.status = "Completed"
        db.commit()
        
    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {e}")
        # Mark as Failed if something goes wrong
        if 'doc' in locals() and doc:
            doc.status = "Failed"
            db.commit()
    finally:
        db.close()
