# src/qr_utils.py
from __future__ import annotations
from typing import Dict, Any, Optional
import re
import numpy as np
import cv2

try:
    from pyzbar.pyzbar import decode as zbar_decode
    _HAS_ZBAR = True
except Exception:
    _HAS_ZBAR = False

from validators import verhoeff_valid, normalize_gender, clean_name, DATE_RE

AADHAAR_RE = re.compile(r"\b(\d{4}\s?\d{4}\s?\d{4})\b")

def _decode_with_pyzbar(img_bgr: np.ndarray) -> Optional[str]:
    if not _HAS_ZBAR:
        return None
    img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    res = zbar_decode(img_gray)
    for r in res:
        try:
            txt = r.data.decode("utf-8", errors="ignore").strip()
            if txt:
                return txt
        except Exception:
            pass
    return None

def _decode_with_opencv(img_bgr: np.ndarray) -> Optional[str]:
    det = cv2.QRCodeDetector()
    val, pts, straight = det.detectAndDecode(img_bgr)
    val = (val or "").strip()
    return val or None

def _normalize_digits(s: str) -> str:
    return (s.replace("O","0").replace("o","0")
             .replace("I","1").replace("l","1")
             .replace("B","8").replace("S","5")
             .replace("Z","2").replace("z","2"))

def parse_qr_text(txt: str) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "source": "qr",
        "raw": None,  # do not echo PII; set to txt if you want raw
        "aadhaar_number": None,
        "name": None,
        "dob": None,
        "yob": None,
        "gender": None,
        "verhoeff_ok": False,
        "notes": []
    }

    tnorm = _normalize_digits(txt)

    # Aadhaar number
    m = AADHAAR_RE.search(tnorm)
    if m:
        num = re.sub(r"\s+", "", m.group(1))
        out["aadhaar_number"] = num
        out["verhoeff_ok"] = verhoeff_valid(num)

    # Key=Value pairs help
    kv = dict(re.findall(r"([A-Za-z ]+)\s*[:=]\s*([^\n\r]+)", txt, flags=re.I))

    # Name
    name = kv.get("Name") or kv.get("name")
    if not name:
        for line in txt.splitlines():
            if re.search(r"[A-Za-z]{2,}", line) and not re.search(r"\d", line):
                name = line.strip()
                break
    out["name"] = clean_name(name)

    # DOB/YOB
    m = DATE_RE.search(tnorm)
    if m:
        out["dob"] = m.group(0)
    else:
        y = re.search(r"\b(19|20)\d{2}\b", tnorm)
        if y:
            out["yob"] = y.group(0)

    # Gender
    g = None
    for key in ["Gender","gender","Sex","sex","GENDER"]:
        if key in kv:
            g = kv[key]
            break
    if not g:
        if re.search(r"\bfemale\b|महिला|பெண்", txt, re.I): g = "female"
        elif re.search(r"\bmale\b|पुरुष|ஆண்", txt, re.I):   g = "male"
    out["gender"] = normalize_gender(g)

    return out

def decode_qr_from_image(img_bytes: bytes) -> Dict[str, Any]:
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return {"error": "Invalid image"}
    txt = _decode_with_pyzbar(img) or _decode_with_opencv(img)
    if not txt:
        return {"error": "No QR code found"}
    return parse_qr_text(txt)
