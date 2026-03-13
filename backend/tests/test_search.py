import asyncio
import sys
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api import search as search_api


def test_search_vector_route_returns_scoped_results(monkeypatch, fake_user):
    captured: dict[str, object] = {}

    monkeypatch.setitem(
        sys.modules,
        "app.ai_config",
        SimpleNamespace(configure_ai_settings=lambda: captured.setdefault("configured", True)),
    )

    class FakeAgenticRouter:
        def __init__(self, llm):
            captured["router_llm"] = llm

        def route_query(self, query: str, topology, fallback: str):
            captured["route_query"] = (query, topology, fallback)
            return "Vector"

        def classify_vibe(self, query: str):
            captured["classified_query"] = query
            return "Melancholic"

    class FakeQueryEngine:
        def query(self, query: str):
            captured["engine_query"] = query
            class FakeResponse:
                source_nodes = [
                    SimpleNamespace(
                        node=SimpleNamespace(
                            text="Rain streaked across the carriage window.",
                            metadata={"filename": "storm.epub"},
                        ),
                        score=0.91,
                    )
                ]

                def __str__(self) -> str:
                    return "A melancholic train scene appears in storm.epub."

            return FakeResponse()

    class FakeIndex:
        def as_query_engine(self, **kwargs):
            captured["query_engine_kwargs"] = kwargs
            return FakeQueryEngine()

    class FakeVectorStoreIndex:
        @staticmethod
        def from_vector_store(*, vector_store):
            captured["vector_store"] = vector_store
            return FakeIndex()

    monkeypatch.setattr(search_api, "AgenticRouter", FakeAgenticRouter)
    monkeypatch.setattr(search_api, "VectorStoreIndex", FakeVectorStoreIndex)
    monkeypatch.setattr(search_api, "get_vector_store", lambda: "vector-store")
    monkeypatch.setattr(search_api, "Settings", SimpleNamespace(llm="router-llm"))

    response = asyncio.run(
        search_api.search_novels(
            search_query=search_api.SearchQuery(query="Find a rainy train scene"),
            current_user=fake_user,
        )
    )

    filters = captured["query_engine_kwargs"]["filters"]

    assert response["answer"] == "A melancholic train scene appears in storm.epub."
    assert response["sources"] == [
        {
            "text": "Rain streaked across the carriage window.",
            "score": 0.91,
            "filename": "storm.epub",
        }
    ]
    assert response["vibe"] == "Melancholic"
    assert response["engine"] == "qdrant-hybrid"
    assert captured["configured"] is True
    assert captured["vector_store"] == "vector-store"
    assert filters.filters[0].key == "user_id"
    assert filters.filters[0].value == str(fake_user.id)


def test_search_graph_route_returns_fallback_when_no_triplets(monkeypatch, fake_user):
    monkeypatch.setitem(
        sys.modules,
        "app.ai_config",
        SimpleNamespace(configure_ai_settings=lambda: None),
    )

    class FakeAgenticRouter:
        def __init__(self, llm):
            self.llm = llm

        def route_query(self, _query: str, topology, fallback: str):
            return "Graph"

    class FakeLLM:
        def complete(self, prompt: str):
            assert "Output ONLY a comma-separated list of names" in prompt
            return "Nephy, Zagan"

    monkeypatch.setattr(search_api, "AgenticRouter", FakeAgenticRouter)
    monkeypatch.setattr(search_api, "Settings", SimpleNamespace(llm=FakeLLM()))
    monkeypatch.setattr(search_api, "get_triplets_for_characters", lambda names, user_id: [])

    response = asyncio.run(
        search_api.search_novels(
            search_query=search_api.SearchQuery(query="Who is related to Nephy?"),
            current_user=fake_user,
        )
    )

    assert "Nephy and Zagan" in response["answer"]
    assert response["sources"] == []
    assert response["vibe"] == "Neutral"
    assert response["engine"] == "neo4j-graph"


def test_search_graph_route_returns_synthesized_graph_answer(monkeypatch, fake_user):
    monkeypatch.setitem(
        sys.modules,
        "app.ai_config",
        SimpleNamespace(configure_ai_settings=lambda: None),
    )

    class FakeAgenticRouter:
        def __init__(self, llm):
            self.llm = llm

        def route_query(self, _query: str, topology, fallback: str):
            return "Graph"

    class FakeLLM:
        def __init__(self):
            self.calls: list[str] = []

        def complete(self, prompt: str):
            self.calls.append(prompt)
            if len(self.calls) == 1:
                return "Ao, Ren"
            return "Ao betrayed Ren after learning the prophecy."

    fake_llm = FakeLLM()
    monkeypatch.setattr(search_api, "AgenticRouter", FakeAgenticRouter)
    monkeypatch.setattr(search_api, "Settings", SimpleNamespace(llm=fake_llm))
    monkeypatch.setattr(
        search_api,
        "get_triplets_for_characters",
        lambda names, user_id: ["Ao -[betrayed]-> Ren"],
    )

    response = asyncio.run(
        search_api.search_novels(
            search_query=search_api.SearchQuery(query="Who betrayed Ren?"),
            current_user=fake_user,
        )
    )

    assert response == {
        "answer": "Ao betrayed Ren after learning the prophecy.",
        "sources": [
            {
                "text": "Graph Cypher Extraction:\nAo -[betrayed]-> Ren",
                "score": 1.0,
                "filename": "Neo4j Knowledge Graph",
            }
        ],
        "vibe": "Mysterious",
        "engine": "neo4j-graph",
    }
    assert "Ao -[betrayed]-> Ren" in fake_llm.calls[1]


def test_search_wraps_failures_in_http_500(monkeypatch, fake_user):
    monkeypatch.setitem(
        sys.modules,
        "app.ai_config",
        SimpleNamespace(configure_ai_settings=lambda: (_ for _ in ()).throw(RuntimeError("bad config"))),
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            search_api.search_novels(
                search_query=search_api.SearchQuery(query="Why is the duke feared?"),
                current_user=fake_user,
            )
        )

    assert exc_info.value.status_code == 500
    assert "bad config" in exc_info.value.detail
