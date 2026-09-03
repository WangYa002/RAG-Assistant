from datetime import datetime, timedelta

from fastapi import APIRouter, Request
from sqlalchemy import func

from ..models.entities import Chunk, Document, Message, QueryLog

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
def overview(request: Request):
    db = request.app.state.db()
    total = db.query(QueryLog).count()
    avg_latency = db.query(func.avg(QueryLog.latency_ms)).scalar() or 0.0
    avg_score = db.query(func.avg(QueryLog.top_score)).scalar() or 0.0
    up = db.query(Message).filter(Message.rating == "up").count()
    down = db.query(Message).filter(Message.rating == "down").count()
    return {
        "total_queries": total,
        "avg_latency_ms": round(float(avg_latency), 1),
        "avg_top_score": round(float(avg_score), 4),
        "feedback": {"up": up, "down": down},
        "doc_count": db.query(Document).count(),
        "chunk_count": db.query(Chunk).count(),
    }


@router.get("/trends")
def trends(request: Request, days: int = 7):
    db = request.app.state.db()
    since = datetime.utcnow() - timedelta(days=days - 1)
    rows = (
        db.query(QueryLog.created_at, QueryLog.latency_ms)
        .filter(QueryLog.created_at >= since)
        .all()
    )
    buckets: dict[str, list[float]] = {}
    for created_at, latency in rows:
        key = created_at.strftime("%m-%d")
        buckets.setdefault(key, []).append(latency)

    out = []
    for i in range(days):
        day = since + timedelta(days=i)
        key = day.strftime("%m-%d")
        latencies = buckets.get(key, [])
        out.append(
            {
                "date": key,
                "queries": len(latencies),
                "avg_latency": round(sum(latencies) / len(latencies), 1)
                if latencies
                else 0.0,
            }
        )
    return out
