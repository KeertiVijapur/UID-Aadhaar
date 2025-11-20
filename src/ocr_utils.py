from __future__ import annotations
from typing import Dict, Any, List, Tuple, Optional
import re, io, base64
import cv2
import numpy as np
from PIL import Image
import easyocr

# Toggle to print stitched text for debugging
DEBUG = False

# ----------------- helpers -----------------
def _b64_png(img: np.ndarray) -> str:
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    buf = io.BytesIO()
    Image.fromarray(rgb).save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

def normalize_digits(s: str) -> str:
    # common OCR confusions
    return (s.replace("O", "0").replace("o", "0")
             .replace("I", "1").replace("l", "1")
             .replace("B", "8").replace("S", "5")
             .replace("Z", "2").replace("z", "2")
             .replace("q", "9").replace("G", "6"))

HEADER_KEYS = [
    "government of india", "govt of india", "uidai",
    "aadhaar", "aadhar", "आधार", "भारत सरकार", "मेरी पहचान"
]

DOB_KEYS_EN = ("dob", "d.o.b", "date of birth", "year of birth")
DOB_KEYS_HI = ("जन्म तिथि", "जन्मतिथि", "जन्म", "जन्म वर्ष")

# Fuzzy match “MALE”, “FEMALE” even with spaces/dashes/1-l swap
def _fuzzy_token_regex(token: str) -> re.Pattern:
    def ch(c: str) -> str:
        if c.lower() == "l": return r"(?:l|1|I)"
        if c.lower() == "a": return r"(?:a|@)"
        if c.lower() == "e": return r"(?:e|€)"
        return re.escape(c)
    body = r"[\W_]*".join(ch(c) for c in token)
    return re.compile(rf"\b{body}\b", re.I)

RE_MALE   = _fuzzy_token_regex("male")
RE_FEMALE = _fuzzy_token_regex("female")

DATE_RE = re.compile(
    r"(?:[0-3]?\d[\/\-.][01]?\d[\/\-.](?:19|20)\d{2})"
    r"|(?:[0-3]?\d\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*(?:19|20)\d{2})",
    re.I,
)

AADHAAR_RE = re.compile(r"\b(\d{4}\s?\d{4}\s?\d{4})\b")

# ----------------- EasyOCR singleton -----------------
_READER = None
def get_reader():
    # English + Hindi only (Tamil combo is restricted in EasyOCR)
    global _READER
    if _READER is None:
        _READER = easyocr.Reader(['en', 'hi'], gpu=False)
    return _READER

