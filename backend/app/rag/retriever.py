from rank_bm25 import BM25Okapi


def tokenize(text: str) -> list[str]:
    """中文友好分词：过滤非字母数字后取字符 bigram，兼顾中英文。"""
    t = "".join(ch for ch in text if ch.isalnum())
    if len(t) <= 1:
        return [t] if t else []
    return [t[i : i + 2] for i in range(len(t) - 1)]


def rrf_fuse(list_a: list[dict], list_b: list[dict], k: int = 60) -> list[dict]:
    """Reciprocal Rank Fusion：融合两路检索结果，双方都靠前的排最前。"""
    scores: dict[str, float] = {}
    by_id: dict[str, dict] = {}
    sources: dict[str, set] = {}
    order: dict[str, int] = {}

    for tag, lst in (("vector", list_a), ("bm25", list_b)):
        for rank, hit in enumerate(lst):
            cid = hit["id"]
            scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
            by_id.setdefault(cid, dict(hit))
            sources.setdefault(cid, set()).add(tag)
            order.setdefault(cid, len(order))

    fused = []
    for cid in sorted(scores, key=lambda c: (-scores[c], order[c])):
        hit = by_id[cid]
        hit["score"] = scores[cid]
        src = sources[cid]
        hit["source"] = "rrf" if len(src) > 1 else src.pop()
        fused.append(hit)
    return fused


class Retriever:
    """混合检索：向量 Top-K + BM25 Top-K → RRF 融合 → 截断 final_k。"""

    def __init__(self, vector_store, chunks_provider):
        self.vs = vector_store
        self.chunks_provider = chunks_provider

    def search(self, question: str, top_k: int = 8, final_k: int = 4) -> list[dict]:
        vec_hits = self.vs.query(question, top_k=top_k)
        bm_hits = self._bm25_search(self.chunks_provider(), question, top_k)
        return rrf_fuse(vec_hits, bm_hits)[:final_k]

    def _bm25_search(self, corpus: list[dict], question: str, top_k: int) -> list[dict]:
        if not corpus:
            return []
        bm25 = BM25Okapi([tokenize(c["text"]) for c in corpus])
        scores = bm25.get_scores(tokenize(question))
        ranked = sorted(zip(corpus, scores), key=lambda x: x[1], reverse=True)
        return [{**c, "score": float(s)} for c, s in ranked[:top_k] if s > 0]
