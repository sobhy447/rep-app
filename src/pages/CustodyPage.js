import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  page: { padding: '0', fontFamily: 'Cairo, Tahoma, sans-serif', direction: 'rtl', background: '#c8d8e8', minHeight: '100vh' },
  header: { background: 'linear-gradient(180deg,#5b6fa0 0%,#2c3e7a 100%)', color: '#fff', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #1a2a5d' },
  headerTitle: { fontSize: '20px', fontWeight: 700, letterSpacing: '2px' },
  body: { padding: '10px 16px' },
  card: { background: '#dce8f5', border: '1px solid #8aabcc', borderRadius: '4px', padding: '8px 12px', marginBottom: '8px' },
  row: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' },
  fg: { display: 'flex', alignItems: 'center', gap: '4px' },
  lbl: { background: '#4a7ab5', color: '#fff', padding: '3px 10px', borderRadius: '3px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', minWidth: '80px', textAlign: 'center' },
  inp: { border: '1px solid #8aabcc', borderRadius: '3px', padding: '3px 8px', fontSize: '13px', fontFamily: 'Cairo, Tahoma, sans-serif', background: '#fff', minWidth: '100px', outline: 'none' },
  inpWide: { border: '1px solid #8aabcc', borderRadius: '3px', padding: '3px 8px', fontSize: '13px', fontFamily: 'Cairo, Tahoma, sans-serif', background: '#fff', width: '100%', outline: 'none' },
  tableWrap: { border: '1px solid #8aabcc', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' },
  th: { color: '#fff', padding: '5px 8px', fontSize: '12px', fontWeight: 600, textAlign: 'center', borderLeft: '1px solid #4a7ab5', whiteSpace: 'nowrap' },
  td: { padding: '3px 4px', fontSize: '12px', textAlign: 'center', borderLeft: '1px solid #d0e0f0', verticalAlign: 'middle' },
  tdI: { border: '1px solid #b0c8e0', borderRadius: '2px', padding: '2px 6px', fontSize: '12px', fontFamily: 'Cairo, Tahoma, sans-serif', width: '100%', outline: 'none', textAlign: 'right', background: '#fff' },
  tdN: { border: '1px solid #b0c8e0', borderRadius: '2px', padding: '2px 6px', fontSize: '12px', fontFamily: 'Cairo, Tahoma, sans-serif', width: '88px', outline: 'none', textAlign: 'left', background: '#fff' },
  tdS: { border: '1px solid #b0c8e0', borderRadius: '2px', padding: '2px 4px', fontSize: '11px', fontFamily: 'Cairo, Tahoma, sans-serif', width: '100%', outline: 'none', background: '#fff' },
  rowNum: { background: '#4a7ab5', color: '#fff', width: '24px', height: '24px', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, margin: 'auto' },
  btnPlus: { background: '#2c7a2c', color: '#fff', border: 'none', borderRadius: '3px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: '20px', textAlign: 'center' },
  btnMinus: { background: '#c0392b', color: '#fff', border: 'none', borderRadius: '3px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: '20px', textAlign: 'center' },
  totalBar: { background: 'linear-gradient(180deg,#5b8fc9,#2c5282)', padding: '6px 16px', display: 'flex', gap: '16px', alignItems: 'center', borderRadius: '4px', marginBottom: '8px' },
  totalLbl: { color: '#fff', fontSize: '13px', fontWeight: 600 },
  totalVal: { background: '#fff', color: '#1a365d', padding: '3px 20px', borderRadius: '3px', fontSize: '15px', fontWeight: 700, minWidth: '110px', textAlign: 'left' },
  btnBar: { display: 'flex', gap: '8px', padding: '8px 0' },
  btn: (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: '4px', padding: '7px 20px', cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: '13px', fontWeight: 700 }),
  alert: (t) => ({ padding: '8px 16px', borderRadius: '4px', marginBottom: '8px', fontSize: '13px', fontFamily: 'Cairo,sans-serif', background: t==='green'?'#dcfce7':'#fee2e2', color: t==='green'?'#166534':'#991b1b', border: `1px solid ${t==='green'?'#86efac':'#fca5a5'}` }),
};

export default function CustodyPage() {
  const [view, setView] = useState('list');
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const newLine = () => ({
    _key: Math.random().toString(36).slice(2),
    custody_name: '',     // العهدة
    amount: '',           // المبلغ
    file_code: '',        // رقم الملف (5 أرقام)
    account_id: '',       // رقم الحساب
    account_code: '',
    account_name: '',     // اسم الحساب (auto)
    discount_name: '',    // اسم الخصم (auto from file_code)
    auto_number: '',      // الرقم الآلي (auto)
    attachments: '',      // مكان المرفقات
    notes: '',
  });

  const emptyForm = () => ({
    record_date: new Date().toISOString().split('T')[0],
    record_number: '',
    branch: 'الإدارة',
    employee_id: '',
    description: '',
    lines: [newLine()],
  });

  const [form, setForm] = useState(emptyForm());

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [recRes, empRes, accRes] = await Promise.all([
      supabase.from('custody_employees').select('*, employees(full_name_ar)').order('created_at', { ascending: false }).limit(100),
      supabase.from('employees').select('id, full_name_ar').eq('is_active', true).order('full_name_ar'),
      supabase.from('accounts').select('id, account_code, name_ar').eq('is_active', true).order('account_code'),
    ]);
    if (recRes.data) setRecords(recRes.data);
    if (empRes.data) setEmployees(empRes.data);
    if (accRes.data) setAccounts(accRes.data);
    setLoading(false);
  }

  // البحث بكود الملف — يجلب الموكل + الخصم + الرقم الآلي
  async function lookupFileCode(key, code) {
    updateLine(key, { file_code: code, discount_name: '', auto_number: '' });
    if (code.length !== 5) return;
    const { data } = await supabase.from('customers').select('full_name_ar, discount_percentage, id').eq('file_code', code).single();
    if (data) updateLine(key, { discount_name: data.full_name_ar, auto_number: data.id?.slice(0,10) || '' });
  }

  function onAccCode(key, code) {
    const acc = accounts.find(a => a.account_code === code);
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key===key ? {...l, account_code:code, account_id:acc?.id||'', account_name:acc?.name_ar||''} : l) }));
  }

  function onAccSelect(key, id) {
    const acc = accounts.find(a => a.id === id);
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key===key ? {...l, account_id:id, account_code:acc?.account_code||'', account_name:acc?.name_ar||''} : l) }));
  }

  function updateLine(key, changes) {
    setForm(f => ({ ...f, lines: f.lines.map(l => l._key===key ? {...l,...changes} : l) }));
  }

  function addLineAfter(key) {
    setForm(f => {
      const idx = f.lines.findIndex(l => l._key===key);
      const lines = [...f.lines]; lines.splice(idx+1, 0, newLine());
      return { ...f, lines };
    });
  }

  function removeLine(key) {
    setForm(f => f.lines.length <= 1 ? f : { ...f, lines: f.lines.filter(l => l._key!==key) });
  }

  const totalAmount = form.lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

  async function handleSave() {
    setError('');
    if (!form.employee_id) return setError('اختر الموظف');
    if (!form.description.trim()) return setError('البيان مطلوب');
    const filled = form.lines.filter(l => l.custody_name.trim() && parseFloat(l.amount) > 0);
    if (filled.length < 1) return setError('يجب إدخال بند عهدة واحد على الأقل مع المبلغ');
    for (const l of filled) {
      if (!l.file_code || l.file_code.length !== 5) return setError(`رقم الملف (5 أرقام) مطلوب في كل سطر — السطر: "${l.custody_name}"`);
    }

    setSaving(true);
    for (const l of filled) {
      const { error: e } = await supabase.from('custody_employees').insert({
        employee_id: form.employee_id,
        item_id: null,
        file_code: l.file_code,
        amount: parseFloat(l.amount),
        currency: 'KWD',
        delivery_date: form.record_date,
        notes: l.notes || null,
        status: 'active',
        account_id: l.account_id || null,
        description: l.custody_name,
      });
      if (e) { setError(e.message); setSaving(false); return; }
    }

    setSuccess('تم حفظ العهدة بنجاح ✅');
    setSaving(false); setView('list'); setForm(emptyForm()); fetchAll();
    setTimeout(() => setSuccess(''), 4000);
  }

  async function returnRecord(id) {
    await supabase.from('custody_employees').update({ status: 'returned', actual_return_date: new Date().toISOString().split('T')[0] }).eq('id', id);
    fetchAll();
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.headerTitle}>🗃️ تسجيل عهدة موظف</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {view==='list'
            ? <button style={S.btn('#2c5282')} onClick={() => { setForm(emptyForm()); setError(''); setView('form'); }}>📝 عهدة جديدة</button>
            : <button style={S.btn('#7f8c8d')} onClick={() => setView('list')}>↩ القائمة</button>}
        </div>
      </div>
      <div style={S.body}>
        {success && <div style={S.alert('green')}>{success}</div>}
        {error && view==='list' && <div style={S.alert('red')}>{error}</div>}

        {view==='form' && (
          <div>
            {error && <div style={S.alert('red')}>⚠️ {error}</div>}

            <div style={S.card}>
              <div style={S.row}>
                <div style={S.fg}><span style={S.lbl}>رقم</span><input style={{...S.inp,background:'#b8d0e8',fontWeight:700}} readOnly placeholder="تلقائي" /></div>
                <div style={S.fg}><span style={S.lbl}>التاريخ</span><input style={S.inp} type="date" value={form.record_date} onChange={e => setForm({...form,record_date:e.target.value})} /></div>
                <div style={S.fg}><span style={S.lbl}>الفرع</span><select style={S.inp} value={form.branch} onChange={e => setForm({...form,branch:e.target.value})}><option>الإدارة</option><option>فرع 1</option></select></div>
              </div>
              <div style={S.row}>
                <div style={{...S.fg,flex:1}}>
                  <span style={S.lbl}>الموظف</span>
                  <select style={{...S.inp,minWidth:'220px'}} value={form.employee_id} onChange={e => setForm({...form,employee_id:e.target.value})}>
                    <option value="">-- اختر الموظف --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name_ar}</option>)}
                  </select>
                </div>
              </div>
              <div style={S.row}>
                <div style={{...S.fg,flex:1}}><span style={S.lbl}>البيان</span><input style={S.inpWide} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="بيان العهدة..." /></div>
              </div>
            </div>

            {/* جدول البنود */}
            <div style={S.tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(180deg,#5b6fa0,#2c3e7a)' }}>
                    <th style={{...S.th,width:'32px'}}>#</th>
                    <th style={{...S.th,minWidth:'160px'}}>العهدة</th>
                    <th style={{...S.th,width:'95px'}}>المبلغ</th>
                    <th style={{...S.th,width:'80px'}}>رقم الملف</th>
                    <th style={{...S.th,width:'90px'}}>رقم الحساب</th>
                    <th style={{...S.th,minWidth:'150px'}}>اسم الحساب</th>
                    <th style={{...S.th,minWidth:'140px'}}>اسم الخصم</th>
                    <th style={{...S.th,width:'100px'}}>الرقم الآلي</th>
                    <th style={{...S.th,minWidth:'130px'}}>مكان المرفقات</th>
                    <th style={{...S.th,width:'36px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => (
                    <React.Fragment key={line._key}>
                      <tr style={{ borderBottom: '1px solid #c8d8e8', background: '#fff' }}>
                        <td style={S.td}><div style={S.rowNum}>{idx+1}</div></td>
                        {/* العهدة */}
                        <td style={S.td}><input style={S.tdI} value={line.custody_name} onChange={e => updateLine(line._key, {custody_name:e.target.value})} placeholder="اسم العهدة..." /></td>
                        {/* المبلغ */}
                        <td style={S.td}><input style={S.tdN} type="number" step="0.001" min="0" value={line.amount} placeholder="0.000" onChange={e => updateLine(line._key, {amount:e.target.value})} /></td>
                        {/* رقم الملف (5 أرقام) — إلزامي */}
                        <td style={S.td}>
                          <input style={{...S.tdI,width:'72px',letterSpacing:'3px',fontWeight:700,textAlign:'center',background: line.file_code.length===5 ? '#e8f5e9' : '#fff8dc'}}
                            value={line.file_code}
                            onChange={e => lookupFileCode(line._key, e.target.value.replace(/\D/g,'').slice(0,5))}
                            placeholder="00000" maxLength={5} />
                        </td>
                        {/* رقم الحساب */}
                        <td style={S.td}>
                          <input style={{...S.tdI,width:'82px',background:'#eaf2fb'}} value={line.account_code} onChange={e => onAccCode(line._key, e.target.value)} placeholder="الكود" />
                        </td>
                        {/* اسم الحساب */}
                        <td style={S.td}>
                          <select style={S.tdS} value={line.account_id} onChange={e => onAccSelect(line._key, e.target.value)}>
                            <option value="">-- اختر --</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}
                          </select>
                        </td>
                        {/* اسم الخصم (auto) */}
                        <td style={S.td}><input style={{...S.tdI,background:'#f0f6fc'}} value={line.discount_name} readOnly placeholder="يُجلب تلقائياً" /></td>
                        {/* الرقم الآلي (auto) */}
                        <td style={S.td}><input style={{...S.tdI,width:'92px',background:'#f0f6fc',fontSize:'11px'}} value={line.auto_number} readOnly placeholder="تلقائي" /></td>
                        {/* مكان المرفقات */}
                        <td style={S.td}><input style={S.tdI} value={line.attachments} onChange={e => updateLine(line._key, {attachments:e.target.value})} placeholder="مسار المرفق..." /></td>
                        {/* + / - */}
                        <td style={{...S.td,width:'36px'}}>
                          <div style={{display:'flex',flexDirection:'column',gap:'2px',alignItems:'center'}}>
                            <button style={S.btnPlus} onClick={() => addLineAfter(line._key)}>+</button>
                            <button style={S.btnMinus} onClick={() => removeLine(line._key)}>−</button>
                          </div>
                        </td>
                      </tr>
                      {/* صف Doc / ملاحظات */}
                      <tr style={{ borderBottom: '2px solid #8aabcc', background: '#f0f6fc' }}>
                        <td style={{...S.td,background:'#4a7ab5',color:'#fff',fontWeight:700,fontSize:'11px'}}>ملاحظات</td>
                        <td colSpan={8} style={S.td}><input style={{...S.tdI,width:'99%'}} value={line.notes} onChange={e => updateLine(line._key, {notes:e.target.value})} placeholder="ملاحظات البند..." /></td>
                        <td style={S.td}></td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* الإجمالي */}
            <div style={S.totalBar}>
              <span style={S.totalLbl}>الإجمالي</span>
              <span style={S.totalVal}>{totalAmount.toFixed(3)}</span>
            </div>

            <div style={S.btnBar}>
              <button style={S.btn('#2c7a2c')} onClick={handleSave} disabled={saving}>💾 حفظ</button>
              <button style={S.btn('#7f8c8d')} onClick={() => setView('list')}>↩ رجوع</button>
              <button style={S.btn('#c0392b')} onClick={() => { setForm(emptyForm()); setError(''); }}>📄 جديد</button>
            </div>
          </div>
        )}

        {view==='list' && (
          <div>
            {loading ? <p style={{textAlign:'center',color:'#2c5282'}}>جارٍ التحميل...</p> : (
              <div style={{ background:'#fff', border:'1px solid #8aabcc', borderRadius:'4px', overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(180deg,#5b6fa0,#2c3e7a)', display:'flex', padding:'6px 12px', gap:'8px' }}>
                  {['الموظف','التاريخ','البيان','رقم الملف','المبلغ','الحالة','إجراءات'].map((h,i) => (
                    <span key={h} style={{color:'#fff',fontSize:'12px',fontWeight:600,flex:i===0||i===2?2:1}}>{h}</span>
                  ))}
                </div>
                {records.length===0
                  ? <div style={{textAlign:'center',padding:'24px',color:'#9ca3af'}}>لا توجد عهدات مسجلة</div>
                  : records.map(r => (
                    <div key={r.id} style={{display:'flex',padding:'5px 12px',borderBottom:'1px solid #e0eaf5',alignItems:'center',gap:'8px'}}>
                      <span style={{flex:2,fontSize:'13px',fontWeight:600}}>{r.employees?.full_name_ar||'—'}</span>
                      <span style={{flex:1,fontSize:'13px'}}>{r.delivery_date}</span>
                      <span style={{flex:2,fontSize:'13px'}}>{r.description}</span>
                      <span style={{flex:1,fontSize:'13px',fontWeight:700,letterSpacing:'3px',color:'#2c5282'}}>{r.file_code||'—'}</span>
                      <span style={{flex:1,fontSize:'13px',textAlign:'left',fontWeight:700}}>{Number(r.amount||0).toFixed(3)}</span>
                      <span style={{flex:1}}>
                        <span style={{background:r.status==='active'?'#dbeafe':'#dcfce7',color:r.status==='active'?'#1e40af':'#166534',padding:'2px 10px',borderRadius:'10px',fontSize:'12px'}}>
                          {r.status==='active'?'نشط':'مُرتجع'}
                        </span>
                      </span>
                      <span style={{flex:1}}>
                        {r.status==='active' && <button onClick={() => returnRecord(r.id)} style={{...S.btn('#10b981'),padding:'3px 12px',fontSize:'12px'}}>↩️ إرجاع</button>}
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
