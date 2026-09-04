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
    prompt_t = int(db.query(func.sum(QueryLog.prompt_tokens)).scalar() or 0)
    completion_t = int(db.query(func.sum(QueryLog.completion_tokens)).scalar() or 0)
    hit_t = int(db.query(func.sum(QueryLog.cache_hit_tokens)).scalar() or 0)
    miss_t = int(db.query(func.sum(QueryLog.cache_miss_tokens)).scalar() or 0)
    return {
        "total_queries": total,
        "avg_latency_ms": round(float(avg_latency), 1),
        "avg_top_score": round(float(avg_score), 4),
        "feedback": {"up": up, "down": down},
        "doc_count": db.query(Document).count(),
        "chunk_count": db.query(Chunk).count(),
        "tokens": {
            "prompt": prompt_t,
            "completion": completion_t,
            "cache_hit": hit_t,
            "cache_miss": miss_t,
            "cache_hit_rate": round(hit_t / (hit_t + miss_t), 4) if hit_t + miss_t > 0 else None,
        },
    }


@router.get("/trends")
def trends(request: Request, days: int = 7):
    db = request.app.state.db()
    since = datetime.utcnow() - timedelta(days=days - 1)
    rows = (
        db.query(
            QueryLog.created_at,
            QueryLog.latency_ms,
            QueryLog.prompt_tokens,
            QueryLog.cache_hit_tokens,
            QueryLog.cache_miss_tokens,
        )
        .filter(QueryLog.created_at >= since)
        .all()
    )
    buckets: dict[str, list[tuple]] = {}
    for created_at, latency, prompt_t, hit_t, miss_t in rows:
        key = created_at.strftime("%m-%d")
        buckets.setdefault(key, []).append((latency, prompt_t, hit_t, miss_t))

    out = []
    for i in range(days):
        day = since + timedelta(days=i)
        key = day.strftime("%m-%d")
        items = buckets.get(key, [])
        hit_sum = sum(h for _, _, h, _ in items)
        miss_sum = sum(m for _, _, _, m in items)
        out.append(
            {
                "date": key,
                "queries": len(items),
                "avg_latency": round(sum(lat for lat, _, _, _ in items) / len(items), 1)
                if items
                else 0.0,
                "prompt_tokens": sum(p for _, p, _, _ in items),
                "cache_hit_rate": round(hit_sum / (hit_sum + miss_sum), 4)
                if hit_sum + miss_sum > 0
                else None,
            }
        )
    return out
