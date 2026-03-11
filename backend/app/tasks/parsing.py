import os
import logging
from vibe_chunker import NarrativeChunker

logger = logging.getLogger(__name__)

def parse_and_chunk_document(file_path: str, filename: str, user_id: str = None):
    """
    Parses a physical file into LlamaIndex Document objects and chunks it
    intelligently using the modular vibe_chunker.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at path: {file_path}")

    chunker = NarrativeChunker(chunk_size=1024, chunk_overlap=200)

    metadata = {}
    if user_id:
        metadata["user_id"] = user_id

    return chunker.parse_and_chunk(file_path, filename, metadata=metadata)
