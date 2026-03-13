from app import vector_store


def test_get_qdrant_client_uses_module_host_and_port(monkeypatch):
    captured: dict[str, object] = {}

    class FakeClient:
        def __init__(self, *, host, port):
            captured["host"] = host
            captured["port"] = port

    monkeypatch.setattr(vector_store, "QDRANT_HOST", "10.0.0.8")
    monkeypatch.setattr(vector_store, "QDRANT_PORT", 7000)
    monkeypatch.setattr(vector_store.qdrant_client, "QdrantClient", FakeClient)

    vector_store.get_qdrant_client()

    assert captured == {"host": "10.0.0.8", "port": 7000}


def test_get_vector_store_wraps_client_with_hybrid_mode(monkeypatch):
    captured: dict[str, object] = {}

    class FakeVectorStore:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(vector_store, "get_qdrant_client", lambda: "client")
    monkeypatch.setattr(vector_store, "QdrantVectorStore", FakeVectorStore)

    vector_store.get_vector_store()

    assert captured == {
        "client": "client",
        "collection_name": vector_store.COLLECTION_NAME,
        "enable_hybrid": True,
    }


def test_build_metadata_filters_includes_optional_document_and_filename():
    filters = vector_store._build_metadata_filters(
        user_id="user-1",
        document_id="doc-9",
        filename="novel.pdf",
    )

    assert [(item.key, item.value) for item in filters.filters] == [
        ("user_id", "user-1"),
        ("document_id", "doc-9"),
        ("filename", "novel.pdf"),
    ]


def test_delete_document_vectors_returns_early_when_collection_missing(monkeypatch):
    class FakeClient:
        def collection_exists(self, *, collection_name):
            return False

    monkeypatch.setattr(vector_store, "get_qdrant_client", lambda: FakeClient())

    vector_store.delete_document_vectors(document_id="doc-1", user_id="user-1")


def test_delete_document_vectors_cleans_document_and_legacy_filename(monkeypatch):
    deleted_filters: list[object] = []

    class FakeClient:
        def collection_exists(self, *, collection_name):
            return True

    class FakeVectorStore:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def delete_nodes(self, *, filters):
            deleted_filters.append(filters)

    monkeypatch.setattr(vector_store, "get_qdrant_client", lambda: FakeClient())
    monkeypatch.setattr(vector_store, "QdrantVectorStore", FakeVectorStore)

    vector_store.delete_document_vectors(
        document_id="doc-7",
        user_id="user-2",
        legacy_filename="legacy.epub",
    )

    assert len(deleted_filters) == 2
    assert [(item.key, item.value) for item in deleted_filters[0].filters] == [
        ("user_id", "user-2"),
        ("document_id", "doc-7"),
    ]
    assert [(item.key, item.value) for item in deleted_filters[1].filters] == [
        ("user_id", "user-2"),
        ("filename", "legacy.epub"),
    ]
