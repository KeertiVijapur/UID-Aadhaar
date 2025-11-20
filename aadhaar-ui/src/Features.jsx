// src/Features.jsx
import React, { useEffect } from "react";

const COLORS = {
  deepBlue: "#052f6b",
  accent: "#f5c246",
};

export default function Features() {
  useEffect(() => {
    document.body.style.background =
      "linear-gradient(180deg, #ebe6ff, #f4efff, #eef7ff)";
  }, []);

  const FEATURES = [
    {
      title: "OCR Extraction",
      desc: "High-accuracy text extraction using Tesseract and smart regex for Aadhaar fields.",
      icon: "📄",
      bg: "#fff5e6",
    },
    {
      title: "QR Check + Verhoeff",
      desc: "Decode QR and validate Aadhaar checksum using Verhoeff algorithm.",
      icon: "🔍",
      bg: "#e9fbff",
    },
    {
      title: "AI Fraud Detector",
      desc: "ResNet-18 based fraud classifier to flag tampered cards.",
      icon: "🛡️",
      bg: "#f0ffe9",
    },
    {
      title: "Local DB Match",
      desc: "Offline lookup against local SQLite containing synthetic demo records.",
      icon: "🗃️",
      bg: "#ffecec",
    },
  ];

  return (
    <div style={{ padding: "28px 0" }}>
      {/* Hero Section / Banner */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 40,
          padding: "30px 20px",
          borderRadius: 18,
          background: "linear-gradient(90deg, #6236ff, #8f5bff)",
          color: "white",
          maxWidth: 1100,
          margin: "0 auto",
          boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>
          Explore Our Key Features
        </h1>
        <p
          style={{
            marginTop: 10,
            fontSize: 16,
            opacity: 0.9,
            maxWidth: 730,
            margin: "10px auto 0",
          }}
        >
          AadhaarVerify brings powerful identity verification tools that combine
          AI, OCR, QR decoding, and offline fraud detection technology.
        </p>
      </div>

      {/* Features Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 22,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {FEATURES.map((f, i) => (
          <div
            key={i}
            style={{
              padding: 22,
              borderRadius: 16,
              background: f.bg,
              boxShadow: "0 14px 40px rgba(0,0,0,0.06)",
              border: "1px solid rgba(0,0,0,0.05)",
              transition: "transform 0.25s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-6px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            <div style={{ fontSize: 40 }}>{f.icon}</div>
            <h3
              style={{
                margin: "12px 0 6px",
                fontSize: 18,
                fontWeight: 800,
                color: COLORS.deepBlue,
              }}
            >
              {f.title}
            </h3>
            <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
