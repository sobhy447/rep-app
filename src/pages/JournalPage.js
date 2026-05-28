import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  page: { padding: '0', fontFamily: 'Cairo, Tahoma, sans-serif', direction: 'rtl', background: '#c8d8e8', minHeight: '100vh' },
  header: { background: 'linear-gradient(180deg,#4a7ab5 0%,#2c5282 100%)', color: '#fff', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #1a365d' },
  headerTitle: { fontSize: '20px', fontWeight: 700, letterSpacing: '2px' },
  body: { padding: '10px 16px' },
  card: { background: '#dce8f5', border: '1px solid #8aabcc', borderRadius: '4px', padding: '8px 12px', marginBottom: '8px' },
  row: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' },
  fieldGroup: { display: 'flex', alignItems: 'center', gap: '4px' },
  fieldLabel: { background: '#4a7ab5', color: '#fff', padding: '3px 10px', borderRadius: '3px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', minWidth: '80px', textAlign: 'center' },
  fieldInput: { border: '1px solid #8aabcc', borderRadius: '3px', padding: '3px 8px', fontSize: '13px', fontFamily: 'Cairo, Tahoma, sans-serif', background: '#fff', minWidth: '100px', outline: 'none' },
  fieldInputWide: { border: '1px solid #8aabcc', borderRadius: '3px', padding: '3px 8px', fontSize: '13px', fontFamily: 'Cairo, Tahoma, sans-serif', background: '#fff', width: '100%', outline: 'none' },
  fieldStatus: { background: '#2c5282', color: '#fff', padding: '3px 16px', borderRadius: '3px', fontSize: '13px', fontWeight: 700 },
  tableWrap: { border: '1px solid #8aabcc', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px', background: '#fff' },
  tableHead: { background: 'linear-gradient(180deg,#5b8fc9 0%,#2c5282 100%)' },
  th: { color: '#fff', padding: '5px 8px', fontSize: '12px', fontWeight: 600, textAlign: 'center', borderLeft: '1px solid #4a7ab5', whiteSpace: 'nowrap' },
  rowData: { borderBottom: '1px solid #c8d8e8', background: '#fff' },
  rowDoc: { borderBottom: '2px solid #8aabcc', background: '#f0f6fc' },
  td: { padding: '3px 4px', fontSize: '12px', textAlign: 'center', borderLeft: '1px solid #d0e0f0', verticalAlign: 'middle' },
  tdInput: { border: '1px solid #b0c8e0', borderRadius: '2px', padding: '2px 6px', fontSize: '12px', fontFamily: 'Cairo, Tahoma, sans-serif', width: '100%', outline: 'none', textAlign: 'right', background: '#fff' },
  tdInputNum: { border: '1px solid #b0c8e0', borderRadius: '2px', padding: '2px 6px', fontSize: '12px', fontFamily: 'Cairo, Tahoma, sans-serif', width: '88px', outline: 'none', textAlign: 'left', background: '#fff' },
  tdSelect: { border: '1px solid #b0c8e0', borderRadius: '2px', padding: '2px 4px', fontSize: '11px', fontFamily: 'Cairo, Tahoma, sans-serif', width: '100%', outline: 'none', background: '#fff' },
  rowNum: { background: '#4a7ab5', color: '#fff', width: '24px', height: '24px', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, margin: 'auto' },
  btnPlus: { background: '#2c7a2c', color: '#fff', border: 'none', borderRadius: '3px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: '20px', textAlign: 'center' },
  btnMinus: { background: '#c0392b', color: '#fff', border: 'none', borderRadius: '3px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: '20px', textAlign: 'center' },
  totalBar: { background: 'linear-gradient(180deg,#5b8fc9 0%,#2c5282 100%)', padding: '6px 16px', display: 'flex', gap: '16px', alignItems: 'center', borderRadius: '4px', marginBottom: '8px', flexWrap: 'wrap' },
  totalLabel: { color: '#fff', fontSize: '13px', fontWeight: 600 },
  totalValue: { background: '#fff', color: '#1a365d', padding: '3px 16px', borderRadius: '3px', fontSize: '14px', fontWeight: 700, minWidth: '110px', textAlign: 'left' },
  totalDiff: { background: '#fff8dc', color: '#c0392b', padding: '3px 16px', borderRadius: '3px', fontSize: '14px', fontWeight: 700, minWidth: '110px', textAlign: 'left' },
  btnBar: { display: 'flex', gap: '8px', padding: '8px 0' },
  btn: (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: '4px', padding: '7px 20px', cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: '13px', fontWeight: 700 }),
  listCard: { background: '#fff', border: '1px solid #8aabcc', borderRadius: '4px', overflow: 'hidden' },
  alert: (t) => ({ padding: '8px 16px', borderRadius: '4px', marginBottom: '8px', fontSize: '13px', fontFamily: 'Cairo,sans-serif', background: t === 'green' ? '#dcfce7' : '#fee2e2', color: t === 'green' ? '#166534' : '#991b1b', border: `1px solid ${t === 'green' ? '#86efac' : '#fca5a5'}` }),
};

export default function JournalPage() {
  const [view, setView] = useState('list');
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [addCostCenters, setAddCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const newLine = () => ({
    _key: Math.random().toString(36).slice(2),
    account_id: '', account_code: '', account_name: '',
    debit_amount: '', credit_amount: '',
    cost_center_id: '', additional_cost_center_id: '',
    doc_number: '', notes: '',
  });

  const emptyForm = () => ({
    entry_date: new Date().toISOString().split('T')[0],
    branch: 'الإدارة', company: '', group: 'مجموعة',
    currency: 'دينار كويتي', conversion: '1.000000',
    status: 'مسودة', description: '',
    lines: [newLine(), newLine(), newLine(), newLine()],
  });

  const [form, setForm] = useState(emptyForm());

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [entRes, accRes, ccRes, addRes] = await Promise.all([
      supabase.from('journal_entries').select('*').is('deleted_at', null).order('entry_date', { ascending: false }).limit(100),
      supabase.from('accounts').select('id, account_code, name_ar').eq('is_active', true).order('account_code'),
      supabase.from('cost_centers').select('id, name_ar').eq('is_active', true).order('name_ar'),
      supabase.from('additional_cost_centers').select('id, name_ar').eq('is_active', true).order('name_ar'),
    ]);
    if (entRes.data) setEntries(entRes.data);
    if (accRes.data) setAccounts(accRes.data);
    if (ccRes.data) setCostCenters(ccRes.data);
    if (addRes.data) setAddCostCenters(addRes.data);
    setLoading(false);
  }

  function onAccountCodeChange(key, code) {
    const acc = accounts.find(a => a.account_code === code);
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key === key ? { ...l, account_code: code, account_id: acc?.id || '', account_name: acc?.name_ar || '' } : l) }));
  }

  function onAccountSelect(key, id) {
    const acc = accounts.find(a => a.id === id);
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key === key ? { ...l, account_id: id, account_code: acc?.account_code || '', account_name: acc?.name_ar || '' } : l) }));
  }

  const updateLine = useCallback((key, changes) => {
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key === key ? { ...l, ...changes } : l) }));
  }, []);

  function addLineAfter(key) {
    setForm(f => {
      const idx = f.lines.findIndex(l => l._key === key);
      const lines = [...f.lines];
      lines.splice(idx + 1, 0, newLine());
      return { ...f, lines };
    });
  }

  function removeLine(key) {
    setForm(f => f.lines.length <= 2 ? f : { ...f, lines: f.lines.filter(l => l._key !== key) });
  }

  function calcTotals() {
    const d = form.lines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0);
    const c = form.lines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
    return { debit: d, credit: c, diff: Math.abs(d - c), balanced: Math.abs(d - c) < 0.001 };
  }

  async function handleSave(post = false) {
    setError('');
    if (!form.description.trim()) return setError('البيان مطلوب');
    const filled = form.lines.filter(l => l.account_id && (parseFloat(l.debit_amount) > 0 || parseFloat(l.credit_amount) > 0));
    if (filled.length < 2) return setError('يجب إدخال سطرين على الأقل (حساب + مبلغ)');
    const t = calcTotals();
    if (!t.balanced) return setError('القيد غير متوازن — الفرق: ' + t.diff.toFixed(3));

    setSaving(true);
    const { data: ent, error: e1 } = await supabase.from('journal_entries').insert({
      entry_date: form.entry_date, description: form.description,
      total_debit: t.debit, total_credit: t.credit, is_balanced: true,
      status: post ? 'posted' : 'draft',
      posted_at: post ? new Date().toISOString() : null,
      voucher_type: 'journal',
    }).select().single();
    if (e1) { setError(e1.message); setSaving(false); return; }

    const { error: e2 } = await supabase.from('journal_entry_lines').insert(
      filled.map((l, i) => ({
        journal_entry_id: ent.id, line_number: i + 1,
        account_id: l.account_id,
        cost_center_id: l.cost_center_id || null,
        additional_cost_center_id: l.additional_cost_center_id || null,
        debit_amount: parseFloat(l.debit_amount) || 0,
        credit_amount: parseFloat(l.credit_amount) || 0,
        description: l.notes || null,
      }))
    );
    if (e2) { await supabase.from('journal_entries').delete().eq('id', ent.id); setError(e2.message); setSaving(false); return; }

    setSuccess(post ? 'تم الترحيل بنجاح ✅' : 'تم الحفظ كمسودة ✅');
    setSaving(false); setView('list'); setForm(emptyForm()); fetchAll();
    setTimeout(() => setSuccess(''), 4000);
  }

  async function postEntry(id) {
    await supabase.from('journal_entries').update({ status: 'posted', posted_at: new Date().toISOString() }).eq('id', id);
    fetchAll();
  }

  const t = calcTotals();
  const filtered = entries.filter(e => filterStatus === 'all' || e.status === filterStatus);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.headerTitle}>📒 القيود المحاسبية — قيد</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {view === 'list'
            ? <button style={S.btn('#2c7a2c')} onClick={() => { setForm(emptyForm()); setError(''); setView('form'); }}>📝 قيد جديد</button>
            : <button style={S.btn('#7f8c8d')} onClick={() => setView('list')}>↩ القائمة</button>}
        </div>
      </div>
      <div style={S.body}>
        {success && <div style={S.alert('green')}>{success}</div>}
        {error && view === 'list' && <div style={S.alert('red')}>{error}</div>}

        {view === 'form' && (
          <div>
            {error && <div style={S.alert('red')}>⚠️ {error}</div>}
            <div style={S.card}>
              <div style={S.row}>
                <div style={S.fieldGroup}><span style={S.fieldLabel}>الفرع</span><select style={S.fieldInput} value={form.branch} onChange={e => setForm({...form,branch:e.target.value})}><option>الإدارة</option><option>فرع 1</option></select></div>
                <div style={S.fieldGroup}><span style={S.fieldLabel}>الإدارة</span><input style={S.fieldInput} value={form.group} onChange={e => setForm({...form,group:e.target.value})} /></div>
                <div style={S.fieldGroup}><span style={S.fieldLabel}>رقم السند</span><input style={{...S.fieldInput,background:'#b8d0e8',fontWeight:700}} readOnly placeholder="تلقائي" /></div>
                <div style={S.fieldGroup}><span style={S.fieldLabel}>التاريخ</span><input style={S.fieldInput} type="date" value={form.entry_date} onChange={e => setForm({...form,entry_date:e.target.value})} /></div>
                <div style={S.fieldGroup}><span style={{...S.fieldLabel,background:'#1a365d'}}>الحالة</span><span style={S.fieldStatus}>{form.status}</span></div>
              </div>
              <div style={S.row}>
                <div style={S.fieldGroup}><span style={S.fieldLabel}>المجموعة</span><input style={S.fieldInput} value={form.group} onChange={e => setForm({...form,group:e.target.value})} /></div>
                <div style={S.fieldGroup}><span style={S.fieldLabel}>الشركة</span><input style={S.fieldInput} value={form.company} onChange={e => setForm({...form,company:e.target.value})} /></div>
                <div style={S.fieldGroup}><span style={S.fieldLabel}>العملة</span><select style={S.fieldInput} value={form.currency} onChange={e => setForm({...form,currency:e.target.value})}><option>دينار كويتي</option><option>دولار أمريكي</option><option>يورو</option></select></div>
                <div style={S.fieldGroup}><span style={S.fieldLabel}>التحويل</span><input style={{...S.fieldInput,width:'90px'}} value={form.conversion} readOnly /></div>
              </div>
              <div style={S.row}>
                <div style={{...S.fieldGroup,flex:1}}><span style={S.fieldLabel}>البيان</span><input style={S.fieldInputWide} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="بيان القيد..." /></div>
              </div>
            </div>

            <div style={S.tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={S.tableHead}>
                    <th style={{...S.th,width:'32px'}}>م</th>
                    <th style={{...S.th,width:'95px'}}>رقم الحساب</th>
                    <th style={{...S.th,minWidth:'170px'}}>اسم الحساب</th>
                    <th style={{...S.th,width:'95px'}}>مدين</th>
                    <th style={{...S.th,width:'95px'}}>دائن</th>
                    <th style={{...S.th,minWidth:'140px'}}>مركز التكلفة</th>
                    <th style={{...S.th,minWidth:'140px'}}>مراكز اضافية</th>
                    <th style={{...S.th,width:'36px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => (
                    <React.Fragment key={line._key}>
                      <tr style={S.rowData}>
                        <td style={S.td}><div style={S.rowNum}>{idx + 1}</div></td>
                        <td style={S.td}>
                          <input style={{...S.tdInput,width:'85px',background:'#eaf2fb'}}
                            value={line.account_code}
                            onChange={e => onAccountCodeChange(line._key, e.target.value)}
                            placeholder="الكود" />
                        </td>
                        <td style={S.td}>
                          <select style={S.tdSelect} value={line.account_id} onChange={e => onAccountSelect(line._key, e.target.value)}>
                            <option value="">-- اختر حساب --</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}
                          </select>
                        </td>
                        <td style={S.td}>
                          <input style={S.tdInputNum} type="number" step="0.001" min="0" value={line.debit_amount} placeholder="0.000"
                            onChange={e => updateLine(line._key, { debit_amount: e.target.value, credit_amount: e.target.value ? '' : line.credit_amount })} />
                        </td>
                        <td style={S.td}>
                          <input style={S.tdInputNum} type="number" step="0.001" min="0" value={line.credit_amount} placeholder="0.000"
                            onChange={e => updateLine(line._key, { credit_amount: e.target.value, debit_amount: e.target.value ? '' : line.debit_amount })} />
                        </td>
                        <td style={S.td}>
                          <select style={S.tdSelect} value={line.cost_center_id} onChange={e => updateLine(line._key, { cost_center_id: e.target.value })}>
                            <option value="">-- اختر --</option>
                            {costCenters.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                          </select>
                        </td>
                        <td style={S.td}>
                          <select style={S.tdSelect} value={line.additional_cost_center_id} onChange={e => updateLine(line._key, { additional_cost_center_id: e.target.value })}>
                            <option value="">-- اختر --</option>
                            {addCostCenters.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                          </select>
                        </td>
                        <td style={{...S.td,width:'36px'}}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                            <button style={S.btnPlus} onClick={() => addLineAfter(line._key)}>+</button>
                            <button style={S.btnMinus} onClick={() => removeLine(line._key)}>−</button>
                          </div>
                        </td>
                      </tr>
                      <tr style={S.rowDoc}>
                        <td style={{...S.td,background:'#4a7ab5',color:'#fff',fontWeight:700,fontSize:'11px'}}>Doc</td>
                        <td style={S.td} colSpan={2}>
                          <input style={{...S.tdInput,width:'150px'}} value={line.doc_number}
                            onChange={e => updateLine(line._key, { doc_number: e.target.value })} placeholder="رقم المرجع..." />
                        </td>
                        <td colSpan={4} style={S.td}>
                          <input style={{...S.tdInput,width:'99%'}} value={line.notes}
                            onChange={e => updateLine(line._key, { notes: e.target.value })} placeholder="ملاحظات السطر..." />
                        </td>
                        <td style={S.td}></td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={S.totalBar}>
              <span style={S.totalLabel}>الإجمالي</span>
              <span style={S.totalLabel}>مدين:</span><span style={S.totalValue}>{t.debit.toFixed(3)}</span>
              <span style={S.totalLabel}>دائن:</span><span style={S.totalValue}>{t.credit.toFixed(3)}</span>
              <span style={S.totalLabel}>الصافي:</span><span style={t.balanced ? S.totalValue : S.totalDiff}>{t.diff.toFixed(3)}</span>
              {t.balanced && <span style={{ color: '#90EE90', fontWeight: 700 }}>✅ متوازن</span>}
            </div>

            <div style={S.btnBar}>
              <button style={S.btn('#2c7a2c')} onClick={() => handleSave(false)} disabled={saving}>💾 حفظ</button>
              <button style={S.btn('#1a365d')} onClick={() => handleSave(true)} disabled={saving || !t.balanced}>🚀 ترحيل فوري</button>
              <button style={S.btn('#7f8c8d')} onClick={() => setView('list')}>↩ رجوع</button>
              <button style={S.btn('#c0392b')} onClick={() => { setForm(emptyForm()); setError(''); }}>📄 جديد</button>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a365d' }}>تصفية:</span>
              {['all','draft','posted'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{...S.btn(filterStatus === s ? '#2c5282' : '#8aabcc'), padding:'4px 14px', fontSize:'12px'}}>
                  {s==='all'?'الكل':s==='draft'?'مسودة':'مُرحَّل'}
                </button>
              ))}
            </div>
            {loading ? <p style={{ textAlign: 'center', color: '#2c5282' }}>جارٍ التحميل...</p> : (
              <div style={S.listCard}>
                <div style={{ background: 'linear-gradient(180deg,#5b8fc9,#2c5282)', display: 'flex', padding: '6px 12px', gap: '8px' }}>
                  {['رقم القيد','التاريخ','البيان','إجمالي مدين','الحالة','إجراءات'].map((h,i) => (
                    <span key={h} style={{ color: '#fff', fontSize: '12px', fontWeight: 600, flex: i===2 ? 3 : 1 }}>{h}</span>
                  ))}
                </div>
                {filtered.length === 0
                  ? <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>لا توجد قيود</div>
                  : filtered.map(e => (
                    <div key={e.id} style={{ display: 'flex', padding: '5px 12px', borderBottom: '1px solid #e0eaf5', alignItems: 'center', gap: '8px' }}>
                      <span style={{ flex:1, fontWeight:700, color:'#2c5282', fontSize:'13px' }}>{e.entry_number || e.id?.slice(0,8)}</span>
                      <span style={{ flex:1, fontSize:'13px' }}>{e.entry_date}</span>
                      <span style={{ flex:3, fontSize:'13px' }}>{e.description}</span>
                      <span style={{ flex:1, fontSize:'13px', textAlign:'left', fontWeight:600 }}>{Number(e.total_debit||0).toFixed(3)}</span>
                      <span style={{ flex:1 }}>
                        <span style={{ background: e.status==='posted'?'#dcfce7':'#fef3c7', color: e.status==='posted'?'#166534':'#92400e', padding:'2px 10px', borderRadius:'10px', fontSize:'12px' }}>
                          {e.status==='posted'?'مُرحَّل':'مسودة'}
                        </span>
                      </span>
                      <span style={{ flex:1 }}>
                        {e.status==='draft' && <button onClick={() => postEntry(e.id)} style={{...S.btn('#1a365d'),padding:'3px 12px',fontSize:'12px'}}>🚀 ترحيل</button>}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
