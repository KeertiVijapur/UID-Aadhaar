# src/aggregate.py
from typing import Dict, Any, Optional
from rapidfuzz import fuzz

def mask_uid(uid: Optional[str]) -> Optional[str]:
    if not uid or len(uid) != 12: return uid
    return "XXXX-XXXX-" + uid[-4:]

def decide(ocr: Dict[str,Any]|None, qr: Dict[str,Any]|None, xml: Dict[str,Any]|None) -> Dict[str,Any]:
    reasons = []
    score = 0

    def val(d, k): return (d or {}).get(k)

    # Aadhaar number cross-check
    nums = {val(ocr,"aadhaar_number"), val(qr,"aadhaar_number"), val(xml,"aadhaar_number")}
    nums = {n for n in nums if n}
    if len(nums) == 1:
        score += 3
        reasons.append("Aadhaar number matches across sources.")
    elif len(nums) == 0:
        reasons.append("Aadhaar number missing.")
    else:
        reasons.append("Aadhaar number mismatch across sources.")

    # Verhoeff from QR/XML if present
    if (qr and qr.get("verhoeff_ok")) or (xml and xml.get("verhoeff_ok")):
        score += 2
        reasons.append("Checksum (Verhoeff) valid.")
    else:
        reasons.append("Checksum not validated.")

    # Name fuzzy match
    names = [val(ocr,"name"), val(qr,"name"), val(xml,"name")]
    names = [n for n in names if n]
    if len(names) >= 2:
        s = fuzz.token_set_ratio(names[0], names[1])
        if s >= 85:
            score += 2
            reasons.append(f"Name match high ({s}).")
        else:
            reasons.append(f"Name mismatch ({s}).")

    # DOB/YOB consistency
    dvals = [val(ocr,"dob") or val(ocr,"yob"), val(qr,"dob") or val(qr,"yob"), val(xml,"dob") or val(xml,"yob")]
    dvals = [d for d in dvals if d]
    if len(dvals) >= 2:
        if len(set(dvals)) == 1:
            score += 1
            reasons.append("DOB/YOB matches.")
        else:
            reasons.append("DOB/YOB differs across sources.")
    else:
        reasons.append("DOB/YOB insufficient data.")

    verdict = "PASS" if score >= 6 else ("REVIEW" if score >= 3 else "FAIL")
    return {
        "verdict": verdict,
        "score": score,
        "reasons": reasons,
        "preview": {
            "aadhaar": mask_uid(next(iter(nums)) if nums else None),
            "name_ocr": val(ocr,"name"), "name_qr": val(qr,"name"), "name_xml": val(xml,"name")
        }
    }
