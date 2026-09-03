from app.core.llm import MockLLM, DeepSeekLLM, get_llm


def test_mock_llm_streams_deterministic_answer():
    llm = MockLLM()
    messages = [
        {"role": "system", "content": "你是知识库助手"},
        {"role": "user", "content": "【参考资料】\n[1] FastAPI 是一个现代 Python Web 框架\n【问题】FastAPI 是什么？"},
    ]
    chunks = list(llm.chat(messages))
    assert len(chunks) > 1  # 流式：多块输出
    text = "".join(chunks)
    assert "FastAPI" in text  # 回答与问题相关
    assert "[1]" in text  # 保留引用标注


def test_factory_uses_mock_without_api_key(settings):
    llm = get_llm(settings)
    assert isinstance(llm, MockLLM)


def test_factory_builds_deepseek_with_key(settings):
    settings.llm_api_key = "sk-test"
    llm = get_llm(settings)
    assert isinstance(llm, DeepSeekLLM)
    assert llm.model == "deepseek-chat"
