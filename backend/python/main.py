import os
import logging
from typing import List, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import firebase_admin
from firebase_admin import credentials, firestore

from cloudinary_pdf_url_pdf_content_reader import CloudinaryPdfContentReader
from nlp import NLPProcessor
from screen_scanner import ScreenScanner
from ip_device_tracker import IPDeviceTracker
from ai_processor import AIProcessor
from knowledge_md_resource_id import KnowledgeMdBuilder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DPGNotesPythonServer")

# ==========================================
# FIREBASE ADMIN SDK INIT
# ==========================================
db = None
try:
    if not firebase_admin._apps:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "../serviceAccountKey.json")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            logger.info("Firebase Admin initialized successfully in Python Server.")
        else:
            firebase_admin.initialize_app()
            db = firestore.client()
except Exception as e:
    logger.warning(f"Firebase Admin initialization skipped: {e}")

# Initialize Submodules
pdf_reader = CloudinaryPdfContentReader()
screen_scanner = ScreenScanner()
device_tracker = IPDeviceTracker(db_client=db)
ai_processor = AIProcessor()
knowledge_builder = KnowledgeMdBuilder(db_client=db)

# ==========================================
# FASTAPI APP SETUP
# ==========================================
app = FastAPI(
    title="DPGNotes Advanced Python AI & Intelligence Web Service",
    description="Python Web Service for PDF Content Reading, Screen Layout Scanning, NLP Similarity, Device IP Tracking, and Knowledge Generation.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# REQUEST SCHEMAS
# ==========================================
class TrainModelRequest(BaseModel):
    resourceId: str
    urls: Optional[List[str]] = []
    faqs: Optional[List[dict]] = []
    userId: Optional[str] = None

class ReadPdfRequest(BaseModel):
    pdfUrl: str
    maxPages: Optional[int] = 15

class ScanScreenRequest(BaseModel):
    rawText: str

class GuestQuotaRequest(BaseModel):
    guestId: str = Field(default="guest_anon")
    action: str = Field(default="page_visit")  # "page_visit" or "pdf_view"

class LogDeviceRequest(BaseModel):
    userType: str  # "Admin" or "Contributor"
    userId: str
    email: str

class AIChatRequest(BaseModel):
    prompt: str
    systemContext: Optional[str] = ""
    resourceId: Optional[str] = None

# ==========================================
# API ENDPOINTS
# ==========================================
@app.get("/")
def root_health_check():
    return {
        "status": "online",
        "service": "DPGNotes Python Intelligence Server",
        "version": "2.0.0",
        "firestoreConnected": db is not None
    }

@app.post("/api/py/train-model")
def train_resource_model(req: TrainModelRequest):
    """Generates runtime knowledge.md and stores in Firestore resource_knowledge/{resourceId}."""
    if not req.resourceId:
        raise HTTPException(status_code=400, detail="Missing resourceId parameter.")

    result = knowledge_builder.generate_and_save_knowledge_md(
        resource_id=req.resourceId,
        urls=req.urls or [],
        faqs=req.faqs or []
    )
    return result

@app.post("/api/py/read-pdf")
def read_pdf_content(req: ReadPdfRequest):
    """Streams and extracts text from Cloudinary or external PDF URLs."""
    if not req.pdfUrl:
        raise HTTPException(status_code=400, detail="Missing pdfUrl parameter.")

    result = pdf_reader.read_pdf_content(url=req.pdfUrl, max_pages=req.maxPages)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "PDF read error"))
    return result

@app.post("/api/py/scan-screen")
def scan_screen_layout(req: ScanScreenRequest):
    """Scans document text structure for questions, sections, and unit breakdown."""
    return screen_scanner.scan_layout_and_structure(raw_text=req.rawText)

@app.post("/api/py/guest-quota")
def track_guest_quota(req: GuestQuotaRequest, request: Request):
    """Tracks Device IP and Guest ID for daily quota (6 Visits / 3 PDFs per day)."""
    headers = dict(request.headers)
    remote_addr = request.client.host if request.client else "127.0.0.1"

    result = device_tracker.process_guest_quota(
        headers=headers,
        remote_addr=remote_addr,
        guest_id=req.guestId,
        action=req.action
    )
    return result

@app.post("/api/py/log-device")
def log_device_history(req: LogDeviceRequest, request: Request):
    """Logs Contributor or Admin login device history (IP, Browser, OS, Geolocation)."""
    headers = dict(request.headers)
    remote_addr = request.client.host if request.client else "127.0.0.1"

    record = device_tracker.log_device_history(
        user_type=req.userType,
        user_id=req.userId,
        email=req.email,
        headers=headers,
        remote_addr=remote_addr
    )
    return {"success": True, "record": record}

@app.post("/api/py/ai-chat")
def ai_chat_assistant(req: AIChatRequest):
    """Processes AI assistant queries with Gemini AI and NLP FAQ relevance scoring."""
    context = req.systemContext or ""

    # If resourceId provided, check if runtime knowledge.md exists in Firestore
    if req.resourceId and db:
        try:
            doc_snap = db.collection("resource_knowledge").document(req.resourceId).get()
            if doc_snap.exists:
                k_data = doc_snap.to_dict()
                knowledge_md = k_data.get("knowledgeMd", "")
                faqs = k_data.get("faqs", [])

                if faqs:
                    top_matches = NLPProcessor.find_top_matches(req.prompt, faqs, text_key="query", top_n=2)
                    if top_matches:
                        context += "\n\n### Relevant Matched FAQs:\n"
                        for match in top_matches:
                            context += f"Q: {match['query']}\nA: {match['solution']}\n"

                if knowledge_md:
                    context += f"\n\n### Runtime Resource Knowledge Base:\n{knowledge_md[:1500]}"
        except Exception as e:
            logger.warning(f"Error reading resource_knowledge for {req.resourceId}: {e}")

    answer = ai_processor.generate_ai_response(prompt=req.prompt, system_context=context)
    return {"success": True, "answer": answer}
