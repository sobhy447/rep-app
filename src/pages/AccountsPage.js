import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../App";

const TYPE_INFO = {
  assets:      { ar: "أصل",     color: "#10b981", bg: "#f0fdf4" },
  liabilities: { ar: "خصم",     color: "#ef4444", bg: "#fff5f5" },
  equity:      { ar: "ملكية",   color: "#8b5cf6", bg: "#f5f3ff" },
  revenue:     { ar: "إيراد",   color: "#3b82f6", bg: "#eff6ff" },
  expenses:    { ar: "مصروف",   color: "#f59e0b", bg: "#fffbeb" },
};

const fmt = (n) => new Intl.NumberFormat("ar-KW", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n || 0);

export default function AccountsPage() {
  const { company, notify } = useApp() || {};
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editAcc, setEditAcc]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    account_code: "", name_ar: "", name_en: "",
    account_type: "assets", level: 1, parent_id: null,
    accepts_entries: false, notes: ""
  });

  useEffect(() => { if (company?.id) loadAccounts(); }, [company]);

  const loadAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("company_id", company.id)
      .is("deleted_at", null)
      .order("account_code");
    if (error) { notify?.("خطأ في تحميل الحسابات", "error"); }
    else {
      setAccounts(data || []);
      // Auto-expand level 1 & 2
      const toExpand = new Set((data || []).filter(a => a.level <= 2).map(a => a.id));
      setExpanded(toExpand);
    }
    setLoading(false);
  };

  const toggleExpand = (id) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const openAdd = (parentAcc = null) => {
    setEditAcc(null);
    const newLevel = parentAcc ? parentAcc.level + 1 : 1;
    const normalBalance = parentAcc
      ? (["assets","expenses"].includes(parentAcc.account_type) ? "debit" : "credit")
      : "debit";
    setForm({
      account_code: "", name_ar: "", name_en: "",
      account_type: parentAcc?.account_type || "assets",
      normal_balance: normalBalance,
      level: newLevel, parent_id: parentAcc?.id || null,
      accepts_entries: newLevel >= 4,
      notes: ""
    });
    setShowModal(true);
  };

  const openEdit = (acc) => {
    setEditAcc(acc);
    setForm({ ...acc });
    setShowModal(true);
  };

  const saveAccount = async () => {
    if (!form.account_code?.trim() || !form.name_ar?.trim()) {
      notify?.("يرجى إدخال رقم الحساب والاسم", "error"); return;
    }
    setSaving(true);

    // Auto-set normal_balance based on type (IFRS)
    const normal_balance = ["assets","expenses"].includes(form.account_type) ? "debit" : "credit";
    const payload = { ...form, normal_balance, company_id: company.id };

    if (editAcc) {
      const { error } = await supabase.from("accounts").update(payload).eq("id", editAcc.id);
      if (error) notify?.(error.message, "error");
      else { notify?.("تم تحديث الحساب ✓"); setShowModal(false); loadAccounts(); }
    } else {
      const { error } = await supabase.from("accounts").insert(payload);
      if (error) notify?.(error.message, "error");
      else { notify?.("تم إضافة الحساب ✓"); setShowModal(false); loadAccounts(); }
    }
    setSaving(false);
  };

  const archiveAccount = async (acc) => {
    const hasChildren = accounts.some(a => a.parent_id === acc.id);
    if (hasChildren) { notify?.("لا يمكن حذف حساب له فروع", "error"); return; }
    if (!window.confirm(`هل تريد أرشفة حساب: ${acc.name_ar}؟`)) return;
    const { error } = await supabase.from("accounts").update({ is_archived: true }).eq("id", acc.id);
    if (error) notify?.(error.message, "error");
    else { notify?.("تم أرشفة الحساب"); loadAccounts(); }
  };

  const filtered = search.trim()
    ? accounts.filter(a =>
        a.account_code.toLowerCase().includes(search.toLowerCase()) ||
        a.name_ar.includes(search) ||
        (a.name_en || "").toLowerCase().includes(search.toLowerCase())
      )
    : accounts;

  const renderTree = (parentId = null, depth = 0) => {
    const children = filtered
      .filter(a => a.parent_id === parentId && !a.is_archived)
      .sort((a, b) => a.account_code.localeCompare(b.account_code));

    return children.map(acc => {
      const hasChildren = accounts.some(a => a.parent_id === acc.id && !a.is_archived);
      const isExpanded  = expanded.has(acc.id) || search.trim() !== "";
      const typeInfo    = TYPE_INFO[acc.account_type] || TYPE_INFO.assets;
      const balance     = (acc.normal_balance === "debit")
        ? (acc.opening_debit + acc.current_debit) - (acc.opening_credit + acc.current_credit)
        : (acc.opening_credit + acc.current_credit) - (acc.opening_debit + acc.current_debit);

      return (
        <div key={acc.id}>
          <div
            style={{
              display: "flex", alignItems: "center",
              padding: "8px 10px",
              paddingRight: `${10 + depth * 20}px`,
              borderRadius: 8, margin: "1px 0",
              background: depth === 0 ? "#f8fafc" : "white",
              border: `1px solid ${depth === 0 ? "#e2e8f0" : "transparent"}`,
              transition: "background 0.1s",
              cursor: "default",
            }}
            onMouseEnter={e => { if (depth > 0) e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={e => { if (depth > 0) e.currentTarget.style.background = "white"; }}
          >
            {/* Expand */}
            <div
              style={{ width: 18, flexShrink: 0, color: "#94a3b8", cursor: hasChildren ? "pointer" : "default" }}
              onClick={() => hasChildren && toggleExpand(acc.id)}
            >
              {hasChildren
                ? <span style={{ display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: 10 }}>▶</span>
                : <span style={{ display: "inline-block", width: 10 }} />
              }
            </div>

            {/* Code */}
            <div style={{ width: 110, flexShrink: 0, fontFamily: "monospace", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>
              {acc.account_code}
            </div>

            {/* Name */}
            <div style={{ flex: 1, fontSize: 13, fontWeight: depth === 0 ? 700 : 500, color: "#1a1a2e", minWidth: 0 }}>
              {acc.name_ar}
              {acc.cost_center_required && (
                <span style={{ fontSize: 10, color: "#f59e0b", marginRight: 6, fontWeight: 600 }}>مركز تكلفة</span>
              )}
            </div>

            {/* English */}
            <div style={{ width: 150, fontSize: 11, color: "#94a3b8", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {acc.name_en}
            </div>

            {/* Type */}
            <div style={{ width: 60, textAlign: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: typeInfo.bg, color: typeInfo.color }}>
                {typeInfo.ar}
              </span>
            </div>

            {/* Accepts entries */}
            <div style={{ width: 50, textAlign: "center" }}>
              {acc.accepts_entries && (
                <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>✓ قيود</span>
              )}
            </div>

            {/* Balance */}
            <div style={{ width: 110, textAlign: "left", fontSize: 12, fontWeight: 600, color: balance !== 0 ? "#1a1a2e" : "#cbd5e1" }}>
              {balance !== 0 ? `${fmt(Math.abs(balance))}` : "—"}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 3, opacity: 0, transition: "opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
            >
              <button onClick={() => openAdd(acc)} title="إضافة فرعي"
                style={{ border: "none", background: "#f0fdf4", color: "#10b981", borderRadius: 5, padding: "4px 6px", cursor: "pointer", fontSize: 11 }}>+</button>
              <button onClick={() => openEdit(acc)} title="تعديل"
                style={{ border: "none", background: "#eff6ff", color: "#3b82f6", borderRadius: 5, padding: "4px 6px", cursor: "pointer", fontSize: 11 }}>✎</button>
              <button onClick={() => archiveAccount(acc)} title="أرشفة"
                style={{ border: "none", background: "#fff5f5", color: "#ef4444", borderRadius: 5, padding: "4px 6px", cursor: "pointer", fontSize: 11 }}>✕</button>
            </div>
          </div>
          {(isExpanded || search) && renderTree(acc.id, depth + 1)}
        </div>
      );
    });
  };

  const typeStats = Object.entries(TYPE_INFO).map(([key, info]) => ({
    ...info, key, count: accounts.filter(a => a.account_type === key && !a.is_archived).length
  }));

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>دليل الحسابات</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            {accounts.filter(a => !a.is_archived).length} حساب • هيكل شجري
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="secondary" onClick={() => notify?.("قريباً: استيراد Excel", "warning")}>⬆ استيراد Excel</Btn>
          <Btn onClick={() => openAdd()}>+ حساب جديد</Btn>
        </div>
      </div>

      {/* Type stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {typeStats.map(t => (
          <div key={t.key} style={{
            padding: "6px 14px", borderRadius: 8,
            background: t.bg, color: t.color,
            fontSize: 12, fontWeight: 700, display: "flex", gap: 6, alignItems: "center"
          }}>
            <span>{t.count}</span>
            <span style={{ opacity: 0.7 }}>{t.ar}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث برقم أو اسم الحساب..."
          style={{
            width: "100%", padding: "10px 16px 10px 36px",
            border: "1.5px solid #e2e8f0", borderRadius: 10,
            fontSize: 14, fontFamily: "Tajawal, sans-serif", outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = "#6366f1"}
          onBlur={e => e.target.style.borderColor = "#e2e8f0"}
        />
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }}>🔍</span>
      </div>

      {/* Table header */}
      <div style={{ display: "flex", padding: "6px 10px", background: "#f1f5f9", borderRadius: 8, marginBottom: 6, fontSize: 11, color: "#64748b", fontWeight: 700 }}>
        <div style={{ width: 18 }} />
        <div style={{ width: 110 }}>رقم الحساب</div>
        <div style={{ flex: 1 }}>الاسم</div>
        <div style={{ width: 150 }}>بالإنجليزي</div>
        <div style={{ width: 60, textAlign: "center" }}>النوع</div>
        <div style={{ width: 50, textAlign: "center" }}>قيود</div>
        <div style={{ width: 110, textAlign: "left" }}>الرصيد</div>
        <div style={{ width: 70 }}></div>
      </div>

      {/* Tree */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 8, minHeight: 200 }}>
        {loading
          ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>جاري التحميل...</div>
          : accounts.length === 0
          ? <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⊟</div>
              <div style={{ color: "#64748b", marginBottom: 16 }}>لا توجد حسابات بعد</div>
              <Btn onClick={() => openAdd()}>+ أضف أول حساب</Btn>
            </div>
          : renderTree(null)
        }
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editAcc ? "تعديل حساب" : "إضافة حساب جديد"} onClose={() => setShowModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="رقم الحساب *">
              <Input value={form.account_code} onChange={v => setForm(p => ({ ...p, account_code: v }))}
                placeholder="1-1-01-01" dir="ltr" />
            </Field>
            <Field label="المستوى">
              <Input value={form.level} onChange={v => setForm(p => ({ ...p, level: parseInt(v) || 1 }))}
                type="number" dir="ltr" />
            </Field>
          </div>
          <Field label="الاسم بالعربية *">
            <Input value={form.name_ar} onChange={v => setForm(p => ({ ...p, name_ar: v }))}
              placeholder="مثال: الصندوق الرئيسي" />
          </Field>
          <Field label="الاسم بالإنجليزية">
            <Input value={form.name_en || ""} onChange={v => setForm(p => ({ ...p, name_en: v }))}
              placeholder="Main Cash Box" dir="ltr" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="نوع الحساب">
              <Select value={form.account_type} onChange={v => setForm(p => ({ ...p, account_type: v }))}
                options={Object.entries(TYPE_INFO).map(([k, v]) => ({ value: k, label: v.ar }))} />
            </Field>
            <Field label="يقبل قيود مباشرة">
              <Select value={form.accepts_entries ? "yes" : "no"}
                onChange={v => setForm(p => ({ ...p, accepts_entries: v === "yes" }))}
                options={[{ value: "yes", label: "نعم — حساب تفصيلي" }, { value: "no", label: "لا — حساب تجميعي" }]} />
            </Field>
          </div>
          <Field label="مطلوب مركز تكلفة">
            <Select value={form.cost_center_required ? "yes" : "no"}
              onChange={v => setForm(p => ({ ...p, cost_center_required: v === "yes" }))}
              options={[{ value: "no", label: "لا" }, { value: "yes", label: "نعم (مثل: ذمم العملاء)" }]} />
          </Field>
          <Field label="ملاحظات">
            <textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} style={{
                width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0",
                borderRadius: 10, fontSize: 13, fontFamily: "Tajawal, sans-serif",
                resize: "none", outline: "none"
              }} />
          </Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Btn>
            <Btn onClick={saveAccount} disabled={saving}>
              {saving ? "جاري الحفظ..." : editAcc ? "حفظ التعديلات" : "إضافة الحساب"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Shared UI Components ──────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", dir = "rtl" }) {
  return (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} dir={dir}
      style={{
        width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0",
        borderRadius: 10, fontSize: 13, fontFamily: "Tajawal, sans-serif", outline: "none",
      }}
      onFocus={e => e.target.style.borderColor = "#6366f1"}
      onBlur={e => e.target.style.borderColor = "#e2e8f0"}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0",
        borderRadius: 10, fontSize: 13, fontFamily: "Tajawal, sans-serif",
        background: "white", outline: "none", cursor: "pointer",
      }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ children, onClick, variant = "primary", disabled }) {
  const styles = {
    primary:   { bg: "#6366f1", color: "white",    border: "none" },
    secondary: { bg: "#f8fafc", color: "#374151",  border: "1.5px solid #e2e8f0" },
  };
  const s = styles[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "9px 18px", borderRadius: 10, border: s.border,
      background: s.bg, color: s.color, fontSize: 13, fontWeight: 600,
      fontFamily: "Tajawal, sans-serif", cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1, transition: "all 0.15s",
    }}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "white", borderRadius: 20, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid #f1f5f9"
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>{title}</h3>
          <button onClick={onClose} style={{
            border: "none", background: "#f1f5f9", borderRadius: 8,
            padding: "5px 8px", cursor: "pointer", color: "#64748b"
          }}>✕</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}
