// src/Home.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/*
  Home.jsx
  - Purple-blue gradient background (light mode)
  - Dark mode option (keeps previous dark background)
  - Hero uses public/assets/feature_banner.png (ensure file exists)
*/

const DEFAULTS = {
  darkBg: "linear-gradient(180deg,#0f1724,#071036)",
  accentA: "#f59e0b", // saffron
  accentB: "#ec4899", // pink
  deepBlue: "#02183b",
};

export default function Home() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // body background: dark or purple gradient
    document.body.style.background = dark
      ? DEFAULTS.darkBg
      : "linear-gradient(180deg, #ebe6ff, #f4efff, #eef7ff)"; // purple + blue soft gradient
    document.body.style.transition = "background 400ms ease";
  }, [dark]);

  // hero image file (place feature_banner.png in public/assets/)
  const heroImage = "/assets/feature_banner.png";

  // theme-aware colors
  const cardBg = dark ? "rgba(255,255,255,0.03)" : "linear-gradient(180deg, #ffffff, #f7f4ff)"; // subtle purple tint
  const cardInnerBg = dark ? "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))" : "#fff";
  const headlineColor = dark ? "#dbeafe" : "#052f6b";
  const paragraphColor = dark ? "#94a3b8" : "#475569";
  const buttonGradient = `linear-gradient(90deg, ${DEFAULTS.accentA}, ${DEFAULTS.accentB})`;

  return (
    <div style={{ padding: 28 }}>
      {/* theme toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          onClick={() => setDark((s) => !s)}
          style={{
            border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(9,30,63,0.06)",
            background: dark ? "rgba(255,255,255,0.03)" : "#fff",
            color: dark ? "#fff" : "#0f1724",
            padding: "8px 12px",
            borderRadius: 999,
            fontWeight: 700,
            boxShadow: dark ? "0 6px 18px rgba(2,6,23,0.4)" : "0 8px 20px rgba(9,30,63,0.04)",
            cursor: "pointer",
          }}
        >
          {dark ? "Dark" : "Light"}
        </button>
      </div>

      {/* hero area */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 560px",
          gap: 28,
          alignItems: "center",
          padding: 28,
          borderRadius: 16,
          background: cardBg,
          boxShadow: dark ? "0 20px 70px rgba(2,6,23,0.6)" : "0 14px 40px rgba(9,32,88,0.04)",
          border: dark ? "1px solid rgba(255,255,255,0.02)" : "1px solid rgba(9,32,88,0.04)",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 56, color: headlineColor, lineHeight: 1.02 }}>
            Welcome to <br />
            <span style={{ fontWeight: 900, letterSpacing: -1 }}>
              AadhaarVerify
              <span style={{ color: DEFAULTS.accentA, marginLeft: 6 }}>.</span>
            </span>
          </h1>

          <p style={{ color: paragraphColor, marginTop: 16, fontSize: 16, maxWidth: 640 }}>
            Our advanced AI-powered system helps you verify Aadhaar cards with high accuracy and efficiency.
            Prevent fraud and ensure regulatory compliance with our comprehensive verification solution.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 22, alignItems: "center" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                background: buttonGradient,
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 28,
                fontWeight: 800,
                border: 0,
                boxShadow: "0 10px 30px rgba(244,114,182,0.14)",
                cursor: "pointer",
              }}
            >
              Get Started
            </button>

            <a href="#features" style={{ color: dark ? "#e6f0ff" : "#052f6b", fontWeight: 800, textDecoration: "none" }}>
              Learn more →
            </a>
          </div>
        </div>

        {/* right: banner in a light panel */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              borderRadius: 14,
              padding: 18,
              background: cardInnerBg,
              boxShadow: dark ? "0 18px 50px rgba(2,6,23,0.6)" : "0 18px 50px rgba(9,32,88,0.06)",
              border: dark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(9,32,88,0.04)",
            }}
          >
            <img
              src={heroImage}
              alt="feature banner"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 10,
                display: "block",
                objectFit: "cover",
              }}
            />
          </div>
        </div>
      </div>

      {/* Trusted by */}
      <div style={{ display: "flex", gap: 12, marginTop: 20, alignItems: "center", color: paragraphColor }}>
        <div style={{ padding: 12, borderRadius: 10, background: dark ? "rgba(255,255,255,0.02)" : "#fff", boxShadow: dark ? "none" : "0 8px 24px rgba(9,32,88,0.04)" }}>
          <div style={{ fontSize: 12, color: dark ? "#cbd5e1" : "#2667A9", fontWeight: 800 }}>Trusted by</div>
          <div style={{ marginTop: 8, display: "flex", gap: 10, fontSize: 14 }}>
            <div>Govt/Orgs</div>
            <div>· Banks</div>
            <div>· Telecom</div>
          </div>
        </div>
      </div>
    </div>
  );
}
