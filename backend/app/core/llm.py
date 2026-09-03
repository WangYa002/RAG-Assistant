import logging

from ..core.errors import AppError

logger = logging.getLogger(__name__)


class BaseLLM:
    name = "base"

    def chat(self, messages: list[dict], stream: bool = True):
        raise NotImplementedError


class MockLLM(BaseLLM):
    """无 Key 时的确定性实现：基于模板生成带引用标注的回答，保证全链路可演示。"""

    name = "mock"

    def chat(self, messages: list[dict], stream: bool = True):
        user = next(
            (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
        )
        question = user.split("【问题】")[-1].strip() or user[:40]
        if "【参考资料】" not in user or "知识库暂无相关资料" in user:
            text = (
                f"知识库中暂无与「{question[:40]}」相关的资料。"
                "请先在知识库页面上传相关文档，再进行提问。"
            )
        else:
            text = (
                f"根据知识库资料，「{question[:40]}」的相关要点如下："
                "参考资料中包含了与该问题直接相关的内容 [1]。"
                "以上回答完全基于已上传的知识库文档生成，如需更细致的结论，"
                "建议补充更多相关文档后再提问。"
            )
        if not stream:
            yield text
            return
        step = 8
        for i in range(0, len(text), step):
            yield text[i : i + step]


class DeepSeekLLM(BaseLLM):
    """OpenAI 兼容实现，适用于 DeepSeek / Qwen(DashScope兼容模式) / Ollama 等。"""

    name = "openai_compatible"

    def __init__(self, base_url: str, api_key: str, model: str = "deepseek-chat"):
        from openai import OpenAI

        self.model = model
        self._client = OpenAI(base_url=base_url, api_key=api_key)

    def chat(self, messages: list[dict], stream: bool = True):
        try:
            resp = self._client.chat.completions.create(
                model=self.model, messages=messages, stream=True, temperature=0.3
            )
        except Exception as exc:  # 网络失败/Key 无效统一转为业务错误
            raise AppError("llm_error", f"模型调用失败：{exc}", status=502)
        for chunk in resp:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


def get_llm(settings) -> BaseLLM:
    if settings.mock_mode:
        logger.info("LLM 运行于 Mock 模式（未配置 KB_LLM_API_KEY）")
        return MockLLM()
    return DeepSeekLLM(settings.llm_base_url, settings.llm_api_key, settings.llm_model)
