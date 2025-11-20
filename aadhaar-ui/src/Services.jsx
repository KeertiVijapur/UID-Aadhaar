// src/Services.jsx
import React, { useState } from 'react'

const THEME = {
  deepBlue: '#052f6b',
  cyan: '#06b6d4',
  green: '#138808',
}

export default function Services() {
  const [analyzeFile, setAnalyzeFile] = useState(null)
  const [qrFile, setQrFile] = useState(null)
  const [lookupVal, setLookupVal] = useState('')
  const [loading, setLoading] = useState(false)
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

  const handleAnalyze = async () => {
    if (!analyzeFile) return alert('Select image for analysis')
    setLoading(true)
    try {
      const form = new FormData();
      form.append('file', analyzeFile)
      const res = await fetch(`${API_BASE}/analyze`, { method: 'POST', body: form })
      const data = await res.json()
      alert('Analyze result: ' + (data.predicted_label || JSON.stringify(data)))
    } catch (e) { alert('Analyze failed: ' + e.message) }
    finally { setLoading(false) }
  }

  const handleVerifyQR = async () => {
    if (!qrFile) return alert('Select QR image')
    setLoading(true)
    try {
      const form = new FormData();
      form.append('file', qrFile)
      const res = await fetch(`${API_BASE}/verify-qr`, { method: 'POST', body: form })
      const data = await res.json()
      alert('QR result: ' + (data.aadhaar_number || JSON.stringify(data)))
    } catch (e) { alert('QR failed: ' + e.message) }
    finally { setLoading(false) }
  }

  const handleLookup = async () => {
    const digits = (lookupVal||'').replace(/\D/g,'')
    if (digits.length !== 12) return alert('Enter 12 digits')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/lookup?aadhar=${encodeURIComponent(digits)}`)
      const data = await res.json()
      if (res.ok) alert('Lookup: ' + (data.name || JSON.stringify(data)))
      else alert('Lookup failed')
    } catch (e) { alert('Lookup error: '+e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ background: 'white', padding: 18, borderRadius: 12, boxShadow: '0 10px 30px rgba(9,32,88,0.05)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap' }}>

          {/* Analyze card */}
          <div style={{ flex: '1 1 30%', minWidth: 280, borderRadius: 12, padding: 16, border: '1px solid rgba(38,103,169,0.08)', background: '#fff' }}>
            <h3 style={{ marginTop: 0, color: THEME.deepBlue }}>1) Analyze (Image → OCR + Prediction)</h3>
            <input type="file" accept="image/*" onChange={(e)=>setAnalyzeFile(e.target.files?.[0]||null)} />
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={handleAnalyze} style={{ background: THEME.green, color: '#fff', border: 0, padding: '10px 12px', borderRadius: 8, fontWeight: 800 }}>{loading? 'Working…':'Analyze'}</button>
              <button onClick={()=>{ setAnalyzeFile(null); }} style={{ background: '#fff', border: '1px solid #eef6ff', padding: '10px 12px', borderRadius: 8 }}>Reset</button>
            </div>
          </div>

          {/* QR card */}
          <div style={{ flex: '1 1 30%', minWidth: 280, borderRadius: 12, padding: 16, border: '1px solid rgba(38,103,169,0.08)', background: '#fff' }}>
            <h3 style={{ marginTop: 0, color: THEME.deepBlue }}>2) Aadhaar QR Verification (Image)</h3>
            <input type="file" accept="image/*" onChange={(e)=>setQrFile(e.target.files?.[0]||null)} />
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={handleVerifyQR} style={{ background: THEME.green, color: '#fff', border: 0, padding: '10px 12px', borderRadius: 8, fontWeight: 800 }}>{loading? 'Working…':'Verify QR'}</button>
              <button onClick={()=>{ setQrFile(null); }} style={{ background: '#fff', border: '1px solid #eef6ff', padding: '10px 12px', borderRadius: 8 }}>Reset</button>
            </div>
          </div>

          {/* Lookup card */}
          <div style={{ flex: '1 1 30%', minWidth: 280, borderRadius: 12, padding: 16, border: '1px solid rgba(38,103,169,0.08)', background: '#fff' }}>
            <h3 style={{ marginTop: 0, color: THEME.deepBlue }}>3) Lookup by Aadhaar Number</h3>
            <input placeholder="Enter 12-digit Aadhaar" value={lookupVal} onChange={(e)=>setLookupVal(e.target.value.replace(/[^0-9]/g,''))} style={{ padding: 10, borderRadius: 8, border: '1px solid #eef6ff', width: '100%' }} />
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={handleLookup} style={{ background: THEME.cyan, color: '#fff', border: 0, padding: '10px 12px', borderRadius: 8, fontWeight: 800 }}>{loading? 'Working…':'Lookup'}</button>
              <button onClick={()=>{ setLookupVal(''); }} style={{ background: '#fff', border: '1px solid #eef6ff', padding: '10px 12px', borderRadius: 8 }}>Reset</button>
            </div>
          </div>

        </div>

        <div style={{ marginTop: 14, color: '#64748b', fontSize: 13 }}>Tip: Set <code style={{ color: THEME.deepBlue }}>VITE_API_BASE</code> in your frontend <code>.env</code> to point to the FastAPI server.</div>
      </div>
    </div>
  )
}
