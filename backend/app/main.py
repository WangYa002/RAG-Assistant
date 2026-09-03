import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import analytics, chat, documents, eval as eval_api, settings as settings_api
from .core.config import Settings, get_settings
from .core.db import current_sessionmaker, init_db
from .core.embedding import get_embedder
from .core.errors import AppError
from .core.llm import get_llm
from .models.entities import Chunk
from .rag.retriever import Retriever
from .rag.vectorstore import VectorStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


def db_session():
    """每个请求/任务独立获取一个 Session。"""
    return current_sessionmaker()()


def init_state(app: FastAPI, settings: Settings) -> None:
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    init_db(settings)

    app.state.base_settings = settings
    app.state.settings = settings
    app.state.db = db_session
    app.state.embedder = get_embedder(settings)
    app.state.vector_store = VectorStore(settings.chroma_dir, app.state.embedder)

    def chunks_provider():
        db = db_session()
        rows = db.query(Chunk).all()
        return [
            {"id": f"d{r.doc_id}-{r.idx}", "doc_id": r.doc_id, "idx": r.idx, "text": r.text}
            for r in rows
        ]

    app.state.retriever = Retriever(app.state.vector_store, chunks_provider)
    app.state.llm = get_llm(settings)


def create_app(settings: Settings | None = None) -> FastAPI:
    app = FastAPI(title="智汇知识库 API", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status,
            content={"code": exc.code, "message": exc.message},
        )

    @app.get("/api/health")
    def health():
        return {"status": "ok", "mock": app.state.settings.mock_mode}

    init_state(app, settings or get_settings())

    app.include_router(documents.router)
    app.include_router(documents.index_router)
    app.include_router(chat.router)
    app.include_router(eval_api.router)
    app.include_router(analytics.router)
    app.include_router(settings_api.router)
    app.include_router(settings_api.finetune_router)
    return app


app = create_app()
