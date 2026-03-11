import os
import logging
from dotenv import load_dotenv

from llama_index.core.settings import Settings

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

logger = logging.getLogger(__name__)

# Global fallback for backward compatibility
AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower()

def _parse_model_string(model_env_val: str, default_provider: str, default_model: str) -> tuple[str, str]:
    """
    Parses a model string like 'openai/text-embedding-3-small' into ('openai', 'text-embedding-3-small').
    If no slash is found, falls back to the default_provider.
    """
    if not model_env_val:
        return default_provider, default_model

    parts = model_env_val.split("/", 1)
    if len(parts) == 2:
        return parts[0].lower(), parts[1]
    return default_provider, model_env_val

def configure_ai_settings():
    """
    Configures the global LlamaIndex Settings object based on the environment variables.
    Allows mixing AI providers for cost/performance optimization using provider/model syntax.
    (e.g., deepseek/deepseek-chat for FAST_LLM_MODEL, openai/text-embedding-3-small for EMBEDDING_MODEL)
    """

    # --- 1. Parse Providers and Models ---
    embed_model_raw = os.getenv("EMBEDDING_MODEL")
    llm_model_raw = os.getenv("FAST_LLM_MODEL")

    # Defaults depending on the global AI_PROVIDER fallback
    default_embed = "text-embedding-004" if AI_PROVIDER == "gemini" else "text-embedding-3-small"
    default_llm = "gemini-1.5-flash" if AI_PROVIDER == "gemini" else "gpt-4o-mini"

    embed_provider, embed_model_name = _parse_model_string(embed_model_raw, AI_PROVIDER, default_embed)
    llm_provider, llm_model_name = _parse_model_string(llm_model_raw, AI_PROVIDER, default_llm)

    # --- 2. Configure Embeddings ---
    if embed_provider == "openai":
        from llama_index.embeddings.openai import OpenAIEmbedding
        Settings.embed_model = OpenAIEmbedding(model=embed_model_name, embed_batch_size=100)
        logger.info(f"Configured Embeddings: OpenAI ({embed_model_name})")

    elif embed_provider == "gemini":
        from llama_index.embeddings.gemini import GeminiEmbedding
        embed_model_str = embed_model_name if embed_model_name.startswith("models/") else f"models/{embed_model_name}"
        Settings.embed_model = GeminiEmbedding(model_name=embed_model_str, embed_batch_size=100)
        logger.info(f"Configured Embeddings: Gemini ({embed_model_str})")

    else:
        raise ValueError(f"Unsupported EMBEDDING_PROVIDER parsed from {embed_model_raw}: {embed_provider}")

    # --- 3. Configure LLM ---
    if llm_provider == "openai":
        from llama_index.llms.openai import OpenAI
        Settings.llm = OpenAI(model=llm_model_name, temperature=0.7, timeout=120.0)
        logger.info(f"Configured LLM: OpenAI ({llm_model_name})")

    elif llm_provider == "gemini":
        from llama_index.llms.gemini import Gemini
        llm_model_str = llm_model_name if llm_model_name.startswith("models/") else f"models/{llm_model_name}"
        Settings.llm = Gemini(model=llm_model_str, temperature=0.7)
        logger.info(f"Configured LLM: Gemini ({llm_model_str})")

    elif llm_provider == "deepseek":
        from llama_index.llms.deepseek import DeepSeek
        llm_model_name = llm_model_name or "deepseek-chat"
        Settings.llm = DeepSeek(
            model=llm_model_name,
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            temperature=0.7,
            timeout=120.0
        )
        logger.info(f"Configured LLM: DeepSeek ({llm_model_name})")

    else:
        raise ValueError(f"Unsupported LLM_PROVIDER parsed from {llm_model_raw}: {llm_provider}")
