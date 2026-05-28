import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [form, setForm] = useState({ employee_number: "", full_name_ar: "", full_name_en: "", job_title: "", phone: "", email: "", civil_id: "", nationality: "كويتي", date_of_joining: "", basic_salary: "", contract_type: "full_time" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").eq("is_active", true).order("full_name_ar");
    setEmployees(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (!form.full_name_ar?.trim()) { setError("يرجى إدخال اسم الموظف"); return; }
    setSaving(true);
    const { error: err } = await supabase.from("employees").insert({ ...form, basic_salary: parseFloat(form.basic_salary) || 0, is_active: true });
    setSaving(false);
    if (err) { setError(err.message); }
    else {
      setSuccess("تم إضافة الموظف ✅");
      setShowModal(false);
      setForm({ employee_number: "", full_name_ar: "", full_name_en: "", job_title: "", phone: "", email: "", civil_id: "", nationality: "كويتي", date_of_joining: "", basic_salary: "", contract_type: "full_time" });
      load();
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const totalSalaries = employees.reduce((s, e) => s + (e.basic_salary || 0), 0);

  return (
    <div style={{ padding: 20, fontFamily: "Cairo, Tajawal, sans-serif", direction: "rtl" }}>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{success}</div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>الموظفين</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{employees.length} موظف نشط</p>
        </div>
        <button onClick={() => setShowModal(true)} style={btnStyle("#6366f1")}>+ موظف جديد</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "إجمالي الموظفين", value: employees.length, color: "#6366f1" },
          { label: "إجمالي الرواتب", value: `${totalSalaries.toFixed(3)} د.ك`, color: "#10b981" },
          { label: "متوسط الراتب", value: employees.length > 0 ? `${(totalSalaries/employees.length).toFixed(3)} د.ك` : "0.000", color: "#f59e0b" },
        ].map(c => (
          <div key={c.label} style={{ background: "white", borderRadius: 12, padding: "14px 18px", borderRight: `4px solid ${c.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>جارٍ التحميل...</div>
        : employees.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>لا يوجد موظفين</div>
        : <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["رقم الموظف","الاسم","المسمى الوظيفي","الهاتف","تاريخ الالتحاق","الراتب الأساسي"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr key={emp.id} style={{ borderBottom: i < employees.length-1 ? "1px solid #f1f5f9" : "none" }}>
                  <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>{emp.employee_number || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 14, fontWeight: 600 }}>{emp.full_name_ar}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{emp.job_title || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{emp.phone || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#64748b" }}>{emp.date_of_joining || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700 }}>{(emp.basic_salary||0).toFixed(3)} د.ك</td>
                </tr>
              ))}
            </tbody>
          </table>}
      </div>

      {showModal && (
        <Modal title="إضافة موظف جديد" onClose={() => setShowModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="رقم الموظف"><Input value={form.employee_number} onChange={v => setForm(p=>({...p,employee_number:v}))} placeholder="EMP001" dir="ltr" /></Field>
            <Field label="تاريخ الالتحاق"><Input value={form.date_of_joining} onChange={v => setForm(p=>({...p,date_of_joining:v}))} type="date" dir="ltr" /></Field>
          </div>
          <Field label="الاسم بالعربية *"><Input value={form.full_name_ar} onChange={v => setForm(p=>({...p,full_name_ar:v}))} placeholder="محمد أحمد الكندي" /></Field>
          <Field label="الاسم بالإنجليزية"><Input value={form.full_name_en} onChange={v => setForm(p=>({...p,full_name_en:v}))} placeholder="Mohammed Al-Kindi" dir="ltr" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="المسمى الوظيفي"><Input value={form.job_title} onChange={v => setForm(p=>({...p,job_title:v}))} placeholder="محامٍ أول" /></Field>
            <Field label="الجنسية"><Input value={form.nationality} onChange={v => setForm(p=>({...p,nationality:v}))} placeholder="كويتي" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="الهاتف"><Input value={form.phone} onChange={v => setForm(p=>({...p,phone:v}))} placeholder="+965 XXXX XXXX" dir="ltr" /></Field>
            <Field label="الراتب الأساسي (د.ك)"><Input value={form.basic_salary} onChange={v => setForm(p=>({...p,basic_salary:v}))} type="number" dir="ltr" /></Field>
          </div>
          {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowModal(false)} style={btnStyle("#94a3b8")}>إلغاء</button>
            <button onClick={save} disabled={saving} style={btnStyle("#6366f1")}>{saving ? "جارٍ الحفظ..." : "إضافة الموظف"}</button>
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
