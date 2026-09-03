import json
import time

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..models.entities import Conversation, Document, Message, QueryLog
from ..rag.generator import build_prompt

router = APIRouter(prefix="/api", tags=["chat"])


class ChatBody(BaseModel):
    question: str
    conversation_id: int | None = None


class RatingBody(BaseModel):
    rating: str  # up | down


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
def chat_stream(body: ChatBody, request: Request):
    app = request.app
    settings = app.state.settings

    def event_stream():
        t0 = time.time()
        question = body.question.strip() or "（空问题）"

        hits = app.state.retriever.search(question, settings.top_k, settings.final_k)
        db = app.state.db()
        doc_names = {d.id: d.filename for d in db.query(Document).all()}
        citations = [
            {
                "index": i + 1,
                "doc_id": h["doc_id"],
                "filename": doc_names.get(h["doc_id"], "未知文档"),
                "idx": h["idx"],
                "text": h["text"],
                "score": round(h["score"], 4),
            }
            for i, h in enumerate(hits)
        ]
        yield sse("citations", {"hits": citations})

        messages = build_prompt(question, hits)
        if body.conversation_id:
            history = (
                db.query(Message)
                .filter(Message.conversation_id == body.conversation_id)
                .order_by(Message.id.desc())
                .limit(4)
                .all()
            )
            for m in reversed(history):
                messages.insert(1, {"role": m.role, "content": m.content[:500]})

        parts: list[str] = []
        try:
            for delta in app.state.llm.chat(messages, stream=True):
                parts.append(delta)
                yield sse("delta", {"text": delta})
        except Exception as exc:
            yield sse("error", {"code": "llm_error", "message": str(exc)})
            return
        answer = "".join(parts)

        conv = (
            db.get(Conversation, body.conversation_id)
            if body.conversation_id
            else None
        )
        if conv is None:
            conv = Conversation(title=question[:20])
            db.add(conv)
            db.commit()
        db.add(Message(conversation_id=conv.id, role="user", content=question))
        assistant = Message(
            conversation_id=conv.id,
            role="assistant",
            content=answer,
            citations_json=json.dumps(citations, ensure_ascii=False),
        )
        db.add(assistant)
        db.add(
            QueryLog(
                question=question,
                latency_ms=(time.time() - t0) * 1000,
                top_score=citations[0]["score"] if citations else 0.0,
            )
        )
        db.commit()
        yield sse("done", {"message_id": assistant.id, "conversation_id": conv.id})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/conversations")
def conversations(request: Request):
    db = request.app.state.db()
    convs = db.query(Conversation).order_by(Conversation.id.desc()).all()
    return [
        {"id": c.id, "title": c.title, "created_at": c.created_at.isoformat()}
        for c in convs
    ]


@router.get("/conversations/{conv_id}/messages")
def messages_of(conv_id: int, request: Request):
    db = request.app.state.db()
    msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conv_id)
        .order_by(Message.id.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "citations": json.loads(m.citations_json or "[]"),
            "rating": m.rating,
            "created_at": m.created_at.isoformat(),
        }
        for m in msgs
    ]


@router.post("/messages/{message_id}/rating")
def rate(message_id: int, body: RatingBody, request: Request):
    db = request.app.state.db()
    m = db.get(Message, message_id)
    if m is None:
        from ..core.errors import AppError

        raise AppError("not_found", "消息不存在", status=404)
    m.rating = body.rating
    db.commit()
    return {"ok": True, "rating": m.rating}
