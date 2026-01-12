"""
Application configuration using environment variables.
"""

import os
from dotenv import load_dotenv

load_dotenv(".env.local")


class Settings:
    """Application settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # JWT Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION_USE_STRONG_SECRET")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours default
    
    # CORS (comma-separated list of allowed origins)
    # Default to localhost for development. Set explicitly in production.
    _cors_origins_str: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000")
    CORS_ORIGINS: list[str] = [origin.strip() for origin in _cors_origins_str.split(",")]


settings = Settings()

