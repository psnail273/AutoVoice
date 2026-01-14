from kokoro import KPipeline
import soundfile as sf
import warnings
import numpy as np
import struct
from io import BytesIO
from typing import Generator
from pydub import AudioSegment

# Suppress PyTorch deprecation/config warnings from kokoro's dependencies
warnings.filterwarnings("ignore", message=".*dropout option adds dropout.*")
warnings.filterwarnings("ignore", message=".*weight_norm.*is deprecated.*")

SAMPLE_RATE = 24000

pipeline = KPipeline(lang_code="a")


def create_wav_header(sample_rate: int = 24000, bits_per_sample: int = 16, channels: int = 1) -> bytes:
    """
    Create a WAV header for streaming. Uses max size (0xFFFFFFFF) to allow
    browsers to play audio as it streams in.
    """
    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8
    # Use max uint32 for unknown length streaming
    data_size = 0xFFFFFFFF - 36
    file_size = 0xFFFFFFFF

    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF',           # ChunkID
        file_size,         # ChunkSize (will be max for streaming)
        b'WAVE',           # Format
        b'fmt ',           # Subchunk1ID
        16,                # Subchunk1Size (PCM)
        1,                 # AudioFormat (1 = PCM)
        channels,          # NumChannels
        sample_rate,       # SampleRate
        byte_rate,         # ByteRate
        block_align,       # BlockAlign
        bits_per_sample,   # BitsPerSample
        b'data',           # Subchunk2ID
        data_size,         # Subchunk2Size
    )
    return header


def text_to_wav(text: str, voice: str = "af_bella", speed: float = 1.0) -> BytesIO:
    generator = pipeline(text, voice=voice, speed=speed)

    buffer = BytesIO()
    for _, _, audio in generator:
        sf.write(buffer, audio, SAMPLE_RATE, format="WAV")
        break

    buffer.seek(0)
    return buffer


def stream_audio_chunks(
    text: str, voice: str = "af_bella", speed: float = 1.0
) -> Generator[bytes, None, None]:
    """
    Stream audio as WAV format. Sends header first, then PCM chunks.
    Playable directly in browsers.
    """
    # Send WAV header first
    yield create_wav_header(SAMPLE_RATE)

    generator = pipeline(text, voice=voice, speed=speed)
    for i, (gs, ps, audio) in enumerate(generator):
        # Convert PyTorch tensor to numpy, then to int16 PCM
        audio_np = audio.cpu().numpy() if hasattr(audio, 'cpu') else audio
        audio_int16 = (audio_np * 32767).astype(np.int16)
        yield audio_int16.tobytes()


def stream_audio_chunks_mp3(
    text: str, voice: str = "af_bella", speed: float = 1.0
) -> Generator[bytes, None, None]:
    """
    Stream audio as MP3 format for MediaSource API compatibility.
    Yields MP3-encoded audio chunks suitable for progressive streaming.
    """
    generator = pipeline(text, voice=voice, speed=speed)

    for i, (gs, ps, audio) in enumerate(generator):
        # Convert PyTorch tensor to numpy array
        audio_np = audio.cpu().numpy() if hasattr(audio, 'cpu') else audio
        audio_int16 = (audio_np * 32767).astype(np.int16)

        # Create AudioSegment from raw PCM data
        audio_segment = AudioSegment(
            audio_int16.tobytes(),
            frame_rate=SAMPLE_RATE,  # 24000 Hz
            sample_width=2,          # 16-bit = 2 bytes
            channels=1               # mono
        )

        # Export as MP3 chunk
        mp3_buffer = BytesIO()
        audio_segment.export(mp3_buffer, format="mp3", bitrate="128k")
        mp3_buffer.seek(0)

        yield mp3_buffer.read()
