from sqlmodel import create_engine, Session, SQLModel
import os

_db_url = os.getenv("DATABASE_URL", "postgresql:///steering_db")
DATABASE_URL = _db_url.replace("postgres://", "postgresql://", 1) if _db_url.startswith("postgres://") else _db_url

engine = create_engine(DATABASE_URL)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
