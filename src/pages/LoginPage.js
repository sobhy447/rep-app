import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("يرجى إدخال البريد الإلكتروني وكلمة المرور"); return; }
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError("بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.");
    } else {
      onLogin(data.session);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Tajawal', 'Cairo', sans-serif",
      direction: "rtl",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none !important; }
        ::placeholder { color: rgba(148,163,184,0.6) !important; }
      `}</style>

      {/* Background geometric shapes */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "-20%", right: "-10%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)"
        }} />
        <div style={{
          position: "absolute", bottom: "-20%", left: "-10%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)"
        }} />
        {/* Grid lines */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
          backgroundSize: "50px 50px"
        }} />
      </div>

      {/* Login Card */}
      <div style={{
        width: "100%", maxWidth: 420,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: "40px 36px",
        backdropFilter: "blur(20px)",
        position: "relative",
        zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 800, color: "white",
            margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(99,102,241,0.4)"
          }}>م</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 4 }}>
            نظام ERP
          </h1>
          <p style={{ fontSize: 13, color: "rgba(148,163,184,0.7)" }}>
            سجّل دخولك للمتابعة
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 20,
            fontSize: 13, color: "#fca5a5", textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(148,163,184,0.9)", marginBottom: 8 }}>
              البريد الإلكتروني
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@company.com"
                dir="ltr"
                style={{
                  width: "100%", padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, color: "white", fontSize: 14,
                  fontFamily: "Tajawal, sans-serif",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(148,163,184,0.9)", marginBottom: 8 }}>
              كلمة المرور
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                style={{
                  width: "100%", padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, color: "white", fontSize: 14,
                  fontFamily: "Tajawal, sans-serif",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(148,163,184,0.6)", fontSize: 12, padding: 4
              }}>
                {showPass ? "إخفاء" : "إظهار"}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "14px",
            background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", borderRadius: 12,
            color: "white", fontSize: 15, fontWeight: 700,
            fontFamily: "Tajawal, sans-serif",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)"
          }}>
            {loading ? "جاري الدخول..." : "دخول →"}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "rgba(148,163,184,0.3)" }}>
          Universal ERP v1.0 — 2026
        </div>
      </div>
    </div>
  );
}
