// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Home from "./Home";
import About from "./About";
import Features from "./Features";
import AadhaarCheck from "./AadhaarCheck"; // your dashboard component

const NAV = {
  height: 64,
  bg: "#4b2ccc",
  text: "#ffffff",
  accent: "#f5c246",
};

function TopNav() {
  return (
    <nav style={{ background: NAV.bg, color: NAV.text, boxShadow: "0 6px 20px rgba(11,10,30,0.18)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: NAV.height, padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontWeight: 900, color: "#fff", fontSize: 20 }}>AadhaarVerify<span style={{ color: NAV.accent }}>.</span></div>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <NavLink
            to="/"
            style={({ isActive }) => ({
              color: NAV.text,
              padding: "8px 12px",
              borderRadius: 8,
              fontWeight: 800,
              textDecoration: "none",
              background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
              boxShadow: isActive ? `inset 0 -4px 0 ${NAV.accent}` : "none",
            })}
          >
            Home
          </NavLink>

          <NavLink
            to="/about"
            style={({ isActive }) => ({
              color: NAV.text,
              padding: "8px 12px",
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: "none",
              background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
              boxShadow: isActive ? `inset 0 -4px 0 ${NAV.accent}` : "none",
            })}
          >
            About
          </NavLink>

          <NavLink
            to="/features"
            style={({ isActive }) => ({
              color: NAV.text,
              padding: "8px 12px",
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: "none",
              background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
              boxShadow: isActive ? `inset 0 -4px 0 ${NAV.accent}` : "none",
            })}
          >
            Features
          </NavLink>

          <NavLink
            to="/dashboard"
            style={({ isActive }) => ({
              color: NAV.text,
              padding: "8px 12px",
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: "none",
              background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
              boxShadow: isActive ? `inset 0 -4px 0 ${NAV.accent}` : "none",
            })}
          >
            Dashboard
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <TopNav />
      <div style={{ maxWidth: 1200, margin: "26px auto", padding: "0 20px 60px" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/dashboard" element={<AadhaarCheck />} />
        </Routes>
      </div>
    </Router>
  );
}
