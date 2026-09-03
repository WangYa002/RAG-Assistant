from app.core.config import Settings
from app.core.errors import AppError


def test_health_ok(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["mock"] is True  # 未配置 api_key 时必须是 Mock 模式


def test_mock_mode_flag():
    assert Settings(llm_api_key="").mock_mode is True
    assert Settings(llm_api_key="sk-test").mock_mode is False


def test_app_error_shape(client):
    """AppError 必须以 {code, message} JSON 返回对应状态码。"""
    from app.main import create_app

    app = create_app(Settings(llm_api_key="", embedding_provider="mock", data_dir="data"))

    from fastapi.testclient import TestClient

    c = TestClient(app, raise_server_exceptions=False)

    @app.get("/api/_boom")
    def boom():
        raise AppError("test_error", "测试错误", status=422)

    res = c.get("/api/_boom")
    assert res.status_code == 422
    assert res.json() == {"code": "test_error", "message": "测试错误"}
