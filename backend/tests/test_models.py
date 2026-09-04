from datetime import datetime

from app.core.db import init_db, get_session
from app.models.entities import Document, Message, Conversation, QueryLog


def test_models_roundtrip(settings):
    init_db(settings)
    db = next(get_session())
    doc = Document(filename="a.md", ext="md", size=10, status="ready", chunk_count=2)
    db.add(doc)
    db.commit()

    conv = Conversation(title="测试会话")
    db.add(conv)
    db.commit()
    db.add(
        Message(
            conversation_id=conv.id,
            role="assistant",
            content="回答",
            citations_json="[]",
        )
    )
    db.add(QueryLog(question="q", latency_ms=12.5, top_score=0.8))
    db.commit()

    got = db.query(Document).first()
    assert got.filename == "a.md"
    assert isinstance(got.created_at, datetime)

    msg = db.query(Message).first()
    assert msg.conversation_id == conv.id
    assert db.query(QueryLog).count() == 1


def test_query_log_token_columns_migration(tmp_path):
    """旧库升级：缺 token 列时 init_db 必须自动补列，不丢数据。"""
    import sqlite3

    from app.core.config import Settings
    from app.core.db import init_db, get_session

    s = Settings(data_dir=str(tmp_path / "d"), llm_api_key="", embedding_provider="mock")
    (tmp_path / "d").mkdir(parents=True)
    con = sqlite3.connect(tmp_path / "d" / "app.db")
    con.execute(
        "CREATE TABLE query_logs (id INTEGER PRIMARY KEY, question TEXT, "
        "latency_ms FLOAT, top_score FLOAT, created_at DATETIME)"
    )
    con.execute("INSERT INTO query_logs (question, latency_ms, top_score) VALUES ('旧记录', 5.0, 0.4)")
    con.commit()
    con.close()

    init_db(s)
    db = next(get_session())
    db.add(
        QueryLog(
            question="新记录", latency_ms=1.0, top_score=0.5,
            prompt_tokens=10, completion_tokens=3, cache_hit_tokens=4, cache_miss_tokens=6,
        )
    )
    db.commit()
    rows = db.query(QueryLog).all()
    assert len(rows) == 2
    new = next(r for r in rows if r.question == "新记录")
    assert new.prompt_tokens == 10 and new.cache_hit_tokens == 4
    old = next(r for r in rows if r.question == "旧记录")
    assert old.prompt_tokens == 0  # 旧数据补列后默认 0
