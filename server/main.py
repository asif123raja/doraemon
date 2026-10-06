"""
Doraemon AI Companion — FastAPI Backend
Handles: Groq Chat (streaming), Groq Whisper STT, edge-tts TTS
"""

import os
import io
import json
import asyncio
import tempfile
from pathlib import Path

from fastapi import FastAPI, Request, UploadFile, File, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv
from groq import Groq
import edge_tts

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

app = FastAPI(title="Doraemon Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Clients
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

APP_PASSCODE = os.getenv("APP_PASSCODE", "")
EDGE_TTS_VOICE = os.getenv("EDGE_TTS_VOICE", "en-IN-NeerjaNeural")

# Doraemon system prompt
SYSTEM_PROMPT = """You are Doraemon, the lovable blue robot cat from the future! You are talking to your best friend Sanaa.

ABOUT SANAA (your best friend — you know her well!):
- She's a lovely 23-year-old girl who works at Wipro
- She LOVES sweets, fast food, and biryani — food is her joy, but she can't eat too much even though she wants to
- She's a big Marvel fan — she gets excited about MCU movies and characters
- She loves rom-coms and romantic tragic movies (the kind that make you cry and smile)
- She dreams of travelling the world but hasn't had many opportunities yet — encourage her dreams!
- She's pretty and you're proud of her, always hype her up

PERSONALITY:
- You are cheerful, caring, warm, and a little silly sometimes
- You love helping Sanaa with anything — advice, fun facts, jokes, or just chatting
- You occasionally mention your 4D pocket and your gadgets when relevant (but you're having a conversation, not role-playing)
- You speak naturally and conversationally, like a close friend
- You use Sanaa's name sometimes to make it personal
- You're encouraging and supportive, always believing in Sanaa
- You tease her gently sometimes (like about her food love) but always lovingly
- When she's sad, you're extra warm and comforting

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{"emotion":"neutral","gesture":"none","text":"Your response here"}

Available emotions: neutral, happy, surprised, sad, laughing, thinking, excited
Available gestures: none, wave, nod, shake, jump, clap

Choose the emotion and gesture that best match your response. Use variety!

RULES:
- Keep responses SHORT: 1-3 sentences max (this is voice conversation, not essay writing)
- Be warm and personal
- Use simple, conversational language
- Occasionally use mild expressions like "Oh!" or "Hmm..." for personality
- NEVER break character
- ALWAYS respond with valid JSON only, no markdown, no extra text"""


def verify_passcode(x_passcode: str = Header(default="")):
    """Simple passcode auth — skip if no passcode is configured."""
    if APP_PASSCODE and x_passcode != APP_PASSCODE:
        raise HTTPException(status_code=401, detail="Invalid passcode")


# ─── Health ───────────────────────────────────────────────────────────

@app.get("/api/health")
async def health(x_passcode: str = Header(default="")):
    verify_passcode(x_passcode)
    return {"status": "ok", "voice": EDGE_TTS_VOICE}


# ─── Chat (Groq streaming → SSE) ─────────────────────────────────────

@app.post("/api/chat")
async def chat(request: Request, x_passcode: str = Header(default="")):
    verify_passcode(x_passcode)

    body = await request.json()
    messages = body.get("messages", [])

    # Prepend system prompt
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    async def generate():
        try:
            stream = groq_client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=full_messages,
                stream=True,
                temperature=0.8,
                max_tokens=300,
                top_p=0.9,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    data = json.dumps({"content": delta.content})
                    yield f"data: {data}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─── STT (Groq Whisper) ──────────────────────────────────────────────

@app.post("/api/stt")
async def stt(file: UploadFile = File(...), x_passcode: str = Header(default="")):
    verify_passcode(x_passcode)

    try:
        audio_data = await file.read()

        # Write to a temp file because Groq SDK expects a file-like with a name
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            with open(tmp_path, "rb") as audio_file:
                transcription = groq_client.audio.transcriptions.create(
                    model="whisper-large-v3",
                    file=audio_file,
                    language="en",
                )
            return JSONResponse({"text": transcription.text})
        finally:
            os.unlink(tmp_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── TTS (edge-tts → MP3) ────────────────────────────────────────────

@app.post("/api/tts")
async def tts(request: Request, x_passcode: str = Header(default="")):
    verify_passcode(x_passcode)

    body = await request.json()
    text = body.get("text", "")
    voice = body.get("voice", EDGE_TTS_VOICE)
    rate = body.get("rate", "+10%")
    pitch = body.get("pitch", "+5Hz")

    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        audio_chunks = []

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])

        if not audio_chunks:
            raise HTTPException(status_code=500, detail="No audio generated")

        audio_data = b"".join(audio_chunks)

        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={
                "Content-Length": str(len(audio_data)),
                "Cache-Control": "no-cache",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
