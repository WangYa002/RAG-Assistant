from app.core.db import init_db, get_session
from app.models.entities import QueryLog, Conversation, Message


def seed_logs(client):
    init_db(client.app.state.settings)
    db = next(get_session())
    for i in range(3):
        db.add(QueryLog(question=f"q{i}", latency_ms=100.0 + i * 100, top_score=0.5))
    conv = Conversation(title="t")
    db.add(conv)
    db.commit()
    db.add(Message(conversation_id=conv.id, role="assistant", content="答", citations_json="[]", rating="up"))
    db.add(Message(conversation_id=conv.id, role="assistant", content="答2", citations_json="[]", rating="down"))
    db.commit()


def test_analytics_overview(client):
    seed_logs(client)
    body = client.get("/api/analytics/overview").json()
    assert body["total_queries"] == 3
    assert body["avg_latency_ms"] == 200.0
    assert body["feedback"] == {"up": 1, "down": 1}


def test_analytics_trends(client):
    seed_logs(client)
    trends = client.get("/api/analytics/trends").json()
    assert len(trends) == 7
    assert sum(t["queries"] for t in trends) == 3


def test_settings_model_roundtrip_and_mask(client):
    res = client.put("/api/settings/model", json={"llm_api_key": "sk-1234567890", "llm_model": "deepseek-chat"})
    assert res.status_code == 200
    got = client.get("/api/settings/model").json()
    assert got["llm_api_key"] == "******7890"  # 脱敏：只露后 4 位
    assert got["mock_mode"] is False  # 保存后热生效，切到真实模型

    # 回传脱敏值时不得覆盖真实 Key
    client.put("/api/settings/model", json={"llm_api_key": "******7890", "llm_model": "deepseek-chat"})
    assert client.get("/api/settings/model").json()["llm_api_key"] == "******7890"


def test_model_test_endpoint_mock(client):
    body = client.post("/api/settings/model/test").json()
    assert body["ok"] is True
    assert "Mock" in body["detail"]


def test_finetune_export(client):
    seed_logs(client)
    body = client.post("/api/finetune/export").json()
    assert "jsonl" in body and "yaml" in body
    assert "lora" in body["yaml"].lower()
