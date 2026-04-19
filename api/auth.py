import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

from models import User, UserRole

SECRET_KEY = "mm-project-governance-secret-2024-xK9pL3mQ"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8
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


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def seed_default_users(session) -> None:
    defaults = [
        {"username": "superadmin", "email": "superadmin@mm.com", "password": "Super@MM2024", "role": UserRole.SUPER_ADMIN},
        {"username": "admin",      "email": "admin@mm.com",      "password": "Admin@MM2024", "role": UserRole.ADMIN},
    ]
    for u in defaults:
        existing = session.query(User).filter_by(username=u["username"]).first()
        if not existing:
            session.add(User(
                username=u["username"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
            ))
    session.commit()
