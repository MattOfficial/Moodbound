import os
import logging
from llama_index.core.settings import Settings
from llama_index.core.node_parser import SemanticSplitterNodeParser, SentenceSplitter
from narrative_chunker import NarrativeChunker

logger = logging.getLogger(__name__)

def parse_and_chunk_document(
    file_path: str,
    filename: str,
    user_id: str | None = None,
    document_id: str | None = None,
):
    """
    Parses a physical file into LlamaIndex Document objects and chunks it
    using state-of-the-art Semantic Splitter from LlamaIndex.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at path: {file_path}")

    # Ensure AI Settings are configured so the embedding model is loaded
    from app.ai_config import configure_ai_settings
    configure_ai_settings()

    metadata = {}
    if user_id:
        metadata["user_id"] = user_id
    if document_id:
        metadata["document_id"] = document_id

    # Prefer semantic chunking, but gracefully fall back if embedding pre-pass fails
    # (e.g., provider-side 400 on malformed/oversized sentence candidates).
    try:
        logger.info("Initializing SemanticSplitterNodeParser (this may take longer as it computes sentence similarity embeddings)...")
        semantic_parser = SemanticSplitterNodeParser(
            buffer_size=1,
            breakpoint_percentile_threshold=95,
            embed_model=Settings.embed_model
        )
        chunker = NarrativeChunker(parser=semantic_parser)
        return chunker.parse_and_chunk(file_path, filename, metadata=metadata)
    except Exception as e:
        logger.warning(
            "Semantic chunking failed for '%s' (%s). Falling back to SentenceSplitter.",
            filename,
            e
        )
        fallback_parser = SentenceSplitter(chunk_size=1024, chunk_overlap=120)
        fallback_chunker = NarrativeChunker(parser=fallback_parser)
        return fallback_chunker.parse_and_chunk(file_path, filename, metadata=metadata)
