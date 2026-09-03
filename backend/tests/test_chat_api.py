import json


def seed_doc(client):
    res = client.post(
        "/api/documents/upload",
        files={"file": ("kb.md", ("# 知识库\n\nFastAPI 是一个现代 Python Web 框架。" * 20).encode("utf-8"), "text/markdown")},
    )
    assert res.status_code == 200


def parse_sse(text):
    """把 SSE 文本解析为 [(event, data_dict)] 列表。"""
    events = []
    cur_event, cur_data = None, []
    for line in text.splitlines():
        if line.startswith("event: "):
            cur_event = line[7:].strip()
        elif line.startswith("data: "):
            cur_data.append(line[6:])
        elif line == "" and cur_event is not None:
            events.append((cur_event, json.loads("\n".join(cur_data))))
            cur_event, cur_data = None, []
    return events


def test_chat_stream_full_chain(client):
    seed_doc(client)
    res = client.post("/api/chat/stream", json={"question": "FastAPI 是什么？"})
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")

    events = parse_sse(res.text)
    names = [e for e, _ in events]
    assert names[0] == "citations"
    assert names.count("delta") > 1
    assert names[-1] == "done"

    citations = events[0][1]["hits"]
    assert isinstance(citations, list) and len(citations) <= 4
    answer = "".join(d["text"] for e, d in events if e == "delta")
    assert answer  # Mock 也会给出非空回答

    done = events[-1][1]
    assert done["conversation_id"] and done["message_id"]


def test_conversation_history_and_rating(client):
    seed_doc(client)
    res = client.post("/api/chat/stream", json={"question": "介绍一下 FastAPI"})
    done = parse_sse(res.text)[-1][1]
    cid = done["conversation_id"]

    convs = client.get("/api/conversations").json()
    assert any(c["id"] == cid for c in convs)

    msgs = client.get(f"/api/conversations/{cid}/messages").json()
    assert [m["role"] for m in msgs] == ["user", "assistant"]

    mid = msgs[1]["id"]
    r = client.post(f"/api/messages/{mid}/rating", json={"rating": "up"})
    assert r.status_code == 200
    msgs = client.get(f"/api/conversations/{cid}/messages").json()
    assert msgs[1]["rating"] == "up"


def test_empty_kb_answer(client):
    res = client.post("/api/chat/stream", json={"question": "知识库里有什么？"})
    events = parse_sse(res.text)
    answer = "".join(d["text"] for e, d in events if e == "delta")
    assert "知识库" in answer  # 空库时的友好提示
