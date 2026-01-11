"""
Main FastAPI application entry point.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from src.tts.kokoro.utils import text_to_wav, stream_audio_chunks
from src.routers import auth, rules
from src.config import settings

os.environ["QT_QPA_PLATFORM"] = "offscreen"
os.environ["DISPLAY"] = ""

app = FastAPI(
    title="AutoVoice API",
    description="Text-to-speech API with user authentication and rules management",
    version="1.0.0"
)

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
async def convert_text(text_to_convert: TextToConvert) -> Response:
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
async def stream_text(text_to_convert: TextToConvert) -> StreamingResponse:
    """
    Stream text-to-speech audio as WAV format (16-bit PCM, mono, 24kHz).

    Audio begins playing as chunks arrive - no need to wait for full generation.
    """
    return StreamingResponse(
        stream_audio_chunks(text_to_convert.text),
        media_type="audio/wav",
    )


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy"}
