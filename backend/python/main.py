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
from firestore_db_analyzer_ai_response_parser import FirestoreDbAnalyzerAIResponseParser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DPGNotesPythonServer")

# ==========================================
# FIREBASE ADMIN SDK INIT
# ==========================================
import json
import base64

db = None
try:
    if not firebase_admin._apps:
        service_account_dict = None

        # 1. Check FIREBASE_SERVICE_ACCOUNT env var
        fb_env = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        if fb_env:
            fb_env = fb_env.strip()
            if not fb_env.startswith("{"):
                try:
                    fb_env = base64.b64decode(fb_env).decode("utf-8")
                except Exception:
                    pass
            try:
                service_account_dict = json.loads(fb_env)
            except Exception as pe:
                logger.warning(f"Failed parsing FIREBASE_SERVICE_ACCOUNT env var: {pe}")

        # 2. Fallback to serviceAccountKey.json file paths
        if not service_account_dict:
            possible_paths = [
                os.getenv("GOOGLE_APPLICATION_CREDENTIALS", ""),
                "serviceAccountKey.json",
                "../serviceAccountKey.json",
                "../../serviceAccountKey.json"
            ]
            for p in possible_paths:
                if p and os.path.exists(p):
                    try:
                        with open(p, "r", encoding="utf-8") as f:
                            service_account_dict = json.load(f)
                            break
                    except Exception:
                        pass

        # 3. Validate private_key before passing to Certificate
        if service_account_dict and isinstance(service_account_dict, dict):
            pk = service_account_dict.get("private_key", "")
            if pk and pk != "REPLACE_ME":
                # Fix escaped newlines in private key string
                service_account_dict["private_key"] = pk.replace("\\n", "\n")
                cred = credentials.Certificate(service_account_dict)
                firebase_admin.initialize_app(cred)
                db = firestore.client()
                logger.info("Firebase Admin initialized successfully in Python Server via Service Account.")
            else:
                logger.warning("Service Account JSON contains 'REPLACE_ME' placeholder key. Initializing default app.")
                firebase_admin.initialize_app()
                db = firestore.client()
        else:
            firebase_admin.initialize_app()
            db = firestore.client()
            logger.info("Firebase Admin initialized via default application credentials.")
except Exception as e:
    logger.warning(f"Firebase Admin initialization skipped: {e}")

# Initialize Submodules
pdf_reader = CloudinaryPdfContentReader()
screen_scanner = ScreenScanner()
device_tracker = IPDeviceTracker(db_client=db)
ai_processor = AIProcessor()
knowledge_builder = KnowledgeMdBuilder(db_client=db)
db_analyzer = FirestoreDbAnalyzerAIResponseParser(db_client=db)

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
    permissionGranted: Optional[bool] = False
    hardwareInfo: Optional[dict] = None

class AIChatRequest(BaseModel):
    prompt: str
    systemContext: Optional[str] = ""
    resourceId: Optional[str] = None

# ==========================================
# API ENDPOINTS
# ==========================================
@app.api_route("/", methods=["GET", "HEAD", "POST", "OPTIONS"])
@app.api_route("/health", methods=["GET", "HEAD", "POST", "OPTIONS"])
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

