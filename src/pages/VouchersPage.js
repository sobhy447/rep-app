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
  badge: (type) => {
    const map = { posted: { bg: '#d4edda', color: '#155724' }, draft: { bg: '#fff3cd', color: '#856404' }, receipt: { bg: '#cce5ff', color: '#004085' }, payment: { bg: '#f8d7da', color: '#721c24' } };
    const s = map[type] || map.draft;
    return { background: s.bg, color: s.color, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' };
  },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' },
  modalBox: { background: '#dce8f5', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '1000px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', marginTop: '10px' },
  formRow: { display: 'grid', gap: '12px', marginBottom: '12px' },
  alert: (type) => ({ padding: '10px 16px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', background: type === 'error' ? '#f8d7da' : '#d4edda', color: type === 'error' ? '#721c24' : '#155724', border: `1px solid ${type === 'error' ? '#f5c6cb' : '#c3e6cb'}` }),
  filterRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '12px' },
  lineInput: { border: '1px solid #b0c4de', borderRadius: '4px', padding: '5px 8px', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: '12px', direction: 'rtl', width: '100%', boxSizing: 'border-box', background: '#fff' },
  mainLineBox: { background: 'linear-gradient(135deg, #e8f0fb, #dce8f5)', border: '2px solid #5b8fc9', borderRadius: '10px', padding: '16px', marginBottom: '12px' },
};

