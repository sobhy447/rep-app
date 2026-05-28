import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [form, setForm] = useState({ file_code: "", full_name_ar: "", full_name_en: "", phone: "", email: "", civil_id: "", nationality: "كويتي", notes: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("full_name_ar");
    setCustomers(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (!form.full_name_ar?.trim()) { setError("يرجى إدخال اسم العميل"); return; }
    setSaving(true);
    const { error: err } = await supabase.from("customers").insert({ ...form });
    setSaving(false);
    if (err) { setError(err.message); }
    else {
      setSuccess("تم إضافة العميل ✅");
      setShowModal(false);
      setForm({ file_code: "", full_name_ar: "", full_name_en: "", phone: "", email: "", civil_id: "", nationality: "كويتي", notes: "" });
      load();
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const filtered = customers.filter(c =>
    !search || c.full_name_ar?.includes(search) || c.file_code?.includes(search) || (c.phone || "").includes(search)
  );

  return (
    <div style={{ padding: 20, fontFamily: "Cairo, Tajawal, sans-serif", direction: "rtl" }}>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{success}</div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>العملاء والموكلين</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{customers.length} عميل</p>
        </div>
        <button onClick={() => setShowModal(true)} style={btnStyle("#6366f1")}>+ عميل جديد</button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو رقم الملف أو الهاتف..."
        style={{ width: "100%", padding: "9px 16px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontFamily: "Cairo, sans-serif", outline: "none", marginBottom: 14, boxSizing: "border-box" }} />

      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>جارٍ التحميل...</div>
        : filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>لا يوجد عملاء</div>
        : <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["رقم الملف", "الاسم", "الهاتف", "البريد", "الجنسية"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < filtered.length-1 ? "1px solid #f1f5f9" : "none" }}>
                  <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>{c.file_code || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 14, fontWeight: 600 }}>{c.full_name_ar}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{c.phone || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{c.email || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12 }}>
                    <span style={{ background: "#f0f9ff", color: "#0369a1", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{c.nationality || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
      </div>

      {showModal && (
        <Modal title="إضافة عميل جديد" onClose={() => setShowModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="رقم الملف"><Input value={form.file_code} onChange={v => setForm(p => ({ ...p, file_code: v }))} placeholder="12345" dir="ltr" /></Field>
            <Field label="الجنسية"><Input value={form.nationality} onChange={v => setForm(p => ({ ...p, nationality: v }))} placeholder="كويتي" /></Field>
          </div>
          <Field label="الاسم بالعربية *"><Input value={form.full_name_ar} onChange={v => setForm(p => ({ ...p, full_name_ar: v }))} placeholder="أحمد محمد الكندي" /></Field>
          <Field label="الاسم بالإنجليزية"><Input value={form.full_name_en} onChange={v => setForm(p => ({ ...p, full_name_en: v }))} placeholder="Ahmed Al-Kindi" dir="ltr" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="الهاتف"><Input value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+965 XXXX XXXX" dir="ltr" /></Field>
            <Field label="الرقم المدني"><Input value={form.civil_id} onChange={v => setForm(p => ({ ...p, civil_id: v }))} placeholder="2XXXXXXXXXXX" dir="ltr" /></Field>
          </div>
          <Field label="البريد الإلكتروني"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="email@example.com" dir="ltr" /></Field>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, resize: "none", outline: "none", fontFamily: "Cairo, sans-serif", boxSizing: "border-box" }} /></Field>
          {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowModal(false)} style={btnStyle("#94a3b8")}>إلغاء</button>
            <button onClick={save} disabled={saving} style={btnStyle("#6366f1")}>{saving ? "جارٍ الحفظ..." : "إضافة العميل"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const btnStyle = (bg) => ({ background: bg, color: "white", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, fontFamily: "Cairo, sans-serif", cursor: "pointer" });
function Field({ label, children }) { return <div style={{ marginBottom: 13 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>{children}</div>; }
function Input({ value, onChange, placeholder, type = "text", dir = "rtl" }) { return <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} dir={dir} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "Cairo, sans-serif", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />; }
function Modal({ title, onClose, children }) { return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}><div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #f1f5f9" }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3><button onClick={onClose} style={{ border: "none", background: "#f1f5f9", borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>✕</button></div><div style={{ padding: 22 }}>{children}</div></div></div>; }
