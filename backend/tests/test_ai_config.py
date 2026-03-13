import os
import sys
from types import SimpleNamespace

import pytest

from app import ai_config


def test_get_required_env_and_apply_sanitized_env(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "  x" * 12)
    monkeypatch.setenv("GOOGLE_API_KEY", "  valid-google-key-1234567890  ")

    with pytest.raises(RuntimeError):
        ai_config._get_required_env("MISSING_ENV")

    sanitized = ai_config._apply_sanitized_env("GOOGLE_API_KEY")

    assert sanitized == "valid-google-key-1234567890"
    assert os.environ["GOOGLE_API_KEY"] == "valid-google-key-1234567890"


def test_apply_sanitized_env_rejects_short_values(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "short-key")

    with pytest.raises(RuntimeError) as exc_info:
        ai_config._apply_sanitized_env("DEEPSEEK_API_KEY")

    assert "looks too short" in str(exc_info.value)


def test_parse_model_string_handles_prefixed_and_fallback_values():
    assert ai_config._parse_model_string(None, "gemini", "text-embedding-004") == ("gemini", "text-embedding-004")
    assert ai_config._parse_model_string("openai/text-embedding-3-small", "gemini", "default") == (
        "openai",
        "text-embedding-3-small",
    )
    assert ai_config._parse_model_string("gpt-4o-mini", "openai", "default") == ("openai", "gpt-4o-mini")


def test_configure_ai_settings_supports_openai_models(monkeypatch):
    settings = SimpleNamespace()

    class FakeOpenAIEmbedding:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    class FakeOpenAI:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    monkeypatch.setattr(ai_config, "Settings", settings)
    monkeypatch.setattr(ai_config, "AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "openai-key-123456789012345")
    monkeypatch.setenv("EMBEDDING_MODEL", "openai/text-embedding-3-small")
    monkeypatch.setenv("FAST_LLM_MODEL", "openai/gpt-4o-mini")
    monkeypatch.setitem(sys.modules, "llama_index.embeddings.openai", SimpleNamespace(OpenAIEmbedding=FakeOpenAIEmbedding))
    monkeypatch.setitem(sys.modules, "llama_index.llms.openai", SimpleNamespace(OpenAI=FakeOpenAI))

    ai_config.configure_ai_settings()

    assert settings.embed_model.kwargs["model"] == "text-embedding-3-small"
    assert settings.embed_model.kwargs["api_key"] == "openai-key-123456789012345"
    assert settings.llm.kwargs["model"] == "gpt-4o-mini"
    assert settings.llm.kwargs["api_key"] == "openai-key-123456789012345"


def test_configure_ai_settings_supports_gemini_defaults(monkeypatch):
    settings = SimpleNamespace()

    class FakeGeminiEmbedding:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    class FakeGemini:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    monkeypatch.setattr(ai_config, "Settings", settings)
    monkeypatch.setattr(ai_config, "AI_PROVIDER", "gemini")
    monkeypatch.setenv("GOOGLE_API_KEY", "google-key-123456789012345")
    monkeypatch.delenv("EMBEDDING_MODEL", raising=False)
    monkeypatch.delenv("FAST_LLM_MODEL", raising=False)
    monkeypatch.setitem(sys.modules, "llama_index.embeddings.gemini", SimpleNamespace(GeminiEmbedding=FakeGeminiEmbedding))
    monkeypatch.setitem(sys.modules, "llama_index.llms.gemini", SimpleNamespace(Gemini=FakeGemini))

    ai_config.configure_ai_settings()

    assert settings.embed_model.kwargs["model_name"] == "models/text-embedding-004"
    assert settings.llm.kwargs["model"] == "models/gemini-1.5-flash"


def test_configure_ai_settings_supports_deepseek_llm(monkeypatch):
    settings = SimpleNamespace()

    class FakeGeminiEmbedding:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    class FakeDeepSeek:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    monkeypatch.setattr(ai_config, "Settings", settings)
    monkeypatch.setattr(ai_config, "AI_PROVIDER", "gemini")
    monkeypatch.setenv("GOOGLE_API_KEY", "google-key-123456789012345")
    monkeypatch.setenv("DEEPSEEK_API_KEY", " deepseek-key-123456789012345 ")
    monkeypatch.setenv("FAST_LLM_MODEL", "deepseek/deepseek-chat")
    monkeypatch.delenv("EMBEDDING_MODEL", raising=False)
    monkeypatch.setitem(sys.modules, "llama_index.embeddings.gemini", SimpleNamespace(GeminiEmbedding=FakeGeminiEmbedding))
    monkeypatch.setitem(sys.modules, "llama_index.llms.deepseek", SimpleNamespace(DeepSeek=FakeDeepSeek))

    ai_config.configure_ai_settings()

    assert settings.embed_model.kwargs["model_name"] == "models/text-embedding-004"
    assert settings.llm.kwargs["model"] == "deepseek-chat"
    assert settings.llm.kwargs["api_key"] == "deepseek-key-123456789012345"


def test_configure_ai_settings_rejects_unknown_embedding_provider(monkeypatch):
    monkeypatch.setattr(ai_config, "Settings", SimpleNamespace())
    monkeypatch.setattr(ai_config, "AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "openai-key-123456789012345")
    monkeypatch.setenv("EMBEDDING_MODEL", "anthropic/claude-embed")
    monkeypatch.setenv("FAST_LLM_MODEL", "openai/gpt-4o-mini")

    with pytest.raises(ValueError) as exc_info:
        ai_config.configure_ai_settings()

    assert "Unsupported EMBEDDING_PROVIDER" in str(exc_info.value)
