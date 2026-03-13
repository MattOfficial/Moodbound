import asyncio
from datetime import timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from jose import jwt

from app import auth


def test_password_hash_round_trip():
    hashed = auth.get_password_hash("moonlit-secret")

    assert hashed != "moonlit-secret"
    assert auth.verify_password("moonlit-secret", hashed) is True
    assert auth.verify_password("wrong-secret", hashed) is False


def test_create_access_token_encodes_subject_and_expiry():
    token = auth.create_access_token({"sub": "user-123"}, expires_delta=timedelta(minutes=5))
    payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])

    assert payload["sub"] == "user-123"
    assert "exp" in payload


def test_get_current_user_returns_user_for_valid_token(fake_user):
    token = auth.create_access_token({"sub": str(fake_user.id)})
    fake_db = SimpleNamespace(
        query=lambda model: SimpleNamespace(
            filter=lambda *criteria: SimpleNamespace(first=lambda: fake_user)
        )
    )

    current_user = asyncio.run(auth.get_current_user(token=token, db=fake_db))

    assert current_user is fake_user


def test_get_current_user_rejects_invalid_token(fake_db_session):
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(auth.get_current_user(token="invalid-token", db=fake_db_session))

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Could not validate credentials"


def test_get_current_user_rejects_missing_user():
    token = auth.create_access_token({"sub": "missing-user"})
    fake_db = SimpleNamespace(
        query=lambda model: SimpleNamespace(
            filter=lambda *criteria: SimpleNamespace(first=lambda: None)
        )
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(auth.get_current_user(token=token, db=fake_db))

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Could not validate credentials"
