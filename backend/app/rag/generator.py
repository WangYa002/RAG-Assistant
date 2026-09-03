SYSTEM_PROMPT = (
    "你是企业知识库智能问答助手。请仅根据参考资料回答问题，"
    "并在回答中引用的语句后标注引用编号（如 [1]）。"
    "如果参考资料为空或与问题无关，请直接说明知识库中暂无相关资料。始终使用中文回答。"
)


def build_prompt(question: str, hits: list[dict]) -> list[dict]:
    if hits:
        context = "\n".join(f"[{i + 1}] {h['text']}" for i, h in enumerate(hits))
    else:
        context = "（知识库暂无相关资料）"
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"【参考资料】\n{context}\n【问题】{question}"},
    ]


def stream_answer(llm, messages: list[dict]):
    """流式生成，返回增量文本迭代器。"""
    return llm.chat(messages, stream=True)
