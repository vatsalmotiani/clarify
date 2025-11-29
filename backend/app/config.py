from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"

    # OpenAI - Required
    OPENAI_API_KEY: str

    # Supabase - Required
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # Authentication - Required (no default for security)
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Email (Resend) - Optional for development
    RESEND_API_KEY: Optional[str] = None

    # App settings
    MAX_FILE_SIZE_MB: int = 20
    MAX_FILES_PER_UPLOAD: int = 5
    TEMP_DIR: str = "temp"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
