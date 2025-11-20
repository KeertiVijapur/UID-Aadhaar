# src/xml_utils.py
from __future__ import annotations
from typing import Dict, Any
import re
from defusedxml import ElementTree as ET
from validators import verhoeff_valid, normalize_gender, clean_name, DATE_RE

def parse_offline_xml(xml_bytes: bytes) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "source": "xml",
        "aadhaar_number": None,
        "name": None,
        "dob": None,
        "yob": None,
        "gender": None,
        "verhoeff_ok": False,
        "raw": None,
        "notes": []
    }
    try:
        root = ET.fromstring(xml_bytes)
    except Exception as e:
        return {"error": f"Invalid XML: {e}"}

    uid = None
    poi = None

    for elem in root.iter():
        if "uid" in elem.attrib:
            uid = elem.attrib.get("uid")
        if elem.tag.lower().endswith("poi") or elem.tag.endswith("Poi"):
            poi = elem.attrib

    if uid:
        uid_digits = re.sub(r"\D", "", uid)
        if len(uid_digits) == 12:
            out["aadhaar_number"] = uid_digits
            out["verhoeff_ok"] = verhoeff_valid(uid_digits)

    if poi:
        out["name"] = clean_name(poi.get("name"))
        dob = poi.get("dob") or poi.get("dobd") or poi.get("dobt")
        if dob and DATE_RE.search(dob):
            out["dob"] = dob
        else:
            y = poi.get("yob")
            if y and re.fullmatch(r"(19|20)\d{2}", y):
                out["yob"] = y
        out["gender"] = normalize_gender(poi.get("gender"))

    if not out["dob"] and not out["yob"]:
        txt = ET.tostring(root, encoding="unicode")
        m = DATE_RE.search(txt)
        if m: out["dob"] = m.group(0)

    return out
