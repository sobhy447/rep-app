import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../App";

const NAV = [
  { id: "dashboard",  label: "لوحة التحكم",       icon: "⊞",  group: "رئيسي" },
  { id: "accounts",   label: "دليل الحسابات",      icon: "⊟",  group: "محاسبة" },
  { id: "journal",    label: "القيود اليومية",      icon: "◫",  group: "محاسبة" },
  { id: "vouchers",   label: "سندات القبض والصرف",  icon: "◈",  group: "محاسبة" },
  { id: "reports",    label: "التقارير المالية",    icon: "◧",  group: "محاسبة" },
  { id: "customers",  label: "العملاء والموكلين",   icon: "◎",  group: "علاقات" },
  { id: "employees",  label: "الموظفين",            icon: "◉",  group: "موارد بشرية" },
  { id: "payroll",    label: "الرواتب",             icon: "◐",  group: "موارد بشرية" },
  { id: "settings",   label: "الإعدادات",           icon: "◌",  group: "النظام" },
];

export default function MainLayout({ children, currentPage, setPage }) {
  const { company } = useApp() || {};
  const [collapsed, setCollapsed] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Group nav items
  const groups = [...new Set(NAV.map(n => n.group))];

  return (
    <div style={{
      display: "flex", height: "100vh",
      fontFamily: "'Tajawal', 'Cairo', sans-serif",
      background: "#f8fafc", direction: "rtl",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        .nav-btn:hover { background: rgba(99,102,241,0.08) !important; color: #6366f1 !important; }
      `}</style>

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 64 : 248,
        background: "#0f172a",
        display: "flex", flexDirection: "column",
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden", flexShrink: 0,
        boxShadow: "2px 0 20px rgba(0,0,0,0.15)",
      }}>

        {/* Logo area */}
        <div style={{
          padding: "18px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "white",
            boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
          }}>م</div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", whiteSpace: "nowrap" }}>
                {company?.name_ar || "نظام ERP"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", whiteSpace: "nowrap" }}>
                {company?.currencies?.code || "KWD"} • 2026
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{
            marginRight: "auto", background: "none", border: "none",
            color: "rgba(148,163,184,0.4)", cursor: "pointer",
            padding: 4, flexShrink: 0, fontSize: 16,
            transition: "color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(148,163,184,0.8)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.4)"}
          >☰</button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto", overflowX: "hidden" }}>
          {groups.map(group => (
            <div key={group}>
              {!collapsed && (
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "rgba(148,163,184,0.3)",
                  padding: "12px 8px 4px", letterSpacing: "0.08em", textTransform: "uppercase"
                }}>{group}</div>
              )}
              {NAV.filter(n => n.group === group).map(item => {
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setPage(item.id)}
                    className="nav-btn"
                    title={collapsed ? item.label : ""}
                    style={{
                      width: "100%", display: "flex", alignItems: "center",
                      gap: 10, padding: "9px 10px", borderRadius: 10,
                      border: "none", cursor: "pointer", marginBottom: 2,
                      background: active ? "rgba(99,102,241,0.15)" : "transparent",
                      color: active ? "#818cf8" : "rgba(148,163,184,0.6)",
                      fontFamily: "Tajawal, sans-serif",
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      textAlign: "right", whiteSpace: "nowrap",
                      borderRight: active ? "3px solid #6366f1" : "3px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0, opacity: active ? 1 : 0.7 }}>
                      {item.icon}
                    </span>
                    {!collapsed && item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setConfirmLogout(true)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "transparent", color: "rgba(239,68,68,0.5)",
            fontFamily: "Tajawal, sans-serif", fontSize: 13,
            textAlign: "right", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(239,68,68,0.5)"; }}
          >
            <span style={{ fontSize: 15 }}>⏻</span>
            {!collapsed && "تسجيل الخروج"}
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: 56, background: "white",
          borderBottom: "1px solid #e2e8f0",
          display: "flex", alignItems: "center",
          padding: "0 24px", gap: 16, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, color: "#64748b" }}>
              {NAV.find(n => n.id === currentPage)?.label || "لوحة التحكم"}
            </span>
          </div>

          {/* Date */}
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            الخميس، 28 مايو 2026
          </div>

          {/* Currency badge */}
          <div style={{
            padding: "4px 10px", borderRadius: 8,
            background: "#f0fdf4", color: "#10b981",
            fontSize: 12, fontWeight: 600,
          }}>
            {company?.currencies?.symbol || "د.ك"} {company?.currencies?.code || "KWD"}
          </div>

          {/* User avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer",
          }}>م</div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {children}
        </main>
      </div>

      {/* Logout confirm modal */}
      {confirmLogout && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => setConfirmLogout(false)}>
          <div style={{
            background: "white", borderRadius: 20, padding: "32px 36px",
            textAlign: "center", maxWidth: 320, width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏻</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>
              تسجيل الخروج
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b" }}>
              هل أنت متأكد من تسجيل الخروج؟
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmLogout(false)} style={{
                padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0",
                background: "white", cursor: "pointer", fontSize: 14,
                fontFamily: "Tajawal, sans-serif", fontWeight: 600, color: "#374151"
              }}>إلغاء</button>
              <button onClick={handleLogout} style={{
                padding: "10px 20px", borderRadius: 10, border: "none",
                background: "#ef4444", cursor: "pointer", fontSize: 14,
                fontFamily: "Tajawal, sans-serif", fontWeight: 600, color: "white"
              }}>تسجيل الخروج</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
