import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../App";

export default function SettingsPage() {
  const { company, notify } = useApp() || {};
  const [settings, setSettings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { if (company?.id) load(); }, [company]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("settings")
      .select("*").eq("company_id", company.id).order("group_name");
    setSettings(data || []);
    setLoading(false);
  };

  const updateSetting = async (id, value) => {
    const { error } = await supabase.from("settings").update({ value }).eq("id", id);
    if (error) notify?.(error.message, "error");
    else { notify?.("تم حفظ الإعداد ✓"); load(); }
  };

  const groups = [...new Set(settings.map(s => s.group_name))];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>الإعدادات</h2>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>إعدادات النظام والشركة</p>
      </div>

      {/* Company Info Card */}
      {company && (
        <div style={{ background: "white", borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>معلومات الشركة</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "الاسم العربي",   value: company.name_ar },
              { label: "الاسم الإنجليزي", value: company.name_en },
              { label: "الكود",           value: company.code },
              { label: "العملة",          value: `${company.currencies?.name_ar} (${company.currencies?.code})` },
              { label: "بداية السنة المالية", value: `الشهر ${company.fiscal_year_start_month}` },
              { label: "الحالة",          value: company.is_active ? "نشط ✓" : "غير نشط" },
            ].map(item => (
              <div key={item.label} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Settings */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>جاري التحميل...</div>
      ) : (
        groups.map(group => (
          <div key={group} style={{ background: "white", borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1a1a2e", textTransform: "capitalize" }}>
              {group === "accounting" ? "إعدادات المحاسبة" : group === "general" ? "إعدادات عامة" : group}
            </h3>
            {settings.filter(s => s.group_name === group).map(setting => (
              <SettingRow key={setting.id} setting={setting} onSave={updateSetting} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function SettingRow({ setting, onSave }) {
  const [val, setVal]   = useState(setting.value || "");
  const [dirty, setDirty] = useState(false);

  const labels = {
    allow_past_date_entries:  "السماح بإدخال قيود بتواريخ سابقة",
    require_cost_center:      "إلزامية مركز التكلفة في القيود",
    auto_post_vouchers:       "ترحيل السندات تلقائياً",
    max_journal_lines:        "الحد الأقصى لأسطر القيد الواحد",
    default_language:         "اللغة الافتراضية",
    date_format:              "تنسيق التاريخ",
    decimal_places:           "عدد المنازل العشرية",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid #f8fafc" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{labels[setting.key] || setting.key}</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
          {setting.is_system ? "إعداد النظام" : "قابل للتعديل"} • {setting.key}
        </div>
      </div>
      <input
        value={val}
        onChange={e => { setVal(e.target.value); setDirty(true); }}
        disabled={setting.is_system}
        style={{
          width: 160, padding: "7px 10px",
          border: "1.5px solid #e2e8f0", borderRadius: 8,
          fontSize: 13, fontFamily: "Tajawal, sans-serif",
          background: setting.is_system ? "#f8fafc" : "white",
          color: setting.is_system ? "#94a3b8" : "#1a1a2e",
          outline: "none", textAlign: "center",
        }}
        onFocus={e => e.target.style.borderColor = "#6366f1"}
        onBlur={e => e.target.style.borderColor = "#e2e8f0"}
      />
      {dirty && !setting.is_system && (
        <button onClick={() => { onSave(setting.id, val); setDirty(false); }}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#6366f1", color: "white", fontSize: 12, fontWeight: 600, fontFamily: "Tajawal, sans-serif", cursor: "pointer" }}>
          حفظ
        </button>
      )}
    </div>
  );
}
