"""
Database configuration and session management for async PostgreSQL.
"""

import os
import ssl
from urllib.parse import urlparse, urlunparse
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv(".env.local")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Convert postgres:// to postgresql+asyncpg:// for async driver
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://", 1)

# Strip query parameters that asyncpg doesn't understand (sslmode, channel_binding, etc.)
# and handle SSL via connect_args instead
parsed = urlparse(DATABASE_URL)
clean_url = urlunparse(parsed._replace(query=""))

# Create SSL context for Neon (requires SSL with certificate verification)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = True
ssl_context.verify_mode = ssl.CERT_REQUIRED
# Neon uses standard CA certificates, no custom cert needed

engine = create_async_engine(
    clean_url, echo=False, connect_args={"ssl": ssl_context})
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db():
    """
    Dependency that yields an async database session.

    Use with FastAPI's Depends() to inject into route handlers.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
