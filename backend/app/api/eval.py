import json
from pathlib import Path

from fastapi import APIRouter, Request
from pydantic import BaseModel

from ..core.errors import AppError
from ..eval.runner import run_eval
from ..models.entities import EvalRun

router = APIRouter(prefix="/api/eval", tags=["eval"])

SEED_DIR = Path(__file__).resolve().parents[2] / "data_seed"


class RunBody(BaseModel):
    dataset: str


def load_datasets() -> list[dict]:
    path = SEED_DIR / "eval_dataset.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


@router.get("/datasets")
def datasets():
    return load_datasets()


@router.post("/runs")
def create_run(body: RunBody, request: Request):
    dataset = next(
        (d for d in load_datasets() if d["name"] == body.dataset), None
    )
    if dataset is None:
        raise AppError("dataset_not_found", f"评估集 {body.dataset} 不存在", 404)
    app = request.app
    db = app.state.db()
    return run_eval(db, app.state.settings, app.state.retriever, app.state.llm, dataset)


@router.get("/runs")
def list_runs(request: Request):
    db = request.app.state.db()
    runs = db.query(EvalRun).order_by(EvalRun.id.desc()).limit(50).all()
    return [
        {
            "id": r.id,
            "dataset": r.dataset_name,
            "metrics": json.loads(r.metrics_json or "{}"),
            "created_at": r.created_at.isoformat(),
        }
        for r in runs
    ]
