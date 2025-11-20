# src/validators.py
from __future__ import annotations
import re
from datetime import date

# --- Verhoeff checksum for Aadhaar ---
_d = [
 [0,1,2,3,4,5,6,7,8,9],
 [1,2,3,4,0,6,7,8,9,5],
 [2,3,4,0,1,7,8,9,5,6],
 [3,4,0,1,2,8,9,5,6,7],
 [4,0,1,2,3,9,5,6,7,8],
 [5,9,8,7,6,0,4,3,2,1],
 [6,5,9,8,7,1,0,4,3,2],
 [7,6,5,9,8,2,1,0,4,3],
 [8,7,6,5,9,3,2,1,0,4],
 [9,8,7,6,5,4,3,2,1,0]
]
_p = [
 [0,1,2,3,4,5,6,7,8,9],
 [1,5,7,6,2,8,3,0,9,4],
 [5,8,0,3,7,9,6,1,4,2],
 [8,9,1,6,0,4,3,5,2,7],
 [9,4,5,3,1,2,6,8,7,0],
 [4,2,8,6,5,7,3,9,0,1],
 [2,7,9,3,8,0,6,4,1,5],
 [7,0,4,6,9,1,3,2,5,8]
]
_inv = [0,4,3,2,1,5,6,7,8,9]

def verhoeff_valid(num: str) -> bool:
    s = ''.join(ch for ch in num if ch.isdigit())
    if len(s) != 12:
        return False
    c = 0
    for i, ch in enumerate(reversed(s)):
        c = _d[c][_p[(i % 8)][ord(ch)-48]]
    return c == 0

DATE_RE = re.compile(
    r"(?:[0-3]?\d[\/\-.][01]?\d[\/\-.](?:19|20)\d{2})"
    r"|(?:[0-3]?\d\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*(?:19|20)\d{2})",
    re.I,
)

def valid_date(ddmmyyyy: str) -> bool:
    try:
        d, m, y = map(int, re.split(r"[^\d]+", ddmmyyyy))
        if y < 1900 or y > date.today().year:
            return False
        _ = date(y, m, d)
        return True
    except Exception:
        return False

def normalize_gender(g: str|None):
    if not g: return None
    g = g.strip().lower()
    if any(x in g for x in ["female","महिला","பெண்"]): return "FEMALE"
    if any(x in g for x in ["male","पुरुष","ஆண்"]):   return "MALE"
    if "trans" in g: return "TRANSGENDER"
    return None

def clean_name(s: str|None):
    if not s: return None
    s = re.sub(r"[^A-Za-z\s\.\-']", " ", s)
    s = re.sub(r"\s{2,}", " ", s).strip()
    return s.title() if s else None
