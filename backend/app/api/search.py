from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

from llama_index.core import VectorStoreIndex
from llama_index.core.settings import Settings

from ..vector_store import get_vector_store

router = APIRouter()
logger = logging.getLogger(__name__)

class SearchQuery(BaseModel):
    query: str

@router.post("/")
async def search_novels(search_query: SearchQuery):
    """
    Endpoint to perform a 'Vibe Search' across all ingested novels.
    It converts the query to a vector, finds the nearest chunks in Qdrant,
    and synthesizes an answer using an LLM.
    """
    try:
        # 1. Configure Global LlamaIndex Settings
        # Dynamically load the correct AI provider (Gemini or OpenAI)
        from app.ai_config import configure_ai_settings
        configure_ai_settings()

        # 2. Attach to our existing Qdrant Vector Store
        logger.info(f"Received search query: {search_query.query}")
        vector_store = get_vector_store()

        # Re-instantiate the index from the existing vector store
        index = VectorStoreIndex.from_vector_store(vector_store=vector_store)

        # 3. Create the Query Engine
        # similarity_top_k dictates how many chunks we retrieve. We will pull the Top 3 most relevant scenes.
        logger.info("Executing hybrid search (Dense Vectors + BM25 Sparse) against Qdrant...")
        query_engine = index.as_query_engine(
            similarity_top_k=3,
            vector_store_query_mode="hybrid",
            alpha=0.5
        )

        # 4. Extract "Vibe" category using global LLM
        vibe_prompt = (
            "Classify the emotional tone of the following search query into EXACTLY ONE of these categories: "
            "[Melancholic, Serene, Dark, Tense, Romantic, Epic, Mysterious, Happy, Neutral]. "
            "Output ONLY the category name and nothing else.\n\n"
            f"Query: '{search_query.query}'"
        )
        try:
            vibe_response = Settings.llm.complete(vibe_prompt)
            # Clean up the response just in case the LLM adds punctuation
            vibe_category = str(vibe_response).strip().strip("[]'\".,").capitalize()

            # Validate against our list just to be safe
            valid_vibes = ["Melancholic", "Serene", "Dark", "Tense", "Romantic", "Epic", "Mysterious", "Happy", "Neutral"]
            if vibe_category not in valid_vibes:
                vibe_category = "Neutral"
        except Exception as e:
            logger.warning(f"Failed to extract vibe, defaulting to Neutral: {e}")
            vibe_category = "Neutral"

        logger.info(f"Query classified as Vibe: {vibe_category}")

        # 5. Execute the query and synthesize the response
        response = query_engine.query(search_query.query)

        # 6. Format the return data for our beautiful React frontend
        source_nodes = []
        for node in response.source_nodes:
            source_nodes.append({
                "text": node.node.text,
                "score": node.score, # How mathematically similar this chunk was to the query
                "filename": node.node.metadata.get('filename', 'Unknown Source')
            })

        return {
            "answer": str(response),
            "sources": source_nodes,
            "vibe": vibe_category
        }

    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute search: {str(e)}")
