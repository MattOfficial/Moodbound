import os
import qdrant_client
from llama_index.vector_stores.qdrant import QdrantVectorStore
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

QDRANT_HOST = os.getenv("QDRANT_HOST", "127.0.0.1")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
COLLECTION_NAME = "vibe_novels"

def get_qdrant_client():
    """Returns a connected qdrant client."""
    return qdrant_client.QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

def get_vector_store():
    """
    Returns the LlamaIndex QdrantVectorStore abstraction, 
    wrapping our raw qdrant client. It automatically creates the collection
    if it doesn't already exist.
    """
    client = get_qdrant_client()
    return QdrantVectorStore(client=client, collection_name=COLLECTION_NAME)
