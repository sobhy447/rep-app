import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

/*
  صفحة رفع شجرة الحسابات من Excel/CSV
  الأعمدة المطلوبة في الملف:
    account_code | name_ar | account_type | parent_code | level | is_active
  مثال:
    1            | الأصول          | asset    |             | 1 | true
    11           | الأصول المتداولة | asset   | 1           | 2 | true
    1101         | الصندوق         | asset    | 11          | 3 | true
*/

const S = {
  page: { padding: '0', fontFamily: 'Cairo, Tahoma, sans-serif', direction: 'rtl', background: '#c8d8e8', minHeight: '100vh' },
  header: { background: 'linear-gradient(180deg,#4a7ab5,#2c5282)', color: '#fff', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  body: { padding: '16px' },
  card: { background: '#dce8f5', border: '1px solid #8aabcc', borderRadius: '4px', padding: '16px', marginBottom: '12px' },
  btn: (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 22px', cursor: 'pointer', fontFamily: 'Cairo,Tahoma,sans-serif', fontSize: '13px', fontWeight: 700 }),
  alert: (t) => ({ padding: '10px 16px', borderRadius: '4px', marginBottom: '10px', fontSize: '13px', fontFamily: 'Cairo,sans-serif', background: t==='green'?'#dcfce7':t==='yellow'?'#fef9c3':'#fee2e2', color: t==='green'?'#166534':t==='yellow'?'#92400e':'#991b1b' }),
  th: { background: '#2c5282', color: '#fff', padding: '6px 12px', fontSize: '12px', fontWeight: 600, textAlign: 'right', border: '1px solid #4a7ab5' },
  td: { padding: '5px 12px', fontSize: '12px', textAlign: 'right', border: '1px solid #d0e0f0', fontFamily: 'Cairo,Tahoma,sans-serif' },
};

export default function ImportAccountsPage() {
  const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=done
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState({ inserted: 0, skipped: 0, failed: 0 });
  const [message, setMessage] = useState('');
  const fileRef = useRef();

  /* ── تحليل الملف ── */
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'txt'].includes(ext)) {
      setMessage('❌ يرجى رفع ملف CSV فقط. لتحويل Excel: احفظ كـ CSV (UTF-8)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target.result);
    reader.readAsText(file, 'utf-8');
  }

  function parseCSV(text) {
    setErrors([]);
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { setMessage('الملف فارغ أو لا يحتوي بيانات'); return; }

    // استخراج رؤوس الأعمدة
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase());
    const required = ['account_code', 'name_ar'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) { setMessage('❌ الأعمدة المطلوبة غير موجودة: ' + missing.join(', ')); return; }

    const parsed = [];
    const errs = [];

    lines.slice(1).forEach((line, i) => {
      if (!line.trim()) return;
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });

      // التحقق
      if (!row.account_code) { errs.push(`سطر ${i+2}: كود الحساب فارغ`); return; }
      if (!row.name_ar) { errs.push(`سطر ${i+2}: اسم الحساب فارغ`); return; }

      parsed.push({
        account_code: row.account_code.trim(),
        name_ar: row.name_ar.trim(),
        name_en: row.name_en || '',
        account_type: row.account_type || 'asset',
        parent_code: row.parent_code || null,
        level: parseInt(row.level) || detectLevel(row.account_code),
        is_active: row.is_active !== 'false',
        allow_posting: row.allow_posting !== 'false',
        balance_type: row.balance_type || detectBalanceType(row.account_type),
        currency: row.currency || 'KWD',
        notes: row.notes || '',
      });
    });

    setErrors(errs);
    setRows(parsed);
    if (parsed.length > 0) setStep(2);
    else setMessage('لم يتم استخراج أي صفوف صالحة');
  }

  function detectLevel(code) {
    if (code.length <= 1) return 1;
    if (code.length <= 2) return 2;
    if (code.length <= 4) return 3;
    if (code.length <= 6) return 4;
    return 5;
  }

  function detectBalanceType(type) {
    return ['asset','expense'].includes(type) ? 'debit' : 'credit';
  }

  async function handleImport() {
    setImporting(true);
    setProgress(0);
    let inserted = 0, skipped = 0, failed = 0;

    // أولاً: بناء خريطة parent_code → id
    const { data: existing } = await supabase.from('accounts').select('id, account_code');
    const codeMap = {};
    (existing || []).forEach(a => { codeMap[a.account_code] = a.id; });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setProgress(Math.round((i / rows.length) * 100));

      // تحقق من التكرار
      if (codeMap[row.account_code]) { skipped++; continue; }

      // إيجاد parent_id
      let parent_id = null;
      if (row.parent_code && codeMap[row.parent_code]) {
        parent_id = codeMap[row.parent_code];
      }

      const { data: inserted_row, error } = await supabase.from('accounts').insert({
        account_code: row.account_code,
        name_ar: row.name_ar,
        name_en: row.name_en || null,
        account_type: row.account_type,
        parent_id: parent_id,
        level: row.level,
        is_active: row.is_active,
        allow_posting: row.allow_posting,
        balance_type: row.balance_type,
        currency: row.currency,
        notes: row.notes || null,
      }).select('id').single();

      if (error) { failed++; }
      else { codeMap[row.account_code] = inserted_row.id; inserted++; }
    }

    setProgress(100);
    setResult({ inserted, skipped, failed });
    setImporting(false);
    setStep(3);
  }

  const typeLabel = { asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات' };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={{ fontSize: '18px', fontWeight: 700 }}>📥 رفع شجرة الحسابات</span>
        {step === 2 && <span style={{ fontSize: '13px' }}>{rows.length} سطر جاهز للرفع</span>}
      </div>

      <div style={S.body}>
        {/* خطوات */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '16px' }}>
          {[{ n:1, label:'رفع الملف' }, { n:2, label:'مراجعة البيانات' }, { n:3, label:'النتيجة' }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: step >= s.n ? '#2c5282' : '#8aabcc', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>{s.n}</div>
              <span style={{ margin: '0 6px', fontSize: '13px', fontWeight: step === s.n ? 700 : 400, color: step >= s.n ? '#1a365d' : '#6b7280' }}>{s.label}</span>
              {i < 2 && <span style={{ color: '#8aabcc', margin: '0 4px' }}>◄</span>}
            </div>
          ))}
        </div>

        {/* STEP 1: رفع */}
        {step === 1 && (
          <div>
            {message && <div style={S.alert('red')}>{message}</div>}
            <div style={S.card}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1a365d' }}>متطلبات ملف CSV</h3>
              <div style={{ background: '#fff', border: '1px solid #8aabcc', borderRadius: '4px', padding: '12px', marginBottom: '12px', fontSize: '13px' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700 }}>الأعمدة المطلوبة (الترتيب مهم إذا بدون رؤوس):</p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={S.th}>اسم العمود</th><th style={S.th}>مطلوب؟</th><th style={S.th}>مثال</th><th style={S.th}>ملاحظة</th></tr></thead>
                  <tbody>
                    {[
                      ['account_code','✅ نعم','1101','كود الحساب - أرقام فقط'],
                      ['name_ar','✅ نعم','الصندوق النقدي','الاسم بالعربي'],
                      ['account_type','اختياري','asset','asset/liability/equity/revenue/expense'],
                      ['parent_code','اختياري','11','كود الحساب الأب'],
                      ['level','اختياري','3','يُحسب تلقائياً من طول الكود'],
                      ['name_en','اختياري','Cash','الاسم بالإنجليزي'],
                      ['is_active','اختياري','true','true/false'],
                      ['allow_posting','اختياري','true','السماح بالترحيل'],
                    ].map(r => (
                      <tr key={r[0]}><td style={S.td}><code style={{background:'#f0f6fc',padding:'1px 4px',borderRadius:'2px'}}>{r[0]}</code></td><td style={{...S.td,textAlign:'center'}}>{r[1]}</td><td style={S.td}>{r[2]}</td><td style={S.td}>{r[3]}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* نموذج CSV للتحميل */}
              <div style={{ marginBottom: '16px' }}>
                <button style={S.btn('#2c7a2c')} onClick={() => {
                  const csv = 'account_code,name_ar,account_type,parent_code,level,is_active,allow_posting\n1,الأصول,asset,,1,true,false\n11,الأصول المتداولة,asset,1,2,true,false\n1101,الصندوق النقدي,asset,11,3,true,true\n1102,البنك,asset,11,3,true,true\n2,الخصوم,liability,,1,true,false\n3,حقوق الملكية,equity,,1,true,false\n4,الإيرادات,revenue,,1,true,false\n5,المصروفات,expense,,1,true,false\n';
                  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chart_of_accounts_template.csv'; a.click();
                }}>⬇️ تحميل نموذج CSV</button>
              </div>

              <div style={{ border: '2px dashed #4a7ab5', borderRadius: '8px', padding: '32px', textAlign: 'center', background: '#f0f6fc', cursor: 'pointer' }}
                onClick={() => fileRef.current.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f){ fileRef.current.files = e.dataTransfer.files; handleFile({target:{files:[f]}}); } }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>📄</div>
                <p style={{ margin: 0, fontSize: '14px', color: '#2c5282', fontWeight: 600 }}>اسحب ملف CSV هنا أو اضغط للاختيار</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>CSV فقط — يمكن تصدير Excel كـ CSV بسهولة</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
            </div>
          </div>
        )}

        {/* STEP 2: مراجعة */}
        {step === 2 && (
          <div>
            {errors.length > 0 && (
              <div style={S.alert('yellow')}>
                <strong>⚠️ تحذيرات ({errors.length}):</strong>
                <ul style={{ margin: '4px 0 0', paddingRight: '20px', fontSize: '12px' }}>
                  {errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                  {errors.length > 10 && <li>... و {errors.length - 10} أخرى</li>}
                </ul>
              </div>
            )}
            <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a365d' }}>إجمالي السطور الجاهزة: {rows.length}</span>
              <button style={S.btn('#2c7a2c')} onClick={handleImport} disabled={importing}>
                {importing ? `جارٍ الرفع... ${progress}%` : '🚀 ابدأ الرفع'}
              </button>
              <button style={S.btn('#8aabcc')} onClick={() => { setStep(1); setRows([]); setErrors([]); }}>← رجوع</button>
            </div>
            {importing && (
              <div style={{ background: '#dce8f5', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px', height: '14px' }}>
                <div style={{ background: '#2c5282', height: '100%', width: progress + '%', transition: 'width 0.3s' }}></div>
              </div>
            )}
            <div style={{ overflowX: 'auto', border: '1px solid #8aabcc', borderRadius: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                <thead>
                  <tr>
                    {['#','كود الحساب','الاسم العربي','النوع','الكود الأب','المستوى','نشط','ترحيل'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e0eaf5', background: i%2===0?'#fff':'#f8fafc' }}>
                      <td style={{...S.td,textAlign:'center',color:'#9ca3af'}}>{i+1}</td>
                      <td style={{...S.td,fontWeight:700,color:'#2c5282',fontFamily:'monospace'}}>{r.account_code}</td>
                      <td style={S.td}>{r.name_ar}</td>
                      <td style={{...S.td,textAlign:'center'}}><span style={{background:'#dbeafe',color:'#1e40af',padding:'1px 6px',borderRadius:'8px',fontSize:'11px'}}>{typeLabel[r.account_type]||r.account_type}</span></td>
                      <td style={{...S.td,textAlign:'center',fontFamily:'monospace'}}>{r.parent_code||'—'}</td>
                      <td style={{...S.td,textAlign:'center'}}>{r.level}</td>
                      <td style={{...S.td,textAlign:'center'}}>{r.is_active?'✅':'❌'}</td>
                      <td style={{...S.td,textAlign:'center'}}>{r.allow_posting?'✅':'❌'}</td>
                    </tr>
                  ))}
                  {rows.length > 200 && <tr><td colSpan={8} style={{...S.td,textAlign:'center',color:'#6b7280'}}>... و {rows.length-200} سطر إضافي</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 3: النتيجة */}
        {step === 3 && (
          <div style={S.card}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#1a365d', textAlign: 'center' }}>✅ اكتمل الرفع</h3>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'تم إدراجها', value: result.inserted, color: '#dcfce7', text: '#166534' },
                { label: 'موجودة مسبقاً', value: result.skipped, color: '#fef9c3', text: '#92400e' },
                { label: 'فشل في الرفع', value: result.failed, color: '#fee2e2', text: '#991b1b' },
              ].map(s => (
                <div key={s.label} style={{ background: s.color, border: `1px solid ${s.text}30`, borderRadius: '8px', padding: '16px 32px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: s.text }}>{s.value}</div>
                  <div style={{ fontSize: '13px', color: s.text, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button style={S.btn('#2c5282')} onClick={() => { setStep(1); setRows([]); setErrors([]); setResult({inserted:0,skipped:0,failed:0}); }}>رفع ملف آخر</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
