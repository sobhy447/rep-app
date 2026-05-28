import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [stats, setStats] = useState({ accounts: 0, customers: 0, employees: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [accRes, custRes, empRes] = await Promise.all([
        supabase.from("accounts").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("employees").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        accounts: accRes.count || 0,
        customers: custRes.count || 0,
        employees: empRes.count || 0,
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  const cards = [
    { label: "حسابات في دليل الحسابات", value: stats.accounts, icon: "📊", color: "#6366f1", bg: "#f5f3ff" },
    { label: "عملاء وموكلين", value: stats.customers, icon: "👥", color: "#10b981", bg: "#f0fdf4" },
    { label: "موظفين", value: stats.employees, icon: "👤", color: "#f59e0b", bg: "#fffbeb" },
    { label: "العملة الافتراضية", value: "KWD", icon: "💎", color: "#8b5cf6", bg: "#f5f3ff" },
  ];

  const steps = [
    { n: 1, label: "دليل الحسابات", desc: "تحقق من الحسابات المستوردة أو أضف حسابات جديدة" },
    { n: 2, label: "العملاء والموكلين", desc: "أضف عملاءك أو استوردهم من Excel" },
    { n: 3, label: "الموظفين", desc: "أضف بيانات الموظفين والرواتب" },
    { n: 4, label: "القيود اليومية", desc: "ابدأ بإدخال القيود المحاسبية" },
  ];

  return (
    <div style={{ padding: 24, fontFamily: "Cairo, Tajawal, sans-serif", direction: "rtl" }}>
      {/* ترحيب */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: "0 0 6px" }}>
          أهلاً بك 👋
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>نظام ERP – لوحة التحكم الرئيسية</p>
      </div>

      {/* بطاقات الإحصاءات */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {cards.map((card, i) => (
          <div key={i} style={{
            background: "white", borderRadius: 14, padding: "18px 20px",
            border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            borderTop: `3px solid ${card.color}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>
                  {loading ? "..." : card.value}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* خطوات الإعداد */}
      <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>خطوات الإعداد</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {steps.map(step => (
            <div key={step.n} style={{
              background: "#f8fafc", borderRadius: 10, padding: "14px 16px",
              border: "1px solid #e2e8f0", position: "relative"
            }}>
              <div style={{
                position: "absolute", top: 12, left: 12,
                width: 24, height: 24, borderRadius: "50%",
                background: "#6366f1", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700
              }}>{step.n}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e", marginBottom: 6, paddingLeft: 32 }}>{step.label}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
