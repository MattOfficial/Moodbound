import pytest
from fastapi import HTTPException

from app.api import graph as graph_api


def test_get_document_graph_colors_known_relationships(monkeypatch, fake_user):
    monkeypatch.setattr(
        graph_api,
        "get_graph",
        lambda document_id, user_id: {
            "nodes": [{"id": "Nephy", "label": "Nephy"}, {"id": "Zagan", "label": "Zagan"}],
            "edges": [{"source": "Nephy", "target": "Zagan", "label": "ally"}],
        },
    )

    response = graph_api.get_document_graph("doc-1", current_user=fake_user)

    assert response["edges"][0]["color"] == "#22c55e"


def test_get_document_graph_returns_empty_message_when_no_nodes(monkeypatch, fake_user):
    monkeypatch.setattr(
        graph_api,
        "get_graph",
        lambda document_id, user_id: {"nodes": [], "edges": []},
    )

    response = graph_api.get_document_graph("doc-1", current_user=fake_user)

    assert response == {
        "nodes": [],
        "edges": [],
        "message": "No character relationships found for this document.",
    }


def test_get_document_graph_wraps_graph_errors(monkeypatch, fake_user):
    monkeypatch.setattr(
        graph_api,
        "get_graph",
        lambda document_id, user_id: (_ for _ in ()).throw(RuntimeError("neo4j unavailable")),
    )

    with pytest.raises(HTTPException) as exc_info:
        graph_api.get_document_graph("doc-1", current_user=fake_user)

    assert exc_info.value.status_code == 500
    assert "neo4j unavailable" in exc_info.value.detail
