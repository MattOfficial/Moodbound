import asyncio
import os
import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Document
from app.tasks.parsing import parse_and_chunk_document
from app.vector_store import get_vector_store

from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core.settings import Settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_document(ctx, document_id: str):
    """
    This is the background task that runs asynchronously.
    It takes a document ID, parses it, chunks it, and generates vector embeddings
    which are stored in Qdrant.
    """
    db: Session = SessionLocal()
    
    try:
        # 1. Fetch the document
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found in database.")
            return

        logger.info(f"Starting ingestion pipeline for document: {doc.filename}")
        doc.status = "Processing"
        db.commit()

        # 2. LlamaIndex Narrative Chunking
        nodes = parse_and_chunk_document(doc.file_path, doc.filename)
        
        # 3. Configure Embeddings & Vector Store
        # Dynamically load the correct AI provider based on our .env config
        from app.ai_config import configure_ai_settings
        configure_ai_settings()
        
        logger.info("Connecting to Qdrant and initializing StorageContext...")
        vector_store = get_vector_store()
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        # 4. Generate Embeddings and Save to Qdrant
        # This step sends the nodes to OpenAI or Gemini to get coordinates, then saves them to Qdrant.
        logger.info(f"Generating vectors for {len(nodes)} chunks. This may take a moment...")
        index = VectorStoreIndex(
            nodes, 
            storage_context=storage_context,
            # We pass show_progress=True but we might not see it gracefully in background logs
        )
        
        # 5. Mark as Completed
        logger.info(f"Successfully vectorized and stored {doc.filename} in Qdrant.")
        doc.status = "Completed"
        db.commit()
        
    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {e}")
        if 'doc' in locals() and doc:
            doc.status = "Failed"
            db.commit()
    finally:
        db.close()
