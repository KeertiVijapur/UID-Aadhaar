// src/About.jsx
import React, { useEffect } from "react";

const COLORS = {
  deepBlue: "#052f6b",
  midBlue: "#2667A9",
  accent: "#f5c246",
};

export default function About() {
  // Match Home Page Background
  useEffect(() => {
    document.body.style.background =
      "linear-gradient(180deg, #ebe6ff, #f4efff, #eef7ff)";
  }, []);

  return (
    <div style={{ padding: "28px 0" }}>
      {/* Center Heading */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 900,
            color: COLORS.deepBlue,
          }}
        >
          About AadhaarVerify
        </h2>

        {/* Decorative Lines */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 10,
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 60,
              height: 4,
              background: COLORS.accent,
              borderRadius: 4,
            }}
          />
          <div
            style={{
              width: 60,
              height: 4,
              background: COLORS.accent,
              borderRadius: 4,
            }}
          />
        </div>

        <p
          style={{
            color: "#64748b",
            maxWidth: 900,
            margin: "16px auto 0",
            lineHeight: 1.6,
            fontSize: 16,
          }}
        >
          AadhaarVerify is a cutting-edge document verification platform
          designed to revolutionize how organizations validate identity
          documents. Our system combines OCR, QR decoding, checksum validation,
          and AI-based fraud detection to provide a robust offline-capable
          verification pipeline.
        </p>
      </div>

      {/* Two Column Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 460px",
          gap: 32,
          alignItems: "center",
          marginTop: 40,
        }}
      >
        {/* Left Side: Text */}
        <div>
          <h3
            style={{
              color: COLORS.deepBlue,
              fontSize: 24,
              marginBottom: 12,
            }}
          >
            Our Mission
          </h3>

          <p
            style={{
              color: "#475569",
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            Our mission is to combat identity fraud and strengthen regulatory
            compliance by delivering accurate, efficient, and secure Aadhaar
            verification tools. Leveraging AI and state-of-the-art technology,
            our platform ensures reliable results both online and offline —
            making identity verification accessible and powerful for individuals,
            businesses, and government organizations.
          </p>
        </div>

        {/* Right Side: Image Card */}
        <div
          style={{
            background: "linear-gradient(180deg,#ffffff,#f7f4ff)",
            padding: 18,
            borderRadius: 14,
            border: "1px solid rgba(9,32,88,0.06)",
            boxShadow: "0 20px 60px rgba(9,32,88,0.06)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <img
            src="/assets/about_illustration.png"
            alt="About AadhaarVerify"
            style={{
              width: "100%",
              borderRadius: 12,
              objectFit: "cover",
            }}
          />
        </div>
      </div>
    </div>
  );
}
