// src/AadhaarCheck.jsx
import React, { useState, useMemo } from "react";

/*
  Redesigned Dashboard
  - Left: main verify workspace (Analyze + preview + result)
  - Middle: compact cards for QR verify & Lookup
  - Right: inspector sidebar (stats, history, quick actions)
  - Theme: purple header, soft gradient page, green action accents
  - Replace assets in public/assets/ if necessary
*/

const THEME = {
  header: "#5b2ed6", // purple
  bgGradient: "linear-gradient(180deg,#f3f5ff,#eef7ff)",
  card: "#ffffff",
  text: "#052f6b",
  subtext: "#64748b",
  border: "rgba(9,32,88,0.06)",
  green: "#138808",
  cyan: "#06b6d4",
  saffron: "#f59e0b",
};

const btn = (bg) => ({
  background: bg,
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(9,32,88,0.08)",
});

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, color: THEME.subtext }}>{label}</div>
      <div style={{ fontWeight: 800, color: THEME.text }}>{value ?? "N/A"}</div>
    </div>
  );
}

function maskAadhaar(s) {
  if (!s) return "N/A";
  const clean = (s + "").replace(/\D/g, "");
  if (clean.length !== 12) return s;
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

export default function AadhaarCheck() {
  // analyze
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // qr
  const [qrFile, setQrFile] = useState(null);
  const [qrRes, setQrRes] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // lookup
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupRes, setLookupRes] = useState(null);

  // history (local demo)
  const [history, setHistory] = useState([]);

  // API base
  const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  // handle image input
  const handleFileUpload = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview("");
  };

  const submitAnalyze = async () => {
    if (!file) return alert("Select an image to analyze");
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/analyze`, { method: "POST", body: form });
      const data = await res.json();
      setResult(data);

      // add to history
      setHistory((h) => [{ type: "Analyze", label: data.predicted_label ?? "Result", ts: Date.now() }, ...h].slice(0, 8));
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  // QR verify
  const submitQR = async () => {
    if (!qrFile) return alert("Select QR image");
    setQrLoading(true);
    try {
      const form = new FormData();
      form.append("file", qrFile);
      const res = await fetch(`${API_BASE}/verify-qr`, { method: "POST", body: form });
      const data = await res.json();
      setQrRes(data);
      setHistory((h) => [{ type: "QR", label: data.aadhaar_number ?? "QR", ts: Date.now() }, ...h].slice(0, 8));
    } catch (e) {
      setQrRes({ error: e.message });
    } finally {
      setQrLoading(false);
    }
  };

  // lookup
  const submitLookup = async () => {
    const digits = (aadhaarInput || "").replace(/\D/g, "");
    if (digits.length !== 12) {
      setLookupRes({ error: "Enter exactly 12 digits" });
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
        setHistory((h) => [{ type: "Lookup", label: data.name ?? digits, ts: Date.now() }, ...h].slice(0, 8));
      }
    } catch (e) {
      setLookupRes({ error: e.message });
    } finally {
      setLookupLoading(false);
    }
  };

  // status badge for analyze
  const statusBadge = useMemo(() => {
    if (!result || result.error) return null;
    return result.verified ? (
      <span style={{ padding: "6px 10px", borderRadius: 999, background: THEME.green, color: "#fff", fontWeight: 800 }}>
        ✅ Verified
      </span>
    ) : (
      <span style={{ padding: "6px 10px", borderRadius: 999, background: "#d43f4a", color: "#fff", fontWeight: 800 }}>
        ❌ Not verified
      </span>
    );
  }, [result]);

  // summary cards data (demo numbers)
  const verifiedToday = 124;
  const pendingReviews = 4;

  return (
    <div style={{ minHeight: "80vh", background: THEME.bgGradient, paddingBottom: 60 }}>
      {/* header */}
      <div style={{ background: THEME.header, color: "#fff", padding: "18px 28px", boxShadow: "0 6px 18px rgba(9,32,88,0.12)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <img src="/assets/lion_emblem.png" alt="emblem" style={{ height: 46 }} />
            <div style={{ fontWeight: 900, fontSize: 18 }}>Unique Identification Authority Of India</div>
          </div>
          <img src="/assets/aadhaar_logo.png" alt="Aadhaar" style={{ height: 44 }} />
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "28px auto", padding: "0 20px" }}>
        {/* top summary */}
        <div style={{ display: "flex", gap: 16, alignItems: "stretch", marginBottom: 18 }}>
          <div style={{ flex: 1, padding: 18, background: THEME.card, borderRadius: 12, border: `1px solid ${THEME.border}`, boxShadow: "0 14px 40px rgba(9,32,88,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: THEME.subtext, fontWeight: 800 }}>Today</div>
                <div style={{ fontWeight: 900, fontSize: 18, color: THEME.text }}>{verifiedToday} Verified</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: THEME.subtext }}>Model</div>
                <div style={{ fontWeight: 900, color: THEME.green }}>ResNet-18</div>
              </div>
            </div>
          </div>

          <div style={{ width: 260, padding: 18, background: THEME.card, borderRadius: 12, border: `1px solid ${THEME.border}`, boxShadow: "0 14px 40px rgba(9,32,88,0.04)" }}>
            <div style={{ fontSize: 13, color: THEME.subtext, fontWeight: 800 }}>Manual Reviews</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: THEME.saffron }}>{pendingReviews}</div>
            <div style={{ marginTop: 10, fontSize: 13, color: THEME.subtext }}>Flagged items awaiting operator attention</div>
          </div>
        </div>

        {/* main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16 }}>
          {/* left workspace */}
          <div>
            <div style={{ padding: 18, borderRadius: 12, background: THEME.card, border: `1px solid ${THEME.border}`, boxShadow: "0 16px 50px rgba(9,32,88,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: THEME.text }}>1) Analyze (Image → OCR + Prediction)</h3>
                <div>{statusBadge}</div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "inline-block", padding: "10px 12px", borderRadius: 10, border: `1px dashed ${THEME.border}`, cursor: "pointer", background: "#fff" }}>
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                  <span style={{ color: THEME.subtext, fontWeight: 700 }}>Choose image</span>
                </label>

                <button onClick={submitAnalyze} style={btn(THEME.green)} disabled={loading}>
                  {loading ? "Analyzing…" : "Analyze"}
                </button>

                <button onClick={() => { setFile(null); setPreview(""); setResult(null); }} style={{ background: "#fff", border: `1px solid ${THEME.border}`, padding: "10px 12px", borderRadius: 10 }}>
                  Reset
                </button>
              </div>

              {/* preview + result */}
              <div style={{ display: "flex", gap: 16, marginTop: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  {preview ? (
                    <img src={preview} alt="preview" style={{ width: "100%", borderRadius: 10, border: `1px solid ${THEME.border}` }} />
                  ) : (
                    <div style={{ height: 220, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#fbfdff", border: `1px dashed ${THEME.border}` }}>
                      <div style={{ color: THEME.subtext }}>No image selected — preview will appear here</div>
                    </div>
                  )}
                </div>

                <div style={{ width: 320 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: "#fbfdff", border: `1px solid ${THEME.border}` }}>
                    {result ? (
                      result.error ? (
                        <div style={{ color: "#d43f4a", fontWeight: 800 }}>Error: {result.error}</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 13, color: THEME.subtext }}>Prediction</div>
                          <div style={{ fontWeight: 900, fontSize: 18, color: THEME.text }}>{result.predicted_label ?? "—"}</div>

                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.subtext }}>
                              <div>Confidence</div>
                              <div>{result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : "—"}</div>
                            </div>
                            <div style={{ height: 8, background: "#e6f3ff", borderRadius: 6, marginTop: 8 }}>
                              <div style={{ width: `${(result.confidence || 0) * 100}%`, height: "100%", borderRadius: 6, background: `linear-gradient(90deg, ${THEME.green}, ${THEME.cyan})` }} />
                            </div>
                          </div>

                          <hr style={{ margin: "12px 0", borderColor: THEME.border }} />

                          <div>
                            <Field label="Name" value={result.ocr?.name ?? "N/A"} />
                            <Field label="DOB" value={result.ocr?.dob ?? result.ocr?.yob ?? "N/A"} />
                            <Field label="Aadhaar No." value={maskAadhaar(result.ocr?.aadhaar_number)} />
                          </div>
                        </>
                      )
                    ) : (
                      <div style={{ color: THEME.subtext }}>Results will show here after analysis</div>
                    )}
                  </div>

                  {/* actions below result */}
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <button onClick={() => { if (result) navigator.clipboard?.writeText(JSON.stringify(result, null, 2)); }} style={{ padding: "8px 10px", borderRadius: 8, background: "#fff", border: `1px solid ${THEME.border}` }}>
                      Copy JSON
                    </button>
                    <button onClick={() => setResult(null)} style={{ padding: "8px 10px", borderRadius: 8, background: "#fff", border: `1px solid ${THEME.border}` }}>
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* secondary row: QR + Lookup short cards */}
            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              {/* QR Card */}
              <div style={{ flex: 1, padding: 16, borderRadius: 12, background: THEME.card, border: `1px solid ${THEME.border}`, boxShadow: "0 10px 30px rgba(9,32,88,0.04)" }}>
                <h4 style={{ marginTop: 0, color: THEME.text }}>2) Aadhaar QR Verification</h4>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="file" accept="image/*" onChange={(e) => { setQrFile(e.target.files?.[0] || null); setQrRes(null); }} />
                  <button onClick={submitQR} style={btn(THEME.green)} disabled={qrLoading}>{qrLoading ? "Checking…" : "Verify QR"}</button>
                </div>

                <div style={{ marginTop: 10, background: "#fbfdff", padding: 10, borderRadius: 8, border: `1px solid ${THEME.border}` }}>
                  {qrRes ? (
                    qrRes.error ? (
                      <div style={{ color: "#d43f4a" }}>{qrRes.error}</div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 800 }}>{maskAadhaar(qrRes.aadhaar_number)}</div>
                        <div style={{ color: THEME.subtext }}>{qrRes.name ?? "—"}</div>
                        <div style={{ marginTop: 8 }}>
                          <span style={{ fontSize: 12, color: THEME.subtext, marginRight: 8 }}>Verhoeff</span>
                          <span style={{ padding: "4px 8px", borderRadius: 999, background: qrRes.verhoeff_ok ? THEME.green : "#d43f4a", color: "#fff", fontWeight: 800 }}>
                            {qrRes.verhoeff_ok ? "valid" : "invalid"}
                          </span>
                        </div>
                      </div>
                    )
                  ) : (
                    <div style={{ color: THEME.subtext }}>Upload QR image to decode</div>
                  )}
                </div>
              </div>

              {/* Lookup Card */}
              <div style={{ flex: 1, padding: 16, borderRadius: 12, background: THEME.card, border: `1px solid ${THEME.border}`, boxShadow: "0 10px 30px rgba(9,32,88,0.04)" }}>
                <h4 style={{ marginTop: 0, color: THEME.text }}>3) Lookup by Aadhaar Number</h4>
                <input placeholder="Enter 12-digit Aadhaar" value={aadhaarInput} maxLength={14} onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${THEME.border}` }} />
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button onClick={submitLookup} style={btn(THEME.cyan)} disabled={lookupLoading}>{lookupLoading ? "Looking…" : "Lookup"}</button>
                  <button onClick={() => { setAadhaarInput(""); setLookupRes(null); }} style={{ background: "#fff", border: `1px solid ${THEME.border}`, padding: "10px 12px", borderRadius: 8 }}>Reset</button>
                </div>

                <div style={{ marginTop: 12, background: "#fbfdff", padding: 10, borderRadius: 8, border: `1px solid ${THEME.border}` }}>
                  {lookupRes ? (
                    lookupRes.error ? <div style={{ color: "#d43f4a" }}>{lookupRes.error}</div> : lookupRes.not_found ? <div style={{ color: THEME.subtext }}>Not found</div> : (
                      <div>
                        <div style={{ fontWeight: 800 }}>{lookupRes.name}</div>
                        <div style={{ color: THEME.subtext }}>{maskAadhaar(lookupRes.aadhaar)}</div>
                        <div style={{ color: THEME.subtext }}>{lookupRes.address}</div>
                      </div>
                    )
                  ) : (
                    <div style={{ color: THEME.subtext }}>Enter Aadhaar and press Lookup</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* right inspector */}
          <aside style={{ width: 420 }}>
            <div style={{ padding: 16, borderRadius: 12, background: THEME.card, border: `1px solid ${THEME.border}`, boxShadow: "0 16px 40px rgba(9,32,88,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: THEME.subtext }}>Quick Actions</div>
                  <div style={{ fontWeight: 900, color: THEME.text }}>Operator Console</div>
                </div>
                <div>
                  <button style={{ background: THEME.cyan, color: "#fff", border: 0, padding: "8px 10px", borderRadius: 8 }}>Bulk Verify</button>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, color: THEME.subtext }}>Recent History</div>
                <ul style={{ marginTop: 10, paddingLeft: 14 }}>
                  {history.length === 0 ? <li style={{ color: THEME.subtext }}>No recent actions</li> : history.map((h, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <div style={{ fontWeight: 800 }}>{h.type}</div>
                      <div style={{ color: THEME.subtext, fontSize: 13 }}>{h.label} • {new Date(h.ts).toLocaleTimeString()}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: "#fbfdff", flex: 1, border: `1px solid ${THEME.border}` }}>
                    <div style={{ fontSize: 12, color: THEME.subtext }}>Flags</div>
                    <div style={{ fontWeight: 900, color: THEME.saffron, marginTop: 6 }}>4</div>
                  </div>

                  <div style={{ padding: 12, borderRadius: 10, background: "#fbfdff", flex: 1, border: `1px solid ${THEME.border}` }}>
                    <div style={{ fontSize: 12, color: THEME.subtext }}>Verified</div>
                    <div style={{ fontWeight: 900, color: THEME.green, marginTop: 6 }}>{verifiedToday}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 13, color: THEME.subtext }}>
                Tip: Set <code style={{ color: THEME.text }}>VITE_API_BASE</code> in your frontend <code>.env</code>.
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ padding: 12, borderRadius: 12, background: THEME.card, border: `1px solid ${THEME.border}`, boxShadow: "0 12px 30px rgba(9,32,88,0.06)" }}>
                <div style={{ fontSize: 13, color: THEME.subtext }}>Support</div>
                <div style={{ fontWeight: 800, color: THEME.text, marginTop: 8 }}>Need help? Contact the admin.</div>
                <div style={{ marginTop: 10 }}>
                  <button style={{ background: THEME.header, color: "#fff", border: 0, padding: "10px 12px", borderRadius: 8 }}>Contact</button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
