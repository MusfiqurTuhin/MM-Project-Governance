from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from .database import get_session
from .models import User, UserRole

SECRET_KEY = "mm-project-governance-secret-2024-xK9pL3mQ"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
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
    except JWTError:
        raise credentials_exc

    user = session.exec(select(User).where(User.username == username)).first()
    if not user or not user.is_active:
        raise credentials_exc
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Both admin and super_admin can access."""
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Only super_admin can access."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can perform this action",
        )
    return current_user


def seed_default_users(session: Session):
    """Create default users if they don't exist."""
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
