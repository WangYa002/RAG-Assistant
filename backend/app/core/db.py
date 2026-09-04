from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from ..models.entities import Base

_engine = None
_SessionLocal = None

# 旧库自动补列：{表: {列: DDL}}
_MIGRATIONS = {
    "query_logs": {
        "prompt_tokens": "INTEGER DEFAULT 0",
        "completion_tokens": "INTEGER DEFAULT 0",
        "cache_hit_tokens": "INTEGER DEFAULT 0",
        "cache_miss_tokens": "INTEGER DEFAULT 0",
    },
}


def _ensure_columns(engine) -> None:
    with engine.connect() as conn:
        for table, columns in _MIGRATIONS.items():
            rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
            if not rows:
                continue  # 表不存在（create_all 会新建）
            existing = {r[1] for r in rows}
            for col, ddl in columns.items():
                if col not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
        conn.commit()


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
    _ensure_columns(engine)


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
