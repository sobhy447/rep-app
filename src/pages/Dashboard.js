import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../App";

const fmt = (n, dec = 3) =>
  new Intl.NumberFormat("ar-KW", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n || 0);

export default function Dashboard() {
  const { company } = useApp() || {};
  const [stats, setStats]   = useState({ accounts: 0, customers: 0, employees: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) loadStats();
  }, [company]);

  const loadStats = async () => {
    setLoading(true);
    const [acc, cust, emp] = await Promise.all([
      supabase.from("accounts").select("id", { count: "exact", head: true })
        .eq("company_id", company.id).is("deleted_at", null),
      supabase.from("customers").select("id", { count: "exact", head: true })
        .eq("company_id", company.id).is("deleted_at", null),
      supabase.from("employees").select("id", { count: "exact", head: true })
        .eq("company_id", company.id).is("deleted_at", null),
    ]);
    setStats({
      accounts: acc.count || 0,
      customers: cust.count || 0,
      employees: emp.count || 0,
    });
    setLoading(false);
  };

  const cards = [
    { label: "حسابات في دليل الحسابات", value: loading ? "..." : stats.accounts, color: "#6366f1", bg: "#eef2ff", icon: "⊟" },
    { label: "عملاء وموكلين",            value: loading ? "..." : stats.customers, color: "#10b981", bg: "#f0fdf4", icon: "◎" },
    { label: "موظفين",                   value: loading ? "..." : stats.employees, color: "#f59e0b", bg: "#fffbeb", icon: "◉" },
    { label: "العملة الافتراضية",         value: company?.currencies?.code || "KWD", color: "#8b5cf6", bg: "#f5f3ff", icon: "◈" },
  ];

  const steps = [
    { num: 1, title: "دليل الحسابات",         desc: "تحقق من الحسابات المستوردة أو أضف حسابات جديدة",  done: stats.accounts > 0,  page: "accounts" },
    { num: 2, title: "العملاء والموكلين",       desc: "أضف عملاءك أو استوردهم من Excel",                done: stats.customers > 0, page: "customers" },
    { num: 3, title: "الموظفين",               desc: "أضف بيانات الموظفين والرواتب",                    done: stats.employees > 0, page: "employees" },
    { num: 4, title: "القيود اليومية",          desc: "ابدأ بإدخال القيود المحاسبية",                    done: false,               page: "journal" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>
          أهلاً بك 👋
        </h2>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
          {company?.name_ar || "نظام ERP"} — لوحة التحكم الرئيسية
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {cards.map(card => (
          <div key={card.label} style={{
            background: "white", borderRadius: 16, padding: "20px 22px",
            borderRight: `4px solid ${card.color}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            display: "flex", alignItems: "center", gap: 14,
            transition: "transform 0.15s, box-shadow 0.15s",
            cursor: "default",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: card.bg, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 20, color: card.color, flexShrink: 0,
            }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.2 }}>
                {card.value}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Setup Steps */}
      <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>
          خطوات الإعداد
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {steps.map(step => (
            <div key={step.num} style={{
              padding: "16px", borderRadius: 12,
              border: `1.5px solid ${step.done ? "#bbf7d0" : "#e2e8f0"}`,
              background: step.done ? "#f0fdf4" : "#fafafa",
              display: "flex", gap: 12, alignItems: "flex-start",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: step.done ? "#10b981" : "#e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700,
                color: step.done ? "white" : "#94a3b8",
              }}>
                {step.done ? "✓" : step.num}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: step.done ? "#166534" : "#1a1a2e", marginBottom: 4 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 12, color: step.done ? "#16a34a" : "#64748b", lineHeight: 1.5 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Company Info */}
      {company && (
        <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>
            معلومات الشركة
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "الاسم العربي",   value: company.name_ar },
              { label: "الاسم الإنجليزي", value: company.name_en },
              { label: "الكود",          value: company.code },
              { label: "العملة",         value: `${company.currencies?.name_ar} (${company.currencies?.code})` },
              { label: "البريد الإلكتروني", value: company.email || "—" },
              { label: "الهاتف",         value: company.phone || "—" },
            ].map(item => (
              <div key={item.label} style={{
                padding: "10px 14px", background: "#f8fafc", borderRadius: 10
              }}>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
