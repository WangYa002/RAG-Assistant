import hashlib
import logging
import math

from ..core.errors import AppError

logger = logging.getLogger(__name__)


class BaseEmbedder:
    name = "base"
    dim = 0

    def embed(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError


class MockEmbedder(BaseEmbedder):
    """确定性哈希向量（256 维、归一化）：仅用于离线测试与演示。"""

    name = "mock"
    dim = 256

    def embed(self, texts: list[str]) -> list[list[float]]:
        out = []
        for t in texts:
            v = [0.0] * self.dim
            for i in range(max(len(t) - 1, 1)):
                gram = t[i : i + 2]
                h = int(hashlib.md5(gram.encode("utf-8")).hexdigest(), 16)
                v[h % self.dim] += 1.0
            norm = math.sqrt(sum(x * x for x in v)) or 1.0
            out.append([x / norm for x in v])
        return out


class BGEEmbedder(BaseEmbedder):
    """fastembed 承载的 BGE 中文向量模型（ONNX CPU，无需 GPU/Torch）。懒加载。"""

    name = "bge"

    def __init__(self, model: str = "BAAI/bge-small-zh-v1.5"):
        self.model_name = model
        self._model = None

    def _ensure(self):
        if self._model is None:
            from fastembed import TextEmbedding

            logger.info("加载 BGE 向量模型 %s ...", self.model_name)
            self._model = TextEmbedding(model_name=self.model_name)

    def embed(self, texts: list[str]) -> list[list[float]]:
        self._ensure()
        return [[float(x) for x in vec] for vec in self._model.embed(texts)]


def get_embedder(settings) -> BaseEmbedder:
    provider = settings.embedding_provider
    if provider == "mock":
        return MockEmbedder()
    if provider in ("auto", "bge"):
        try:
            embedder = BGEEmbedder(settings.embedding_model)
            embedder._ensure()
            return embedder
        except Exception as exc:
            if provider == "bge":
                raise AppError("embedding_error", f"BGE 模型加载失败：{exc}", 500)
            logger.warning("BGE 加载失败，降级为 MockEmbedder：%s", exc)
            return MockEmbedder()
    raise AppError("config_error", f"未知 embedding_provider: {provider}", 500)
