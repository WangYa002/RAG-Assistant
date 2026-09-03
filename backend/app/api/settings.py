import json

from fastapi import APIRouter, Request
from pydantic import BaseModel

from ..core.embedding import get_embedder
from ..core.llm import get_llm
from ..models.entities import Chunk, Conversation, Message, Setting
from ..rag.retriever import Retriever
from ..rag.vectorstore import VectorStore

router = APIRouter(prefix="/api/settings", tags=["settings"])
finetune_router = APIRouter(prefix="/api", tags=["finetune"])

OVERRIDABLE = [
    "llm_base_url",
    "llm_api_key",
    "llm_model",
    "embedding_provider",
    "embedding_model",
    "chunk_size",
    "chunk_overlap",
    "top_k",
    "final_k",
]


class ModelSettingsBody(BaseModel):
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None
    embedding_provider: str | None = None
    embedding_model: str | None = None
    top_k: int | None = None
    final_k: int | None = None


def get_overrides(db) -> dict:
    rows = {r.key: r.value for r in db.query(Setting).all()}
    out = {}
    for key in OVERRIDABLE:
        if key in rows:
            try:
                out[key] = json.loads(rows[key])
            except (TypeError, ValueError):
                out[key] = rows[key]
    return out


def mask_key(key: str | None) -> str:
    if not key:
        return ""
    return "******" + key[-4:]


def rebuild_state(app) -> None:
    """用「基础配置 + DB 覆盖项」重建运行态（热生效，无需重启）。"""
    db = app.state.db()
    settings = app.state.base_settings.model_copy(update=get_overrides(db))

    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    embedder = get_embedder(settings)
    vector_store = VectorStore(settings.chroma_dir, embedder)

    def chunks_provider():
        s = app.state.db()
        rows = s.query(Chunk).all()
        return [
            {"id": f"d{r.doc_id}-{r.idx}", "doc_id": r.doc_id, "idx": r.idx, "text": r.text}
            for r in rows
        ]

    app.state.settings = settings
    app.state.embedder = embedder
    app.state.vector_store = vector_store
    app.state.retriever = Retriever(vector_store, chunks_provider)
    app.state.llm = get_llm(settings)


@router.get("/model")
def get_model(request: Request):
    s = request.app.state.settings
    return {
        "llm_base_url": s.llm_base_url,
        "llm_api_key": mask_key(s.llm_api_key),
        "llm_model": s.llm_model,
        "embedding_provider": s.embedding_provider,
        "embedding_model": s.embedding_model,
        "top_k": s.top_k,
        "final_k": s.final_k,
        "mock_mode": s.mock_mode,
    }


@router.put("/model")
def put_model(body: ModelSettingsBody, request: Request):
    db = request.app.state.db()
    updates = body.model_dump(exclude_none=True)
    # 回传脱敏 Key 时保留已存储的真实 Key
    if "llm_api_key" in updates and str(updates["llm_api_key"]).startswith("******"):
        stored = db.get(Setting, "llm_api_key")
        if stored:
            try:
                updates["llm_api_key"] = json.loads(stored.value)
            except (TypeError, ValueError):
                updates["llm_api_key"] = stored.value
        else:
            updates.pop("llm_api_key")
    for key, value in updates.items():
        if key in OVERRIDABLE:
            row = db.get(Setting, key)
            if row is None:
                row = Setting(key=key, value=json.dumps(value))
                db.add(row)
            else:
                row.value = json.dumps(value)
    db.commit()
    rebuild_state(request.app)
    return get_model(request)


@router.post("/model/test")
def test_model(request: Request):
    s = request.app.state.settings
    if s.mock_mode:
        return {"ok": True, "detail": "Mock 模式：未配置 API Key，使用本地确定性模型。"}
    try:
        llm = get_llm(s)
        text = "".join(llm.chat([{"role": "user", "content": "回复：ok"}], stream=True))
        return {"ok": True, "detail": f"连接成功，模型返回：{text[:50]}"}
    except Exception as exc:
        return {"ok": False, "detail": str(exc)[:200]}


@finetune_router.post("/finetune/export")
def finetune_export(request: Request):
    """把问答记录导出为 SFT 数据集（OpenAI 消息格式）+ LLaMA-Factory LoRA 配置。"""
    db = request.app.state.db()
    convs = db.query(Conversation).all()
    lines = []
    for conv in convs:
        msgs = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.id.asc())
            .all()
        )
        pairs = []
        pending_q = None
        for m in msgs:
            if m.role == "user":
                pending_q = m.content
            elif m.role == "assistant" and pending_q:
                pairs.append(
                    {
                        "messages": [
                            {"role": "system", "content": "你是企业知识库智能问答助手。"},
                            {"role": "user", "content": pending_q},
                            {"role": "assistant", "content": m.content},
                        ]
                    }
                )
                pending_q = None
        lines.extend(pairs)

    yaml_config = (
        "### LLaMA-Factory LoRA 微调配置（由智汇知识库生成）\n"
        "model_name_or_path: Qwen/Qwen2.5-7B-Instruct\n"
        "stage: sft\n"
        "do_train: true\n"
        "finetuning_type: lora\n"
        "lora_target: all\n"
        "lora_rank: 8\n"
        "lora_alpha: 16\n"
        "dataset: zhihui_kb\n"
        "template: qwen\n"
        "output_dir: saves/zhihui-kb-lora\n"
        "per_device_train_batch_size: 1\n"
        "gradient_accumulation_steps: 8\n"
        "learning_rate: 5.0e-5\n"
        "num_train_epochs: 3.0\n"
        "fp16: true\n"
    )
    return {
        "count": len(lines),
        "jsonl": "\n".join(json.dumps(l, ensure_ascii=False) for l in lines),
        "yaml": yaml_config,
    }
