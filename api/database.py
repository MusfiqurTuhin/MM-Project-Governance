import os
import ssl
import urllib.parse as up
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

_raw = os.getenv("DATABASE_URL", "postgresql+pg8000:///steering_db")
if _raw.startswith("postgres://"):
    _raw = _raw.replace("postgres://", "postgresql+pg8000://", 1)
elif _raw.startswith("postgresql://"):
    _raw = _raw.replace("postgresql://", "postgresql+pg8000://", 1)

_qs = dict(up.parse_qsl(up.urlparse(_raw).query))
_clean = _raw.split("?")[0]

_connect_args = {}
if _qs.get("sslmode") == "require":
    _ctx = ssl.create_default_context()
    _ctx.check_hostname = False
    _ctx.verify_mode = ssl.CERT_NONE
    _connect_args["ssl_context"] = _ctx

engine = create_engine(_clean, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass
