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

# Fixed genre labels the LLM must choose from
GENRE_LABELS = [
    "Fantasy", "Sci-Fi", "Romance", "Mystery",
    "Thriller", "Horror", "Historical Fiction",
    "Literary Fiction", "Adventure", "Non-Fiction",
]

async def _classify_genre(sample_text: str) -> str:
    """
    Calls the configured LLM with a constrained prompt to classify a novel's genre.
    Returns one of the GENRE_LABELS, or 'Uncategorized' on failure.
    """
    label_list = ", ".join(GENRE_LABELS)
    prompt = (
        f"You are a literary genre classifier. Based on the following excerpt from a novel, "
        f"classify it into exactly ONE of these genres: {label_list}.\n\n"
        f"Respond with ONLY the genre name and nothing else.\n\n"
        f"EXCERPT:\n{sample_text[:2000]}"
    )
    try:
        response = await asyncio.to_thread(Settings.llm.complete, prompt)
        raw = str(response).strip()
        # Find the first matching label (case-insensitive)
        for label in GENRE_LABELS:
            if label.lower() in raw.lower():
                return label
        logger.warning(f"LLM returned unrecognised genre '{raw}' — falling back to Uncategorized.")
    except Exception as e:
        logger.warning(f"Genre classification failed: {e}")
    return "Uncategorized"


async def process_document(ctx, document_id: str):
    """
    Background task: parses, chunks, vectorizes, and auto-categorizes a document.
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

        # 2. Narrative Chunking
        nodes = parse_and_chunk_document(doc.file_path, doc.filename)
        
        # 3. Configure AI provider
        from app.ai_config import configure_ai_settings
        configure_ai_settings()
        
        # 4. Generate Embeddings → Qdrant
        logger.info(f"Generating vectors for {len(nodes)} chunks...")
        vector_store = get_vector_store()
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        VectorStoreIndex(nodes, storage_context=storage_context)

        # 5. AI Genre Classification
        if nodes and doc.genre in (None, "Uncategorized"):
            sample_text = nodes[0].text
            logger.info("Running AI genre classification...")
            doc.genre = await _classify_genre(sample_text)
            logger.info(f"Genre classified as: {doc.genre}")
        
        # 6. Mark Completed
        logger.info(f"Successfully processed '{doc.filename}' → genre: {doc.genre}")
        doc.status = "Completed"
        db.commit()
        
    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {e}")
        if 'doc' in locals() and doc:
            doc.status = "Failed"
            db.commit()
    finally:
        db.close()

