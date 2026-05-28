import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [success, setSuccess]   = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("settings").select("*").order("key");
    setSettings(data || []);
    setLoading(false);
  };

  const updateSetting = async (id, value) => {
    const { error } = await supabase.from("settings").update({ value }).eq("id", id);
    if (!error) { setSuccess("تم حفظ الإعداد ✅"); load(); setTimeout(() => setSuccess(""), 3000); }
  };

  const groups = [...new Set(settings.map(s => s.group_name || "عام"))];

  const groupLabel = (g) => ({ accounting: "إعدادات المحاسبة", general: "إعدادات عامة" }[g] || g);

  return (
    <div style={{ padding: 20, fontFamily: "Cairo, Tajawal, sans-serif", direction: "rtl" }}>
      {success && <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{success}</div>}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>الإعدادات</h2>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>إعدادات النظام</p>
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>جارٍ التحميل...</div>
      : settings.length === 0
      ? <div style={{ background: "white", borderRadius: 16, padding: 40, textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>لا توجد إعدادات محددة</div>
      : groups.map(group => (
          <div key={group} style={{ background: "white", borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{groupLabel(group)}</h3>
            {settings.filter(s => (s.group_name || "عام") === group).map(setting => (
              <SettingRow key={setting.id} setting={setting} onSave={updateSetting} />
            ))}
          </div>
        ))}
    </div>
  );
}

function SettingRow({ setting, onSave }) {
  const [val, setVal]     = useState(setting.value || "");
  const [dirty, setDirty] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "11px 0", borderBottom: "1px solid #f8fafc" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{setting.key}</div>
      </div>
      <input value={val} onChange={e => { setVal(e.target.value); setDirty(true); }}
        disabled={setting.is_system}
        style={{ width: 160, padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "Cairo, sans-serif", background: setting.is_system ? "#f8fafc" : "white", outline: "none", textAlign: "center" }} />
      {dirty && !setting.is_system && (
        <button onClick={() => { onSave(setting.id, val); setDirty(false); }}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#6366f1", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Cairo, sans-serif" }}>حفظ</button>
      )}
    </div>
  );
}
