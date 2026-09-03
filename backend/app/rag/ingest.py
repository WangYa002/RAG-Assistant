from pathlib import Path

from ..core.errors import AppError
from ..models.entities import Chunk, Document
from .chunker import chunk_text
from .loader import SUPPORTED, load_text


def ingest_document(session, settings, vector_store, upload_path: Path, filename: str) -> Document:
    ext = Path(filename).suffix.lstrip(".").lower()
    if ext not in SUPPORTED:
        raise AppError(
            "unsupported_file",
            f"暂不支持 .{ext} 格式，请上传 txt / md / pdf / docx 文件",
            status=422,
        )
    text = load_text(upload_path, ext)
    chunks = chunk_text(text, settings.chunk_size, settings.chunk_overlap)
    if not chunks:
        raise AppError("empty_document", "文档解析后没有可用文本", status=422)

    doc = Document(
        filename=filename,
        ext=ext,
        size=upload_path.stat().st_size,
        status="processing",
        chunk_count=len(chunks),
    )
    session.add(doc)
    session.commit()

    session.add_all([Chunk(doc_id=doc.id, idx=i, text=c) for i, c in enumerate(chunks)])
    session.commit()
    vector_store.add(
        [
            {"id": f"d{doc.id}-{i}", "doc_id": doc.id, "idx": i, "text": c}
            for i, c in enumerate(chunks)
        ]
    )
    doc.status = "ready"
    session.commit()
    return doc


def delete_document(session, vector_store, doc_id: int) -> None:
    doc = session.get(Document, doc_id)
    if doc is None:
        raise AppError("not_found", "文档不存在", status=404)
    session.query(Chunk).filter(Chunk.doc_id == doc_id).delete()
    session.delete(doc)
    session.commit()
    vector_store.delete_doc(doc_id)


def rebuild_index(session, settings, vector_store) -> int:
    """用 SQLite 中的分块全量重建向量索引（自愈不一致状态）。"""
    vector_store.reset()
    rows = session.query(Chunk).all()
    vector_store.add(
        [
            {"id": f"d{r.doc_id}-{r.idx}", "doc_id": r.doc_id, "idx": r.idx, "text": r.text}
            for r in rows
        ]
    )
    return len(rows)
