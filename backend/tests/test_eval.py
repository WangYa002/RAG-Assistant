from app.eval.metrics import compute_retrieval_metrics, faithfulness, answer_relevance
from app.core.llm import MockLLM


def test_compute_retrieval_metrics_exact():
    ranked = [
        [True, False],        # 第 1 位命中 → RR=1
        [False, False, True], # 第 3 位命中 → RR=1/3
        [False, False],       # 未命中 → RR=0
    ]
    m = compute_retrieval_metrics(ranked)
    assert abs(m["hit_rate"] - 2 / 3) < 1e-9
    assert abs(m["mrr"] - (1 + 1 / 3) / 3) < 1e-9


def test_metrics_empty():
    assert compute_retrieval_metrics([]) == {"hit_rate": 0.0, "mrr": 0.0}


def test_faithfulness_and_relevance_baseline():
    llm = MockLLM()
    ans = "FastAPI 是一个现代 Python Web 框架。"
    ctx = ["[1] FastAPI 是一个用于构建 API 的现代 Python Web 框架。"]
    assert faithfulness(ans, ctx, llm) > 0.5
    assert answer_relevance("FastAPI 是什么", ans, llm) > 0.5


def test_eval_run_end_to_end(client):
    client.post(
        "/api/documents/upload",
        files={"file": ("kb.md", ("# 知识\n\nChromaDB 是一个开源向量数据库，支持嵌入向量的存储与检索。" * 15).encode("utf-8"), "text/markdown")},
    )
    datasets = client.get("/api/eval/datasets").json()
    assert datasets and datasets[0]["items"]

    run = client.post("/api/eval/runs", json={"dataset": datasets[0]["name"]})
    assert run.status_code == 200
    body = run.json()
    assert 0.0 <= body["metrics"]["hit_rate"] <= 1.0
    assert len(body["per_item"]) == len(datasets[0]["items"])

    history = client.get("/api/eval/runs").json()
    assert any(r["id"] == body["id"] for r in history)
