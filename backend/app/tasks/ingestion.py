import asyncio
import os
import logging
from typing import Any
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Document
from app.tasks.parsing import parse_and_chunk_document
from app.vector_store import get_vector_store
from app.graph_store import write_triplets
import json

from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core.settings import Settings
from llama_index.core.schema import TextNode

from agentic_router import AgenticRouter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
MAX_EMBED_CHARS = int(os.getenv("EMBEDDING_MAX_CHARS", "8000"))
EMBED_SPLIT_OVERLAP_CHARS = int(os.getenv("EMBEDDING_SPLIT_OVERLAP_CHARS", "400"))
EMBED_RECOVERY_BATCH_SIZE = int(os.getenv("EMBED_RECOVERY_BATCH_SIZE", "20"))


def _safe_node_text(node: Any) -> str:
    text = getattr(node, "text", None)
    if isinstance(text, str):
        return text

    if hasattr(node, "get_content"):
        try:
            return str(node.get_content(metadata_mode="none"))
        except TypeError:
            return str(node.get_content())
        except Exception:
            return ""

    return ""


def _safe_node_id(node: Any, fallback: str) -> str:
    node_id = getattr(node, "node_id", None) or getattr(node, "id_", None)
    if node_id:
        return str(node_id)
    return fallback


def _safe_node_metadata(node: Any) -> dict:
    metadata = getattr(node, "metadata", None)
    if isinstance(metadata, dict):
        return metadata.copy()
    return {}


def _normalize_nodes_for_embedding(nodes: list[Any]) -> list[TextNode]:
    """
    Normalize parser output into TextNode objects that are embedding-safe:
    - remove empty/invalid text
    - strip null bytes and whitespace
    - split oversized chunks into smaller parts to avoid provider 400s
    """
    normalized: list[TextNode] = []

    for idx, node in enumerate(nodes):
        text = _safe_node_text(node).replace("\x00", " ")
        # Drop invalid surrogates / non-UTF8 artifacts that providers can reject.
        text = text.encode("utf-8", errors="ignore").decode("utf-8", errors="ignore").strip()
        if not text:
            continue

        metadata = _safe_node_metadata(node)
        base_id = _safe_node_id(node, fallback=f"chunk-{idx}")

        if len(text) <= MAX_EMBED_CHARS:
            normalized.append(TextNode(text=text, metadata=metadata, id_=base_id))
            continue

        step = max(1, MAX_EMBED_CHARS - EMBED_SPLIT_OVERLAP_CHARS)
        slices = [text[pos : pos + MAX_EMBED_CHARS] for pos in range(0, len(text), step)]
        total_parts = len(slices)

        logger.warning(
            "Chunk '%s' is oversized (%s chars). Splitting into %s embedding-safe parts.",
            base_id,
            len(text),
            total_parts,
        )

        for part_idx, part_text in enumerate(slices, start=1):
            part_clean = part_text.strip()
            if not part_clean:
                continue
            part_meta = metadata.copy()
            part_meta["chunk_part"] = part_idx
            part_meta["chunk_parts_total"] = total_parts
            normalized.append(
                TextNode(
                    text=part_clean,
                    metadata=part_meta,
                    id_=f"{base_id}:p{part_idx}",
                )
            )

    return normalized


def _error_details(exc: Exception) -> str:
    detail = str(exc).strip() or exc.__class__.__name__
    response = getattr(exc, "response", None)
    if response is not None:
        try:
            return f"{detail} | response={response.json()}"
        except Exception:
            response_text = getattr(response, "text", None)
            if response_text:
                return f"{detail} | response={response_text[:600]}"

    body = getattr(exc, "body", None)
    if body:
        return f"{detail} | body={body}"

    if getattr(exc, "args", None):
        return f"{detail} | args={exc.args!r}"

    return detail


def _resolve_embed_provider_model() -> tuple[str, str]:
    ai_provider = (os.getenv("AI_PROVIDER", "gemini") or "gemini").strip().lower()
    embed_model_raw = (os.getenv("EMBEDDING_MODEL") or "").strip()
    default_embed = "text-embedding-004" if ai_provider == "gemini" else "text-embedding-3-small"

    if embed_model_raw:
        parts = embed_model_raw.split("/", 1)
        if len(parts) == 2:
            return parts[0].strip().lower(), parts[1].strip()
        return ai_provider, embed_model_raw

    return ai_provider, default_embed


def _probe_openai_embedding_error(model_name: str) -> str:
    """
    Probe OpenAI embeddings endpoint with a tiny payload and return exact error details.
    This helps distinguish model/account/configuration issues from text-data issues.
    """
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return "OPENAI_API_KEY is missing/blank at runtime."

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        client.embeddings.create(model=model_name, input=["healthcheck"])
        return "OpenAI embedding probe succeeded."
    except Exception as sdk_exc:
        sdk_detail = _error_details(sdk_exc)

        # Fallback to raw HTTP probe because some wrapped SDK errors lose payload details.
        try:
            import httpx

            response = httpx.post(
                "https://api.openai.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": model_name, "input": ["healthcheck"]},
                timeout=30.0,
            )
            raw_body = response.text.replace("\n", " ").strip()
            raw_body = raw_body[:1200]
            return (
                f"SDK={sdk_detail} | "
                f"RAW_STATUS={response.status_code} | RAW_BODY={raw_body}"
            )
        except Exception as raw_exc:
            return f"SDK={sdk_detail} | RAW_PROBE_ERROR={_error_details(raw_exc)}"


