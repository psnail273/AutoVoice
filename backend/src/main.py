"""
Main FastAPI application entry point.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from src.tts.kokoro.utils import text_to_wav, stream_audio_chunks, stream_audio_chunks_mp3
from src.routers import auth, rules
from src.config import settings
from src.dependencies import require_pro_user
from src.models.user import User

os.environ["QT_QPA_PLATFORM"] = "offscreen"
os.environ["DISPLAY"] = ""


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown."""
    # Startup: Validate critical configuration
    if settings.SECRET_KEY == "CHANGE_ME_IN_PRODUCTION_USE_STRONG_SECRET":
        raise ValueError(
            "SECRET_KEY must be set to a secure value in production. "
            "Generate one with: openssl rand -hex 32"
        )
    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        raise ValueError(
            "SECRET_KEY must be at least 32 characters for security. "
            "Current length: " + str(len(settings.SECRET_KEY))
        )
    yield
    # Shutdown: cleanup code would go here


app = FastAPI(
    title="AutoVoice API",
    description="Text-to-speech API with user authentication and rules management",
    version="1.0.0",
    lifespan=lifespan
)

# Configure rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(rules.router, prefix="/rules", tags=["Rules"])


class TextToConvert(BaseModel):
    """Request body for text-to-speech conversion."""
    text: str


@app.post("/text", tags=["Text-to-Speech"])
async def convert_text(
    text_to_convert: TextToConvert,
    _current_user: User = Depends(require_pro_user)
) -> Response:
    """
    Convert text to speech and return as WAV audio.
    
    Returns the complete audio file after full generation.
    """
    audio_buffer = text_to_wav(text_to_convert.text)
    return Response(
        content=audio_buffer.read(),
        media_type="audio/wav",
    )


@app.post("/stream", tags=["Text-to-Speech"])
async def stream_text(
    text_to_convert: TextToConvert,
    _current_user: User = Depends(require_pro_user)
) -> StreamingResponse:
    """
    Stream text-to-speech audio as MP3 format (128kbps, mono, 24kHz).

    Audio begins playing as chunks arrive - no need to wait for full generation.
    MP3 format enables MediaSource Extensions API for progressive streaming in browsers.
    """
    return StreamingResponse(
        stream_audio_chunks_mp3(text_to_convert.text),
        media_type="audio/mpeg",
    )


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy"}
