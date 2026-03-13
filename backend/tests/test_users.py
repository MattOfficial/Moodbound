from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api import users as users_api


def make_avatar_upload(*, filename: str, content_type: str, content: bytes):
    return SimpleNamespace(
        filename=filename,
        content_type=content_type,
        file=BytesIO(content),
    )


def test_register_user_creates_account_and_returns_token(monkeypatch, fake_db_session):
    monkeypatch.setattr(users_api.auth, "get_password_hash", lambda password: f"hashed::{password}")
    monkeypatch.setattr(users_api.auth, "create_access_token", lambda data: f"token::{data['sub']}")

    response = users_api.register_user(
        users_api.UserCreate(email="new.reader@example.com", password="secret123"),
        db=fake_db_session,
    )

    created_user = next(user for user in fake_db_session.users.values() if user.email == "new.reader@example.com")

    assert response == {"access_token": f"token::{created_user.id}", "token_type": "bearer"}
    assert created_user.hashed_password == "hashed::secret123"


def test_register_user_rejects_duplicate_email(fake_db_session, fake_user):
    with pytest.raises(HTTPException) as exc_info:
        users_api.register_user(
            users_api.UserCreate(email=fake_user.email, password="duplicate"),
            db=fake_db_session,
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Email already registered"


def test_login_for_access_token_returns_token_for_valid_credentials(monkeypatch, fake_db_session, fake_user):
    monkeypatch.setattr(users_api.auth, "verify_password", lambda plain, hashed: plain == "secret123" and hashed == fake_user.hashed_password)
    monkeypatch.setattr(users_api.auth, "create_access_token", lambda data: "issued-token")

    response = users_api.login_for_access_token(
        form_data=SimpleNamespace(username=fake_user.email, password="secret123"),
        db=fake_db_session,
    )

    assert response == {"access_token": "issued-token", "token_type": "bearer"}


def test_login_for_access_token_rejects_invalid_credentials(monkeypatch, fake_db_session, fake_user):
    monkeypatch.setattr(users_api.auth, "verify_password", lambda _plain, _hashed: False)

    with pytest.raises(HTTPException) as exc_info:
        users_api.login_for_access_token(
            form_data=SimpleNamespace(username=fake_user.email, password="wrong"),
            db=fake_db_session,
        )

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Incorrect email or password"


def test_get_user_profile_returns_serialized_current_user(fake_user):
    response = users_api.get_user_profile(current_user=fake_user)

    assert response == {
        "id": str(fake_user.id),
        "email": fake_user.email,
        "nickname": fake_user.nickname,
        "profile_picture_url": fake_user.profile_picture_url,
    }


def test_update_user_profile_updates_nickname_url_and_password(monkeypatch, fake_db_session, fake_user):
    monkeypatch.setattr(users_api.auth, "get_password_hash", lambda password: f"hashed::{password}")

    response = users_api.update_user_profile(
        update_data=users_api.UserProfileUpdate(
            nickname="Vibe Reader",
            profile_picture_url="http://cdn/avatar.png",
            password="newpass",
        ),
        db=fake_db_session,
        current_user=fake_user,
    )

    assert response["nickname"] == "Vibe Reader"
    assert response["profile_picture_url"] == "http://cdn/avatar.png"
    assert fake_user.hashed_password == "hashed::newpass"
    assert fake_db_session.operations[-2:] == ["commit", "refresh"]


def test_upload_user_avatar_rejects_non_images(fake_db_session, fake_user):
    with pytest.raises(HTTPException) as exc_info:
        users_api.upload_user_avatar(
            file=make_avatar_upload(
                filename="notes.txt",
                content_type="text/plain",
                content=b"not an image",
            ),
            db=fake_db_session,
            current_user=fake_user,
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "File must be an image"


def test_upload_user_avatar_saves_file_and_updates_profile(monkeypatch, tmp_path, fake_db_session, fake_user):
    avatar_path = tmp_path / f"{fake_user.id}.png"
    avatar_path_str = str(avatar_path)
    monkeypatch.setattr(users_api.os.path, "join", lambda *_parts: avatar_path_str)

    response = users_api.upload_user_avatar(
        file=make_avatar_upload(
            filename="portrait.png",
            content_type="image/png",
            content=b"image-bytes",
        ),
        db=fake_db_session,
        current_user=fake_user,
    )

    assert avatar_path.read_bytes() == b"image-bytes"
    assert response["profile_picture_url"] == f"http://localhost:8000/uploads/avatars/{fake_user.id}.png"
    assert fake_user.profile_picture_url == response["profile_picture_url"]
