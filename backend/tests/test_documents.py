import asyncio
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
import uuid

import pytest
from fastapi import HTTPException

from app.api import documents as documents_api
from app.models import Document


def make_upload_file(
    *,
    filename: str = "novel.pdf",
    content_type: str = "application/pdf",
    content: bytes = b"chapter one",
):
    return SimpleNamespace(
        filename=filename,
        content_type=content_type,
        file=BytesIO(content),
    )


def test_upload_document_stores_unique_file_path_and_original_filename(
    monkeypatch,
    tmp_path,
    fake_db_session,
    fake_user,
):
    monkeypatch.setattr(documents_api, "UPLOAD_DIR", str(tmp_path))
    enqueued_jobs: list[tuple[str, str]] = []

    class FakeRedis:
        async def enqueue_job(self, job_name: str, document_id: str):
            enqueued_jobs.append((job_name, document_id))

    async def fake_create_pool(_settings):
        return FakeRedis()

    monkeypatch.setattr(documents_api, "create_pool", fake_create_pool)

    upload = make_upload_file(filename="..\\novel.PDF", content=b"melancholy vibes")

    response = asyncio.run(
        documents_api.upload_document(
            file=upload,
            genre="Fantasy",
            db=fake_db_session,
            current_user=fake_user,
        )
    )

    saved_document = next(iter(fake_db_session.documents.values()))

    assert response["document_id"] == saved_document.id
    assert response["status"] == "Pending"
    assert saved_document.filename == "novel.PDF"
    assert Path(saved_document.file_path).name == f"{saved_document.id}.pdf"
    assert Path(saved_document.file_path).read_bytes() == b"melancholy vibes"
    assert enqueued_jobs == [("process_document", str(saved_document.id))]


def test_upload_document_marks_document_failed_when_queue_dispatch_fails(
    monkeypatch,
    tmp_path,
    fake_db_session,
    fake_user,
):
    monkeypatch.setattr(documents_api, "UPLOAD_DIR", str(tmp_path))

    async def fake_create_pool(_settings):
        raise RuntimeError("redis unavailable")

    monkeypatch.setattr(documents_api, "create_pool", fake_create_pool)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            documents_api.upload_document(
                file=make_upload_file(content=b"queued content"),
                genre="Fantasy",
                db=fake_db_session,
                current_user=fake_user,
            )
        )

    saved_document = next(iter(fake_db_session.documents.values()))

    assert exc_info.value.status_code == 503
    assert saved_document.status == "Failed"
    assert "background processing could not be queued" in exc_info.value.detail


def test_delete_document_removes_external_data_before_deleting_db_row(
    monkeypatch,
    tmp_path,
    fake_db_session,
    fake_user,
):
    file_path = tmp_path / "stored.pdf"
    file_path.write_bytes(b"already ingested")

    document = Document(
        id=uuid.uuid4(),
        user_id=fake_user.id,
        filename="original.pdf",
        content_type="application/pdf",
        file_path=str(file_path),
        status="Completed",
        genre="Fantasy",
    )
    fake_db_session.documents[document.id] = document

    call_order: list[str] = []
    vector_calls: list[tuple[str, str, str | None]] = []
    graph_calls: list[tuple[str, str]] = []

    def fake_delete_document_vectors(*, document_id: str, user_id: str, legacy_filename: str | None):
        call_order.append("vectors")
        vector_calls.append((document_id, user_id, legacy_filename))

    def fake_delete_graph(document_id: str, user_id: str):
        call_order.append("graph")
        graph_calls.append((document_id, user_id))

    monkeypatch.setattr(documents_api, "delete_document_vectors", fake_delete_document_vectors)
    monkeypatch.setattr(documents_api, "delete_graph", fake_delete_graph)

    response = documents_api.delete_document(
        document_id=str(document.id),
        db=fake_db_session,
        current_user=fake_user,
    )

    assert response["message"] == f"Document '{document.filename}' deleted successfully."
    assert call_order == ["vectors", "graph"]
    assert vector_calls == [(str(document.id), str(fake_user.id), None)]
    assert graph_calls == [(str(document.id), str(fake_user.id))]
    assert not file_path.exists()
    assert document.id not in fake_db_session.documents
    assert fake_db_session.operations[-2:] == ["delete", "commit"]
