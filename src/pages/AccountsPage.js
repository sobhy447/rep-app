import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const TYPE_INFO = {
  asset:     { ar: "أصل",     color: "#10b981", bg: "#f0fdf4" },
  liability: { ar: "خصم",     color: "#ef4444", bg: "#fff5f5" },
  equity:    { ar: "ملكية",   color: "#8b5cf6", bg: "#f5f3ff" },
  revenue:   { ar: "إيراد",   color: "#3b82f6", bg: "#eff6ff" },
  expense:   { ar: "مصروف",   color: "#f59e0b", bg: "#fffbeb" },
};

const fmt = (n) => new Intl.NumberFormat("ar-KW", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n || 0);

export default function AccountsPage() {
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editAcc, setEditAcc]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [form, setForm] = useState({
    account_code: "", name_ar: "", name_en: "",
    account_type: "asset", level: 1, parent_id: null,
    allow_posting: false, notes: ""
  });

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("is_active", true)
      .order("account_code");
    if (error) setError("خطأ في تحميل الحسابات");
    else {
      setAccounts(data || []);
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
    setForm({
      account_code: "", name_ar: "", name_en: "",
      account_type: parentAcc?.account_type || "asset",
      balance_type: ["asset","expense"].includes(parentAcc?.account_type) ? "debit" : "credit",
      level: newLevel, parent_id: parentAcc?.id || null,
      allow_posting: newLevel >= 4, notes: ""
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
      setError("يرجى إدخال رقم الحساب والاسم"); return;
    }
    setSaving(true);
    const balance_type = ["asset","expense"].includes(form.account_type) ? "debit" : "credit";
    const payload = { ...form, balance_type, is_active: true };

    if (editAcc) {
      const { error } = await supabase.from("accounts").update(payload).eq("id", editAcc.id);
      if (error) setError(error.message);
      else { setSuccess("تم تحديث الحساب ✅"); setShowModal(false); loadAccounts(); }
    } else {
      const { error } = await supabase.from("accounts").insert(payload);
      if (error) setError(error.message);
      else { setSuccess("تم إضافة الحساب ✅"); setShowModal(false); loadAccounts(); }
    }
    setSaving(false);
    setTimeout(() => { setError(""); setSuccess(""); }, 3000);
  };

  const filtered = search.trim()
    ? accounts.filter(a =>
        a.account_code?.toLowerCase().includes(search.toLowerCase()) ||
        a.name_ar?.includes(search)
      )
    : accounts;

  const renderTree = (parentId = null, depth = 0) => {
    const children = filtered
      .filter(a => a.parent_id === parentId)
      .sort((a, b) => (a.account_code || "").localeCompare(b.account_code || ""));

    return children.map(acc => {
      const hasChildren = accounts.some(a => a.parent_id === acc.id);
      const isExpanded  = expanded.has(acc.id) || search.trim() !== "";
      const typeInfo    = TYPE_INFO[acc.account_type] || TYPE_INFO.asset;

      return (
        <div key={acc.id}>
          <div style={{
            display: "flex", alignItems: "center",
            padding: "7px 10px",
            paddingRight: `${10 + depth * 20}px`,
            borderRadius: 6, margin: "1px 0",
            background: depth === 0 ? "#f8fafc" : "white",
            border: `1px solid ${depth === 0 ? "#e2e8f0" : "transparent"}`,
          }}>
            <div style={{ width: 18, flexShrink: 0, color: "#94a3b8", cursor: hasChildren ? "pointer" : "default" }}
              onClick={() => hasChildren && toggleExpand(acc.id)}>
              {hasChildren
                ? <span style={{ display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: 10 }}>▶</span>
                : <span style={{ display: "inline-block", width: 10 }} />}
            </div>
            <div style={{ width: 120, flexShrink: 0, fontFamily: "monospace", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>
              {acc.account_code}
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: depth === 0 ? 700 : 500, color: "#1a1a2e" }}>
              {acc.name_ar}
            </div>
            <div style={{ width: 140, fontSize: 11, color: "#94a3b8", textAlign: "left" }}>{acc.name_en}</div>
            <div style={{ width: 60, textAlign: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: typeInfo.bg, color: typeInfo.color }}>
                {typeInfo.ar}
              </span>
            </div>
            <div style={{ width: 80, textAlign: "left", fontSize: 11, color: "#64748b" }}>
              {acc.opening_balance ? fmt(acc.opening_balance) : "—"}
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              <button onClick={() => openAdd(acc)} title="إضافة فرعي"
                style={{ border: "none", background: "#f0fdf4", color: "#10b981", borderRadius: 5, padding: "3px 6px", cursor: "pointer", fontSize: 11 }}>+</button>
              <button onClick={() => openEdit(acc)} title="تعديل"
                style={{ border: "none", background: "#eff6ff", color: "#3b82f6", borderRadius: 5, padding: "3px 6px", cursor: "pointer", fontSize: 11 }}>✎</button>
            </div>
          </div>
          {isExpanded && renderTree(acc.id, depth + 1)}
        </div>
      );
    });
  };

  const typeStats = Object.entries(TYPE_INFO).map(([key, info]) => ({
    ...info, key, count: accounts.filter(a => a.account_type === key).length
  }));

  return (
    <div style={{ padding: 20, fontFamily: "Cairo, Tajawal, sans-serif", direction: "rtl" }}>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{success}</div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>دليل الحسابات</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            {accounts.length} حساب • هيكل شجري
          </p>
        </div>
        <button onClick={() => openAdd()} style={{ background: "#6366f1", color: "white", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, fontFamily: "Cairo, sans-serif", cursor: "pointer" }}>
          + حساب جديد
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {typeStats.map(t => (
          <div key={t.key} style={{ padding: "5px 12px", borderRadius: 8, background: t.bg, color: t.color, fontSize: 12, fontWeight: 700, display: "flex", gap: 6 }}>
            <span>{t.count}</span><span style={{ opacity: 0.7 }}>{t.ar}</span>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث برقم أو اسم الحساب..."
          style={{ width: "100%", padding: "9px 16px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontFamily: "Cairo, sans-serif", outline: "none", boxSizing: "border-box" }} />
      </div>

      <div style={{ display: "flex", padding: "5px 10px", background: "#f1f5f9", borderRadius: 8, marginBottom: 6, fontSize: 11, color: "#64748b", fontWeight: 700 }}>
        <div style={{ width: 18 }} />
        <div style={{ width: 120 }}>رقم الحساب</div>
        <div style={{ flex: 1 }}>الاسم</div>
        <div style={{ width: 140 }}>بالإنجليزي</div>
        <div style={{ width: 60, textAlign: "center" }}>النوع</div>
        <div style={{ width: 80 }}>الرصيد</div>
        <div style={{ width: 60 }}></div>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 8, minHeight: 200 }}>
        {loading
          ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>جارٍ التحميل...</div>
          : accounts.length === 0
          ? <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ color: "#64748b", marginBottom: 16 }}>لا توجد حسابات بعد</div>
            </div>
          : renderTree(null)
        }
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editAcc ? "تعديل حساب" : "إضافة حساب جديد"}</h3>
              <button onClick={() => setShowModal(false)} style={{ border: "none", background: "#f1f5f9", borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>رقم الحساب *</label>
                  <input value={form.account_code} onChange={e => setForm(p => ({ ...p, account_code: e.target.value }))}
                    placeholder="1101011" dir="ltr"
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>نوع الحساب</label>
                  <select value={form.account_type} onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "white", outline: "none" }}>
                    {Object.entries(TYPE_INFO).map(([k, v]) => <option key={k} value={k}>{v.ar}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>الاسم بالعربية *</label>
                <input value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))}
                  placeholder="الصندوق الرئيسي"
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>الاسم بالإنجليزية</label>
                <input value={form.name_en || ""} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))}
                  placeholder="Main Cash" dir="ltr"
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.allow_posting || false}
                    onChange={e => setForm(p => ({ ...p, allow_posting: e.target.checked }))} />
                  يقبل قيود مباشرة (حساب تفصيلي)
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowModal(false)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#374151", fontSize: 13, cursor: "pointer" }}>إلغاء</button>
                <button onClick={saveAccount} disabled={saving}
                  style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#6366f1", color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "جارٍ الحفظ..." : editAcc ? "حفظ التعديلات" : "إضافة الحساب"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
