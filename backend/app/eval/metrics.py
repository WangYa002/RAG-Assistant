from ..rag.retriever import tokenize


def compute_retrieval_metrics(ranked_flags: list[list[bool]]) -> dict:
    """检索指标：hit_rate（至少命中一条的比例）与 mrr（首个命中位置倒数的均值）。"""
    if not ranked_flags:
        return {"hit_rate": 0.0, "mrr": 0.0}
    hit_rate = sum(1 for flags in ranked_flags if any(flags)) / len(ranked_flags)
    rr_total = 0.0
    for flags in ranked_flags:
        for rank, flag in enumerate(flags, start=1):
            if flag:
                rr_total += 1.0 / rank
                break
    return {"hit_rate": hit_rate, "mrr": rr_total / len(ranked_flags)}


def _lexical_overlap(a: str, b: str) -> float:
    ga, gb = set(tokenize(a)), set(tokenize(b))
    if not ga:
        return 0.0
    return len(ga & gb) / len(ga)


def _llm_score(llm, prompt: str, fallback: float) -> float:
    """真实 LLM 打分：要求只输出 0~1 小数；失败回退到词面基线。"""
    try:
        text = "".join(llm.chat([{"role": "user", "content": prompt}], stream=True))
        value = float(text.strip().split()[0])
        return max(0.0, min(1.0, value))
    except Exception:
        return fallback


def faithfulness(answer: str, contexts: list[str], llm) -> float:
    """忠实度：回答中的信息是否被参考资料支撑。"""
    baseline = (
        _lexical_overlap(answer, "\n".join(contexts)) if contexts else 0.0
    )
    if llm.name == "mock":
        return round(min(baseline, 1.0), 4)
    return _llm_score(
        llm,
        "请判断【回答】中的内容是否被【参考资料】支持。只输出一个 0 到 1 之间的小数，1 表示完全支持。\n"
        f"【参考资料】\n{''.join(contexts)}\n【回答】{answer}",
        baseline,
    )


def answer_relevance(question: str, answer: str, llm) -> float:
    """答案相关性：回答是否回应了问题。"""
    baseline = _lexical_overlap(question, answer)
    if llm.name == "mock":
        return round(min(baseline, 1.0), 4)
    return _llm_score(
        llm,
        "请判断【回答】是否回应了【问题】。只输出一个 0 到 1 之间的小数，1 表示完全回应。\n"
        f"【问题】{question}\n【回答】{answer}",
        baseline,
    )
