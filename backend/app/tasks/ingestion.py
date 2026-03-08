import asyncio
import os
import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Document
from app.tasks.parsing import parse_and_chunk_document
from app.vector_store import get_vector_store
from app.graph_store import write_triplets
import json

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


async def _extract_relationships(sample_text: str) -> list[dict]:
    """
    Calls the configured LLM to extract character relationship triplets.
    """
    prompt = (
        "You are an expert at Named Entity Recognition. Extract the key character relationships "
        "from the following excerpt of a novel. Ensure you extract a comprehensive map, capturing "
        "at least 15 to 25 crucial relationships between characters.\n\n"
        "Return ONLY a JSON list of objects with exactly these keys: "
        "'source' (character name), 'relationship' (verb/label like 'betrayed', 'loves', 'friend', 'enemy', 'mentor', 'family'), "
        "and 'target' (character name).\n\n"
        f"EXCERPT:\n{sample_text[:15000]}\n\n"
        "RESPONSE FORMAT:\n[{\"source\": \"A\", \"relationship\": \"rel\", \"target\": \"B\"}]"
    )
    try:
        response = await asyncio.to_thread(Settings.llm.complete, prompt)
        raw = str(response).strip()
        # Clean markdown code block if present
        if raw.startswith("```json"):
            raw = raw[7:]
        elif raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        return json.loads(raw.strip())
    except Exception as e:
        logger.warning(f"Failed to extract relationships: {e}")
        return []


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
        # 6. NER Graph Extraction — Concurrent streaming pattern
        if nodes:
            logger.info("Running NER relationship extraction (concurrent)...")

            # Sample 20 chunks evenly distributed across the entire novel
            TOTAL_SAMPLES = 20
            CHUNKS_PER_BATCH = 2  # ~5k characters per call – fast and timeout-safe
            step_size = max(1, len(nodes) // TOTAL_SAMPLES)
            sampled_nodes = nodes[::step_size][:TOTAL_SAMPLES]

            # Build individual batch texts
            batches = []
            for i in range(0, len(sampled_nodes), CHUNKS_PER_BATCH):
                batch = sampled_nodes[i : i + CHUNKS_PER_BATCH]
                batches.append("\n\n...[SCENE BREAK]...\n\n".join(n.text for n in batch))

            logger.info(f"Firing {len(batches)} concurrent NER batches...")

            # Launch all extraction calls simultaneously
            results = await asyncio.gather(
                *[_extract_relationships(text) for text in batches],
                return_exceptions=True,
            )

            # Write each batch's results to Neo4j as they complete
            total_written = 0
            for idx, triplets in enumerate(results):
                if isinstance(triplets, Exception) or not triplets:
                    continue
                write_triplets(document_id, triplets)
                total_written += len(triplets)
                logger.info(f"Batch {idx + 1}: wrote {len(triplets)} triplets to Neo4j.")

            logger.info(f"NER complete — {total_written} total relationship triplets written.")

        # 7. Mark Completed
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
