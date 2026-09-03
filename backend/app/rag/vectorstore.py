import os
from pathlib import Path

os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

import chromadb


class VectorStore:
    """ChromaDB 封装：向量与元数据（doc_id/idx）的持久化存取。"""

    def __init__(self, persist_dir, embedder):
        persist_dir = Path(persist_dir)
        persist_dir.mkdir(parents=True, exist_ok=True)
        self.embedder = embedder
        self._client = chromadb.PersistentClient(path=str(persist_dir))
        self._col = self._client.get_or_create_collection(
            "knowledge_base", metadata={"hnsw:space": "cosine"}
        )

    def add(self, chunks: list[dict]) -> None:
        if not chunks:
            return
        self._col.upsert(
            ids=[c["id"] for c in chunks],
            documents=[c["text"] for c in chunks],
            metadatas=[{"doc_id": c["doc_id"], "idx": c["idx"]} for c in chunks],
            embeddings=self.embedder.embed([c["text"] for c in chunks]),
        )

    def query(self, question: str, top_k: int) -> list[dict]:
        total = self._col.count()
        if total == 0:
            return []
        qv = self.embedder.embed([question])[0]
        res = self._col.query(query_embeddings=[qv], n_results=min(top_k, total))
        hits = []
        for i, cid in enumerate(res["ids"][0]):
            meta = res["metadatas"][0][i]
            hits.append(
                {
                    "id": cid,
                    "doc_id": meta["doc_id"],
                    "idx": meta["idx"],
                    "text": res["documents"][0][i],
                    "score": 1.0 - float(res["distances"][0][i]),  # cosine 距离 → 相似度
                }
            )
        return hits

    def delete_doc(self, doc_id: int) -> None:
        self._col.delete(where={"doc_id": doc_id})

    def count(self) -> int:
        return self._col.count()

    def reset(self) -> None:
        self._client.delete_collection("knowledge_base")
        self._col = self._client.get_or_create_collection(
            "knowledge_base", metadata={"hnsw:space": "cosine"}
        )
