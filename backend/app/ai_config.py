import os
import logging
from dotenv import load_dotenv

from llama_index.core.settings import Settings

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

logger = logging.getLogger(__name__)

AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower()

def configure_ai_settings():
    """
    Configures the global LlamaIndex Settings object based on the environment variables.
    This allows the application to cleanly swap between OpenAI, Gemini, or other providers
    without rewriting the business logic in ingestion or search routes.
    """
    if AI_PROVIDER == "openai":
        from llama_index.embeddings.openai import OpenAIEmbedding
        from llama_index.llms.openai import OpenAI
        
        # Override with OpenAI defaults if user didn't specify OPENAI specific models
        embed_model_name = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        llm_model_name = os.getenv("FAST_LLM_MODEL", "gpt-4o-mini")
        
        Settings.embed_model = OpenAIEmbedding(model=embed_model_name)
        Settings.llm = OpenAI(model=llm_model_name, temperature=0.7)
        logger.info(f"Configured LlamaIndex to use OpenAI (Embed: {embed_model_name}, LLM: {llm_model_name})")
        
    elif AI_PROVIDER == "gemini":
        from llama_index.embeddings.gemini import GeminiEmbedding
        from llama_index.llms.gemini import Gemini
        
        # Override with Gemini defaults
        embed_model_name = os.getenv("EMBEDDING_MODEL", "text-embedding-004")
        llm_model_name = os.getenv("FAST_LLM_MODEL", "gemini-1.5-flash")
        
        # Ensure the 'models/' prefix is present for Gemini
        embed_model_str = embed_model_name if embed_model_name.startswith("models/") else f"models/{embed_model_name}"
        llm_model_str = llm_model_name if llm_model_name.startswith("models/") else f"models/{llm_model_name}"
        
        # Gemini requires GOOGLE_API_KEY in env
        Settings.embed_model = GeminiEmbedding(model_name=embed_model_str)
        Settings.llm = Gemini(model=llm_model_str, temperature=0.7)
        logger.info(f"Configured LlamaIndex to use Gemini (Embed: {embed_model_str}, LLM: {llm_model_str})")
        
    else:
        raise ValueError(f"Unsupported AI_PROVIDER: {AI_PROVIDER}. Must be 'openai' or 'gemini'.")
