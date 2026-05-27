// CustomersPage.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../App";

export default function CustomersPage() {
  const { company, notify } = useApp() || {};
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ code: "", name_ar: "", name_en: "", phone: "", email: "", civil_id: "", nationality: "كويتي", notes: "" });

  useEffect(() => { if (company?.id) load(); }, [company]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*")
      .eq("company_id", company.id).is("deleted_at", null).order("name_ar");
    setCustomers(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (!form.name_ar?.trim()) { notify?.("يرجى إدخال اسم العميل", "error"); return; }
    if (!form.code?.trim()) { notify?.("يرجى إدخال كود العميل", "error"); return; }
    setSaving(true);
    const { error } = await supabase.from("customers").insert({ ...form, company_id: company.id });
    setSaving(false);
    if (error) notify?.(error.message, "error");
    else { notify?.("تم إضافة العميل ✓"); setShowModal(false); setForm({ code: "", name_ar: "", name_en: "", phone: "", email: "", civil_id: "", nationality: "كويتي", notes: "" }); load(); }
  };

  const filtered = customers.filter(c =>
    !search || c.name_ar.includes(search) || c.code.includes(search) || (c.phone || "").includes(search)
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>العملاء والموكلين</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{customers.length} عميل</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="secondary" onClick={() => notify?.("قريباً: استيراد Excel", "warning")}>⬆ استيراد</Btn>
          <Btn onClick={() => setShowModal(true)}>+ عميل جديد</Btn>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الكود أو الهاتف..."
          style={{ width: "100%", padding: "10px 16px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "Tajawal, sans-serif", outline: "none" }}
          onFocus={e => e.target.style.borderColor = "#6366f1"}
          onBlur={e => e.target.style.borderColor = "#e2e8f0"}
        />
      </div>

      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
            <div style={{ color: "#64748b", marginBottom: 16 }}>لا يوجد عملاء بعد</div>
            <Btn onClick={() => setShowModal(true)}>+ أضف أول عميل</Btn>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["الكود", "الاسم", "الهاتف", "البريد", "الجنسية", "الرصيد"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}>
                  <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>{c.code}</td>
                  <td style={{ padding: "11px 14px", fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{c.name_ar}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{c.phone || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{c.email || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12 }}>
                    <span style={{ background: "#f0f9ff", color: "#0369a1", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{c.nationality || "—"}</span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: c.current_balance > 0 ? "#10b981" : "#94a3b8" }}>
                    {c.current_balance > 0 ? `${c.current_balance.toFixed(3)} د.ك` : "0.000"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title="إضافة عميل جديد" onClose={() => setShowModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="كود العميل *"><Input value={form.code} onChange={v => setForm(p => ({ ...p, code: v }))} placeholder="C001" dir="ltr" /></Field>
            <Field label="الجنسية"><Input value={form.nationality} onChange={v => setForm(p => ({ ...p, nationality: v }))} placeholder="كويتي" /></Field>
          </div>
          <Field label="الاسم بالعربية *"><Input value={form.name_ar} onChange={v => setForm(p => ({ ...p, name_ar: v }))} placeholder="أحمد محمد الكندي" /></Field>
          <Field label="الاسم بالإنجليزية"><Input value={form.name_en} onChange={v => setForm(p => ({ ...p, name_en: v }))} placeholder="Ahmed Al-Kindi" dir="ltr" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="الهاتف"><Input value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+965 XXXX XXXX" dir="ltr" /></Field>
            <Field label="الرقم المدني"><Input value={form.civil_id} onChange={v => setForm(p => ({ ...p, civil_id: v }))} placeholder="2XXXXXXXXXXX" dir="ltr" /></Field>
          </div>
          <Field label="البريد الإلكتروني"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="email@example.com" dir="ltr" /></Field>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontFamily: "Tajawal, sans-serif", resize: "none", outline: "none" }} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "جاري الحفظ..." : "إضافة العميل"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Shared components (same as AccountsPage) ─────────────────
function Field({ label, children }) {
  return <div style={{ marginBottom: 13 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>{children}</div>;
}
function Input({ value, onChange, placeholder, type = "text", dir = "rtl" }) {
  return <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} dir={dir} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontFamily: "Tajawal, sans-serif", outline: "none" }} onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />;
}
function Btn({ children, onClick, variant = "primary", disabled }) {
  const s = variant === "primary" ? { bg: "#6366f1", color: "white", border: "none" } : { bg: "#f8fafc", color: "#374151", border: "1.5px solid #e2e8f0" };
  return <button onClick={onClick} disabled={disabled} style={{ padding: "9px 18px", borderRadius: 10, border: s.border, background: s.bg, color: s.color, fontSize: 13, fontWeight: 600, fontFamily: "Tajawal, sans-serif", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>{children}</button>;
}
function Modal({ title, onClose, children }) {
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}><div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #f1f5f9" }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>{title}</h3><button onClick={onClose} style={{ border: "none", background: "#f1f5f9", borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>✕</button></div><div style={{ padding: 22 }}>{children}</div></div></div>;
}
