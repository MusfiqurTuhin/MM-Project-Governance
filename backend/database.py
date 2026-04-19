from sqlmodel import create_engine, Session, SQLModel
import os

_db_url = os.getenv("DATABASE_URL", "postgresql+psycopg:///steering_db")
DATABASE_URL = _db_url.replace("postgresql://", "postgresql+psycopg://", 1) if _db_url.startswith("postgresql://") else _db_url

engine = create_engine(DATABASE_URL)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
