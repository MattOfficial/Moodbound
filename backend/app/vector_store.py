import logging
import os
import qdrant_client
from dotenv import load_dotenv
from llama_index.core.vector_stores.types import FilterOperator, MetadataFilter, MetadataFilters
from llama_index.vector_stores.qdrant import QdrantVectorStore

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
logger = logging.getLogger(__name__)

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
    return QdrantVectorStore(
        client=client,
        collection_name=COLLECTION_NAME,
        enable_hybrid=True
    )


def _build_metadata_filters(*, user_id: str, document_id: str | None = None, filename: str | None = None) -> MetadataFilters:
    filters = [
        MetadataFilter(key="user_id", operator=FilterOperator.EQ, value=user_id),
    ]
    if document_id:
        filters.append(MetadataFilter(key="document_id", operator=FilterOperator.EQ, value=document_id))
    if filename:
        filters.append(MetadataFilter(key="filename", operator=FilterOperator.EQ, value=filename))
    return MetadataFilters(filters=filters)


def delete_document_vectors(document_id: str, user_id: str, legacy_filename: str | None = None) -> None:
    """
    Delete vectors for a document.

    New ingests are removed by `document_id` + `user_id`.
    Older ingests did not stamp `document_id` into node metadata, so we fall back
    to `filename` + `user_id` only when explicitly requested for legacy records.
    """
    client = get_qdrant_client()
    if not client.collection_exists(collection_name=COLLECTION_NAME):
        return

    vector_store = QdrantVectorStore(
        client=client,
        collection_name=COLLECTION_NAME,
        enable_hybrid=True,
    )
    vector_store.delete_nodes(
        filters=_build_metadata_filters(user_id=user_id, document_id=document_id)
    )

    if legacy_filename:
        logger.warning(
            "Using legacy filename-based vector cleanup for document %s.",
            document_id,
        )
        vector_store.delete_nodes(
            filters=_build_metadata_filters(user_id=user_id, filename=legacy_filename)
        )