# ----------------- pre-processing -----------------
def _deskew(gray: np.ndarray) -> np.ndarray:
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLines(edges, 1, np.pi/180, 160)
    if lines is None:
        return gray
    angles = []
    for rho, theta in lines[:, 0]:
        a = (theta * 180 / np.pi) - 90
        if -45 < a < 45:
            angles.append(a)
    if not angles:
        return gray
    angle = float(np.median(angles))
    h, w = gray.shape[:2]
    M = cv2.getRotationMatrix2D((w//2, h//2), angle, 1.0)
    return cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

def _largest_rect_crop(img: np.ndarray) -> np.ndarray:
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.GaussianBlur(g, (5,5), 0)
    t = cv2.adaptiveThreshold(g,255,cv2.ADAPTIVE_THRESH_MEAN_C,cv2.THRESH_BINARY_INV,35,15)
    t = cv2.morphologyEx(t, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT,(5,5)), 2)
    cnts,_ = cv2.findContours(t, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return img
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
    for c in cnts[:5]:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02*peri, True)
        if len(approx) == 4 and cv2.contourArea(approx) > img.shape[0]*img.shape[1]*0.15:
            pts = approx.reshape(4,2).astype(np.float32)
            s = pts.sum(axis=1); d = np.diff(pts, axis=1)
            tl, br = pts[np.argmin(s)], pts[np.argmax(s)]
            tr, bl = pts[np.argmin(d)], pts[np.argmax(d)]
            wA = np.linalg.norm(br-bl); wB = np.linalg.norm(tr-tl)
            hA = np.linalg.norm(tr-br); hB = np.linalg.norm(tl-bl)
            W, H = int(max(wA,wB)), int(max(hA,hB))
            M = cv2.getPerspectiveTransform(np.array([tl,tr,br,bl]),
                                            np.array([[0,0],[W-1,0],[W-1,H-1],[0,H-1]], dtype="float32"))
            return cv2.warpPerspective(img, M, (W,H))
    return img

def enhance_for_ocr(img_bgr: np.ndarray) -> np.ndarray:
    img_bgr = _largest_rect_crop(img_bgr)
    h, w = img_bgr.shape[:2]
    scale = 2.1 if max(h, w) < 1200 else 1.6
    img = cv2.resize(img_bgr, (int(w*scale), int(h*scale)), interpolation=cv2.INTER_CUBIC)
    img = cv2.bilateralFilter(img, 7, 55, 55)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = _deskew(gray)
    clahe = cv2.createCLAHE(2.0, (8,8))
    gray = clahe.apply(gray)
    blur = cv2.GaussianBlur(gray, (0,0), 1.2)
    sharp = cv2.addWeighted(gray, 1.6, blur, -0.6, 0)
    th = cv2.adaptiveThreshold(sharp,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY,31,9)
    if np.mean(th) < 110:
        th = cv2.bitwise_not(th)
    return cv2.cvtColor(th, cv2.COLOR_GRAY2BGR)

# ----------------- OCR core -----------------
def _read_lines(img_bgr: np.ndarray, min_conf=0.35):
    reader = get_reader()
    results = reader.readtext(img_bgr)  # [(box, text, conf)]
    lines = []
    for (box, text, conf) in results:
        if not text or conf < min_conf:
            continue
        xs = [int(p[0]) for p in box]; ys = [int(p[1]) for p in box]
        bb = (min(xs), min(ys), max(xs), max(ys))
        lines.append((text.strip(), float(conf), bb))
    lines.sort(key=lambda t: (t[2][1], t[2][0]))  # by y, then x
    return lines  # [(text, conf, (x1,y1,x2,y2))]

def _stitch(lines: List[Tuple[str,float,Tuple[int,int,int,int]]]) -> List[str]:
    out = []; seen = set()
    for t, _, _ in lines:
        s = t.strip()
        if not s or s in seen: continue
        seen.add(s); out.append(s)
    return out

# ----------------- parsing -----------------
def _looks_like_header(s: str) -> bool:
    return any(k in s.lower() for k in HEADER_KEYS)

def _pick_name(lines: List[str]) -> Optional[str]:
    stop = ("dob", "d.o.b", "date of birth", "year of birth",
            "gender", "male", "female", "जन्म", "लिंग", "पुरुष", "महिला")
    cands = []
    for ln in lines:
        low = ln.lower()
        if _looks_like_header(ln): continue
        if any(k in low for k in stop): continue
        if re.search(r"\d", ln): continue
        words = re.findall(r"[A-Za-zअ-ह]+", ln)
        if 2 <= len(words) <= 4 and len("".join(words)) >= 5:
            cands.append(ln.strip())
    return cands[0] if cands else None

def _name_from_dob_context(lines: List[str]) -> Optional[str]:
    # If we find DOB/YOB line, try the 1–2 lines above it as name
    for i, ln in enumerate(lines):
        low = ln.lower()
        if any(k in low for k in DOB_KEYS_EN + DOB_KEYS_HI):
            for j in (i-1, i-2):
                if j >= 0:
                    cand = lines[j].strip()
                    if not cand: continue
                    if _looks_like_header(cand): continue
                    if re.search(r"\d", cand): continue
                    words = re.findall(r"[A-Za-zअ-ह]+", cand)
                    if 2 <= len(words) <= 4 and len("".join(words)) >= 5:
                        return cand
    return None

# --- NEW: stronger gender detection ---
# Includes English, Hindi/Marathi, Tamil; supports "Gender: M/F" single-letter cases.
RE_GENDER_KEY = re.compile(r"\b(gender|sex|लिंग)\b", re.I)
RE_SINGLE_MF   = re.compile(r"\b([mf])\b", re.I)
RE_TAMIL_MALE  = re.compile(r"ஆண்")
RE_TAMIL_FEMALE= re.compile(r"பெண்")
RE_HI_MALE     = re.compile(r"पुरुष")
RE_HI_FEMALE   = re.compile(r"महिला")

def _detect_gender_from_lines(lines: List[str]) -> Optional[str]:
    # 1) Priority: look at lines that mention gender/sex explicitly
    for ln in lines:
        low = ln.lower()
        if RE_GENDER_KEY.search(low):
            # direct words
            if RE_FEMALE.search(ln) or RE_HI_FEMALE.search(ln) or RE_TAMIL_FEMALE.search(ln):
                return "FEMALE"
            if RE_MALE.search(ln) or RE_HI_MALE.search(ln) or RE_TAMIL_MALE.search(ln):
                return "MALE"
            # single-letter markers near gender key
            m = RE_SINGLE_MF.search(ln)
            if m:
                return "FEMALE" if m.group(1).lower() == "f" else "MALE"

            # patterns like "Male / Female" with a tick near one side often
            # OCR may drop the tick—fallback to the first word after key:
            m2 = re.search(r"(male|female)", low, re.I)
            if m2:
                return "FEMALE" if m2.group(1).lower().startswith("f") else "MALE"

    # 2) Whole-text fallback (bilingual)
    blob = "\n".join(lines)
    if RE_FEMALE.search(blob) or RE_HI_FEMALE.search(blob) or RE_TAMIL_FEMALE.search(blob):
        return "FEMALE"
    if RE_MALE.search(blob) or RE_HI_MALE.search(blob) or RE_TAMIL_MALE.search(blob):
        return "MALE"

    # 3) Last resort: isolated single-letter M/F line
    for ln in lines:
        if re.fullmatch(r"[*•\-\s]*[mM][*\s•\-]*", ln):
            return "MALE"
        if re.fullmatch(r"[*•\-\s]*[fF][*\s•\-]*", ln):
            return "FEMALE"

    return None

def _find_number_in_band(enh: np.ndarray) -> Optional[str]:
    """Scan the bottom band where the 12-digit number usually sits."""
    h, w = enh.shape[:2]
    band = enh[int(h*0.55):, :]  # lower 45%
    reader = get_reader()
    results = reader.readtext(band)
    tokens = []
    for (box, text, conf) in results:
        if conf < 0.20 or not text:  # very permissive
            continue
        tokens.append(text)
    if not tokens:
        return None
    s = normalize_digits(" ".join(tokens))
    m = AADHAAR_RE.search(s)
    if m:
        return re.sub(r"\s+", "", m.group(1))
    # last try: pull 12 consecutive digits from noisy string
    only = re.sub(r"\D", "", s)
    if len(only) >= 12:
        return only[:12]
    return None

def parse_fields(lines: List[str],
                 raw_lines: List[Tuple[str,float,Tuple[int,int,int,int]]] | None = None,
                 enh_img: np.ndarray | None = None) -> Dict[str, Any]:
    text_all = "\n".join(lines)
    text_all_norm = normalize_digits(text_all)

    fields = {
        "aadhaar_number": None,
        "dob": None,
        "yob": None,
        "gender": None,
        "name": None,
        "raw_text": text_all if DEBUG else ""
    }

    # Aadhaar number — from text; fallback: bottom band sweep
    m = AADHAAR_RE.search(text_all_norm)
    if m:
        fields["aadhaar_number"] = re.sub(r"\s+", "", m.group(1))
    elif enh_img is not None:
        n = _find_number_in_band(enh_img)
        if n: fields["aadhaar_number"] = n

    # DOB/YOB
    dob = None
    for ln in lines:
        low = ln.lower()
        if any(k in low for k in DOB_KEYS_EN + DOB_KEYS_HI):
            m = DATE_RE.search(normalize_digits(ln))
            if m:
                dob = m.group(0); break
    if not dob:
        m = DATE_RE.search(text_all_norm)
        if m: dob = m.group(0)
    if dob:
        fields["dob"] = dob
    else:
        y = re.search(r"(?:19|20)\d{2}", text_all_norm)
        if y: fields["yob"] = y.group(0)

    # Gender (improved)
    fields["gender"] = _detect_gender_from_lines(lines)

    # Name
    nm = _name_from_dob_context(lines) or _pick_name(lines)
    if nm:
        fields["name"] = nm.strip(" :-_|—")

    return fields

# ----------------- public API -----------------
def ocr_image(image_path: str) -> Dict[str, Any]:
    # read & enhance
    data = np.fromfile(image_path, dtype=np.uint8)
    img0 = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img0 is None:
        img0 = cv2.imread(image_path)
    if img0 is None:
        return {"error": "Could not read image"}

    enh = enhance_for_ocr(img0)

    # EasyOCR on enhanced; if very few lines, also on original and merge
    lines_enh = _read_lines(enh, min_conf=0.35)
    lines_raw = []
    if len(lines_enh) < 6:
        lines_raw = _read_lines(img0, min_conf=0.30)

    # merge texts (dedupe)
    texts = _stitch(lines_enh + lines_raw)

    if DEBUG:
        print("\n==== OCR STITCHED ====\n", "\n".join(texts[:60]), "\n======================\n")

    fields = parse_fields(texts, raw_lines=lines_enh + lines_raw, enh_img=enh)
    # If you want to show the processed image in UI, uncomment:
    # fields["enhanced_image_b64"] = _b64_png(enh)
    return fields
