from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="INFRACOP_", extra="ignore")

    qdrant_url: str = "http://127.0.0.1:6333"
    qdrant_api_key: str = ""
    collection: str = "enterprise_standards"

    # bedrock (AWS) | fastembed (local model) | hash (zero-dep, wiring tests)
    embedding_backend: str = "bedrock"
    bedrock_region: str = "us-east-1"
    embedding_model: str = "amazon.titan-embed-text-v2:0"
    embedding_dims: int = 1024

    standards_repo: str = "telecomprofi/Ent-DevOps-Standards"
    github_token: str = ""
    github_webhook_secret: str = ""

    api_keys: str = ""
    log_level: str = "INFO"

    host: str = "0.0.0.0"
    mcp_port: int = 8765
    ingest_port: int = 8766

    @property
    def api_key_set(self) -> set[str]:
        return {k.strip() for k in self.api_keys.split(",") if k.strip()}


settings = Settings()
