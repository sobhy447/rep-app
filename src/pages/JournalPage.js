import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const COMPANY_ID = '30d868b2-b835-46ca-8d87-ae8e46bc38ec';

const styles = {
  page: { background: '#c8d8e8', minHeight: '100vh', fontFamily: 'Cairo, Tahoma, sans-serif', direction: 'rtl', padding: '16px' },
  header: { background: 'linear-gradient(135deg, #4a7ab5, #1a365d)', color: '#fff', borderRadius: '10px', padding: '16px 24px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: '20px', fontWeight: 'bold', margin: 0 },
  card: { background: '#dce8f5', borderRadius: '10px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  btn: (color = '#2c5282') => ({ background: color, color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: '13px', fontWeight: 'bold' }),
  btnSm: (color = '#2c5282') => ({ background: color, color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: '12px' }),
  input: { border: '1px solid #b0c4de', borderRadius: '6px', padding: '7px 10px', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: '13px', direction: 'rtl', width: '100%', boxSizing: 'border-box', background: '#fff' },
  select: { border: '1px solid #b0c4de', borderRadius: '6px', padding: '7px 10px', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: '13px', direction: 'rtl', width: '100%', boxSizing: 'border-box', background: '#fff' },
  label: { fontSize: '12px', color: '#2c5282', fontWeight: 'bold', marginBottom: '4px', display: 'block' },
  tableWrapper: { overflowX: 'auto', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  th: { background: 'linear-gradient(135deg, #5b8fc9, #2c5282)', color: '#fff', padding: '10px 12px', textAlign: 'right', fontSize: '13px', whiteSpace: 'nowrap' },
  td: { padding: '9px 12px', borderBottom: '1px solid #dde8f5', fontSize: '13px', verticalAlign: 'middle' },
  trHover: { cursor: 'pointer' },
  badge: (type) => {
    const map = { posted: { bg: '#d4edda', color: '#155724' }, draft: { bg: '#fff3cd', color: '#856404' } };
    const s = map[type] || map.draft;
    return { background: s.bg, color: s.color, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' };
  },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' },
  modalBox: { background: '#dce8f5', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '1000px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', marginTop: '10px' },
  formRow: { display: 'grid', gap: '12px', marginBottom: '12px' },
  alert: (type) => ({ padding: '10px 16px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', background: type === 'error' ? '#f8d7da' : '#d4edda', color: type === 'error' ? '#721c24' : '#155724', border: `1px solid ${type === 'error' ? '#f5c6cb' : '#c3e6cb'}` }),
  summaryBox: { display: 'flex', gap: '16px', justifyContent: 'flex-end', padding: '12px', background: '#e8f0fb', borderRadius: '8px', marginTop: '8px', flexWrap: 'wrap' },
  summaryItem: { fontSize: '14px', fontWeight: 'bold' },
  filterRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '12px' },
  lineInput: { border: '1px solid #b0c4de', borderRadius: '4px', padding: '5px 8px', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: '12px', direction: 'rtl', width: '100%', boxSizing: 'border-box', background: '#fff' },
};

// ============================================================
// Auto-complete حساب
// ============================================================
function AccountInput({ value, onChange, placeholder = 'كود أو اسم الحساب' }) {
  const [query, setQuery] = useState(value?.account_code ? `${value.account_code} - ${value.name_ar}` : '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    const { data } = await supabase.from('accounts')
      .select('id, account_code, name_ar, balance_type, allow_posting')
      .eq('allow_posting', true)
      .or(`account_code.ilike.${q}%,name_ar.ilike.%${q}%`)
      .order('account_code').limit(10);
    setResults(data || []);
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange(null);
    if (q.length >= 2) { setOpen(true); search(q); } else { setOpen(false); setResults([]); }
  };

  const select = (acc) => {
    setQuery(`${acc.account_code} - ${acc.name_ar}`);
    onChange(acc);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <input style={styles.lineInput} value={query} onChange={handleChange} placeholder={placeholder} />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#fff', border: '1px solid #b0c4de', borderRadius: '6px', zIndex: 999, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {results.map(r => (
            <div key={r.id} onMouseDown={() => select(r)} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
              onMouseEnter={e => e.currentTarget.style.background = '#e8f0fb'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <span style={{ color: '#2c5282', fontWeight: 'bold' }}>{r.account_code}</span> - {r.name_ar}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Auto-complete مركز التكلفة الإضافي
// ============================================================
function AddCostInput({ value, onChange }) {
  const [query, setQuery] = useState(value?.file_code ? `${value.file_code} - ${value.name_ar}` : '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    const { data } = await supabase.from('additional_cost_centers')
      .select('id, file_code, name_ar, lawyer_name, case_number')
      .or(`file_code.ilike.${q}%,name_ar.ilike.%${q}%`)
      .limit(10);
    setResults(data || []);
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange(null);
    if (q.length >= 2) { setOpen(true); search(q); } else { setOpen(false); setResults([]); }
  };

  const select = (item) => {
    setQuery(`${item.file_code} - ${item.name_ar}`);
    onChange(item);
    setOpen(false);
  };

  const clear = () => { setQuery(''); onChange(null); setOpen(false); setResults([]); };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <input style={styles.lineInput} value={query} onChange={handleChange} placeholder='رقم الملف أو اسم الموكل (اختياري)' />
        {query && <button type="button" onMouseDown={clear} style={{ ...styles.btnSm('#c0392b'), padding: '4px 6px' }}>✕</button>}
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#fff', border: '1px solid #b0c4de', borderRadius: '6px', zIndex: 999, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {results.map(r => (
            <div key={r.id} onMouseDown={() => select(r)} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }}
              onMouseEnter={e => e.currentTarget.style.background = '#e8f0fb'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <span style={{ color: '#2c5282', fontWeight: 'bold' }}>{r.file_code}</span> - {r.name_ar}
              {r.lawyer_name && <span style={{ color: '#888', marginRight: '8px', fontSize: '11px' }}> | {r.lawyer_name}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// سطر قيد واحد
// ============================================================
function JournalLine({ line, idx, onChange, onDelete, costCenters }) {
  return (
    <tr style={{ background: idx % 2 === 0 ? '#fff' : '#f4f8fd' }}>
      <td style={{ ...styles.td, width: '30px', textAlign: 'center', color: '#888' }}>{idx + 1}</td>
      <td style={{ ...styles.td, minWidth: '220px' }}>
        <AccountInput value={line.account} onChange={(acc) => onChange(idx, 'account', acc)} />
      </td>
      <td style={{ ...styles.td, minWidth: '130px' }}>
        <select style={styles.lineInput} value={line.cost_center_id || ''} onChange={e => onChange(idx, 'cost_center_id', e.target.value)}>
          <option value=''>-- اختر مركز --</option>
          {costCenters.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
        </select>
      </td>
      <td style={{ ...styles.td, minWidth: '200px' }}>
        <AddCostInput value={line.addCost} onChange={(v) => onChange(idx, 'addCost', v)} />
        {line.addCost && (
          <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
            {line.addCost.lawyer_name && <span>محامي: {line.addCost.lawyer_name} | </span>}
            {line.addCost.case_number && <span>قضية: {line.addCost.case_number}</span>}
          </div>
        )}
      </td>
      <td style={{ ...styles.td, width: '110px' }}>
        <input style={styles.lineInput} type='number' min='0' step='0.001' value={line.debit || ''} placeholder='0.000'
          onChange={e => onChange(idx, 'debit', e.target.value)} />
      </td>
      <td style={{ ...styles.td, width: '110px' }}>
        <input style={styles.lineInput} type='number' min='0' step='0.001' value={line.credit || ''} placeholder='0.000'
          onChange={e => onChange(idx, 'credit', e.target.value)} />
      </td>
      <td style={{ ...styles.td, minWidth: '120px' }}>
        <input style={styles.lineInput} value={line.description || ''} placeholder='بيان السطر'
          onChange={e => onChange(idx, 'description', e.target.value)} />
      </td>
      <td style={{ ...styles.td, width: '40px', textAlign: 'center' }}>
        <button type='button' onClick={() => onDelete(idx)} style={styles.btnSm('#c0392b')}>✕</button>
      </td>
    </tr>
  );
}

// ============================================================
// نافذة إنشاء / تعديل قيد
// ============================================================
function JournalModal({ entry, onClose, onSaved, costCenters }) {
  const isEdit = !!entry?.id;
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ entry_date: entry?.entry_date || today, description: entry?.description || '' });
  const [lines, setLines] = useState(
    entry?.lines?.map(l => ({
      id: l.id, account: l.account_obj || null,
      cost_center_id: l.cost_center_id || '',
      addCost: l.add_cost_obj || null,
      debit: l.debit_amount || '', credit: l.credit_amount || '',
      description: l.description || '',
    })) || [emptyLine(), emptyLine()]
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  function emptyLine() { return { account: null, cost_center_id: '', addCost: null, debit: '', credit: '', description: '' }; }

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;
  const diff = totalDebit - totalCredit;

  const handleLine = (idx, field, val) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: val };
      if (field === 'debit' && val) updated.credit = '';
      if (field === 'credit' && val) updated.debit = '';
      return updated;
    }));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const delLine = (idx) => { if (lines.length <= 2) { setMsg({ type: 'error', text: 'يجب أن يكون القيد بسطرين على الأقل' }); return; } setLines(prev => prev.filter((_, i) => i !== idx)); };

  const validate = () => {
    if (!form.description.trim()) return 'يجب إدخال وصف القيد';
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].account) return `السطر ${i + 1}: يجب اختيار حساب`;
      if (!lines[i].cost_center_id) return `السطر ${i + 1}: يجب اختيار مركز تكلفة`;
      if (!lines[i].debit && !lines[i].credit) return `السطر ${i + 1}: يجب إدخال مبلغ`;
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { setMsg({ type: 'error', text: err }); return; }
    setLoading(true);
    setMsg(null);
    try {
      const status = isBalanced ? 'posted' : 'draft';
      const header = {
        company_id: COMPANY_ID,
        entry_date: form.entry_date,
        description: form.description,
        total_debit: totalDebit,
        total_credit: totalCredit,
        is_balanced: isBalanced,
        status,
        voucher_type: 'journal',
        ...(isBalanced && !isEdit ? { posted_at: new Date().toISOString() } : {}),
      };

      let entryId;
      if (isEdit) {
        await supabase.from('journal_entries').update(header).eq('id', entry.id);
        await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', entry.id);
        entryId = entry.id;
        // Audit trail
        await supabase.from('audit_trail').insert({ company_id: COMPANY_ID, table_name: 'journal_entries', record_id: entry.id, action: 'update', changes: JSON.stringify(header) }).select().maybeSingle();
      } else {
        const { data, error } = await supabase.from('journal_entries').insert(header).select().single();
        if (error) throw error;
        entryId = data.id;
      }

      const linesData = lines.map((l, i) => ({
        company_id: COMPANY_ID,
        journal_entry_id: entryId,
        line_number: i + 1,
        account_id: l.account?.id || null,
        cost_center_id: l.cost_center_id || null,
        additional_cost_center_id: l.addCost?.id || null,
        debit_amount: parseFloat(l.debit) || 0,
        credit_amount: parseFloat(l.credit) || 0,
        description: l.description || '',
      }));
      await supabase.from('journal_entry_lines').insert(linesData);

      setMsg({ type: 'success', text: isBalanced ? '✅ تم حفظ القيد وترحيله تلقائياً' : '📝 تم حفظ القيد كمسودة (غير متوازن)' });
      setTimeout(() => { onSaved(); }, 1200);
    } catch (e) {
      setMsg({ type: 'error', text: 'خطأ: ' + e.message });
    }
    setLoading(false);
  };

  return (
    <div style={styles.modal} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a365d', fontFamily: 'Cairo, Tahoma, sans-serif' }}>{isEdit ? '✏️ تعديل قيد' : '➕ قيد يومي جديد'}</h3>
          <button onClick={onClose} style={styles.btnSm('#888')}>✕ إغلاق</button>
        </div>

        {msg && <div style={styles.alert(msg.type)}>{msg.text}</div>}

        <div style={{ ...styles.formRow, gridTemplateColumns: '1fr 2fr' }}>
          <div>
            <label style={styles.label}>التاريخ *</label>
            <input style={styles.input} type='date' value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>البيان / الوصف *</label>
            <input style={styles.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder='وصف القيد' />
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['#', 'الحساب *', 'مركز التكلفة *', 'مركز إضافي', 'مدين', 'دائن', 'البيان', ''].map((h, i) => (
                  <th key={i} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <JournalLine key={idx} line={line} idx={idx} onChange={handleLine} onDelete={delLine} costCenters={costCenters} />
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <button type='button' onClick={addLine} style={styles.btn('#2c7a2c')}>+ إضافة سطر</button>
          <div style={styles.summaryBox}>
            <span style={styles.summaryItem}>إجمالي مدين: <span style={{ color: '#2c5282' }}>{totalDebit.toFixed(3)}</span></span>
            <span style={styles.summaryItem}>إجمالي دائن: <span style={{ color: '#2c5282' }}>{totalCredit.toFixed(3)}</span></span>
            <span style={{ ...styles.summaryItem, color: isBalanced ? '#155724' : '#721c24' }}>
              {isBalanced ? '✅ متوازن → سيتم الترحيل' : `⚠️ فرق: ${Math.abs(diff).toFixed(3)} → سيحفظ كمسودة`}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #b0c4de', paddingTop: '12px' }}>
          <button onClick={save} disabled={loading} style={styles.btn(isBalanced ? '#2c7a2c' : '#e67e22')}>
            {loading ? '⏳ جاري الحفظ...' : isBalanced ? '✅ حفظ وترحيل' : '📝 حفظ كمسودة'}
          </button>
          <button onClick={onClose} style={styles.btn('#888')}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// نافذة تفاصيل القيد (عرض)
// ============================================================
function JournalDetailModal({ entry, onClose, onEdit, onDelete, costCenters }) {
  const canEdit = entry.status === 'draft';
  return (
    <div style={styles.modal} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a365d', fontFamily: 'Cairo, Tahoma, sans-serif' }}>📋 تفاصيل القيد</h3>
          <button onClick={onClose} style={styles.btnSm('#888')}>✕ إغلاق</button>
        </div>
        <div style={{ ...styles.formRow, gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '16px' }}>
          <div><label style={styles.label}>التاريخ</label><div style={{ fontWeight: 'bold' }}>{entry.entry_date}</div></div>
          <div><label style={styles.label}>الحالة</label><span style={styles.badge(entry.status)}>{entry.status === 'posted' ? 'مرحّل' : 'مسودة'}</span></div>
          <div><label style={styles.label}>إجمالي</label><div style={{ fontWeight: 'bold', color: '#2c5282' }}>{Number(entry.total_debit).toFixed(3)} د.ك</div></div>
        </div>
        <div style={{ marginBottom: '16px' }}><label style={styles.label}>البيان</label><div style={{ background: '#fff', padding: '8px', borderRadius: '6px' }}>{entry.description}</div></div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>{['#', 'الحساب', 'مركز التكلفة', 'مركز إضافي', 'مدين', 'دائن', 'البيان'].map((h, i) => <th key={i} style={styles.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(entry.lines || []).map((l, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f4f8fd' }}>
                  <td style={styles.td}>{i + 1}</td>
                  <td style={styles.td}><span style={{ color: '#2c5282', fontWeight: 'bold' }}>{l.account_code}</span> {l.account_name}</td>
                  <td style={styles.td}>{l.cost_center_name || '-'}</td>
                  <td style={styles.td}>{l.add_cost_name ? `${l.add_cost_code} - ${l.add_cost_name}` : '-'}</td>
                  <td style={{ ...styles.td, color: '#2c5282', fontWeight: 'bold' }}>{l.debit_amount > 0 ? Number(l.debit_amount).toFixed(3) : ''}</td>
                  <td style={{ ...styles.td, color: '#7b241c', fontWeight: 'bold' }}>{l.credit_amount > 0 ? Number(l.credit_amount).toFixed(3) : ''}</td>
                  <td style={styles.td}>{l.description || ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#e8f0fb' }}>
                <td colSpan={4} style={{ ...styles.td, fontWeight: 'bold', textAlign: 'center' }}>الإجمالي</td>
                <td style={{ ...styles.td, fontWeight: 'bold', color: '#2c5282' }}>{Number(entry.total_debit).toFixed(3)}</td>
                <td style={{ ...styles.td, fontWeight: 'bold', color: '#7b241c' }}>{Number(entry.total_credit).toFixed(3)}</td>
                <td style={styles.td}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={() => printEntry(entry)} style={styles.btn('#1a365d')}>🖨️ طباعة PDF</button>
          <button onClick={() => exportEntryExcel(entry)} style={styles.btn('#2c7a2c')}>📊 تصدير Excel</button>
          {canEdit && <button onClick={() => onEdit(entry)} style={styles.btn('#e67e22')}>✏️ تعديل</button>}
          <button onClick={() => onDelete(entry)} style={styles.btn('#c0392b')}>🗑️ حذف</button>
          <button onClick={onClose} style={styles.btn('#888')}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// طباعة PDF
// ============================================================
function printEntry(entry) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>قيد محاسبي</title>
  <style>
    body { font-family: 'Cairo', Tahoma, sans-serif; direction: rtl; padding: 24px; color: #222; }
    h2 { color: #1a365d; text-align: center; }
    .info { display: flex; gap: 32px; margin-bottom: 16px; background: #f0f6ff; padding: 10px; border-radius: 6px; }
    .info div { font-size: 14px; }
    .info strong { color: #2c5282; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #2c5282; color: #fff; padding: 8px 10px; text-align: right; font-size: 13px; }
    td { padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 13px; }
    tr:nth-child(even) { background: #f9fbff; }
    tfoot td { background: #e8f0fb; font-weight: bold; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;
      background: ${entry.status === 'posted' ? '#d4edda' : '#fff3cd'}; color: ${entry.status === 'posted' ? '#155724' : '#856404'}; }
  </style></head><body>
  <h2>⚖️ قيد محاسبي يومي</h2>
  <div class="info">
    <div><strong>التاريخ:</strong> ${entry.entry_date}</div>
    <div><strong>البيان:</strong> ${entry.description}</div>
    <div><strong>الحالة:</strong> <span class="status">${entry.status === 'posted' ? 'مرحّل' : 'مسودة'}</span></div>
    <div><strong>الإجمالي:</strong> ${Number(entry.total_debit).toFixed(3)} د.ك</div>
  </div>
  <table>
    <thead><tr><th>#</th><th>الحساب</th><th>مركز التكلفة</th><th>مركز إضافي</th><th>مدين</th><th>دائن</th><th>البيان</th></tr></thead>
    <tbody>
      ${(entry.lines || []).map((l, i) => `<tr>
        <td>${i + 1}</td>
        <td><strong>${l.account_code || ''}</strong> ${l.account_name || ''}</td>
        <td>${l.cost_center_name || '-'}</td>
        <td>${l.add_cost_name ? `${l.add_cost_code} - ${l.add_cost_name}` : '-'}</td>
        <td style="color:#2c5282;font-weight:bold">${l.debit_amount > 0 ? Number(l.debit_amount).toFixed(3) : ''}</td>
        <td style="color:#7b241c;font-weight:bold">${l.credit_amount > 0 ? Number(l.credit_amount).toFixed(3) : ''}</td>
        <td>${l.description || ''}</td>
      </tr>`).join('')}
    </tbody>
    <tfoot><tr>
      <td colspan="4" style="text-align:center">الإجمالي</td>
      <td>${Number(entry.total_debit).toFixed(3)}</td>
      <td>${Number(entry.total_credit).toFixed(3)}</td>
      <td></td>
    </tr></tfoot>
  </table>
  <script>window.onload=()=>{window.print();window.close();}<\/script>
  </body></html>`);
  w.document.close();
}

// ============================================================
// تصدير Excel
// ============================================================
function exportEntryExcel(entry) {
  const rows = [
    ['#', 'الحساب - كود', 'الحساب - اسم', 'مركز التكلفة', 'مركز إضافي', 'مدين', 'دائن', 'البيان'],
    ...(entry.lines || []).map((l, i) => [
      i + 1, l.account_code || '', l.account_name || '', l.cost_center_name || '',
      l.add_cost_name ? `${l.add_cost_code} - ${l.add_cost_name}` : '',
      l.debit_amount > 0 ? Number(l.debit_amount).toFixed(3) : '',
      l.credit_amount > 0 ? Number(l.credit_amount).toFixed(3) : '',
      l.description || '',
    ]),
    ['', '', '', '', 'الإجمالي', Number(entry.total_debit).toFixed(3), Number(entry.total_credit).toFixed(3), ''],
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `قيد_${entry.entry_date}.csv`; a.click();
}

function exportListExcel(entries) {
  const rows = [
    ['التاريخ', 'البيان', 'مدين', 'دائن', 'الحالة'],
    ...entries.map(e => [e.entry_date, e.description, Number(e.total_debit).toFixed(3), Number(e.total_credit).toFixed(3), e.status === 'posted' ? 'مرحّل' : 'مسودة']),
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `قيود_${new Date().toISOString().split('T')[0]}.csv`; a.click();
}

// ============================================================
// الصفحة الرئيسية
// ============================================================
export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [costCenters, setCostCenters] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [filter, setFilter] = useState({ dateFrom: '', dateTo: '', status: '', search: '' });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchCostCenters = useCallback(async () => {
    const { data } = await supabase.from('cost_centers').select('id, name_ar').eq('is_active', true).order('name_ar');
    setCostCenters(data || []);
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('journal_entries')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (filter.dateFrom) q = q.gte('entry_date', filter.dateFrom);
    if (filter.dateTo) q = q.lte('entry_date', filter.dateTo);
    if (filter.status) q = q.eq('status', filter.status);
    if (filter.search) q = q.ilike('description', `%${filter.search}%`);
    q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data } = await q;
    setEntries(data || []);
    setLoading(false);
  }, [filter, page]);

  useEffect(() => { fetchCostCenters(); }, [fetchCostCenters]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const openDetail = async (entry) => {
    const { data: lines } = await supabase.from('journal_entry_lines')
      .select(`*, accounts(account_code, name_ar), cost_centers(name_ar), additional_cost_centers(file_code, name_ar)`)
      .eq('journal_entry_id', entry.id).order('line_number');
    const mapped = (lines || []).map(l => ({
      ...l,
      account_code: l.accounts?.account_code, account_name: l.accounts?.name_ar,
      cost_center_name: l.cost_centers?.name_ar,
      add_cost_code: l.additional_cost_centers?.file_code, add_cost_name: l.additional_cost_centers?.name_ar,
    }));
    setDetailEntry({ ...entry, lines: mapped });
  };

  const openEdit = async (entry) => {
    const { data: lines } = await supabase.from('journal_entry_lines')
      .select(`*, accounts(id, account_code, name_ar), cost_centers(id, name_ar), additional_cost_centers(id, file_code, name_ar, lawyer_name, case_number)`)
      .eq('journal_entry_id', entry.id).order('line_number');
    const mapped = (lines || []).map(l => ({
      id: l.id,
      account: l.accounts ? { id: l.account_id, account_code: l.accounts.account_code, name_ar: l.accounts.name_ar } : null,
      cost_center_id: l.cost_center_id || '',
      addCost: l.additional_cost_centers ? { id: l.additional_cost_center_id, file_code: l.additional_cost_centers.file_code, name_ar: l.additional_cost_centers.name_ar, lawyer_name: l.additional_cost_centers.lawyer_name, case_number: l.additional_cost_centers.case_number } : null,
      debit: l.debit_amount || '',
      credit: l.credit_amount || '',
      description: l.description || '',
    }));
    setDetailEntry(null);
    setEditEntry({ ...entry, lines: mapped });
  };

  const deleteEntry = async (entry) => {
    await supabase.from('journal_entries').update({ deleted_at: new Date().toISOString() }).eq('id', entry.id);
    await supabase.from('audit_trail').insert({ company_id: COMPANY_ID, table_name: 'journal_entries', record_id: entry.id, action: 'delete', changes: JSON.stringify({ deleted_at: new Date().toISOString() }) }).select().maybeSingle();
    setConfirmDel(null);
    setDetailEntry(null);
    fetchEntries();
  };

  const totalDebit = entries.reduce((s, e) => s + (Number(e.total_debit) || 0), 0);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>📖 القيود اليومية</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowNew(true)} style={styles.btn()}>➕ قيد جديد</button>
          <button onClick={() => exportListExcel(entries)} style={styles.btn('#2c7a2c')}>📊 تصدير Excel</button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.card}>
        <div style={styles.filterRow}>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={styles.label}>من تاريخ</label>
            <input style={styles.input} type='date' value={filter.dateFrom} onChange={e => setFilter({ ...filter, dateFrom: e.target.value })} />
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={styles.label}>إلى تاريخ</label>
            <input style={styles.input} type='date' value={filter.dateTo} onChange={e => setFilter({ ...filter, dateTo: e.target.value })} />
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={styles.label}>الحالة</label>
            <select style={styles.select} value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
              <option value=''>الكل</option>
              <option value='posted'>مرحّل</option>
              <option value='draft'>مسودة</option>
            </select>
          </div>
          <div style={{ flex: 2, minWidth: '180px' }}>
            <label style={styles.label}>بحث في البيان</label>
            <input style={styles.input} value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} placeholder='اكتب للبحث...' />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button onClick={() => { setFilter({ dateFrom: '', dateTo: '', status: '', search: '' }); setPage(1); }} style={styles.btn('#888')}>🔄 مسح</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[{ label: 'عدد القيود', val: entries.length, color: '#2c5282' },
          { label: 'إجمالي المدين', val: totalDebit.toFixed(3) + ' د.ك', color: '#2c7a2c' },
          { label: 'مرحّل', val: entries.filter(e => e.status === 'posted').length, color: '#155724' },
          { label: 'مسودة', val: entries.filter(e => e.status === 'draft').length, color: '#856404' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#dce8f5', borderRadius: '8px', padding: '10px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>{s.label}</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={styles.card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>⏳ جاري التحميل...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>لا توجد قيود</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['التاريخ', 'البيان', 'مدين', 'دائن', 'الحالة', 'إجراءات'].map((h, i) => (
                    <th key={i} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} style={{ ...styles.trHover, background: i % 2 === 0 ? '#fff' : '#f4f8fd' }}
                    onClick={() => openDetail(e)}>
                    <td style={styles.td}>{e.entry_date}</td>
                    <td style={styles.td}>{e.description}</td>
                    <td style={{ ...styles.td, color: '#2c5282', fontWeight: 'bold' }}>{Number(e.total_debit).toFixed(3)}</td>
                    <td style={{ ...styles.td, color: '#7b241c', fontWeight: 'bold' }}>{Number(e.total_credit).toFixed(3)}</td>
                    <td style={styles.td}><span style={styles.badge(e.status)}>{e.status === 'posted' ? 'مرحّل' : 'مسودة'}</span></td>
                    <td style={styles.td} onClick={ev => ev.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => openDetail(e)} style={styles.btnSm('#2c5282')}>👁</button>
                        {e.status === 'draft' && <button onClick={() => openEdit(e)} style={styles.btnSm('#e67e22')}>✏️</button>}
                        <button onClick={() => setConfirmDel(e)} style={styles.btnSm('#c0392b')}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={styles.btnSm(page === 1 ? '#ccc' : '#2c5282')}>◀ السابق</button>
          <span style={{ padding: '4px 12px', fontWeight: 'bold', color: '#2c5282' }}>صفحة {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={entries.length < PAGE_SIZE} style={styles.btnSm(entries.length < PAGE_SIZE ? '#ccc' : '#2c5282')}>التالي ▶</button>
        </div>
      </div>

      {/* Modals */}
      {showNew && (
        <JournalModal costCenters={costCenters} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); fetchEntries(); }} />
      )}
      {editEntry && (
        <JournalModal entry={editEntry} costCenters={costCenters} onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); fetchEntries(); }} />
      )}
      {detailEntry && (
        <JournalDetailModal entry={detailEntry} costCenters={costCenters} onClose={() => setDetailEntry(null)}
          onEdit={(e) => openEdit(e)} onDelete={(e) => setConfirmDel(e)} />
      )}
      {confirmDel && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalBox, maxWidth: '400px', marginTop: '80px' }}>
            <h3 style={{ color: '#c0392b', fontFamily: 'Cairo, Tahoma, sans-serif' }}>⚠️ تأكيد الحذف</h3>
            <p>هل تريد حذف القيد: <strong>{confirmDel.description}</strong>؟</p>
            <p style={{ color: '#888', fontSize: '12px' }}>سيتم حذفه بشكل نهائي (Soft Delete)</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => deleteEntry(confirmDel)} style={styles.btn('#c0392b')}>نعم، احذف</button>
              <button onClick={() => setConfirmDel(null)} style={styles.btn('#888')}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
