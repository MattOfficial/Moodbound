from app import graph_store


def test_get_driver_caches_neo4j_driver(monkeypatch):
    created: list[tuple[str, tuple[str, str]]] = []

    class FakeGraphDatabase:
        @staticmethod
        def driver(uri: str, auth: tuple[str, str]):
            created.append((uri, auth))
            return object()

    monkeypatch.setattr(graph_store, "_driver", None)
    monkeypatch.setattr(graph_store, "GraphDatabase", FakeGraphDatabase)

    driver_one = graph_store._get_driver()
    driver_two = graph_store._get_driver()

    assert driver_one is driver_two
    assert created == [(graph_store.NEO4J_URI, (graph_store.NEO4J_USER, graph_store.NEO4J_PASSWORD))]


def test_write_triplets_skips_blank_nodes_and_persists_valid_relationships(monkeypatch):
    calls: list[dict[str, str]] = []

    class FakeTransaction:
        def run(self, query: str, **params):
            calls.append(params)

    class FakeSession:
        def execute_write(self, callback):
            callback(FakeTransaction())

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeDriver:
        def session(self):
            return FakeSession()

    monkeypatch.setattr(graph_store, "_get_driver", lambda: FakeDriver())

    graph_store.write_triplets(
        document_id="doc-1",
        user_id="user-1",
        triplets=[
            {"source": "Nephy", "relationship": "ally", "target": "Zagan"},
            {"source": "", "relationship": "ally", "target": "Ignored"},
            {"source": "Ignored", "relationship": "ally", "target": ""},
        ],
    )

    assert calls == [
        {
            "source": "Nephy",
            "target": "Zagan",
            "rel": "ally",
            "doc_id": "doc-1",
            "user_id": "user-1",
        }
    ]


def test_get_graph_builds_unique_nodes_and_edges(monkeypatch):
    class FakeSession:
        def run(self, query: str, **params):
            return [
                {"source": "Nephy", "relationship": "ally", "target": "Zagan"},
                {"source": "Zagan", "relationship": "protects", "target": "Nephy"},
            ]

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeDriver:
        def session(self):
            return FakeSession()

    monkeypatch.setattr(graph_store, "_get_driver", lambda: FakeDriver())

    graph = graph_store.get_graph(document_id="doc-2", user_id="user-2")

    assert graph["nodes"] == [
        {"id": "Nephy", "label": "Nephy"},
        {"id": "Zagan", "label": "Zagan"},
    ]
    assert graph["edges"] == [
        {"source": "Nephy", "target": "Zagan", "label": "ally"},
        {"source": "Zagan", "target": "Nephy", "label": "protects"},
    ]


def test_delete_graph_executes_scoped_detach_delete(monkeypatch):
    captured: dict[str, object] = {}

    class FakeSession:
        def run(self, query: str, **params):
            captured["query"] = query
            captured["params"] = params

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeDriver:
        def session(self):
            return FakeSession()

    monkeypatch.setattr(graph_store, "_get_driver", lambda: FakeDriver())

    graph_store.delete_graph(document_id="doc-3", user_id="user-3")

    assert "DETACH DELETE c" in captured["query"]
    assert captured["params"] == {"doc_id": "doc-3", "user_id": "user-3"}


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
