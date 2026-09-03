import time
from pathlib import Path

from fastapi import APIRouter, File, Request, UploadFile

from ..core.errors import AppError
from ..models.entities import Document
from ..rag.ingest import delete_document, ingest_document, rebuild_index
from ..rag.loader import SUPPORTED

router = APIRouter(prefix="/api/documents", tags=["documents"])
index_router = APIRouter(prefix="/api", tags=["index"])


def _doc_dict(doc: Document) -> dict:
    return {
        "id": doc.id,
        "filename": doc.filename,
        "ext": doc.ext,
        "size": doc.size,
        "status": doc.status,
        "chunk_count": doc.chunk_count,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


@router.post("/upload")
def upload(request: Request, file: UploadFile = File(...)):
    filename = Path(file.filename or "unnamed.txt").name
    ext = Path(filename).suffix.lstrip(".").lower()
    if ext not in SUPPORTED:
        raise AppError(
            "unsupported_file",
            f"暂不支持 .{ext} 格式，请上传 txt / md / pdf / docx 文件",
            status=422,
        )
    settings = request.app.state.settings
    dest = settings.uploads_dir / f"{int(time.time() * 1000)}-{filename}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        f.write(file.file.read())

    db = request.app.state.db()
    doc = ingest_document(db, settings, request.app.state.vector_store, dest, filename)
    return _doc_dict(doc)


@router.get("")
def list_documents(request: Request):
    db = request.app.state.db()
    docs = db.query(Document).order_by(Document.id.desc()).all()
    return [_doc_dict(d) for d in docs]


@router.delete("/{doc_id}")
def remove(doc_id: int, request: Request):
    db = request.app.state.db()
    delete_document(db, request.app.state.vector_store, doc_id)
    return {"ok": True}


@index_router.post("/index/rebuild")
def rebuild(request: Request):
    db = request.app.state.db()
    chunks = rebuild_index(db, request.app.state.settings, request.app.state.vector_store)
    return {"ok": True, "chunks": chunks}
