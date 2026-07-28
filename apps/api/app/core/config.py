from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

def find_root_dir() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / ".env").exists() or (parent / "apps").exists() or (parent / "render.yaml").exists():
            return parent
    return current.parents[2]


ROOT_DIR = find_root_dir()
ENV_FILE = ROOT_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    app_env: str = "local"
    database_url: str = "postgresql+psycopg://myagent:myagent@localhost:5432/myagent"
    db_connect_timeout_seconds: int = 2
    skip_db_startup: bool = True
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = "http://localhost:6333"
    jwt_secret: str = Field(default="change-me", min_length=8)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    ai_provider: str = "litellm"
    ai_model: str = "anthropic/claude-haiku-4-5"
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    litellm_api_key: str | None = None
    litellm_api_base: str = "https://litellm.i-hq.tech/v1"
    weather_api_key: str | None = None
    google_client_id: str | None = None
    google_client_secret: str | None = None
    gmail_redirect_uri: str = "http://localhost:8000/api/connectors/google/callback"
    gmail_scopes: str = (
        "openid email profile "
        "https://www.googleapis.com/auth/gmail.readonly "
        "https://www.googleapis.com/auth/gmail.compose "
        "https://www.googleapis.com/auth/calendar.readonly "
        "https://www.googleapis.com/auth/calendar.events"
    )
    github_client_id: str | None = None
    github_client_secret: str | None = None
    github_redirect_uri: str = "http://localhost:8000/api/connectors/github/callback"
    github_scopes: str = "read:user user:email public_repo"
    linkedin_client_id: str | None = None
    linkedin_client_secret: str | None = None
    linkedin_redirect_uri: str = "http://localhost:8000/api/connectors/linkedin/callback"
    linkedin_scopes: str = "openid profile email"
    emergency_alerts_provider: str = "nws"
    health_webhook_token: str = "myagent-health-demo"
    default_alert_city: str = "New York"
    default_alert_lat: float = 40.7128
    default_alert_lon: float = -74.0060
    frontend_url: str = "http://localhost:3000"
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
