from __future__ import annotations

import sys
import uuid
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models


class FakeQuery:
    def __init__(self, session: "FakeSession", model: type[models.User] | type[models.Document]):
        self.session = session
        self.model = model
        self.criteria = ()

    def filter(self, *criteria):
        self.criteria = criteria
        return self

    def order_by(self, *_args, **_kwargs):
        return self

    def all(self):
        records = self._records()
        return sorted(records, key=lambda record: record.created_at, reverse=True)

    def first(self):
        for record in self._records():
            if self._matches(record):
                return record
        return None

    def _records(self):
        if self.model is models.Document:
            return list(self.session.documents.values())
        if self.model is models.User:
            return list(self.session.users.values())
        return []

    def _matches(self, record) -> bool:
        for criterion in self.criteria:
            column_name = getattr(getattr(criterion, "left", None), "name", None)
            expected = getattr(getattr(criterion, "right", None), "value", None)
            if column_name is None:
                continue
            if getattr(record, column_name) != expected:
                return False
        return True


class FakeSession:
    def __init__(self):
        self.documents: dict[uuid.UUID, models.Document] = {}
        self.users: dict[uuid.UUID, models.User] = {}
        self.operations: list[str] = []

    def add(self, instance):
        self.operations.append("add")
        if isinstance(instance, models.Document):
            self.documents[instance.id] = instance
        elif isinstance(instance, models.User):
            self.users[instance.id] = instance

    def commit(self):
        self.operations.append("commit")

    def refresh(self, _instance):
        self.operations.append("refresh")

    def delete(self, instance):
        self.operations.append("delete")
        if isinstance(instance, models.Document):
            self.documents.pop(instance.id, None)
        elif isinstance(instance, models.User):
            self.users.pop(instance.id, None)

    def query(self, model):
        return FakeQuery(self, model)


@pytest.fixture
def fake_db_session():
    return FakeSession()


@pytest.fixture
def fake_user(fake_db_session: FakeSession):
    user = models.User(
        id=uuid.uuid4(),
        email="reader@example.com",
        hashed_password="hashed-password",
    )
    fake_db_session.users[user.id] = user
    return user
