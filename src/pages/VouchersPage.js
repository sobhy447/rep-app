import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/* نفس ألوان الشامل */
const S = {
  page: { padding: '0', fontFamily: 'Cairo, Tahoma, sans-serif', direction: 'rtl', background: '#c8d8e8', minHeight: '100vh' },
  header: (color) => ({ background: `linear-gradient(180deg,${color} 0%,#1a365d 100%)`, color: '#fff', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #1a365d' }),
  headerTitle: { fontSize: '20px', fontWeight: 700, letterSpacing: '2px' },
  body: { padding: '10px 16px' },
  card: { background: '#dce8f5', border: '1px solid #8aabcc', borderRadius: '4px', padding: '8px 12px', marginBottom: '8px' },
  row: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' },
  fg: { display: 'flex', alignItems: 'center', gap: '4px' },
  lbl: (bg) => ({ background: bg||'#4a7ab5', color: '#fff', padding: '3px 10px', borderRadius: '3px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', minWidth: '80px', textAlign: 'center' }),
  inp: { border: '1px solid #8aabcc', borderRadius: '3px', padding: '3px 8px', fontSize: '13px', fontFamily: 'Cairo, Tahoma, sans-serif', background: '#fff', minWidth: '100px', outline: 'none' },
  inpWide: { border: '1px solid #8aabcc', borderRadius: '3px', padding: '3px 8px', fontSize: '13px', fontFamily: 'Cairo, Tahoma, sans-serif', background: '#fff', width: '100%', outline: 'none' },
  inpBlue: { border: '1px solid #8aabcc', borderRadius: '3px', padding: '3px 8px', fontSize: '13px', fontFamily: 'Cairo, Tahoma, sans-serif', background: '#b8d0e8', fontWeight: 700, minWidth: '100px', outline: 'none' },
  status: { background: '#2c5282', color: '#fff', padding: '3px 16px', borderRadius: '3px', fontSize: '13px', fontWeight: 700 },
  tableWrap: { border: '1px solid #8aabcc', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' },
  th: { color: '#fff', padding: '5px 8px', fontSize: '12px', fontWeight: 600, textAlign: 'center', borderLeft: '1px solid #4a7ab5', whiteSpace: 'nowrap' },
  td: { padding: '3px 4px', fontSize: '12px', textAlign: 'center', borderLeft: '1px solid #d0e0f0', verticalAlign: 'middle' },
  tdI: { border: '1px solid #b0c8e0', borderRadius: '2px', padding: '2px 6px', fontSize: '12px', fontFamily: 'Cairo, Tahoma, sans-serif', width: '100%', outline: 'none', textAlign: 'right', background: '#fff' },
  tdN: { border: '1px solid #b0c8e0', borderRadius: '2px', padding: '2px 6px', fontSize: '12px', fontFamily: 'Cairo, Tahoma, sans-serif', width: '88px', outline: 'none', textAlign: 'left', background: '#fff' },
  tdS: { border: '1px solid #b0c8e0', borderRadius: '2px', padding: '2px 4px', fontSize: '11px', fontFamily: 'Cairo, Tahoma, sans-serif', width: '100%', outline: 'none', background: '#fff' },
  rowNum: { background: '#4a7ab5', color: '#fff', width: '24px', height: '24px', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, margin: 'auto' },
  btnPlus: { background: '#2c7a2c', color: '#fff', border: 'none', borderRadius: '3px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: '20px', textAlign: 'center' },
  btnMinus: { background: '#c0392b', color: '#fff', border: 'none', borderRadius: '3px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: '20px', textAlign: 'center' },
  diffBar: { background: 'linear-gradient(180deg,#5b8fc9,#2c5282)', padding: '6px 16px', display: 'flex', gap: '16px', alignItems: 'center', borderRadius: '4px', marginBottom: '8px', flexWrap: 'wrap' },
  diffLbl: { color: '#fff', fontSize: '13px', fontWeight: 600 },
  diffVal: (warn) => ({ background: warn ? '#fff8dc' : '#fff', color: warn ? '#c0392b' : '#1a365d', padding: '3px 16px', borderRadius: '3px', fontSize: '14px', fontWeight: 700, minWidth: '110px', textAlign: 'left' }),
  btnBar: { display: 'flex', gap: '8px', padding: '8px 0' },
  btn: (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: '4px', padding: '7px 20px', cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: '13px', fontWeight: 700 }),
  alert: (t) => ({ padding: '8px 16px', borderRadius: '4px', marginBottom: '8px', fontSize: '13px', fontFamily: 'Cairo,sans-serif', background: t==='green'?'#dcfce7':'#fee2e2', color: t==='green'?'#166534':'#991b1b', border: `1px solid ${t==='green'?'#86efac':'#fca5a5'}` }),
  tabBtn: (active, color) => ({ background: active ? color : '#8aabcc', color: '#fff', border: 'none', borderRadius: '4px 4px 0 0', padding: '8px 28px', cursor: 'pointer', fontFamily: 'Cairo,Tahoma,sans-serif', fontSize: '14px', fontWeight: 700 }),
};

export default function VouchersPage() {
  const [voucherType, setVoucherType] = useState('receipt'); // receipt | payment
  const [view, setView] = useState('list');
  const [vouchers, setVouchers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [addCostCenters, setAddCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isReceipt = voucherType === 'receipt';
  const headerColor = isReceipt ? '#2c7a2c' : '#8b2020';
  const title = isReceipt ? 'قبض' : 'صرف';
  const mainAccLabel = isReceipt ? 'الحساب المدين' : 'الحساب الدائن';

  const newLine = () => ({
    _key: Math.random().toString(36).slice(2),
    account_id: '', account_code: '', account_name: '',
    debit_amount: '', credit_amount: '',
    cost_center_id: '', additional_cost_center_id: '',
    doc_number: '', notes: '',
  });

  const emptyForm = () => ({
    voucher_date: new Date().toISOString().split('T')[0],
    branch: 'الإدارة', company: '', group: 'مجموعة',
    currency: 'دينار كويتي', conversion: '1.000000',
    status: 'مسودة',
    client_name: '',    // اسم العميل (قبض) / صرفنا الى (صرف)
    description: '',    // البيان
    bank_name: '',
    cheque_number: '',
    due_date: '',
    main_account_id: '',   // الحساب المدين (قبض) / الدائن (صرف)
    main_account_code: '',
    main_amount: '',
    main_cost_center_id: '',
    main_add_cost_center_id: '',
    lines: [newLine(), newLine()],
  });

  const [form, setForm] = useState(emptyForm());

  useEffect(() => { fetchAll(); }, [voucherType]);

  async function fetchAll() {
    setLoading(true);
    const type = isReceipt ? 'receipt' : 'payment';
    const [vRes, accRes, ccRes, addRes] = await Promise.all([
      supabase.from('vouchers').select('*').eq('voucher_type', type).order('voucher_date', { ascending: false }).limit(100),
      supabase.from('accounts').select('id, account_code, name_ar').eq('is_active', true).order('account_code'),
      supabase.from('cost_centers').select('id, name_ar').eq('is_active', true).order('name_ar'),
      supabase.from('additional_cost_centers').select('id, name_ar').eq('is_active', true).order('name_ar'),
    ]);
    if (vRes.data) setVouchers(vRes.data);
    if (accRes.data) setAccounts(accRes.data);
    if (ccRes.data) setCostCenters(ccRes.data);
    if (addRes.data) setAddCostCenters(addRes.data);
    setLoading(false);
  }

  function onMainAccCode(code) {
    const acc = accounts.find(a => a.account_code === code);
    setForm(f => ({ ...f, main_account_code: code, main_account_id: acc?.id || '' }));
  }

  function onLineAccCode(key, code) {
    const acc = accounts.find(a => a.account_code === code);
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key===key ? {...l, account_code:code, account_id:acc?.id||'', account_name:acc?.name_ar||''} : l) }));
  }

  function onLineAccSelect(key, id) {
    const acc = accounts.find(a => a.id === id);
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key===key ? {...l, account_id:id, account_code:acc?.account_code||'', account_name:acc?.name_ar||''} : l) }));
  }

  const updateLine = useCallback((key, changes) => {
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key===key ? {...l,...changes} : l) }));
  }, []);

  function addLineAfter(key) {
    setForm(f => {
      const idx = f.lines.findIndex(l => l._key===key);
      const lines = [...f.lines]; lines.splice(idx+1, 0, newLine());
      return { ...f, lines };
    });
  }

  function removeLine(key) {
    setForm(f => f.lines.length <= 2 ? f : { ...f, lines: f.lines.filter(l => l._key!==key) });
  }

  function calcDiff() {
    const mainAmt = parseFloat(form.main_amount) || 0;
    const linesTotal = form.lines.reduce((s, l) => {
      const v = parseFloat(isReceipt ? l.credit_amount : l.debit_amount) || 0;
      return s + v;
    }, 0);
    return { mainAmt, linesTotal, diff: Math.abs(mainAmt - linesTotal), balanced: Math.abs(mainAmt - linesTotal) < 0.001 };
  }

  async function handleSave(post = false) {
    setError('');
    if (!form.description.trim()) return setError('البيان مطلوب');
    if (!form.main_account_id) return setError(mainAccLabel + ' مطلوب');
    if (!form.main_amount || parseFloat(form.main_amount) <= 0) return setError('المبلغ مطلوب');
    const filled = form.lines.filter(l => l.account_id && (parseFloat(l.debit_amount)>0 || parseFloat(l.credit_amount)>0));
    if (filled.length < 1) return setError('يجب إدخال سطر واحد على الأقل في الجدول');
    const d = calcDiff();
    if (!d.balanced) return setError('السند غير متوازن — الفرق: ' + d.diff.toFixed(3));

    setSaving(true);
    const type = isReceipt ? 'receipt' : 'payment';
    const { data: v, error: e1 } = await supabase.from('vouchers').insert({
      voucher_type: type,
      voucher_date: form.voucher_date,
      client_name: form.client_name,
      description: form.description,
      bank_name: form.bank_name || null,
      cheque_number: form.cheque_number || null,
      due_date: form.due_date || null,
      main_account_id: form.main_account_id,
      main_amount: parseFloat(form.main_amount),
      main_cost_center_id: form.main_cost_center_id || null,
      main_add_cost_center_id: form.main_add_cost_center_id || null,
      total_amount: parseFloat(form.main_amount),
      status: post ? 'posted' : 'draft',
      posted_at: post ? new Date().toISOString() : null,
    }).select().single();
    if (e1) { setError(e1.message); setSaving(false); return; }

    const { error: e2 } = await supabase.from('voucher_lines').insert(
      filled.map((l, i) => ({
        voucher_id: v.id, line_number: i+1,
        account_id: l.account_id,
        cost_center_id: l.cost_center_id || null,
        additional_cost_center_id: l.additional_cost_center_id || null,
        debit_amount: parseFloat(l.debit_amount) || 0,
        credit_amount: parseFloat(l.credit_amount) || 0,
        description: l.notes || null,
      }))
    );
    if (e2) { await supabase.from('vouchers').delete().eq('id', v.id); setError(e2.message); setSaving(false); return; }

    setSuccess(post ? 'تم الترحيل بنجاح ✅' : 'تم الحفظ كمسودة ✅');
    setSaving(false); setView('list'); setForm(emptyForm()); fetchAll();
    setTimeout(() => setSuccess(''), 4000);
  }

  async function postVoucher(id) {
    await supabase.from('vouchers').update({ status: 'posted', posted_at: new Date().toISOString() }).eq('id', id);
    fetchAll();
  }

  const d = calcDiff();

  return (
    <div style={S.page}>
      {/* تبويبات قبض / صرف */}
      <div style={{ display: 'flex', padding: '8px 16px 0', gap: '4px', background: '#b0c8e0' }}>
        <button style={S.tabBtn(isReceipt, '#2c7a2c')} onClick={() => { setVoucherType('receipt'); setView('list'); setForm(emptyForm()); }}>💚 سند قبض</button>
        <button style={S.tabBtn(!isReceipt, '#8b2020')} onClick={() => { setVoucherType('payment'); setView('list'); setForm(emptyForm()); }}>❤️ سند صرف</button>
      </div>

      <div style={S.header(headerColor)}>
        <span style={S.headerTitle}>{isReceipt ? '💚' : '❤️'} {title}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {view==='list'
            ? <button style={S.btn(headerColor)} onClick={() => { setForm(emptyForm()); setError(''); setView('form'); }}>📝 سند جديد</button>
            : <button style={S.btn('#7f8c8d')} onClick={() => setView('list')}>↩ القائمة</button>}
        </div>
      </div>

      <div style={S.body}>
        {success && <div style={S.alert('green')}>{success}</div>}
        {error && view==='list' && <div style={S.alert('red')}>{error}</div>}

        {view==='form' && (
          <div>
            {error && <div style={S.alert('red')}>⚠️ {error}</div>}

            {/* ── رأس السند ── */}
            <div style={S.card}>
              <div style={S.row}>
                <div style={S.fg}><span style={S.lbl()}>الفرع</span><select style={S.inp} value={form.branch} onChange={e => setForm({...form,branch:e.target.value})}><option>الإدارة</option><option>فرع 1</option></select></div>
                <div style={S.fg}><span style={S.lbl()}>الإدارة</span><input style={S.inp} value={form.group} onChange={e => setForm({...form,group:e.target.value})} /></div>
                <div style={S.fg}><span style={S.lbl()}>رقم السند</span><input style={S.inpBlue} readOnly placeholder="تلقائي" /></div>
                <div style={S.fg}><span style={S.lbl()}>التاريخ</span><input style={S.inp} type="date" value={form.voucher_date} onChange={e => setForm({...form,voucher_date:e.target.value})} /></div>
                <div style={S.fg}><span style={{...S.lbl('#1a365d')}}>حالة القيد</span><span style={S.status}>{form.status}</span></div>
              </div>
              <div style={S.row}>
                <div style={S.fg}><span style={S.lbl()}>المجموعة</span><input style={S.inp} value={form.group} onChange={e => setForm({...form,group:e.target.value})} /></div>
                <div style={S.fg}><span style={S.lbl()}>الشركة</span><input style={S.inp} value={form.company} onChange={e => setForm({...form,company:e.target.value})} /></div>
                <div style={S.fg}><span style={S.lbl()}>العملة</span><select style={S.inp} value={form.currency} onChange={e => setForm({...form,currency:e.target.value})}><option>دينار كويتي</option><option>دولار أمريكي</option><option>يورو</option></select></div>
                <div style={S.fg}><span style={S.lbl()}>التحويل</span><input style={{...S.inp,width:'90px'}} value={form.conversion} readOnly /></div>
              </div>

              {/* اسم العميل / صرفنا الى + البيان */}
              <div style={S.row}>
                <div style={{...S.fg,flex:1}}><span style={S.lbl()}>{isReceipt ? 'اسم العميل' : 'صرفنا الى'}</span><input style={S.inpWide} value={form.client_name} onChange={e => setForm({...form,client_name:e.target.value})} placeholder={isReceipt ? 'اسم العميل...' : 'صرفنا الى...'} /></div>
              </div>
              <div style={S.row}>
                <div style={{...S.fg,flex:1}}><span style={S.lbl()}>البيان</span><input style={S.inpWide} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="البيان..." /></div>
              </div>

              {/* البنك / شيك / تاريخ الاستحقاق */}
              <div style={S.row}>
                <div style={S.fg}><span style={S.lbl()}>البنك</span><input style={S.inp} value={form.bank_name} onChange={e => setForm({...form,bank_name:e.target.value})} placeholder="اسم البنك..." /></div>
                <div style={S.fg}><span style={S.lbl()}>شيك رقم</span><input style={S.inp} value={form.cheque_number} onChange={e => setForm({...form,cheque_number:e.target.value})} /></div>
                <div style={S.fg}><span style={S.lbl()}>تاريخ الاستحقاق</span><input style={S.inp} type="date" value={form.due_date} onChange={e => setForm({...form,due_date:e.target.value})} /></div>
              </div>

              {/* الحساب المدين/الدائن الرئيسي + مركز التكلفة + المبلغ */}
              <div style={{ background: isReceipt ? '#e8f5e9' : '#fde8e8', border: `1px solid ${isReceipt?'#a5d6a7':'#f5a0a0'}`, borderRadius: '4px', padding: '8px', marginTop: '6px' }}>
                <div style={S.row}>
                  <div style={S.fg}><span style={{...S.lbl(isReceipt?'#2c7a2c':'#8b2020')}}>{mainAccLabel}</span>
                    <input style={{...S.inp,width:'90px',background:'#eaf2fb'}} value={form.main_account_code} onChange={e => onMainAccCode(e.target.value)} placeholder="الكود" />
                    <select style={{...S.inp,minWidth:'200px'}} value={form.main_account_id} onChange={e => {const a=accounts.find(x=>x.id===e.target.value); setForm(f=>({...f,main_account_id:e.target.value,main_account_code:a?.account_code||''}));}}>
                      <option value="">-- اختر الحساب --</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}
                    </select>
                  </div>
                  <div style={S.fg}><span style={S.lbl()}>المبلغ</span><input style={{...S.inp,width:'110px',fontWeight:700,fontSize:'15px',textAlign:'left'}} type="number" step="0.001" min="0" value={form.main_amount} onChange={e => setForm({...form,main_amount:e.target.value})} placeholder="0.000" /></div>
                </div>
                <div style={S.row}>
                  <div style={S.fg}><span style={S.lbl()}>مركز التكلفة</span>
                    <select style={S.inp} value={form.main_cost_center_id} onChange={e => setForm({...form,main_cost_center_id:e.target.value})}>
                      <option value="">-- اختر --</option>
                      {costCenters.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                    </select>
                  </div>
                  <div style={S.fg}><span style={S.lbl()}>المركز الاضافي</span>
                    <select style={S.inp} value={form.main_add_cost_center_id} onChange={e => setForm({...form,main_add_cost_center_id:e.target.value})}>
                      <option value="">-- اختر --</option>
                      {addCostCenters.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ── جدول السطور ── */}
            <div style={S.tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: `linear-gradient(180deg,${isReceipt?'#3a8a3a':'#9b3030'} 0%,#1a365d 100%)` }}>
                    <th style={{...S.th,width:'32px'}}>م</th>
                    <th style={{...S.th,width:'95px'}}>رقم الحساب</th>
                    <th style={{...S.th,minWidth:'170px'}}>اسم الحساب</th>
                    <th style={{...S.th,width:'95px'}}>مدين</th>
                    <th style={{...S.th,width:'95px'}}>دائن</th>
                    <th style={{...S.th,minWidth:'140px'}}>مراكز التكلفة</th>
                    <th style={{...S.th,minWidth:'140px'}}>المراكز الاضافية</th>
                    <th style={{...S.th,width:'36px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => (
                    <React.Fragment key={line._key}>
                      <tr style={{ borderBottom: '1px solid #c8d8e8', background: '#fff' }}>
                        <td style={S.td}><div style={S.rowNum}>{idx+1}</div></td>
                        <td style={S.td}>
                          <input style={{...S.tdI,width:'85px',background:'#eaf2fb'}} value={line.account_code} onChange={e => onLineAccCode(line._key, e.target.value)} placeholder="الكود" />
                        </td>
                        <td style={S.td}>
                          <select style={S.tdS} value={line.account_id} onChange={e => onLineAccSelect(line._key, e.target.value)}>
                            <option value="">-- اختر حساب --</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}
                          </select>
                        </td>
                        <td style={S.td}><input style={S.tdN} type="number" step="0.001" min="0" value={line.debit_amount} placeholder="0.000" onChange={e => updateLine(line._key, {debit_amount:e.target.value, credit_amount:e.target.value?'':line.credit_amount})} /></td>
                        <td style={S.td}><input style={S.tdN} type="number" step="0.001" min="0" value={line.credit_amount} placeholder="0.000" onChange={e => updateLine(line._key, {credit_amount:e.target.value, debit_amount:e.target.value?'':line.debit_amount})} /></td>
                        <td style={S.td}><select style={S.tdS} value={line.cost_center_id} onChange={e => updateLine(line._key, {cost_center_id:e.target.value})}><option value="">-- اختر --</option>{costCenters.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></td>
                        <td style={S.td}><select style={S.tdS} value={line.additional_cost_center_id} onChange={e => updateLine(line._key, {additional_cost_center_id:e.target.value})}><option value="">-- اختر --</option>{addCostCenters.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></td>
                        <td style={{...S.td,width:'36px'}}>
                          <div style={{display:'flex',flexDirection:'column',gap:'2px',alignItems:'center'}}>
                            <button style={S.btnPlus} onClick={() => addLineAfter(line._key)}>+</button>
                            <button style={S.btnMinus} onClick={() => removeLine(line._key)}>−</button>
                          </div>
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '2px solid #8aabcc', background: '#f0f6fc' }}>
                        <td style={{...S.td,background:'#4a7ab5',color:'#fff',fontWeight:700,fontSize:'11px'}}>Doc</td>
                        <td style={S.td} colSpan={2}><input style={{...S.tdI,width:'150px'}} value={line.doc_number} onChange={e => updateLine(line._key, {doc_number:e.target.value})} placeholder="رقم المرجع..." /></td>
                        <td colSpan={4} style={S.td}><input style={{...S.tdI,width:'99%'}} value={line.notes} onChange={e => updateLine(line._key, {notes:e.target.value})} placeholder="ملاحظات السطر..." /></td>
                        <td style={S.td}></td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* الفرق */}
            <div style={S.diffBar}>
              <span style={S.diffLbl}>المبلغ الرئيسي:</span><span style={S.diffVal(false)}>{d.mainAmt.toFixed(3)}</span>
              <span style={S.diffLbl}>إجمالي السطور:</span><span style={S.diffVal(false)}>{d.linesTotal.toFixed(3)}</span>
              <span style={S.diffLbl}>الفرق:</span><span style={S.diffVal(!d.balanced)}>{d.diff.toFixed(3)}</span>
              {d.balanced && <span style={{color:'#90EE90',fontWeight:700}}>✅ متوازن</span>}
            </div>

            <div style={S.btnBar}>
              <button style={S.btn('#2c7a2c')} onClick={() => handleSave(false)} disabled={saving}>💾 حفظ</button>
              <button style={S.btn('#1a365d')} onClick={() => handleSave(true)} disabled={saving||!d.balanced}>🚀 ترحيل فوري</button>
              <button style={S.btn('#7f8c8d')} onClick={() => setView('list')}>↩ رجوع</button>
              <button style={S.btn('#c0392b')} onClick={() => { setForm(emptyForm()); setError(''); }}>📄 جديد</button>
            </div>
          </div>
        )}

        {view==='list' && (
          <div>
            {loading ? <p style={{textAlign:'center',color:'#2c5282'}}>جارٍ التحميل...</p> : (
              <div style={{ background:'#fff', border:'1px solid #8aabcc', borderRadius:'4px', overflow:'hidden' }}>
                <div style={{ background:`linear-gradient(180deg,${isReceipt?'#3a8a3a':'#9b3030'},#1a365d)`, display:'flex', padding:'6px 12px', gap:'8px' }}>
                  {['رقم السند','التاريخ',isReceipt?'اسم العميل':'صرفنا الى','البيان','المبلغ','الحالة','إجراءات'].map((h,i) => (
                    <span key={h} style={{color:'#fff',fontSize:'12px',fontWeight:600,flex:i===2||i===3?2:1}}>{h}</span>
                  ))}
                </div>
                {vouchers.length===0
                  ? <div style={{textAlign:'center',padding:'24px',color:'#9ca3af'}}>لا توجد سندات</div>
                  : vouchers.map(v => (
                    <div key={v.id} style={{display:'flex',padding:'5px 12px',borderBottom:'1px solid #e0eaf5',alignItems:'center',gap:'8px'}}>
                      <span style={{flex:1,fontWeight:700,color:isReceipt?'#166534':'#991b1b',fontSize:'13px'}}>{v.voucher_number||v.id?.slice(0,8)}</span>
                      <span style={{flex:1,fontSize:'13px'}}>{v.voucher_date}</span>
                      <span style={{flex:2,fontSize:'13px'}}>{v.client_name}</span>
                      <span style={{flex:2,fontSize:'13px'}}>{v.description}</span>
                      <span style={{flex:1,fontSize:'13px',textAlign:'left',fontWeight:700}}>{Number(v.total_amount||0).toFixed(3)}</span>
                      <span style={{flex:1}}>
                        <span style={{background:v.status==='posted'?'#dcfce7':'#fef3c7',color:v.status==='posted'?'#166534':'#92400e',padding:'2px 10px',borderRadius:'10px',fontSize:'12px'}}>
                          {v.status==='posted'?'مُرحَّل':'مسودة'}
                        </span>
                      </span>
                      <span style={{flex:1}}>
                        {v.status==='draft' && <button onClick={() => postVoucher(v.id)} style={{...S.btn('#1a365d'),padding:'3px 12px',fontSize:'12px'}}>🚀 ترحيل</button>}
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
