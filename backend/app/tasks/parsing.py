import os
import logging
from llama_index.core.settings import Settings
from llama_index.core.node_parser import SemanticSplitterNodeParser
from narrative_chunker import NarrativeChunker

logger = logging.getLogger(__name__)

def parse_and_chunk_document(file_path: str, filename: str, user_id: str = None):
    """
    Parses a physical file into LlamaIndex Document objects and chunks it
    using state-of-the-art Semantic Splitter from LlamaIndex.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at path: {file_path}")

    # Ensure AI Settings are configured so the embedding model is loaded
    from app.ai_config import configure_ai_settings
    configure_ai_settings()

    # Utilize AI Semantic Chunking instead of naive sentence token limits
    logger.info("Initializing SemanticSplitterNodeParser (this may take longer as it computes sentence similarity embeddings)...")
    semantic_parser = SemanticSplitterNodeParser(
        buffer_size=1, breakpoint_percentile_threshold=95, embed_model=Settings.embed_model
    )

    # Inject the complex parser straight into our generalized pip package
    chunker = NarrativeChunker(parser=semantic_parser)

    metadata = {}
    if user_id:
        metadata["user_id"] = user_id

    return chunker.parse_and_chunk(file_path, filename, metadata=metadata)
