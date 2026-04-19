from sqlmodel import create_engine, Session, SQLModel
import os

_db_url = os.getenv("DATABASE_URL", "postgresql+pg8000:///steering_db")

# Normalise URL scheme for pg8000 driver
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+pg8000://", 1)
elif _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+pg8000://", 1)

# pg8000 uses connect_args for SSL, strip query params and add via connect_args
import urllib.parse as _up
_parsed = _up.urlparse(_db_url)
_qs = dict(_up.parse_qsl(_parsed.query))
_clean_url = _db_url.split("?")[0]

_connect_args = {}
if _qs.get("sslmode") == "require":
    import ssl as _ssl
    _ctx = _ssl.create_default_context()
    _ctx.check_hostname = False
    _ctx.verify_mode = _ssl.CERT_NONE
    _connect_args["ssl_context"] = _ctx

engine = create_engine(_clean_url, connect_args=_connect_args)


def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
