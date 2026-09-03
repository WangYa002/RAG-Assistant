import json

from ..models.entities import EvalRun
from ..rag.generator import build_prompt
from .metrics import answer_relevance, compute_retrieval_metrics, faithfulness


def run_eval(db, settings, retriever, llm, dataset: dict) -> dict:
    """对测试集逐条执行 检索→生成→打分，产出评估报告并落库。"""
    ranked_flags: list[list[bool]] = []
    per_item: list[dict] = []

    for item in dataset["items"]:
        question = item["question"]
        keywords = item.get("expected_keywords", [])
        hits = retriever.search(question, settings.top_k, settings.final_k)
        flags = [any(kw in h["text"] for kw in keywords) for h in hits] or [False]
        ranked_flags.append(flags)

        messages = build_prompt(question, hits)
        answer = "".join(llm.chat(messages, stream=True))
        per_item.append(
            {
                "question": question,
                "answer": answer,
                "hit": any(flags),
                "first_hit_rank": (flags.index(True) + 1) if any(flags) else 0,
                "retrieved": [
                    {"doc_id": h["doc_id"], "idx": h["idx"], "text": h["text"][:80]}
                    for h in hits
                ],
                "faithfulness": faithfulness(answer, [h["text"] for h in hits], llm),
                "answer_relevance": answer_relevance(question, answer, llm),
            }
        )

    metrics = compute_retrieval_metrics(ranked_flags)
    metrics["avg_faithfulness"] = round(
        sum(i["faithfulness"] for i in per_item) / len(per_item), 4
    ) if per_item else 0.0
    metrics["avg_answer_relevance"] = round(
        sum(i["answer_relevance"] for i in per_item) / len(per_item), 4
    ) if per_item else 0.0

    run = EvalRun(
        dataset_name=dataset["name"],
        metrics_json=json.dumps(metrics, ensure_ascii=False),
        per_item_json=json.dumps(per_item, ensure_ascii=False),
    )
    db.add(run)
    db.commit()
    return {
        "id": run.id,
        "dataset": dataset["name"],
        "metrics": metrics,
        "per_item": per_item,
        "created_at": run.created_at.isoformat(),
    }
