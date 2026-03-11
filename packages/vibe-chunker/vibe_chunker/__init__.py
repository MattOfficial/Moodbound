import os
import logging
from typing import Optional, Dict, Any, List
from llama_index.core.node_parser import SentenceSplitter

logger = logging.getLogger(__name__)

class NarrativeChunker:
    """
    Encapsulates narrative chunking logic to preserve scene boundaries when preparing novels for vectorization.
    It parses physical files and intelligently splits them to respect punctuation.
    """

    def __init__(self, parser=None, chunk_size: int = 1024, chunk_overlap: int = 200):
        if parser:
            self.parser = parser
            logger.info("Initialized NarrativeChunker with custom parser override.")
        else:
            self.chunk_size = chunk_size
            self.chunk_overlap = chunk_overlap
            self.parser = SentenceSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
            logger.info(f"Initialized NarrativeChunker (SentenceSplitter, size={chunk_size}, overlap={chunk_overlap}).")

    def parse_and_chunk(self, file_path: str, filename: str, reader=None, metadata: Optional[Dict[str, Any]] = None) -> List[Any]:
        """
        Parses a physical file into LlamaIndex Document objects and chunks it.
        Allows for custom readers and arbitrary metadata injection onto every resulting node.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at path: {file_path}")

        logger.info(f"Parsing raw text from: {filename}")

        # Load documents dynamically
        if reader:
            logger.info("Using custom reader override.")
            documents = reader.load_data()
        else:
            from llama_index.core import SimpleDirectoryReader
            reader = SimpleDirectoryReader(input_files=[file_path])
            documents = reader.load_data()

        # Compile base metadata plus any custom dictionary passed in by the developer
        base_metadata = {"filename": filename, "source": "user_upload"}
        if metadata:
            base_metadata.update(metadata)

        for doc in documents:
            doc.metadata = base_metadata

        nodes = self.parser.get_nodes_from_documents(documents)
        logger.info(f"Successfully generated {len(nodes)} distinct context chunks from {filename} with metadata schema: {list(base_metadata.keys())}!")

        return nodes
