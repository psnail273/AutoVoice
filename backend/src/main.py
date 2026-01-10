from src.tts.kokoro.utils import text_to_wav, stream_audio_chunks
from fastapi.responses import Response, StreamingResponse
from fastapi import FastAPI
import os
from pydantic import BaseModel
from src.routers import db

os.environ["QT_QPA_PLATFORM"] = "offscreen"
os.environ["DISPLAY"] = ""

app = FastAPI()

# Register routers
app.include_router(db.router, prefix="/db", tags=["Database"])


class TextToConvert(BaseModel):
    text: str


@app.post("/text")
async def root(text_to_convert: TextToConvert):
    audio_buffer = text_to_wav(text_to_convert.text)
    return Response(
        content=audio_buffer.read(),
        media_type="audio/wav",
    )


@app.post("/stream")
async def stream(text_to_convert: TextToConvert):
    """
    Stream audio as WAV format (16-bit PCM, mono, 24kHz).

    Audio begins playing as chunks arrive - no need to wait for full generation.
    """
    return StreamingResponse(
        stream_audio_chunks(text_to_convert.text),
        media_type="audio/wav",
    )