def _index_nodes_with_recovery(nodes: list[TextNode], storage_context: StorageContext) -> tuple[int, int]:
    """
    Index nodes into Qdrant.
    If bulk insertion fails (common with provider-side embedding 400s),
    retry progressively: smaller batches -> single-node inserts.
    """
    try:
        VectorStoreIndex(nodes, storage_context=storage_context)
        return len(nodes), 0
    except Exception as exc:
        logger.warning(
            "Bulk vector indexing failed for %s chunks: %s",
            len(nodes),
            _error_details(exc),
        )

    indexed = 0
    dropped = 0
    batch_size = max(1, EMBED_RECOVERY_BATCH_SIZE)

    for start in range(0, len(nodes), batch_size):
        batch = nodes[start : start + batch_size]
        try:
            VectorStoreIndex(batch, storage_context=storage_context)
            indexed += len(batch)
        except Exception as batch_exc:
            logger.warning(
                "Batch indexing failed for chunks [%s:%s]: %s. Retrying one-by-one.",
                start,
                start + len(batch) - 1,
                _error_details(batch_exc),
            )
            for offset, node in enumerate(batch):
                idx = start + offset
                try:
                    VectorStoreIndex([node], storage_context=storage_context)
                    indexed += 1
                except Exception as node_exc:
                    dropped += 1
                    preview = node.text[:180].replace("\n", " ")
                    logger.error(
                        "Dropping chunk %s after repeated embedding/index failures: %s | preview=%r",
                        idx,
                        _error_details(node_exc),
                        preview,
                    )

    return indexed, dropped

async def _classify_genre(sample_text: str) -> str:
    """
    Calls the configured LLM with a constrained prompt to classify a novel's genre.
    """
    try:
        router = AgenticRouter(llm=Settings.llm)
        genre = await asyncio.to_thread(router.classify_genre, sample_text)
        return genre
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
        raw_nodes = parse_and_chunk_document(
            doc.file_path,
            doc.filename,
            user_id=str(doc.user_id),
            document_id=str(doc.id),
        )
        nodes = _normalize_nodes_for_embedding(raw_nodes)
        if not nodes:
            raise RuntimeError("No valid chunks produced from parser output.")

        # 3. Configure AI provider
        from app.ai_config import configure_ai_settings
        configure_ai_settings()

        # 4. Generate Embeddings → Qdrant
        logger.info(f"Generating vectors for {len(nodes)} chunks...")

        # The user_id is now safely injected via the vibe-chunker metadata framework.

        vector_store = get_vector_store()
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        indexed_count, dropped_count = _index_nodes_with_recovery(nodes, storage_context)
        if indexed_count == 0:
            embed_provider, embed_model_name = _resolve_embed_provider_model()
            diagnostic = ""
            if embed_provider == "openai":
                diagnostic = _probe_openai_embedding_error(embed_model_name)
                logger.error(
                    "OpenAI embedding diagnostic failed after zero indexed chunks: %s",
                    diagnostic,
                )
            raise RuntimeError(
                "Failed to index all chunks into vector store."
                + (f" Diagnostic: {diagnostic}" if diagnostic else "")
            )
        logger.info(
            "Indexed %s chunks into Qdrant (%s dropped during recovery).",
            indexed_count,
            dropped_count,
        )

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

            logger.info(f"Firing {len(batches)} NER batches with Semaphore concurrency limit of 3...")

            semaphore = asyncio.Semaphore(3)

            async def sem_extract(text_batch):
                async with semaphore:
                    return await _extract_relationships(text_batch)

            # Launch extraction calls with strict concurrency limits
            results = await asyncio.gather(
                *[sem_extract(text) for text in batches],
                return_exceptions=True,
            )

            # Write each batch's results to Neo4j as they complete
            total_written = 0
            for idx, triplets in enumerate(results):
                if isinstance(triplets, Exception) or not triplets:
                    continue
                write_triplets(document_id, str(doc.user_id), triplets)
                total_written += len(triplets)
                logger.info(f"Batch {idx + 1}: wrote {len(triplets)} triplets to Neo4j.")

            logger.info(f"NER complete — {total_written} total relationship triplets written.")

        # 7. Mark Completed
        logger.info(f"Successfully processed '{doc.filename}' → genre: {doc.genre}")
        doc.status = "Completed"
        db.commit()

    except Exception as e:
        logger.exception(f"Failed to process document {document_id}: {e}")
        if 'doc' in locals() and doc:
            doc.status = "Failed"
            db.commit()
    finally:
        db.close()