@app.api_route("/api/guest-quota", methods=["GET", "POST"])
@app.api_route("/api/py/guest-quota", methods=["GET", "POST"])
def track_guest_quota(req: Optional[GuestQuotaRequest] = None, request: Request = None, guestId: Optional[str] = "guest_anon", action: Optional[str] = "page_visit"):
    """Tracks Device IP and Guest ID for daily quota (6 Visits / 3 PDFs per day)."""
    headers = dict(request.headers) if request else {}
    remote_addr = request.client.host if (request and request.client) else "127.0.0.1"

    g_id = req.guestId if req else guestId
    act = req.action if req else action

    result = device_tracker.process_guest_quota(
        headers=headers,
        remote_addr=remote_addr,
        guest_id=g_id,
        action=act
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
        remote_addr=remote_addr,
        permission_granted=req.permissionGranted,
        hardware_info=req.hardwareInfo
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

class DbAnalyzeRequest(BaseModel):
    prompt: str
    resourceId: Optional[str] = None
    legalPdfUrls: Optional[List[str]] = []

@app.post("/api/py/db-ai-analyze")
def db_ai_analyze(req: DbAnalyzeRequest):
    """Parses Firestore resource DB, knowledge.md, and Legal PDFs to generate context-rich Gemini AI responses."""
    if req.legalPdfUrls:
        db_analyzer.read_legal_notes_pdf_in_advance(req.legalPdfUrls)

    context = db_analyzer.build_comprehensive_ai_context(user_query=req.prompt, resource_id=req.resourceId)
    answer = ai_processor.generate_ai_response(prompt=req.prompt, system_context=context)

    return {
        "success": True,
        "answer": answer,
        "contextSnippet": context[:500] if context else ""
    }


# ==========================================
# QUIZ ATTEMPT & DEVICE TRACKING ENDPOINTS
# ==========================================
class QuizAttemptTrackRequest(BaseModel):
    quizId: str
    attemptId: Optional[str] = None
    candidateType: str = "guest"  # "guest" or "contributor"
    candidateUid: Optional[str] = None
    studentId: str
    candidateName: str
    collegeName: Optional[str] = None
    universityName: Optional[str] = None
    guestId: Optional[str] = "guest_anon"
    deviceClientId: Optional[str] = "dev_unknown"
    action: Optional[str] = "track"
    score: Optional[float] = 0.0
    maximumScore: Optional[float] = 0.0
    percentage: Optional[float] = 0.0
    umcFlag: Optional[bool] = False
    hardwareInfo: Optional[dict] = None

@app.post("/api/py/quiz-attempt-check")
@app.api_route("/api/quiz/check-attempt", methods=["POST", "OPTIONS"])
def check_quiz_attempt(req: QuizAttemptTrackRequest, request: Request):
    """
    Checks if this candidate (by Student ID, Contributor UID, Device Client ID, or IP)
    has already submitted this quiz.
    """
    headers = dict(request.headers)
    remote_addr = request.client.host if request.client else "127.0.0.1"
    ip = device_tracker.extract_client_ip(headers, remote_addr)

    if not db:
        return {"allowed": True, "clientIp": ip, "reason": "DB offline"}

    try:
        # Check by student ID
        safe_sid = re.sub(r"[^a-zA-Z0-9_\-]", "_", req.studentId.strip().lower())
        sid_doc = db.collection("quizAttemptsLookup").document(f"{req.quizId}_sid_{safe_sid}").get()
        if sid_doc.exists:
            data = sid_doc.to_dict()
            if not data.get("allowedRetest", False):
                return {
                    "allowed": False,
                    "blockReason": f"Single Attempt Restriction: An examination record with Student ID '{req.studentId}' has already been submitted for this quiz.",
                    "existingAttempt": data
                }

        # Check by candidate UID if authenticated
        if req.candidateUid and req.candidateType == "registered":
            uid_doc = db.collection("quizAttemptsLookup").document(f"{req.quizId}_uid_{req.candidateUid}").get()
            if uid_doc.exists:
                data = uid_doc.to_dict()
                if not data.get("allowedRetest", False):
                    return {
                        "allowed": False,
                        "blockReason": "Single Attempt Restriction: Your authenticated account has already completed this examination.",
                        "existingAttempt": data
                    }

        # Check by Device Client ID
        if req.deviceClientId and req.deviceClientId != "dev_unknown":
            safe_dev = re.sub(r"[^a-zA-Z0-9_\-]", "_", req.deviceClientId)
            dev_doc = db.collection("quizAttemptsLookup").document(f"{req.quizId}_dev_{safe_dev}").get()
            if dev_doc.exists:
                data = dev_doc.to_dict()
                if not data.get("allowedRetest", False):
                    return {
                        "allowed": False,
                        "blockReason": f"Single Attempt Restriction: This device has already completed an attempt for this quiz (Student ID: {data.get('studentId', 'N/A')}).",
                        "existingAttempt": data
                    }

    except Exception as e:
        logger.warning(f"Error checking quiz attempt uniqueness: {e}")

    return {"allowed": True, "clientIp": ip}

@app.post("/api/py/quiz-attempt-track")
@app.api_route("/api/quiz/track-attempt", methods=["POST", "OPTIONS"])
def track_quiz_attempt(req: QuizAttemptTrackRequest, request: Request):
    """
    Tracks and enforces one-attempt-per-quiz rules for Guests and Contributors.
    Captures Client IP, Device IP, User Agent, Geolocation, Guest ID, and Device Client ID.
    """
    headers = dict(request.headers)
    remote_addr = request.client.host if request.client else "127.0.0.1"

    ip = device_tracker.extract_client_ip(headers, remote_addr)
    ua_info = device_tracker.parse_user_agent(headers.get("user-agent", ""))
    geo_info = device_tracker.fetch_ip_geolocation(ip)

    record = {
        "quizId": req.quizId,
        "attemptId": req.attemptId,
        "candidateType": req.candidateType,
        "candidateUid": req.candidateUid,
        "studentId": req.studentId.strip(),
        "candidateName": req.candidateName.strip(),
        "collegeName": req.collegeName,
        "universityName": req.universityName,
        "guestId": req.guestId,
        "deviceClientId": req.deviceClientId,
        "clientIp": ip,
        "browser": ua_info.get("browser", "Unknown"),
        "os": ua_info.get("os", "Unknown"),
        "device": ua_info.get("device", "Desktop"),
        "isMobile": ua_info.get("isMobile", False),
        "country": geo_info.get("country", "Unknown"),
        "city": geo_info.get("city", "Unknown"),
        "region": geo_info.get("region", "Unknown"),
        "isp": geo_info.get("isp", "Unknown"),
        "score": req.score,
        "maximumScore": req.maximumScore,
        "percentage": req.percentage,
        "umcFlag": req.umcFlag,
        "hardwareInfo": req.hardwareInfo or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    if db:
        try:
            # 1. Store in quiz_device_tracking
            tracking_doc_id = req.attemptId or f"track_{req.quizId}_{req.guestId}_{int(datetime.now().timestamp())}"
            db.collection("quiz_device_tracking").document(tracking_doc_id).set(record, merge=True)

            # 2. Maintain unique lock records in quizAttemptsLookup
            safe_sid = re.sub(r"[^a-zA-Z0-9_\-]", "_", req.studentId.strip().lower())
            sid_doc_id = f"{req.quizId}_sid_{safe_sid}"
            db.collection("quizAttemptsLookup").document(sid_doc_id).set({
                "quizId": req.quizId,
                "studentId": req.studentId.strip(),
                "candidateName": req.candidateName.strip(),
                "collegeName": req.collegeName,
                "universityName": req.universityName,
                "candidateUid": req.candidateUid,
                "candidateType": req.candidateType,
                "deviceClientId": req.deviceClientId,
                "guestId": req.guestId,
                "clientIp": ip,
                "attemptId": req.attemptId,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, merge=True)

            # Also index by device client ID
            if req.deviceClientId and req.deviceClientId != "dev_unknown":
                safe_dev = re.sub(r"[^a-zA-Z0-9_\-]", "_", req.deviceClientId)
                dev_doc_id = f"{req.quizId}_dev_{safe_dev}"
                db.collection("quizAttemptsLookup").document(dev_doc_id).set({
                    "quizId": req.quizId,
                    "studentId": req.studentId.strip(),
                    "deviceClientId": req.deviceClientId,
                    "clientIp": ip,
                    "attemptId": req.attemptId,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, merge=True)

            # Also index by registered candidate UID
            if req.candidateUid and req.candidateType == "registered":
                uid_doc_id = f"{req.quizId}_uid_{req.candidateUid}"
                db.collection("quizAttemptsLookup").document(uid_doc_id).set({
                    "quizId": req.quizId,
                    "studentId": req.studentId.strip(),
                    "candidateUid": req.candidateUid,
                    "clientIp": ip,
                    "attemptId": req.attemptId,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, merge=True)

        except Exception as e:
            logger.error(f"Error persisting quiz attempt telemetry: {e}")

    return {
        "success": True,
        "clientIp": ip,
        "deviceClientId": req.deviceClientId,
        "guestId": req.guestId,
        "record": record
    }
