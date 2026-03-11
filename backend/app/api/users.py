from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os

from .. import auth, models
from ..database import get_db

router = APIRouter()

class UserCreate(auth.TokenData):
    password: str

class UserProfileResponse(BaseModel):
    id: str
    email: str
    nickname: Optional[str] = None
    profile_picture_url: Optional[str] = None

class UserProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    profile_picture_url: Optional[str] = None
    password: Optional[str] = None

@router.post("/register", response_model=auth.Token)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = auth.create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=auth.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserProfileResponse)
def get_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "nickname": current_user.nickname,
        "profile_picture_url": current_user.profile_picture_url
    }

@router.put("/me", response_model=UserProfileResponse)
def update_user_profile(update_data: UserProfileUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if update_data.nickname is not None:
        current_user.nickname = update_data.nickname
    if update_data.profile_picture_url is not None:
        current_user.profile_picture_url = update_data.profile_picture_url
    if update_data.password is not None and update_data.password.strip() != "":
        current_user.hashed_password = auth.get_password_hash(update_data.password)

    db.commit()
    db.refresh(current_user)
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "nickname": current_user.nickname,
        "profile_picture_url": current_user.profile_picture_url
    }

@router.post("/me/avatar", response_model=UserProfileResponse)
def upload_user_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    ext = file.filename.split('.')[-1]
    filename = f"{current_user.id}.{ext}"
    filepath = os.path.join("uploads", "avatars", filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    # We store a relative URL. The frontend handles adding the base API URL depending on its needs, or we just store an absolute path mapping to our static mount.
    url = f"http://localhost:8000/uploads/avatars/{filename}"
    current_user.profile_picture_url = url

    db.commit()
    db.refresh(current_user)

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "nickname": current_user.nickname,
        "profile_picture_url": current_user.profile_picture_url
    }
