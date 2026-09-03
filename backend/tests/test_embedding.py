from app.core.embedding import MockEmbedder, BGEEmbedder, get_embedder


def test_mock_embedder_deterministic_and_normalized():
    emb = MockEmbedder()
    v1 = emb.embed(["知识库问答"])[0]
    v2 = emb.embed(["知识库问答"])[0]
    v3 = emb.embed(["完全不同的内容"])[0]
    assert v1 == v2
    assert v1 != v3
    assert len(v1) == 256
    norm = sum(x * x for x in v1) ** 0.5
    assert abs(norm - 1.0) < 1e-6


def test_factory_mock_provider(settings):
    assert isinstance(get_embedder(settings), MockEmbedder)


def test_bge_is_lazy():
    """BGEEmbedder 构造时不得加载模型（懒加载），首次 embed 才初始化。"""
    emb = BGEEmbedder("BAAI/bge-small-zh-v1.5")
    assert emb._model is None
