# Deploying Python AI & Crawler Services on Render for DPGNotes

This guide explains how to deploy Python Web Crawlers and AI Workers on Render alongside your Node.js Express backend.

---

## 🏗️ Architecture Options

### Option 1: Dedicated Python Web Service / Worker (Recommended)
Deploying a separate Render Web Service for Python allows independent scaling, isolated dependencies, and zero interference with Node.js Express API performance.

#### Step 1: Add a `requirements.txt` in your Python backend folder
```txt
fastapi>=0.100.0
uvicorn>=0.22.0
requests>=2.31.0
beautifulsoup4>=4.12.2
google-generativeai>=0.3.0
firebase-admin>=6.2.0
python-dotenv>=1.0.0
```

#### Step 2: Create `main.py` (FastAPI / Uvicorn Server)
```python
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai

app = FastAPI(title="DPGNotes Python AI Crawler")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class TrainRequest(BaseModel):
    resourceId: str
    urls: list[str] = []
    faqs: list[dict] = []

@app.get("/")
def health_check():
    return {"status": "Python AI Crawler is active"}

@app.post("/api/py/train-model")
async def train_model(req: TrainRequest):
    # Process links and generate knowledge.md
    return {"success": True, "resourceId": req.resourceId}
```

#### Step 3: Render Dashboard Setup
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub Repository `Akshat-881236/DPGNotes`.
4. Configure settings:
   - **Name**: `dpgnotes-python-service`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/python/requirements.txt`
   - **Start Command**: `uvicorn backend.python.main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `GEMINI_API_KEY`: Your Gemini API Key
   - `FIREBASE_CREDENTIALS`: Service Account JSON content

---

### Option 2: Multi-Stage Dockerfile (Unified Node.js + Python Service)
If you prefer running Node.js and Python inside the **same Render Web Service**, use a custom Dockerfile:

#### Create `Dockerfile` in root directory:
```dockerfile
# Stage 1: Build Node.js + Python Runtime
FROM node:18-bullseye

# Install Python 3 & pip
RUN apt-get update && apt-get install -y python3 python3-pip python3-bs4

WORKDIR /app

# Copy package files & install Node dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy application files
COPY . .

EXPOSE 10000

ENV PORT=10000

CMD ["node", "backend/server.js"]
```

---

## ⚡ Connecting Render Service to DPGNotes Frontend

Set `window.API_BASE_URL` in `config.js` to point to your deployed Render URL:
```javascript
window.API_BASE_URL = "https://dpgnotes-api.onrender.com"; // or Python service URL
```
