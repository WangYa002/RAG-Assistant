from app.core.embedding import MockEmbedder
from app.rag.vectorstore import VectorStore


def make_store(tmp_path):
    return VectorStore(tmp_path / "chroma", MockEmbedder())


def test_add_query_roundtrip(tmp_path):
    store = make_store(tmp_path)
    store.add(
        [
            {"id": "c1", "doc_id": 1, "idx": 0, "text": "FastAPI 是现代 Python Web 框架"},
            {"id": "c2", "doc_id": 1, "idx": 1, "text": "ChromaDB 是向量数据库"},
        ]
    )
    assert store.count() == 2
    hits = store.query("向量数据库是什么", top_k=1)
    assert len(hits) == 1
    hit = hits[0]
    assert set(hit.keys()) >= {"id", "doc_id", "idx", "text", "score"}
    assert hit["doc_id"] == 1


def test_query_empty_store(tmp_path):
    store = make_store(tmp_path)
    assert store.query("任何问题", top_k=3) == []
    assert store.count() == 0


def test_delete_doc(tmp_path):
    store = make_store(tmp_path)
    store.add(
        [
            {"id": "c1", "doc_id": 1, "idx": 0, "text": "a"},
            {"id": "c2", "doc_id": 2, "idx": 0, "text": "b"},
        ]
    )
    store.delete_doc(1)
    assert store.count() == 1
