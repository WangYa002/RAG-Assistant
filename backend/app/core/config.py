from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="KB_", env_file=".env", extra="ignore")

    data_dir: str = "./data"

    llm_base_url: str = "https://api.deepseek.com/v1"
    llm_api_key: str = ""
    llm_model: str = "deepseek-chat"

    embedding_provider: str = "auto"  # auto | bge | mock
    embedding_model: str = "BAAI/bge-small-zh-v1.5"

    chunk_size: int = 500
    chunk_overlap: int = 80
    top_k: int = 8
    final_k: int = 4

    @property
    def mock_mode(self) -> bool:
        return not self.llm_api_key

    @property
    def sqlite_url(self) -> str:
        return f"sqlite:///{Path(self.data_dir) / 'app.db'}"

    @property
    def chroma_dir(self) -> Path:
        return Path(self.data_dir) / "chroma"

    @property
    def uploads_dir(self) -> Path:
        return Path(self.data_dir) / "uploads"


@lru_cache
def get_settings() -> Settings:
    return Settings()
