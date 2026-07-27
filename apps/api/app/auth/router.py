from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.schemas import AuthResponse, LoginRequest, RegisterRequest
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User, UserProfile

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()
    db.add(UserProfile(user_id=user.id, context={}, guardian_enabled=True, location_mode="city"))
    db.commit()
    return AuthResponse(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return AuthResponse(access_token=create_access_token(str(user.id)))

