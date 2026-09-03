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
