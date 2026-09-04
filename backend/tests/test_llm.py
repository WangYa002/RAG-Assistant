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


def test_mock_llm_usage_sums_and_prefix_cache():
    """多轮对话：除末条 user 外的前缀视为可缓存，hit+miss 必须等于 prompt。"""
    llm = MockLLM()
    usage: dict = {}
    messages = [
        {"role": "system", "content": "系统提示词" * 20},
        {"role": "user", "content": "历史问题"},
        {"role": "assistant", "content": "历史回答"},
        {"role": "user", "content": "【参考资料】\n知识\n【问题】新问题"},
    ]
    list(llm.chat(messages, usage_out=usage))
    assert usage["prompt_tokens"] > 0
    assert usage["completion_tokens"] > 0
    assert 0 < usage["cache_hit_tokens"] < usage["prompt_tokens"]  # 系统词+历史前缀可命中
    assert usage["prompt_tokens"] == usage["cache_hit_tokens"] + usage["cache_miss_tokens"]


def test_mock_llm_usage_without_callback_ok():
    # 不传 usage_out 时行为不变
    chunks = list(MockLLM().chat([{"role": "user", "content": "q"}]))
    assert "".join(chunks)


def test_factory_uses_mock_without_api_key(settings):
    llm = get_llm(settings)
    assert isinstance(llm, MockLLM)


def test_factory_builds_deepseek_with_key(settings):
    settings.llm_api_key = "sk-test"
    llm = get_llm(settings)
    assert isinstance(llm, DeepSeekLLM)
    assert llm.model == "deepseek-chat"
