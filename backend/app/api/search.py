from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import logging

from llama_index.core import VectorStoreIndex
from llama_index.core.settings import Settings

from ..vector_store import get_vector_store
from ..graph_store import get_triplets_for_characters
from ..auth import get_current_user
from ..models import User

router = APIRouter()
logger = logging.getLogger(__name__)

class SearchQuery(BaseModel):
    query: str

@router.post("/")
async def search_novels(
    search_query: SearchQuery,
    current_user: User = Depends(get_current_user)
):
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

        # 2. AI Router (Vector vs Graph)
        router_prompt = (
            "You are a strict query routing assistant. Categorize the user's query into EXACTLY ONE of two categories: 'Vector' or 'Graph'.\n\n"
            "RULES:\n"
            "1. If the query asks 'Why', or asks for a reason, description, lore explanation, abstract concept, or mood, YOU MUST CHOOSE 'Vector'. Example: 'Why was piggy duke fat?' -> Vector. 'Describe the rainy night.' -> Vector.\n"
            "2. If the query STRICTLY asks for structural relationships between entities (who is related to who, who betrayed who, family ties), choose 'Graph'. Example: 'Who is related to Ao?' -> Graph.\n"
            "3. Do NOT choose Graph simply because a character's name is in the prompt. 'Who is Piggy Duke?' is Vector. 'Why did Piggy Duke leave?' is Vector. Graph is ONLY for relationship mapping.\n\n"
            "Output ONLY the exact word 'Vector' or 'Graph' and absolutely nothing else.\n\n"
            f"Query: '{search_query.query}'"
        )
        try:
            route_response = Settings.llm.complete(router_prompt)
            route = str(route_response).strip().capitalize()
            if route not in ["Vector", "Graph"]:
                route = "Vector"
        except Exception as e:
            logger.warning(f"Router failed, defaulting to Vector: {e}")
            route = "Vector"

        logger.info(f"AI Router decided: {route}")

        if route == "Vector":
            # --- Qdrant Vector / Hybrid Path (Existing) ---
            logger.info("Connecting to Qdrant Vector Store...")
            vector_store = get_vector_store()
            index = VectorStoreIndex.from_vector_store(vector_store=vector_store)

            from llama_index.core.vector_stores.types import MetadataFilter, MetadataFilters, FilterOperator

            logger.info(f"Executing scoped hybrid search (user={current_user.id}) against Qdrant...")

            # CRITICAL: Isolate vector query to the user's uploaded documents only!
            filters = MetadataFilters(
                filters=[
                    MetadataFilter(key="user_id", operator=FilterOperator.EQ, value=str(current_user.id)),
                ]
            )

            query_engine = index.as_query_engine(
                similarity_top_k=3,
                vector_store_query_mode="hybrid",
                alpha=0.5,
                filters=filters
            )

            # Extract "Vibe" category
            vibe_prompt = (
                "Classify the emotional tone of the following search query into EXACTLY ONE of these categories: "
                "[Melancholic, Serene, Dark, Tense, Romantic, Epic, Mysterious, Happy, Neutral]. "
                "Output ONLY the category name and nothing else.\n\n"
                f"Query: '{search_query.query}'"
            )
            try:
                vibe_response = Settings.llm.complete(vibe_prompt)
                vibe_category = str(vibe_response).strip().strip("[]'\".,").capitalize()
                valid_vibes = ["Melancholic", "Serene", "Dark", "Tense", "Romantic", "Epic", "Mysterious", "Happy", "Neutral"]
                if vibe_category not in valid_vibes:
                    vibe_category = "Neutral"
            except Exception as e:
                vibe_category = "Neutral"

            logger.info(f"Query classified as Vibe: {vibe_category}")

            response = query_engine.query(search_query.query)

            source_nodes = []
            for node in response.source_nodes:
                source_nodes.append({
                    "text": node.node.text,
                    "score": node.score,
                    "filename": node.node.metadata.get('filename', 'Unknown Source')
                })

            return {
                "answer": str(response),
                "sources": source_nodes,
                "vibe": vibe_category,
                "engine": "qdrant-hybrid"
            }

        else:
            # --- Neo4j GraphRAG Path (New) ---
            logger.info("Executing GraphRAG pipeline...")
            entity_prompt = (
                "Extract the main character names or entities from the following query. "
                "Output ONLY a comma-separated list of names. If you cannot find any names, output 'None'.\n\n"
                f"Query: '{search_query.query}'"
            )
            entity_response = Settings.llm.complete(entity_prompt)
            entities_str = str(entity_response).strip()

            names = []
            if entities_str.lower() != 'none':
                names = [n.strip() for n in entities_str.split(',') if n.strip()]

            # Pass the user down so Neo4j filters relationship by the owner
            triplets = get_triplets_for_characters(names, user_id=str(current_user.id))

            if not triplets:
                # Fallback gently
                return {
                    "answer": f"I analyzed the graph for {' and '.join(names) if names else 'those characters'}, but I couldn't find any direct relationship data in the current database.",
                    "sources": [],
                    "vibe": "Neutral",
                    "engine": "neo4j-graph"
                }

            # Synthesize answer from Neo4j Triplets
            triplets_context = "\n".join(triplets)
            synthesis_prompt = (
                "You are an AI assistant for a novel reader. Answer the user's question using ONLY the provided relationship graph data.\n"
                "Do not hallucinate external lore. If the graph data doesn't fully answer the question, say so, but provide what you do know.\n\n"
                "--- Graph Relationships ---\n"
                f"{triplets_context}\n"
                "---------------------------\n\n"
                f"User Question: '{search_query.query}'\n"
                "Answer: "
            )

            synthesis_response = Settings.llm.complete(synthesis_prompt)

            # Format Neo4j logic as pseudo-sources so the frontend doesn't crash
            # and can proudly display the extracted graph data.
            graph_sources = [{
                "text": f"Graph Cypher Extraction:\n{triplets_context}",
                "score": 1.0,
                "filename": "Neo4j Knowledge Graph"
            }]

            return {
                "answer": str(synthesis_response),
                "sources": graph_sources,
                "vibe": "Mysterious", # Give graph queries a distinct color vibe
                "engine": "neo4j-graph"
            }

    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute search: {str(e)}")