// ============================================================
// Auto-complete حساب
// ============================================================
function AccountInput({ value, onChange, placeholder = 'كود أو اسم الحساب' }) {
  const [query, setQuery] = useState(value?.account_code ? `${value.account_code} - ${value.name_ar}` : '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const search = async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    const { data } = await supabase.from('accounts').select('id, account_code, name_ar, balance_type').eq('allow_posting', true).or(`account_code.ilike.${q}%,name_ar.ilike.%${q}%`).order('account_code').limit(10);
    setResults(data || []);
  };
  const handleChange = (e) => { const q = e.target.value; setQuery(q); onChange(null); if (q.length >= 2) { setOpen(true); search(q); } else { setOpen(false); } };
  const select = (acc) => { setQuery(`${acc.account_code} - ${acc.name_ar}`); onChange(acc); setOpen(false); setResults([]); };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input style={styles.lineInput} value={query} onChange={handleChange} placeholder={placeholder} />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#fff', border: '1px solid #b0c4de', borderRadius: '6px', zIndex: 999, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {results.map(r => (
            <div key={r.id} onMouseDown={() => select(r)} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }} onMouseEnter={e => e.currentTarget.style.background = '#e8f0fb'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <span style={{ color: '#2c5282', fontWeight: 'bold' }}>{r.account_code}</span> - {r.name_ar}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Auto-complete مركز إضافي
// ============================================================
function AddCostInput({ value, onChange }) {
  const [query, setQuery] = useState(value?.file_code ? `${value.file_code} - ${value.name_ar}` : '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const search = async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    const { data } = await supabase.from('additional_cost_centers').select('id, file_code, name_ar, lawyer_name, case_number').or(`file_code.ilike.${q}%,name_ar.ilike.%${q}%`).limit(10);
    setResults(data || []);
  };
  const handleChange = (e) => { const q = e.target.value; setQuery(q); onChange(null); if (q.length >= 2) { setOpen(true); search(q); } else { setOpen(false); } };
  const select = (item) => { setQuery(`${item.file_code} - ${item.name_ar}`); onChange(item); setOpen(false); };
  const clear = () => { setQuery(''); onChange(null); };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <input style={styles.lineInput} value={query} onChange={handleChange} placeholder='رقم الملف أو اسم الموكل (اختياري)' />
        {query && <button type="button" onMouseDown={clear} style={{ ...styles.btnSm('#c0392b'), padding: '4px 6px' }}>✕</button>}
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#fff', border: '1px solid #b0c4de', borderRadius: '6px', zIndex: 999, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {results.map(r => (
            <div key={r.id} onMouseDown={() => select(r)} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #eee' }} onMouseEnter={e => e.currentTarget.style.background = '#e8f0fb'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <span style={{ color: '#2c5282', fontWeight: 'bold' }}>{r.file_code}</span> - {r.name_ar}
              {r.lawyer_name && <span style={{ color: '#888', marginRight: '8px', fontSize: '11px' }}>| {r.lawyer_name}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// نافذة إنشاء/تعديل سند
// ============================================================
function VoucherModal({ voucher, onClose, onSaved, costCenters }) {
  const isEdit = !!voucher?.id;
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    voucher_type: voucher?.voucher_type || 'receipt',
    voucher_date: voucher?.voucher_date || today,
    voucher_number: voucher?.voucher_number || '',
    client_name: voucher?.client_name || '',
    description: voucher?.description || '',
    bank_name: voucher?.bank_name || '',
    cheque_number: voucher?.cheque_number || '',
    due_date: voucher?.due_date || '',
  });
  const [mainLine, setMainLine] = useState({
    account: voucher?.main_account || null,
    cost_center_id: voucher?.main_cost_center_id || '',
    amount: voucher?.main_amount || '',
  });
  const [lines, setLines] = useState(
    voucher?.lines?.map(l => ({
      id: l.id,
      account: l.account_obj || null,
      cost_center_id: l.cost_center_id || '',
      addCost: l.add_cost_obj || null,
      amount: l.debit_amount || l.credit_amount || '',
      description: l.description || '',
    })) || [emptyLine()]
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  function emptyLine() { return { account: null, cost_center_id: '', addCost: null, amount: '', description: '' }; }

  const totalLines = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const mainAmount = parseFloat(mainLine.amount) || 0;
  const diff = mainAmount - totalLines;
  const isBalanced = Math.abs(diff) < 0.001 && mainAmount > 0;

  const handleLine = (idx, field, val) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const delLine = (idx) => { if (lines.length <= 1) return; setLines(prev => prev.filter((_, i) => i !== idx)); };

  // جلب آخر رقم سند
  useEffect(() => {
    if (!isEdit) {
      (async () => {
        const { data } = await supabase.from('vouchers').select('voucher_number').eq('voucher_type', form.voucher_type).order('created_at', { ascending: false }).limit(1);
        const last = data?.[0]?.voucher_number;
        const next = last ? String(parseInt(last.replace(/\D/g, '') || '0') + 1).padStart(5, '0') : '00001';
        setForm(f => ({ ...f, voucher_number: next }));
      })();
    }
  }, [form.voucher_type, isEdit]);

  const validate = () => {
    if (!form.description.trim()) return 'يجب إدخال البيان';
    if (!mainLine.account) return 'يجب اختيار الحساب الرئيسي';
    if (!mainLine.cost_center_id) return 'يجب اختيار مركز التكلفة الرئيسي';
    if (!mainLine.amount || mainAmount <= 0) return 'يجب إدخال المبلغ الرئيسي';
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].account) return `السطر ${i + 1}: يجب اختيار حساب`;
      if (!lines[i].cost_center_id) return `السطر ${i + 1}: يجب اختيار مركز تكلفة`;
      if (!lines[i].amount || parseFloat(lines[i].amount) <= 0) return `السطر ${i + 1}: يجب إدخال مبلغ`;
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { setMsg({ type: 'error', text: err }); return; }
    setLoading(true); setMsg(null);
    try {
      const status = isBalanced ? 'posted' : 'draft';
      const isReceipt = form.voucher_type === 'receipt';
      const header = {
        company_id: COMPANY_ID,
        voucher_type: form.voucher_type,
        voucher_date: form.voucher_date,
        voucher_number: form.voucher_number,
        client_name: form.client_name,
        description: form.description,
        bank_name: form.bank_name,
        cheque_number: form.cheque_number,
        due_date: form.due_date || null,
        main_account_id: mainLine.account?.id,
        main_amount: mainAmount,
        main_cost_center_id: mainLine.cost_center_id || null,
        total_amount: mainAmount,
        status,
        ...(isBalanced && !isEdit ? { posted_at: new Date().toISOString() } : {}),
      };

      let voucherId;
      if (isEdit) {
        await supabase.from('vouchers').update(header).eq('id', voucher.id);
        await supabase.from('voucher_lines').delete().eq('voucher_id', voucher.id);
        voucherId = voucher.id;
      } else {
        const { data, error } = await supabase.from('vouchers').insert(header).select().single();
        if (error) throw error;
        voucherId = data.id;
      }

      // السطر الرئيسي
      const mainLineData = {
        company_id: COMPANY_ID,
        voucher_id: voucherId,
        line_number: 0,
        account_id: mainLine.account?.id,
        cost_center_id: mainLine.cost_center_id || null,
        debit_amount: isReceipt ? mainAmount : 0,
        credit_amount: isReceipt ? 0 : mainAmount,
        description: `${isReceipt ? 'قبض' : 'صرف'} - ${form.description}`,
      };

      // الأسطر الفرعية
      const linesData = lines.map((l, i) => ({
        company_id: COMPANY_ID,
        voucher_id: voucherId,
        line_number: i + 1,
        account_id: l.account?.id,
        cost_center_id: l.cost_center_id || null,
        additional_cost_center_id: l.addCost?.id || null,
        debit_amount: isReceipt ? 0 : parseFloat(l.amount),
        credit_amount: isReceipt ? parseFloat(l.amount) : 0,
        description: l.description || '',
      }));

      await supabase.from('voucher_lines').insert([mainLineData, ...linesData]);

      setMsg({ type: 'success', text: isBalanced ? '✅ تم حفظ السند وترحيله' : '📝 تم حفظ السند كمسودة (الإجمالي لا يتطابق)' });
      setTimeout(() => onSaved(), 1200);
    } catch (e) {
      setMsg({ type: 'error', text: 'خطأ: ' + e.message });
    }
    setLoading(false);
  };

  const isReceipt = form.voucher_type === 'receipt';

  return (
    <div style={styles.modal} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a365d', fontFamily: 'Cairo, Tahoma, sans-serif' }}>
            {isEdit ? '✏️ تعديل سند' : isReceipt ? '💰 سند قبض جديد' : '💸 سند صرف جديد'}
          </h3>
          <button onClick={onClose} style={styles.btnSm('#888')}>✕ إغلاق</button>
        </div>

        {msg && <div style={styles.alert(msg.type)}>{msg.text}</div>}

        {/* نوع السند */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          {[{ val: 'receipt', label: '💰 قبض', color: '#004085', bg: '#cce5ff' }, { val: 'payment', label: '💸 صرف', color: '#721c24', bg: '#f8d7da' }].map(t => (
            <button key={t.val} type='button' onClick={() => setForm({ ...form, voucher_type: t.val })}
              style={{ ...styles.btn(form.voucher_type === t.val ? t.color : '#aaa'), background: form.voucher_type === t.val ? t.color : '#ddd', color: form.voucher_type === t.val ? '#fff' : '#555', flex: 1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* الحقول الأساسية */}
        <div style={{ ...styles.formRow, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div><label style={styles.label}>التاريخ *</label><input style={styles.input} type='date' value={form.voucher_date} onChange={e => setForm({ ...form, voucher_date: e.target.value })} /></div>
          <div><label style={styles.label}>رقم السند</label><input style={styles.input} value={form.voucher_number} onChange={e => setForm({ ...form, voucher_number: e.target.value })} /></div>
          <div><label style={styles.label}>اسم العميل</label><input style={styles.input} value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder='اسم العميل' /></div>
        </div>
        <div style={{ ...styles.formRow, gridTemplateColumns: '2fr 1fr 1fr' }}>
          <div><label style={styles.label}>البيان *</label><input style={styles.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder='بيان السند' /></div>
          <div><label style={styles.label}>اسم البنك</label><input style={styles.input} value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
          <div><label style={styles.label}>رقم الشيك</label><input style={styles.input} value={form.cheque_number} onChange={e => setForm({ ...form, cheque_number: e.target.value })} /></div>
        </div>

        {/* السطر الرئيسي */}
        <div style={styles.mainLineBox}>
          <div style={{ fontWeight: 'bold', color: '#1a365d', marginBottom: '10px', fontSize: '14px' }}>
            📌 {isReceipt ? 'الحساب المدين (مصدر القبض)' : 'الحساب الدائن (مصدر الصرف)'} — السطر الرئيسي
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '10px' }}>
            <div><label style={styles.label}>الحساب الرئيسي *</label><AccountInput value={mainLine.account} onChange={v => setMainLine({ ...mainLine, account: v })} /></div>
            <div>
              <label style={styles.label}>مركز التكلفة *</label>
              <select style={styles.input} value={mainLine.cost_center_id} onChange={e => setMainLine({ ...mainLine, cost_center_id: e.target.value })}>
                <option value=''>-- اختر مركز --</option>
                {costCenters.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div><label style={styles.label}>المبلغ الكلي *</label><input style={styles.input} type='number' min='0' step='0.001' value={mainLine.amount} placeholder='0.000' onChange={e => setMainLine({ ...mainLine, amount: e.target.value })} /></div>
          </div>
        </div>

        {/* الأسطر الفرعية */}
        <div style={{ fontWeight: 'bold', color: '#1a365d', marginBottom: '8px', fontSize: '14px' }}>
          📋 {isReceipt ? 'توزيع القبض (الحسابات الدائنة)' : 'توزيع الصرف (الحسابات المدينة)'}
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>{['#', 'الحساب *', 'مركز التكلفة *', 'مركز إضافي', 'المبلغ', 'البيان', ''].map((h, i) => <th key={i} style={styles.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f4f8fd' }}>
                  <td style={{ ...styles.td, textAlign: 'center', color: '#888', width: '30px' }}>{idx + 1}</td>
                  <td style={{ ...styles.td, minWidth: '200px' }}><AccountInput value={line.account} onChange={v => handleLine(idx, 'account', v)} /></td>
                  <td style={{ ...styles.td, minWidth: '130px' }}>
                    <select style={styles.lineInput} value={line.cost_center_id} onChange={e => handleLine(idx, 'cost_center_id', e.target.value)}>
                      <option value=''>-- اختر --</option>
                      {costCenters.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                    </select>
                  </td>
                  <td style={{ ...styles.td, minWidth: '180px' }}>
                    <AddCostInput value={line.addCost} onChange={v => handleLine(idx, 'addCost', v)} />
                    {line.addCost && <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>{line.addCost.lawyer_name && `محامي: ${line.addCost.lawyer_name}`}{line.addCost.case_number && ` | قضية: ${line.addCost.case_number}`}</div>}
                  </td>
                  <td style={{ ...styles.td, width: '110px' }}>
                    <input style={styles.lineInput} type='number' min='0' step='0.001' value={line.amount} placeholder='0.000' onChange={e => handleLine(idx, 'amount', e.target.value)} />
                  </td>
                  <td style={{ ...styles.td, minWidth: '120px' }}>
                    <input style={styles.lineInput} value={line.description} placeholder='بيان' onChange={e => handleLine(idx, 'description', e.target.value)} />
                  </td>
                  <td style={{ ...styles.td, width: '40px', textAlign: 'center' }}>
                    {lines.length > 1 && <button type='button' onClick={() => delLine(idx)} style={styles.btnSm('#c0392b')}>✕</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <button type='button' onClick={addLine} style={styles.btn('#2c7a2c')}>+ إضافة سطر</button>
          <div style={{ display: 'flex', gap: '16px', padding: '10px 16px', background: '#e8f0fb', borderRadius: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold' }}>المبلغ الرئيسي: <span style={{ color: '#2c5282' }}>{mainAmount.toFixed(3)}</span></span>
            <span style={{ fontWeight: 'bold' }}>مجموع الأسطر: <span style={{ color: '#2c5282' }}>{totalLines.toFixed(3)}</span></span>
            <span style={{ fontWeight: 'bold', color: isBalanced ? '#155724' : '#721c24' }}>
              {isBalanced ? '✅ متطابق → سيتم الترحيل' : `⚠️ فرق: ${Math.abs(diff).toFixed(3)} → مسودة`}
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
// نافذة تفاصيل السند
// ============================================================
function VoucherDetailModal({ voucher, onClose, onEdit, onDelete }) {
  const isReceipt = voucher.voucher_type === 'receipt';
  return (
    <div style={styles.modal} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a365d', fontFamily: 'Cairo, Tahoma, sans-serif' }}>
            {isReceipt ? '💰 سند قبض' : '💸 سند صرف'} — {voucher.voucher_number}
          </h3>
          <button onClick={onClose} style={styles.btnSm('#888')}>✕</button>
        </div>
        <div style={{ ...styles.formRow, gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '16px' }}>
          <div><label style={styles.label}>التاريخ</label><div style={{ fontWeight: 'bold' }}>{voucher.voucher_date}</div></div>
          <div><label style={styles.label}>اسم العميل</label><div>{voucher.client_name || '-'}</div></div>
          <div><label style={styles.label}>المبلغ</label><div style={{ fontWeight: 'bold', color: '#2c5282' }}>{Number(voucher.total_amount).toFixed(3)} د.ك</div></div>
          <div><label style={styles.label}>الحالة</label><span style={styles.badge(voucher.status)}>{voucher.status === 'posted' ? 'مرحّل' : 'مسودة'}</span></div>
        </div>
        {voucher.bank_name && <div style={{ marginBottom: '8px' }}><label style={styles.label}>البنك / الشيك</label><div>{voucher.bank_name} {voucher.cheque_number ? `- شيك رقم ${voucher.cheque_number}` : ''}</div></div>}
        <div style={{ marginBottom: '12px' }}><label style={styles.label}>البيان</label><div style={{ background: '#fff', padding: '8px', borderRadius: '6px' }}>{voucher.description}</div></div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead><tr>{['#', 'الحساب', 'مركز التكلفة', 'مركز إضافي', 'مدين', 'دائن', 'البيان'].map((h, i) => <th key={i} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {(voucher.lines || []).map((l, i) => (
                <tr key={i} style={{ background: i === 0 ? '#e8f0fb' : i % 2 === 0 ? '#fff' : '#f4f8fd' }}>
                  <td style={styles.td}>{i === 0 ? '★' : i}</td>
                  <td style={styles.td}><span style={{ color: '#2c5282', fontWeight: 'bold' }}>{l.account_code}</span> {l.account_name}</td>
                  <td style={styles.td}>{l.cost_center_name || '-'}</td>
                  <td style={styles.td}>{l.add_cost_name ? `${l.add_cost_code} - ${l.add_cost_name}` : '-'}</td>
                  <td style={{ ...styles.td, color: '#2c5282', fontWeight: 'bold' }}>{l.debit_amount > 0 ? Number(l.debit_amount).toFixed(3) : ''}</td>
                  <td style={{ ...styles.td, color: '#7b241c', fontWeight: 'bold' }}>{l.credit_amount > 0 ? Number(l.credit_amount).toFixed(3) : ''}</td>
                  <td style={styles.td}>{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={() => printVoucher(voucher)} style={styles.btn('#1a365d')}>🖨️ طباعة PDF</button>
          <button onClick={() => exportVoucherExcel(voucher)} style={styles.btn('#2c7a2c')}>📊 Excel</button>
          {voucher.status === 'draft' && <button onClick={() => onEdit(voucher)} style={styles.btn('#e67e22')}>✏️ تعديل</button>}
          <button onClick={() => onDelete(voucher)} style={styles.btn('#c0392b')}>🗑️ حذف</button>
          <button onClick={onClose} style={styles.btn('#888')}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

function printVoucher(voucher) {
  const isReceipt = voucher.voucher_type === 'receipt';
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>سند ${isReceipt ? 'قبض' : 'صرف'}</title>
  <style>
    body { font-family: 'Cairo', Tahoma, sans-serif; direction: rtl; padding: 24px; color: #222; }
    h2 { color: #1a365d; text-align: center; }
    .info { display: flex; gap: 24px; flex-wrap: wrap; background: #f0f6ff; padding: 12px; border-radius: 6px; margin-bottom: 12px; }
    .info div { font-size: 14px; }
    .info strong { color: #2c5282; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #2c5282; color: #fff; padding: 8px 10px; text-align: right; font-size: 13px; }
    td { padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 13px; }
    tr:nth-child(even) td { background: #f9fbff; }
    tr:first-child td { background: #e8f0fb; font-weight: bold; }
    .total { font-weight: bold; font-size: 16px; text-align: left; margin-top: 12px; color: #2c5282; }
  </style></head><body>
  <h2>${isReceipt ? '💰 سند قبض' : '💸 سند صرف'} رقم ${voucher.voucher_number}</h2>
  <div class="info">
    <div><strong>التاريخ:</strong> ${voucher.voucher_date}</div>
    <div><strong>العميل:</strong> ${voucher.client_name || '-'}</div>
    <div><strong>البيان:</strong> ${voucher.description}</div>
    <div><strong>المبلغ الكلي:</strong> ${Number(voucher.total_amount).toFixed(3)} د.ك</div>
    ${voucher.bank_name ? `<div><strong>البنك:</strong> ${voucher.bank_name}</div>` : ''}
    ${voucher.cheque_number ? `<div><strong>رقم الشيك:</strong> ${voucher.cheque_number}</div>` : ''}
  </div>
  <table>
    <thead><tr><th>#</th><th>الحساب</th><th>مركز التكلفة</th><th>مركز إضافي</th><th>مدين</th><th>دائن</th><th>البيان</th></tr></thead>
    <tbody>
      ${(voucher.lines || []).map((l, i) => `<tr><td>${i === 0 ? '★' : i}</td><td><strong>${l.account_code || ''}</strong> ${l.account_name || ''}</td><td>${l.cost_center_name || '-'}</td><td>${l.add_cost_name ? `${l.add_cost_code} - ${l.add_cost_name}` : '-'}</td><td style="color:#2c5282;font-weight:bold">${l.debit_amount > 0 ? Number(l.debit_amount).toFixed(3) : ''}</td><td style="color:#7b241c;font-weight:bold">${l.credit_amount > 0 ? Number(l.credit_amount).toFixed(3) : ''}</td><td>${l.description || ''}</td></tr>`).join('')}
    </tbody>
  </table>
  <script>window.onload=()=>{window.print();window.close();}<\/script>
  </body></html>`);
  w.document.close();
}

function exportVoucherExcel(voucher) {
  const rows = [
    ['#', 'الحساب كود', 'الحساب اسم', 'مركز التكلفة', 'مركز إضافي', 'مدين', 'دائن', 'البيان'],
    ...(voucher.lines || []).map((l, i) => [i === 0 ? 'رئيسي' : i, l.account_code || '', l.account_name || '', l.cost_center_name || '', l.add_cost_name ? `${l.add_cost_code} - ${l.add_cost_name}` : '', l.debit_amount > 0 ? Number(l.debit_amount).toFixed(3) : '', l.credit_amount > 0 ? Number(l.credit_amount).toFixed(3) : '', l.description || '']),
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `سند_${voucher.voucher_number}_${voucher.voucher_date}.csv`; a.click();
}

function exportListExcel(vouchers) {
  const rows = [
    ['النوع', 'رقم السند', 'التاريخ', 'العميل', 'البيان', 'المبلغ', 'الحالة'],
    ...vouchers.map(v => [v.voucher_type === 'receipt' ? 'قبض' : 'صرف', v.voucher_number || '', v.voucher_date, v.client_name || '', v.description, Number(v.total_amount).toFixed(3), v.status === 'posted' ? 'مرحّل' : 'مسودة']),
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `سندات_${new Date().toISOString().split('T')[0]}.csv`; a.click();
}

// ============================================================
// الصفحة الرئيسية
// ============================================================
export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [costCenters, setCostCenters] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [editVoucher, setEditVoucher] = useState(null);
  const [detailVoucher, setDetailVoucher] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [filter, setFilter] = useState({ type: '', dateFrom: '', dateTo: '', status: '', search: '' });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchCostCenters = useCallback(async () => {
    const { data } = await supabase.from('cost_centers').select('id, name_ar').eq('is_active', true).order('name_ar');
    setCostCenters(data || []);
  }, []);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('vouchers').select('*').is('deleted_at', null).order('voucher_date', { ascending: false }).order('created_at', { ascending: false });
    if (filter.type) q = q.eq('voucher_type', filter.type);
    if (filter.dateFrom) q = q.gte('voucher_date', filter.dateFrom);
    if (filter.dateTo) q = q.lte('voucher_date', filter.dateTo);
    if (filter.status) q = q.eq('status', filter.status);
    if (filter.search) q = q.or(`description.ilike.%${filter.search}%,client_name.ilike.%${filter.search}%`);
    q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data } = await q;
    setVouchers(data || []);
    setLoading(false);
  }, [filter, page]);

  useEffect(() => { fetchCostCenters(); }, [fetchCostCenters]);
  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const openDetail = async (v) => {
    const { data: lines } = await supabase.from('voucher_lines')
      .select(`*, accounts(account_code, name_ar), cost_centers(name_ar), additional_cost_centers(file_code, name_ar)`)
      .eq('voucher_id', v.id).order('line_number');
    const mapped = (lines || []).map(l => ({ ...l, account_code: l.accounts?.account_code, account_name: l.accounts?.name_ar, cost_center_name: l.cost_centers?.name_ar, add_cost_code: l.additional_cost_centers?.file_code, add_cost_name: l.additional_cost_centers?.name_ar }));
    setDetailVoucher({ ...v, lines: mapped });
  };

  const openEdit = async (v) => {
    const { data: lines } = await supabase.from('voucher_lines')
      .select(`*, accounts(id, account_code, name_ar), cost_centers(id, name_ar), additional_cost_centers(id, file_code, name_ar, lawyer_name, case_number)`)
      .eq('voucher_id', v.id).order('line_number');
    const mainL = lines?.[0];
    const detailLines = (lines || []).slice(1).map(l => ({
      id: l.id,
      account: l.accounts ? { id: l.account_id, account_code: l.accounts.account_code, name_ar: l.accounts.name_ar } : null,
      cost_center_id: l.cost_center_id || '',
      addCost: l.additional_cost_centers ? { id: l.additional_cost_center_id, file_code: l.additional_cost_centers.file_code, name_ar: l.additional_cost_centers.name_ar, lawyer_name: l.additional_cost_centers.lawyer_name, case_number: l.additional_cost_centers.case_number } : null,
      amount: Math.max(l.debit_amount || 0, l.credit_amount || 0) || '',
      description: l.description || '',
    }));
    setDetailVoucher(null);
    setEditVoucher({ ...v, main_account: mainL?.accounts ? { id: mainL.account_id, account_code: mainL.accounts.account_code, name_ar: mainL.accounts.name_ar } : null, main_cost_center_id: mainL?.cost_center_id || '', lines: detailLines });
  };

  const deleteVoucher = async (v) => {
    await supabase.from('vouchers').update({ deleted_at: new Date().toISOString() }).eq('id', v.id);
    setConfirmDel(null); setDetailVoucher(null); fetchVouchers();
  };

  const totalReceipt = vouchers.filter(v => v.voucher_type === 'receipt').reduce((s, v) => s + (Number(v.total_amount) || 0), 0);
  const totalPayment = vouchers.filter(v => v.voucher_type === 'payment').reduce((s, v) => s + (Number(v.total_amount) || 0), 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>💳 سندات القبض والصرف</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowNew(true)} style={styles.btn()}>➕ سند جديد</button>
          <button onClick={() => exportListExcel(vouchers)} style={styles.btn('#2c7a2c')}>📊 تصدير Excel</button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.card}>
        <div style={styles.filterRow}>
          <div style={{ minWidth: '110px' }}>
            <label style={styles.label}>النوع</label>
            <select style={styles.select} value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
              <option value=''>الكل</option>
              <option value='receipt'>قبض</option>
              <option value='payment'>صرف</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '110px' }}><label style={styles.label}>من تاريخ</label><input style={styles.input} type='date' value={filter.dateFrom} onChange={e => setFilter({ ...filter, dateFrom: e.target.value })} /></div>
          <div style={{ flex: 1, minWidth: '110px' }}><label style={styles.label}>إلى تاريخ</label><input style={styles.input} type='date' value={filter.dateTo} onChange={e => setFilter({ ...filter, dateTo: e.target.value })} /></div>
          <div style={{ minWidth: '110px' }}>
            <label style={styles.label}>الحالة</label>
            <select style={styles.select} value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
              <option value=''>الكل</option><option value='posted'>مرحّل</option><option value='draft'>مسودة</option>
            </select>
          </div>
          <div style={{ flex: 2, minWidth: '160px' }}><label style={styles.label}>بحث</label><input style={styles.input} value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} placeholder='عميل أو بيان...' /></div>
          <div style={{ alignSelf: 'flex-end' }}><button onClick={() => { setFilter({ type: '', dateFrom: '', dateTo: '', status: '', search: '' }); setPage(1); }} style={styles.btn('#888')}>🔄 مسح</button></div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { label: 'عدد السندات', val: vouchers.length, color: '#2c5282' },
          { label: 'إجمالي القبض', val: totalReceipt.toFixed(3) + ' د.ك', color: '#004085' },
          { label: 'إجمالي الصرف', val: totalPayment.toFixed(3) + ' د.ك', color: '#721c24' },
          { label: 'الصافي', val: (totalReceipt - totalPayment).toFixed(3) + ' د.ك', color: totalReceipt >= totalPayment ? '#155724' : '#721c24' },
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
        ) : vouchers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>لا توجد سندات</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>{['النوع', 'رقم السند', 'التاريخ', 'العميل', 'البيان', 'المبلغ', 'الحالة', 'إجراءات'].map((h, i) => <th key={i} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {vouchers.map((v, i) => (
                  <tr key={v.id} style={{ background: i % 2 === 0 ? '#fff' : '#f4f8fd', cursor: 'pointer' }} onClick={() => openDetail(v)}>
                    <td style={styles.td}><span style={styles.badge(v.voucher_type)}>{v.voucher_type === 'receipt' ? '💰 قبض' : '💸 صرف'}</span></td>
                    <td style={{ ...styles.td, fontWeight: 'bold', color: '#2c5282' }}>{v.voucher_number || '-'}</td>
                    <td style={styles.td}>{v.voucher_date}</td>
                    <td style={styles.td}>{v.client_name || '-'}</td>
                    <td style={styles.td}>{v.description}</td>
                    <td style={{ ...styles.td, fontWeight: 'bold', color: v.voucher_type === 'receipt' ? '#004085' : '#721c24' }}>{Number(v.total_amount).toFixed(3)}</td>
                    <td style={styles.td}><span style={styles.badge(v.status)}>{v.status === 'posted' ? 'مرحّل' : 'مسودة'}</span></td>
                    <td style={styles.td} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => openDetail(v)} style={styles.btnSm('#2c5282')}>👁</button>
                        {v.status === 'draft' && <button onClick={() => openEdit(v)} style={styles.btnSm('#e67e22')}>✏️</button>}
                        <button onClick={() => setConfirmDel(v)} style={styles.btnSm('#c0392b')}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={styles.btnSm(page === 1 ? '#ccc' : '#2c5282')}>◀ السابق</button>
          <span style={{ padding: '4px 12px', fontWeight: 'bold', color: '#2c5282' }}>صفحة {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={vouchers.length < PAGE_SIZE} style={styles.btnSm(vouchers.length < PAGE_SIZE ? '#ccc' : '#2c5282')}>التالي ▶</button>
        </div>
      </div>

      {showNew && <VoucherModal costCenters={costCenters} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); fetchVouchers(); }} />}
      {editVoucher && <VoucherModal voucher={editVoucher} costCenters={costCenters} onClose={() => setEditVoucher(null)} onSaved={() => { setEditVoucher(null); fetchVouchers(); }} />}
      {detailVoucher && <VoucherDetailModal voucher={detailVoucher} onClose={() => setDetailVoucher(null)} onEdit={openEdit} onDelete={v => setConfirmDel(v)} />}
      {confirmDel && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalBox, maxWidth: '400px', marginTop: '80px' }}>
            <h3 style={{ color: '#c0392b', fontFamily: 'Cairo, Tahoma, sans-serif' }}>⚠️ تأكيد الحذف</h3>
            <p>هل تريد حذف السند: <strong>{confirmDel.description}</strong>؟</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => deleteVoucher(confirmDel)} style={styles.btn('#c0392b')}>نعم، احذف</button>
              <button onClick={() => setConfirmDel(null)} style={styles.btn('#888')}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
