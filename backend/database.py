from sqlmodel import create_engine, Session, SQLModel
import os

_db_url = os.getenv("DATABASE_URL", "postgresql+pg8000:///steering_db")
DATABASE_URL = _db_url.replace("postgresql://", "postgresql+pg8000://", 1).replace("postgres://", "postgresql+pg8000://", 1) if ("postgresql://" in _db_url or "postgres://" in _db_url) else _db_url

engine = create_engine(DATABASE_URL)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
