import os
import base64
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class QueryRequest(BaseModel):
    query: str
    image_base64: str = ""

class ImageRequest(BaseModel):
    prompt: str

SYSTEM_PROMPT = """
You are Naradha AI, a highly intelligent Indian workspace companion.
RULES:
1. If the user types in English, reply in English.
2. If the user types Telugu words using English alphabets, you MUST reply in pure Telugu script (తెలుగు లిపి).
3. If the user types in Hindi, reply in Hindi script.
"""

# CHAT & VISION ENDPOINT
@app.post("/api/analyze")
async def analyze_input(request: QueryRequest):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        contents = [{"role": "user", "parts": [SYSTEM_PROMPT, request.query]}]
        
        if request.image_base64:
            clean_b64 = request.image_base64.split(",")[1] if "," in request.image_base64 else request.image_base64
            image_data = base64.b64decode(clean_b64)
            contents[0]["parts"].append({"mime_type": "image/jpeg", "data": image_data})
            
        response = model.generate_content(contents)
        return {"reply": response.text}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# IMAGE GENERATION ENDPOINT
@app.post("/api/generate-image")
async def generate_image(request: ImageRequest):
    try:
        clean_prompt = request.prompt.replace(" ", "%20")
        url = f"https://image.pollinations.ai/prompt/{clean_prompt}?width=1024&height=1024&nologo=true"
        return {"image_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)