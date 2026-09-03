import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings


@pytest.fixture
def settings(tmp_path) -> Settings:
    """离线测试配置：Mock LLM + Mock Embedding，数据写入临时目录。"""
    s = Settings(
        data_dir=str(tmp_path / "data"),
        llm_api_key="",
        embedding_provider="mock",
    )
    return s


@pytest.fixture
def client(settings):
    from app.main import create_app

    app = create_app(settings)
    return TestClient(app)
