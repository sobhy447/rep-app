import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const EMPTY_LINE = {
  account_id: '',
  account_code: '',
  account_name: '',
  cost_center_id: '',
  additional_cost_center_code: '',
  additional_cost_center_id: '',
  client_name: '',
  defendant_name: '',
  debit_amount: '',
  credit_amount: '',
  description: '',
};

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // بيانات النموذج
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    currency: 'KWD',
    exchange_rate: '1',
    notes: '',
  });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);

  // ───── تحميل البيانات ─────
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: accs }, { data: ccs }, { data: ents }] = await Promise.all([
      supabase.from('accounts').select('id,account_code,name_ar').order('account_code'),
      supabase.from('cost_centers').select('id,code,name_ar').eq('is_active', true).order('code'),
      supabase.from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    setAccounts(accs || []);
    setCostCenters(ccs || []);
    setEntries(ents || []);
    setLoading(false);
  }

  // ───── جلب تلقائي لاسم الحساب بالكود ─────
  async function handleAccountCodeChange(idx, code) {
    const updated = [...lines];
    updated[idx].account_code = code;
    updated[idx].account_id = '';
    updated[idx].account_name = '';
    if (code.length >= 3) {
      const acc = accounts.find(a => a.account_code === code);
      if (acc) {
        updated[idx].account_id = acc.id;
        updated[idx].account_name = acc.name_ar;
      }
    }
    setLines(updated);
  }

  // ───── جلب تلقائي لمركز التكلفة الإضافي (5 أرقام) ─────
  async function handleAdditionalCCCode(idx, code) {
    const updated = [...lines];
    updated[idx].additional_cost_center_code = code;
    updated[idx].additional_cost_center_id = '';
    updated[idx].client_name = '';
    updated[idx].defendant_name = '';

    if (/^\d{5}$/.test(code)) {
      const { data } = await supabase
        .from('additional_cost_centers')
        .select('id,client_name,defendant_name')
        .eq('code', code)
        .single();
      if (data) {
        updated[idx].additional_cost_center_id = data.id;
        updated[idx].client_name = data.client_name;
        updated[idx].defendant_name = data.defendant_name;
      } else {
        updated[idx].client_name = '⚠ كود غير موجود';
      }
    }
    setLines(updated);
  }

  // ───── إضافة / حذف سطور ─────
  function addLine() { setLines([...lines, { ...EMPTY_LINE }]); }
  function removeLine(idx) {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  }
  function updateLine(idx, field, value) {
    const updated = [...lines];
    updated[idx][field] = value;
    setLines(updated);
  }

  // ───── حساب الميزان ─────
  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  // ───── حفظ القيد ─────
  async function handleSave(saveStatus = 'draft') {
    setError('');
    if (!form.description) { setError('الوصف مطلوب'); return; }
    if (!isBalanced) { setError('القيد غير متوازن - المدين ≠ الدائن'); return; }
    const validLines = lines.filter(l => l.account_id && (parseFloat(l.debit_amount) > 0 || parseFloat(l.credit_amount) > 0));
    if (validLines.length < 2) { setError('يجب إدخال سطرين على الأقل'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // رقم القيد تلقائي
      const year = new Date().getFullYear().toString().slice(-2);
      const { count } = await supabase.from('journal_entries').select('*', { count: 'exact', head: true });
      const entryNumber = `JE${year}-${String((count || 0) + 1).padStart(4, '0')}`;

      const entryData = {
        entry_number: entryNumber,
        entry_date: form.entry_date,
        description: form.description,
        currency: form.currency,
        exchange_rate: parseFloat(form.exchange_rate) || 1,
        status: saveStatus,
        notes: form.notes,
        created_by: user?.id,
      };

      let entryId;
      if (editEntry) {
        const { data, error: e } = await supabase
          .from('journal_entries').update(entryData).eq('id', editEntry.id).select().single();
        if (e) throw e;
        entryId = editEntry.id;
        await supabase.from('journal_entry_lines').delete().eq('entry_id', entryId);
      } else {
        const { data, error: e } = await supabase
          .from('journal_entries').insert(entryData).select().single();
        if (e) throw e;
        entryId = data.id;
      }

      // إدراج السطور
      const linesData = validLines.map((l, i) => ({
        entry_id: entryId,
        line_number: i + 1,
        account_id: l.account_id,
        cost_center_id: l.cost_center_id || null,
        additional_cost_center_id: l.additional_cost_center_id || null,
        debit_amount: parseFloat(l.debit_amount) || 0,
        credit_amount: parseFloat(l.credit_amount) || 0,
        description: l.description || form.description,
      }));
      const { error: le } = await supabase.from('journal_entry_lines').insert(linesData);
      if (le) throw le;

      setSuccess(saveStatus === 'posted' ? 'تم ترحيل القيد بنجاح ✓' : 'تم الحفظ كمسودة ✓');
      setShowForm(false);
      resetForm();
      loadAll();
    } catch (e) {
      setError(e.message || 'خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm({ entry_date: new Date().toISOString().split('T')[0], description: '', currency: 'KWD', exchange_rate: '1', notes: '' });
    setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
    setEditEntry(null);
    setError('');
  }

  async function handlePost(entry) {
    if (!window.confirm(`ترحيل القيد ${entry.entry_number}؟ لن تتمكن من التعديل بعدها.`)) return;
    const { error } = await supabase.from('journal_entries').update({ status: 'posted' }).eq('id', entry.id);
    if (!error) { setSuccess('تم الترحيل ✓'); loadAll(); }
    else setError(error.message);
  }

  async function handleDelete(entry) {
    if (entry.status === 'posted') { setError('لا يمكن حذف قيد مرحّل'); return; }
    if (!window.confirm('حذف القيد نهائياً؟')) return;
    await supabase.from('journal_entry_lines').delete().eq('entry_id', entry.id);
    const { error } = await supabase.from('journal_entries').delete().eq('id', entry.id);
    if (!error) { setSuccess('تم الحذف ✓'); loadAll(); }
  }

  const filtered = entries.filter(e => {
    const matchSearch = !search || e.entry_number?.includes(search) || e.description?.includes(search);
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ───── الواجهة ─────
  return (
    <div style={{ fontFamily: 'Tajawal, Arial, sans-serif', direction: 'rtl', padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: '#1e293b' }}>📒 القيود المحاسبية</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}>
          + قيد جديد
        </button>
      </div>

      {/* Alerts */}
      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 12 }}>{error} <button onClick={() => setError('')} style={{ float: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>×</button></div>}
      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: 8, marginBottom: 12 }}>{success} <button onClick={() => setSuccess('')} style={{ float: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontSize: 16 }}>×</button></div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم أو وصف..."
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', flex: 1, fontFamily: 'inherit', fontSize: 14 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontFamily: 'inherit', fontSize: 14 }}>
          <option value="all">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="posted">مرحّل</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {/* ─── نموذج إدخال قيد ─── */}
      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', color: '#1e293b' }}>{editEntry ? 'تعديل قيد' : 'قيد محاسبي جديد'}</h3>

          {/* بيانات رأس القيد */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <label style={lbl}>
              تاريخ القيد
              <input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} style={inp} />
            </label>
            <label style={lbl}>
              العملة
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={inp}>
                <option value="KWD">دينار كويتي</option>
                <option value="USD">دولار أمريكي</option>
                <option value="EUR">يورو</option>
                <option value="SAR">ريال سعودي</option>
              </select>
            </label>
            {form.currency !== 'KWD' && (
              <label style={lbl}>
                سعر الصرف
                <input type="number" value={form.exchange_rate} onChange={e => setForm({ ...form, exchange_rate: e.target.value })} style={inp} min="0" step="0.0001" />
              </label>
            )}
            <label style={{ ...lbl, gridColumn: 'span 2' }}>
              الوصف *
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inp} placeholder="وصف القيد" />
            </label>
          </div>

          {/* سطور القيد */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#e2e8f0' }}>
                  <th style={th}>#</th>
                  <th style={th}>كود الحساب</th>
                  <th style={th}>اسم الحساب</th>
                  <th style={th}>مركز التكلفة</th>
                  <th style={{ ...th, background: '#dbeafe' }}>كود الملف (5 أرقام)</th>
                  <th style={{ ...th, background: '#dbeafe' }}>الموكل</th>
                  <th style={{ ...th, background: '#dbeafe' }}>الخصم</th>
                  <th style={th}>مدين</th>
                  <th style={th}>دائن</th>
                  <th style={th}>بيان</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={td}>{idx + 1}</td>
                    {/* كود الحساب */}
                    <td style={td}>
                      <input value={line.account_code} onChange={e => handleAccountCodeChange(idx, e.target.value)}
                        style={{ ...cellInp, width: 80 }} placeholder="كود" />
                    </td>
                    {/* اسم الحساب من القائمة */}
                    <td style={td}>
                      <select value={line.account_id}
                        onChange={e => {
                          const acc = accounts.find(a => a.id === e.target.value);
                          const updated = [...lines];
                          updated[idx].account_id = e.target.value;
                          updated[idx].account_code = acc?.account_code || '';
                          updated[idx].account_name = acc?.name_ar || '';
                          setLines(updated);
                        }}
                        style={{ ...cellInp, minWidth: 160 }}>
                        <option value="">-- اختر --</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}
                      </select>
                      {line.account_name && !accounts.find(a => a.id === line.account_id) && (
                        <div style={{ color: '#dc2626', fontSize: 11 }}>⚠ غير موجود</div>
                      )}
                    </td>
                    {/* مركز التكلفة العام */}
                    <td style={td}>
                      <select value={line.cost_center_id}
                        onChange={e => updateLine(idx, 'cost_center_id', e.target.value)}
                        style={{ ...cellInp, minWidth: 130 }}>
                        <option value="">-- اختياري --</option>
                        {costCenters.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name_ar}</option>)}
                      </select>
                    </td>
                    {/* كود الملف (5 أرقام) - مركز تكلفة إضافي */}
                    <td style={{ ...td, background: '#eff6ff' }}>
                      <input value={line.additional_cost_center_code}
                        onChange={e => handleAdditionalCCCode(idx, e.target.value)}
                        style={{ ...cellInp, width: 70, background: '#eff6ff' }}
                        maxLength={5} placeholder="12345" />
                    </td>
                    {/* الموكل - يُجلب تلقائياً */}
                    <td style={{ ...td, background: '#eff6ff' }}>
                      <div style={{ minWidth: 110, color: line.client_name?.startsWith('⚠') ? '#dc2626' : '#1e293b', fontSize: 12, padding: '2px 4px' }}>
                        {line.client_name || '—'}
                      </div>
                    </td>
                    {/* الخصم - يُجلب تلقائياً */}
                    <td style={{ ...td, background: '#eff6ff' }}>
                      <div style={{ minWidth: 110, color: '#1e293b', fontSize: 12, padding: '2px 4px' }}>
                        {line.defendant_name || '—'}
                      </div>
                    </td>
                    {/* مدين */}
                    <td style={td}>
                      <input type="number" value={line.debit_amount}
                        onChange={e => { updateLine(idx, 'debit_amount', e.target.value); if (e.target.value) updateLine(idx, 'credit_amount', ''); }}
                        style={{ ...cellInp, width: 90, color: '#16a34a', fontWeight: 600 }}
                        min="0" step="0.001" />
                    </td>
                    {/* دائن */}
                    <td style={td}>
                      <input type="number" value={line.credit_amount}
                        onChange={e => { updateLine(idx, 'credit_amount', e.target.value); if (e.target.value) updateLine(idx, 'debit_amount', ''); }}
                        style={{ ...cellInp, width: 90, color: '#dc2626', fontWeight: 600 }}
                        min="0" step="0.001" />
                    </td>
                    {/* بيان */}
                    <td style={td}>
                      <input value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)}
                        style={{ ...cellInp, minWidth: 120 }} placeholder="بيان السطر" />
                    </td>
                    {/* حذف */}
                    <td style={td}>
                      <button onClick={() => removeLine(idx)} disabled={lines.length <= 2}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                  <td colSpan={7} style={{ ...td, textAlign: 'center' }}>
                    <button onClick={addLine}
                      style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      + إضافة سطر
                    </button>
                  </td>
                  <td style={{ ...td, color: '#16a34a', fontSize: 15 }}>{totalDebit.toFixed(3)}</td>
                  <td style={{ ...td, color: '#dc2626', fontSize: 15 }}>{totalCredit.toFixed(3)}</td>
                  <td colSpan={2} style={td}>
                    {isBalanced
                      ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ متوازن</span>
                      : <span style={{ color: '#dc2626' }}>الفرق: {Math.abs(totalDebit - totalCredit).toFixed(3)}</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* أزرار الحفظ */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>
              إلغاء
            </button>
            <button onClick={() => handleSave('draft')} disabled={saving || !isBalanced}
              style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? '...' : 'حفظ كمسودة'}
            </button>
            <button onClick={() => handleSave('posted')} disabled={saving || !isBalanced}
              style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? '...' : 'ترحيل فوري'}
            </button>
          </div>
        </div>
      )}

      {/* ─── قائمة القيود ─── */}
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>⏳ جار التحميل...</div> : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>رقم القيد</th>
                <th style={th}>التاريخ</th>
                <th style={th}>الوصف</th>
                <th style={th}>العملة</th>
                <th style={th}>الحالة</th>
                <th style={th}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>لا توجد قيود</td></tr>
              ) : filtered.map(entry => (
                <tr key={entry.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 600, color: '#2563eb' }}>{entry.entry_number}</td>
                  <td style={td}>{entry.entry_date}</td>
                  <td style={td}>{entry.description}</td>
                  <td style={td}>{entry.currency}</td>
                  <td style={td}>
                    <span style={{
                      background: entry.status === 'posted' ? '#dcfce7' : entry.status === 'draft' ? '#fef9c3' : '#fee2e2',
                      color: entry.status === 'posted' ? '#16a34a' : entry.status === 'draft' ? '#a16207' : '#dc2626',
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
                    }}>
                      {entry.status === 'posted' ? 'مرحّل' : entry.status === 'draft' ? 'مسودة' : 'ملغي'}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {entry.status === 'draft' && (
                        <>
                          <button onClick={() => handlePost(entry)}
                            style={btnSmall('#16a34a')}>ترحيل</button>
                          <button onClick={() => { setEditEntry(entry); setShowForm(true); }}
                            style={btnSmall('#2563eb')}>تعديل</button>
                          <button onClick={() => handleDelete(entry)}
                            style={btnSmall('#dc2626')}>حذف</button>
                        </>
                      )}
                      {entry.status === 'posted' && (
                        <button onClick={() => alert('طباعة قريباً')}
                          style={btnSmall('#64748b')}>طباعة</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───
const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 600 };
const inp = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontFamily: 'Tajawal, Arial, sans-serif', fontSize: 14, background: '#fff' };
const th = { padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#374151', borderLeft: '1px solid #e2e8f0' };
const td = { padding: '8px 10px', textAlign: 'right', verticalAlign: 'middle' };
const cellInp = { border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontFamily: 'Tajawal, Arial, sans-serif', fontSize: 13, width: '100%', background: '#fff' };
const btnSmall = (color) => ({
  background: color + '15', color, border: `1px solid ${color}40`,
  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600
});
