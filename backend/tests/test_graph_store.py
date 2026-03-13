from app import graph_store


def test_get_triplets_for_characters_scopes_query_to_user_id(monkeypatch):
    captured: dict[str, object] = {}

    class FakeSession:
        def run(self, query: str, **params):
            captured["query"] = query
            captured["params"] = params
            return [
                {"source": "Alice", "rel": "ALLY", "target": "Bob"},
            ]

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeDriver:
        def session(self):
            return FakeSession()

    monkeypatch.setattr(graph_store, "_get_driver", lambda: FakeDriver())

    triplets = graph_store.get_triplets_for_characters(["Alice"], user_id="user-123")

    assert triplets == ["Alice -[ALLY]-> Bob"]
    assert captured["params"] == {"names": ["Alice"], "user_id": "user-123"}
    assert "a.user_id = $user_id" in captured["query"]
    assert "b.user_id = $user_id" in captured["query"]
    assert "r.user_id = $user_id" in captured["query"]
