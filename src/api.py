# src/api.py
from __future__ import annotations

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from PIL import Image
from tempfile import NamedTemporaryFile
import io
import sys

import torch
from torch import nn
from torchvision import models, transforms

# Make "from ocr_utils import ocr_image" work when running as module
sys.path.append(str(Path(__file__).resolve().parent))
from ocr_utils import ocr_image

# NEW imports for QR + XML
from qr_utils import decode_qr_from_image
from xml_utils import parse_offline_xml

# NEW: DB utils (seed + lookup)
from db_utils import init_db, get_person_by_aadhaar

# ---------------------------
# Paths
# ---------------------------
ARTIFACTS_DIR = Path("artifacts")
WEIGHTS = ARTIFACTS_DIR / "best_resnet18.pt"
CLASSES_FILE = ARTIFACTS_DIR / "classes.txt"

# warn (do not abort) if artifacts missing
if not WEIGHTS.exists():
    print("WARNING: artifacts/best_resnet18.pt missing — prediction endpoints will be disabled until you restore model weights.")
if not CLASSES_FILE.exists():
    print('WARNING: artifacts/classes.txt missing — using fallback classes ["real","fake"]')

# ---------------------------
# Device Setup
# ---------------------------
def get_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")   # Apple Silicon
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")

device = get_device()

# ---------------------------
# Load classes
# ---------------------------
def load_classes(path: Path) -> list[str]:
    return [l.strip() for l in path.read_text().splitlines() if l.strip()]

if CLASSES_FILE.exists():
    classes = load_classes(CLASSES_FILE)
else:
    classes = ["real", "fake"]

# ---------------------------
# Build Model (must match training head)
# ---------------------------
def build_model(num_classes: int, device: torch.device) -> torch.nn.Module:
    model = models.resnet18(weights=None)
    in_feats = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_feats, num_classes)
    )
    state = torch.load(WEIGHTS, map_location=device)
    model.load_state_dict(state, strict=True)
    model.eval().to(device)
    return model

# load model only if weights exist
if WEIGHTS.exists():
    try:
        model = build_model(len(classes), device)
        print("Model loaded from artifacts/best_resnet18.pt")
    except Exception as e:
        model = None
        print("Failed to load model:", e)
else:
    model = None
    print("Prediction model not loaded (artifacts missing). /predict and /analyze will return 503 until model is restored.")

# ---------------------------
# Image Transform
# ---------------------------
tfm = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],[0.229, 0.224, 0.225])
])

# ---------------------------
# Response Schemas
# ---------------------------
class PredictResponse(BaseModel):
    predicted_label: str
    confidence: float
    verified: bool
    classes: list[str]

class AnalyzeResponse(BaseModel):
    predicted_label: str
    confidence: float
    verified: bool
    classes: list[str]
    ocr: dict

# ---------------------------
# FastAPI App
# ---------------------------
app = FastAPI(
    title="Unique Identification Authority Of India — Aadhaar Fraud Detector API",
    description="OCR + QR + Tamper detection for Aadhaar-like cards (dev environment).",
    version="1.4"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ---------------------------
# Startup: ensure DB seeded
# ---------------------------
@app.on_event("startup")
def startup_event():
    # ensure DB exists & seeded on server start (use seed=True for initial dev)
    init_db(seed=True)

# ---------------------------
# Routes
# ---------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def home():
    return {
        "status": "ok",
        "device": str(device),
        "classes": classes,
        "message": "Unique Identification Authority Of India — Aadhaar Fraud Detector API Running ✅"
    }

@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Prediction model unavailable on server (artifacts missing).")
    try:
        content = await file.read()
        img = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file format")

    x = tfm(img).unsqueeze(0).to(device)
    with torch.no_grad():
        probs = torch.softmax(model(x), dim=1)[0]
        conf, idx = torch.max(probs, dim=0)

    label = classes[int(idx)]
    confidence = float(conf)
    verified = (label.lower() == "real") and (confidence >= 0.80)

    return PredictResponse(
        predicted_label=label,
        confidence=confidence,
        verified=verified,
        classes=classes
    )

@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    try:
        content = await file.read()
        with NamedTemporaryFile(delete=True, suffix=".jpg") as tmp:
            tmp.write(content)
            tmp.flush()
            fields = ocr_image(tmp.name)
        return fields
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OCR failed: {e}")

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile = File(...)):
    if model is None:
        # still attempt OCR-only analysis if possible
        try:
            content = await file.read()
            img = Image.open(io.BytesIO(content)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file format")
        # attempt OCR
        try:
            with NamedTemporaryFile(delete=True, suffix=".jpg") as tmp:
                tmp.write(content)
                tmp.flush()
                fields = ocr_image(tmp.name)
        except Exception:
            fields = {"ocr_error": True}
        # inform client that prediction isn't available but OCR was attempted
        return AnalyzeResponse(predicted_label="N/A", confidence=0.0, verified=False, classes=classes, ocr=fields)

    try:
        content = await file.read()
        img = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file format")

    x = tfm(img).unsqueeze(0).to(device)
    with torch.no_grad():
        probs = torch.softmax(model(x), dim=1)[0]
        conf, idx = torch.max(probs, dim=0)
    label = classes[int(idx)]
    confidence = float(conf)
    verified = (label.lower() == "real") and (confidence >= 0.80)

    try:
        with NamedTemporaryFile(delete=True, suffix=".jpg") as tmp:
            tmp.write(content)
            tmp.flush()
            fields = ocr_image(tmp.name)
    except Exception:
        fields = {"ocr_error": True}

    return AnalyzeResponse(
        predicted_label=label,
        confidence=confidence,
        verified=verified,
        classes=classes,
        ocr=fields
    )

# ---------- Aadhaar QR ----------
@app.post("/verify-qr")
async def verify_qr(file: UploadFile = File(...)):
    try:
        content = await file.read()
        result = decode_qr_from_image(content)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"QR decode failed: {e}")

# ---------- Offline XML (kept for dev) ----------
@app.post("/verify-xml")
async def verify_xml(file: UploadFile = File(...)):
    try:
        filename = (file.filename or "").lower()
        content = await file.read()
        if filename.endswith(".zip"):
            return {"error": "UIDAI eKYC ZIP (password-protected) not implemented here. Upload extracted XML."}
        result = parse_offline_xml(content)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"XML parse failed: {e}")

# ---------- DB endpoints (seed + lookup) ----------
@app.post("/seed-aadhaar")
def seed_aadhaar():
    """
    (Dev) Recreate the local sqlite DB and insert the fixed seed records.
    Calling this will clear existing `persons` rows and re-insert the seed.
    """
    path = init_db(seed=True)
    return {"status": "ok", "db": str(path)}

@app.get("/aadhaar/{aadhaar}")
def lookup_aadhaar(aadhaar: str):
    """
    Lookup a 12-digit Aadhaar in the seeded DB.
    Returns 404 if not found or invalid.
    """
    person = get_person_by_aadhaar(aadhaar)
    if not person:
        raise HTTPException(status_code=404, detail="Aadhaar not found or invalid number")
    return {"status": "ok", "person": person}

# Convenience query endpoint used by frontend: GET /lookup?aadhar=XXXXXXXXXXXX
@app.get("/lookup")
def lookup_query(aadhar: str = Query(..., alias="aadhar")):
    """
    Query param lookup alias for /aadhaar/{aadhaar}
    Example: GET /lookup?aadhar=111122223333
    """
    person = get_person_by_aadhaar(aadhar)
    if not person:
        raise HTTPException(status_code=404, detail="Aadhaar not found or invalid number")
    return person
