import math
import zlib

from app.rag.retriever import Retriever, rrf_fuse


class StubEmbedder:
    """固定 512 维 CRC 桶向量：词面重叠越高相似度越高，可对排序做精确断言。"""

    name = "stub"
    DIM = 512

    def embed(self, texts):
        out = []
        for t in texts:
            v = [0.0] * self.DIM
            tokens = bigrams(t)
            for g in tokens:
                v[zlib.crc32(g.encode("utf-8")) % self.DIM] += 1.0
            n = math.sqrt(sum(x * x for x in v)) or 1.0
            out.append([x / n for x in v])
        return out


def bigrams(t):
    t = "".join(ch for ch in t if ch.isalnum())
    return [t[i : i + 2] for i in range(max(len(t) - 1, 1))] or [t]


CORPUS = [
    {"id": "c1", "doc_id": 1, "idx": 0, "text": "FastAPI 是一个用于构建 API 的现代 Python Web 框架，性能出色。"},
    {"id": "c2", "doc_id": 1, "idx": 1, "text": "ChromaDB 是一个开源向量数据库，专门存储嵌入式向量。"},
    {"id": "c3", "doc_id": 2, "idx": 0, "text": "React 是用于构建用户界面的前端 JavaScript 库。"},
    {"id": "c4", "doc_id": 2, "idx": 1, "text": "BM25 是一种经典的信息检索排序算法，基于词频。"},
    {"id": "c5", "doc_id": 3, "idx": 0, "text": "RAG 检索增强生成把检索系统与大模型生成结合起来。"},
]


class StubStore:
    """以 StubEmbedder 模拟的向量库，接口与 VectorStore 一致。"""

    def __init__(self):
        from app.core.embedding import MockEmbedder

        self.embedder = StubEmbedder()
        self.docs = list(CORPUS)

    def query(self, question, top_k):
        qv = self.embedder.embed([question])[0]

        def cos(a, b):
            return sum(x * y for x, y in zip(a, b))

        scored = [
            {**d, "score": cos(qv, self.embedder.embed([d["text"]])[0])}
            for d in self.docs
        ]
        scored.sort(key=lambda h: h["score"], reverse=True)
        return scored[:top_k]


def test_rrf_fuse_prefers_consensus():
    a = [{"id": "x"}, {"id": "y"}, {"id": "z"}]
    b = [{"id": "y"}, {"id": "x"}, {"id": "w"}]
    fused = rrf_fuse(a, b, k=60)
    assert fused[0]["id"] == "x"  # 两路都排前 → 融合第一
    assert "w" in [f["id"] for f in fused]


def test_retriever_hybrid_ranking():
    store = StubStore()
    retriever = Retriever(store, chunks_provider=lambda: CORPUS)
    hits = retriever.search("什么是向量数据库", top_k=3, final_k=2)
    assert len(hits) == 2
    assert hits[0]["id"] == "c2"  # 命中向量库主题分块
    assert hits[0]["source"] in {"vector", "bm25", "rrf"}


def test_retriever_empty_corpus():
    empty_store = StubStore()
    empty_store.docs = []
    retriever = Retriever(empty_store, chunks_provider=lambda: [])
    assert retriever.search("任何问题") == []
