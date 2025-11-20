// src/AadhaarCheck.jsx
import React, { useState, useMemo, useEffect } from "react";

/*
  Updated AadhaarCheck.jsx
  - Shows a large image preview + nicely formatted "Extracted Details" panel for:
    1) Analyze (image upload)  -> uses `result` and `preview`
    2) Verify QR (image upload) -> uses `qrRes` and `qrPreview`
    3) Lookup (12-digit lookup) -> uses `lookupRes`. If backend returns image_url it will be used.
  - Inline styles for simplicity and easy drop-in to your Vite React app.
*/

const THEME = {
  headerStart: "#5b2ed6",
  headerEnd: "#7b39ff",
  pageBg: "linear-gradient(180deg,#f4f7ff,#eef9ff)",
  cardBg: "#ffffff",
  text: "#08204a",
  subtext: "#52667d",
  accentGreen: "#138808",
  accentCyan: "#06b6d4",
  saffron: "#f59e0b",
  softBorder: "rgba(11,35,77,0.06)",
  shadow: "0 12px 36px rgba(11,35,77,0.06)",
};

const actionBtn = (bg) => ({
  background: bg,
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 8px 22px rgba(11,35,77,0.06)",
});

function maskAadhaar(s) {
  if (!s) return "N/A";
  const clean = (s + "").replace(/\D/g, "");
  if (clean.length !== 12) return s;
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

export default function AadhaarCheck() {
  // Analyze
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // QR
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState("");
  const [qrRes, setQrRes] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Lookup
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [lookupRes, setLookupRes] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  // cleanup blob URLs
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      if (qrPreview) URL.revokeObjectURL(qrPreview);
    };
  }, [preview, qrPreview]);

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);
    if (preview) {
      try { URL.revokeObjectURL(preview); } catch {}
      setPreview("");
    }
    if (f) {
      try {
        const url = URL.createObjectURL(f);
        setPreview(url);
      } catch {
        setPreview("");
      }
    }
  };

  const handleQrUpload = (e) => {
    const f = e.target.files?.[0] || null;
    setQrFile(f);
    setQrRes(null);
    if (qrPreview) {
      try { URL.revokeObjectURL(qrPreview); } catch {}
      setQrPreview("");
    }
    if (f) {
      try {
        const url = URL.createObjectURL(f);
        setQrPreview(url);
      } catch {
        setQrPreview("");
      }
    }
  };

  const submitAnalyze = async () => {
    if (!file) return alert("Select an image to analyze");
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/analyze`, { method: "POST", body: form });
      const data = await res.json();
      // backend may return image_url (optional)
      if (data?.image_url) {
        if (preview) try { URL.revokeObjectURL(preview); } catch {}
        setPreview(data.image_url);
      }
      setResult(data);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const submitQR = async () => {
    if (!qrFile) return alert("Select a QR image to verify");
    setQrLoading(true);
    try {
      const form = new FormData();
      form.append("file", qrFile);
      const res = await fetch(`${API_BASE}/verify-qr`, { method: "POST", body: form });
      const data = await res.json();
      // backend may return image_url for preview
      if (data?.image_url) {
        if (qrPreview) try { URL.revokeObjectURL(qrPreview); } catch {}
        setQrPreview(data.image_url);
      }
      setQrRes(data);
    } catch (e) {
      setQrRes({ error: e.message });
    } finally {
      setQrLoading(false);
    }
  };

  const submitLookup = async () => {
    const digits = (aadhaarInput || "").replace(/\D/g, "");
    if (digits.length !== 12) {
      setLookupRes({ error: "Enter exactly 12 digits." });
      return;
    }
    setLookupLoading(true);
    setLookupRes(null);
    try {
      const res = await fetch(`${API_BASE}/lookup?aadhar=${encodeURIComponent(digits)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLookupRes({ error: err.detail || "Lookup failed" });
      } else {
        const data = await res.json();
        setLookupRes(data);
      }
    } catch (e) {
      setLookupRes({ error: e.message });
    } finally {
      setLookupLoading(false);
    }
  };

  const analyzeBadge = useMemo(() => {
    if (!result || result.error) return null;
    return result.verified ? (
      <span style={{ display: "inline-block", padding: "8px 14px", borderRadius: 999, background: THEME.accentGreen, color: "#fff", fontWeight: 800 }}>
        ✅ Verified
      </span>
    ) : (
      <span style={{ display: "inline-block", padding: "8px 14px", borderRadius: 999, background: "#d43f4a", color: "#fff", fontWeight: 800 }}>
        ❌ Suspect
      </span>
    );
  }, [result]);

  const qrBadge = useMemo(() => {
    if (!qrRes || qrRes.error) return null;
    // qrRes may contain verhoeff_ok boolean
    return qrRes.verhoeff_ok ? (
      <span style={{ display: "inline-block", padding: "8px 14px", borderRadius: 999, background: THEME.accentGreen, color: "#fff", fontWeight: 800 }}>
        ✅ QR OK
      </span>
    ) : (
      <span style={{ display: "inline-block", padding: "8px 14px", borderRadius: 999, background: "#d43f4a", color: "#fff", fontWeight: 800 }}>
        ❌ QR Invalid
      </span>
    );
  }, [qrRes]);

  const lookupBadge = useMemo(() => {
    if (!lookupRes || lookupRes.error) return null;
    // Use a green badge when found
    return lookupRes.not_found ? (
      <span style={{ display: "inline-block", padding: "8px 14px", borderRadius: 999, background: "#f59e0b", color: "#fff", fontWeight: 700 }}>
        Not found
      </span>
    ) : (
      <span style={{ display: "inline-block", padding: "8px 14px", borderRadius: 999, background: THEME.accentCyan, color: "#fff", fontWeight: 700 }}>
        Record
      </span>
    );
  }, [lookupRes]);

  return (
    <div style={{ minHeight: "100vh", background: THEME.pageBg, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial" }}>
      {/* main container */}
      <div style={{ maxWidth: 1100, margin: "28px auto", padding: "0 20px" }}>
        {/* Hero */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 22 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 34, color: THEME.text }}>
              Welcome to <span style={{ color: THEME.headerEnd, fontWeight: 900 }}>AadhaarVerify</span><span style={{ color: THEME.saffron }}>.</span>
            </h1>
            <p style={{ color: THEME.subtext, marginTop: 10 }}>
              Verify Aadhaar cards in seconds using OCR, QR decoding and an AI fraud detector.
            </p>
          </div>

          <div style={{ width: 420 }}>
            <div style={{ borderRadius: 14, overflow: "hidden", background: THEME.cardBg, boxShadow: THEME.shadow, border: `1px solid ${THEME.softBorder}` }}>
              <img src="/assets/feature_banner.png" alt="banner" style={{ width: "100%", display: "block" }} />
            </div>
          </div>
        </div>

        {/* services row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {/* ANALYZE */}
          <div style={{ borderRadius: 12, padding: 18, background: "#fff", boxShadow: THEME.shadow, border: `1px solid ${THEME.softBorder}` }}>
            <div>
              <div style={{ fontWeight: 900, color: THEME.headerEnd, fontSize: 20 }}>1) Analyze</div>
              <div style={{ color: THEME.subtext, fontSize: 13 }}>Image → OCR + Prediction</div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <input type="file" accept="image/*" onChange={handleFileUpload} />
              <button onClick={submitAnalyze} style={actionBtn(THEME.accentGreen)} disabled={loading}>
                {loading ? "Analyzing…" : "Analyze"}
              </button>
            </div>

            {/* fancy result panel */}
            <div style={{ marginTop: 16, borderRadius: 10, overflow: "hidden", border: `1px solid ${THEME.softBorder}`, background: "#fbfdff" }}>
              <div style={{ background: "#fff", padding: 12 }}>
                {preview ? (
                  <img
                    src={preview}
                    alt="analyze preview"
                    style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, display: "block", border: `1px solid ${THEME.softBorder}` }}
                  />
                ) : (
                  <div style={{ height: 220, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa6b6" }}>
                    Preview will appear here
                  </div>
                )}
              </div>

              <div style={{ padding: 14 }}>
                {result ? (
                  result.error ? (
                    <div style={{ color: "#d43f4a", fontWeight: 700 }}>Error: {result.error}</div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.text, textTransform: "capitalize" }}>{result.predicted_label}</div>
                          <div style={{ marginTop: 6, color: THEME.subtext, fontWeight: 700 }}>Confidence: {(result.confidence * 100).toFixed(1)}%</div>
                        </div>
                        <div>{analyzeBadge}</div>
                      </div>

                      <hr style={{ border: 0, borderTop: `1px solid ${THEME.softBorder}`, margin: "12px 0" }} />

                      <div>
                        <div style={{ fontWeight: 800, color: THEME.text }}>Extracted Details</div>
                        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "120px 1fr", gap: "6px 12px", alignItems: "start" }}>
                          <div style={{ color: THEME.subtext }}>Name</div>
                          <div style={{ fontWeight: 700 }}>{result.ocr?.name || "N/A"}</div>

                          <div style={{ color: THEME.subtext }}>DOB / YOB</div>
                          <div>{result.ocr?.dob || result.ocr?.yob || "N/A"}</div>

                          <div style={{ color: THEME.subtext }}>Gender</div>
                          <div>{result.ocr?.gender || "N/A"}</div>

                          <div style={{ color: THEME.subtext }}>Aadhaar No.</div>
                          <div style={{ fontWeight: 800 }}>{maskAadhaar(result.ocr?.aadhaar_number)}</div>
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  <div style={{ color: THEME.subtext }}>Results will show here after analysis.</div>
                )}
              </div>
            </div>
          </div>

          {/* VERIFY QR */}
          <div style={{ borderRadius: 12, padding: 18, background: "#fff", boxShadow: THEME.shadow, border: `1px solid ${THEME.softBorder}` }}>
            <div>
              <div style={{ fontWeight: 900, color: THEME.headerEnd, fontSize: 20 }}>2) Verify QR</div>
              <div style={{ color: THEME.subtext, fontSize: 13 }}>Decode QR + Verhoeff</div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
              <input type="file" accept="image/*" onChange={handleQrUpload} />
              <button onClick={submitQR} style={actionBtn(THEME.accentGreen)} disabled={qrLoading}>
                {qrLoading ? "Decoding…" : "Verify QR"}
              </button>
            </div>

            <div style={{ marginTop: 16, borderRadius: 10, overflow: "hidden", border: `1px solid ${THEME.softBorder}`, background: "#fbfdff" }}>
              <div style={{ background: "#fff", padding: 12 }}>
                {qrPreview ? (
                  <img
                    src={qrPreview}
                    alt="qr preview"
                    style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, display: "block", border: `1px solid ${THEME.softBorder}` }}
                  />
                ) : (
                  <div style={{ height: 220, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa6b6" }}>
                    QR preview will appear here
                  </div>
                )}
              </div>

              <div style={{ padding: 14 }}>
                {qrRes ? (
                  qrRes.error ? (
                    <div style={{ color: "#d43f4a", fontWeight: 700 }}>{qrRes.error}</div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.text }}>{qrRes.name || maskAadhaar(qrRes.aadhaar_number)}</div>
                          <div style={{ marginTop: 6, color: THEME.subtext, fontWeight: 700 }}>
                            {qrRes.confidence ? `Confidence: ${(qrRes.confidence * 100).toFixed(1)}%` : ""}
                          </div>
                        </div>
                        <div>{qrBadge}</div>
                      </div>

                      <hr style={{ border: 0, borderTop: `1px solid ${THEME.softBorder}`, margin: "12px 0" }} />

                      <div>
                        <div style={{ fontWeight: 800, color: THEME.text }}>Extracted Details</div>
                        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "120px 1fr", gap: "6px 12px", alignItems: "start" }}>
                          <div style={{ color: THEME.subtext }}>Name</div>
                          <div style={{ fontWeight: 700 }}>{qrRes.name || "N/A"}</div>

                          <div style={{ color: THEME.subtext }}>DOB / YOB</div>
                          <div>{qrRes.dob || qrRes.yob || "N/A"}</div>

                          <div style={{ color: THEME.subtext }}>Gender</div>
                          <div>{qrRes.gender || "N/A"}</div>

                          <div style={{ color: THEME.subtext }}>Aadhaar No.</div>
                          <div style={{ fontWeight: 800 }}>{maskAadhaar(qrRes.aadhaar_number)}</div>
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  <div style={{ color: THEME.subtext }}>Upload a QR image and press Verify to see decoded details.</div>
                )}
              </div>
            </div>
          </div>

          {/* LOOKUP */}
          <div style={{ borderRadius: 12, padding: 18, background: "#fff", boxShadow: THEME.shadow, border: `1px solid ${THEME.softBorder}` }}>
            <div>
              <div style={{ fontWeight: 900, color: THEME.headerEnd, fontSize: 20 }}>3) Lookup</div>
              <div style={{ color: THEME.subtext, fontSize: 13 }}>Local DB lookup</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <input
                placeholder="Enter 12-digit Aadhaar"
                value={aadhaarInput}
                onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, ""))}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${THEME.softBorder}` }}
              />
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button onClick={submitLookup} style={actionBtn(THEME.accentCyan)} disabled={lookupLoading}>
                  {lookupLoading ? "Looking…" : "Lookup"}
                </button>
                <button onClick={() => { setAadhaarInput(""); setLookupRes(null); }} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${THEME.softBorder}`, background: "#fff" }}>
                  Reset
                </button>
              </div>
            </div>

            <div style={{ marginTop: 16, borderRadius: 10, overflow: "hidden", border: `1px solid ${THEME.softBorder}`, background: "#fbfdff" }}>
              <div style={{ background: "#fff", padding: 12 }}>
                {lookupRes?.image_url ? (
                  <img
                    src={lookupRes.image_url}
                    alt="lookup preview"
                    style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, display: "block", border: `1px solid ${THEME.softBorder}` }}
                  />
                ) : (
                  <div style={{ height: 220, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa6b6" }}>
                    {lookupRes ? "Record details below" : "Lookup results will appear here"}
                  </div>
                )}
              </div>

              <div style={{ padding: 14 }}>
                {lookupRes ? (
                  lookupRes.error ? (
                    <div style={{ color: "#d43f4a", fontWeight: 700 }}>{lookupRes.error}</div>
                  ) : lookupRes.not_found ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: THEME.text }}>Not found</div>
                        <div>{lookupBadge}</div>
                      </div>
                      <div style={{ marginTop: 10, color: THEME.subtext }}>No record in demo DB.</div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: THEME.text }}>{lookupRes.name}</div>
                        <div>{lookupBadge}</div>
                      </div>

                      <hr style={{ border: 0, borderTop: `1px solid ${THEME.softBorder}`, margin: "12px 0" }} />

                      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "6px 12px" }}>
                        <div style={{ color: THEME.subtext }}>Aadhaar No.</div>
                        <div style={{ fontWeight: 800 }}>{maskAadhaar(lookupRes.aadhaar)}</div>

                        <div style={{ color: THEME.subtext }}>DOB</div>
                        <div>{lookupRes.dob || lookupRes.yob || "N/A"}</div>

                        <div style={{ color: THEME.subtext }}>Gender</div>
                        <div>{lookupRes.gender || "N/A"}</div>

                        <div style={{ color: THEME.subtext }}>Address</div>
                        <div>{lookupRes.address || "N/A"}</div>
                      </div>
                    </>
                  )
                ) : (
                  <div style={{ color: THEME.subtext }}>Lookup a 12-digit Aadhaar to show stored record (demo DB)</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, color: THEME.subtext }}>
          Tip: configure <code style={{ color: THEME.headerEnd }}>VITE_API_BASE</code> in `.env`
        </div>
      </div>

      <footer style={{ marginTop: 40, padding: "28px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", color: THEME.subtext, fontSize: 13 }}>
          © AadhaarVerify • Demo only.
        </div>
      </footer>
    </div>
  );
}
