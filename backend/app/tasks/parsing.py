import os
import logging
from llama_index.core import SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter

logger = logging.getLogger(__name__)

def parse_and_chunk_document(file_path: str, filename: str):
    """
    Parses a physical file into LlamaIndex Document objects and chunks it
    intelligently using a SentenceSplitter to preserve narrative flow.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at path: {file_path}")

    # 1. Parsing: LlamaIndex reads the file natively
    logger.info(f"Parsing raw text from: {filename}")
    reader = SimpleDirectoryReader(input_files=[file_path])
    documents = reader.load_data()

    # Apply some basic metadata to the raw document before we split it
    for doc in documents:
        doc.metadata = {"filename": filename, "source": "user_upload"}

    # 2. Narrative Chunking: Instead of splitting strictly by tokens (which cuts sentences in half),
    # SentenceSplitter respects punctuation boundaries.
    # We use a large chunk_size (1024) to keep entire scenes together.
    # We use a substantial overlap (200) so that the transition from chunk N to chunk N+1 is seamless,
    # ensuring the "Vibe" isn't lost at the border of a chunk.
    chunk_size = 1024
    chunk_overlap = 200
    
    logger.info(f"Instantiating SentenceSplitter (size={chunk_size}, overlap={chunk_overlap})...")
    parser = SentenceSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    
    # Generate the actual chunks (nodes)
    nodes = parser.get_nodes_from_documents(documents)
    
    logger.info(f"Successfully generated {len(nodes)} distinct context chunks from {filename}!")
    
    return nodes

