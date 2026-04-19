import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from database import get_session
from models import User, UserRole

SECRET_KEY = "mm-project-governance-secret-2024-xK9pL3mQ"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

ITERATIONS = 260000


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS).hex()
    return f"pbkdf2:sha256:{ITERATIONS}:{salt}:{key}"


def verify_password(plain: str, hashed: str) -> bool:
    try:
        _, _, iters, salt, key = hashed.split(":")
        expected = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), int(iters)).hex()
        return hmac.compare_digest(expected, key)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise credentials_exc
    except jwt.PyJWTError:
        raise credentials_exc

    user = session.exec(select(User).where(User.username == username)).first()
    if not user or not user.is_active:
        raise credentials_exc
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only super admins can perform this action")
    return current_user


def seed_default_users(session: Session):
    defaults = [
        {"username": "superadmin", "email": "superadmin@mm.com", "password": "Super@MM2024", "role": UserRole.SUPER_ADMIN},
        {"username": "admin",      "email": "admin@mm.com",      "password": "Admin@MM2024", "role": UserRole.ADMIN},
    ]
    for u in defaults:
        existing = session.exec(select(User).where(User.username == u["username"])).first()
        if not existing:
            session.add(User(
                username=u["username"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
            ))
    session.commit()
