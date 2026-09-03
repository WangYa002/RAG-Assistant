from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..models.entities import Base

_engine = None
_SessionLocal = None


def init_db(settings) -> None:
    global _engine, _SessionLocal
    db_file = Path(settings.data_dir) / "app.db"
    db_file.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        settings.sqlite_url, connect_args={"check_same_thread": False}
    )
    _engine = engine
    _SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)


def current_sessionmaker():
    if _SessionLocal is None:
        raise RuntimeError("数据库未初始化，请先调用 init_db()")
    return _SessionLocal


def get_session():
    db = current_sessionmaker()()
    try:
        yield db
    finally:
        db.close()
