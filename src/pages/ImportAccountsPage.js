import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

/* ═══════════════════════════════════
   نفس ستايل النظام الشامل
═══════════════════════════════════ */
const S = {
  page: { padding:'0', fontFamily:'Cairo,Tahoma,sans-serif', direction:'rtl', background:'#c8d8e8', minHeight:'100vh' },
  header: (bg) => ({ background:`linear-gradient(180deg,${bg} 0%,#1a365d 100%)`, color:'#fff', padding:'6px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'2px solid #1a365d' }),
  body: { padding:'12px 16px' },
  card: { background:'#dce8f5', border:'1px solid #8aabcc', borderRadius:'4px', padding:'12px 16px', marginBottom:'10px' },
  tabBtn: (active) => ({ background: active?'#2c5282':'#8aabcc', color:'#fff', border:'none', borderRadius:'4px 4px 0 0', padding:'8px 28px', cursor:'pointer', fontFamily:'Cairo,Tahoma,sans-serif', fontSize:'14px', fontWeight:700 }),
  btn: (bg) => ({ background:bg, color:'#fff', border:'none', borderRadius:'4px', padding:'7px 20px', cursor:'pointer', fontFamily:'Cairo,Tahoma,sans-serif', fontSize:'13px', fontWeight:700 }),
  alert: (t) => ({ padding:'8px 14px', borderRadius:'4px', marginBottom:'8px', fontSize:'13px', fontFamily:'Cairo,sans-serif', background:t==='green'?'#dcfce7':t==='yellow'?'#fef9c3':'#fee2e2', color:t==='green'?'#166534':t==='yellow'?'#92400e':'#991b1b' }),
  th: { background:'linear-gradient(180deg,#5b8fc9,#2c5282)', color:'#fff', padding:'6px 10px', fontSize:'12px', fontWeight:600, textAlign:'right', border:'1px solid #4a7ab5', whiteSpace:'nowrap' },
  td: { padding:'4px 10px', fontSize:'12px', textAlign:'right', border:'1px solid #d0e0f0', fontFamily:'Cairo,Tahoma,sans-serif' },
  progress: (pct) => ({ background:'#dce8f5', borderRadius:'4px', overflow:'hidden', height:'18px', marginBottom:'8px' }),
  progressBar: (pct,ok) => ({ background:ok?'#2c7a2c':'#2c5282', height:'100%', width:pct+'%', transition:'width 0.3s', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'11px', fontWeight:700 }),
  dropzone: { border:'2px dashed #4a7ab5', borderRadius:'8px', padding:'32px', textAlign:'center', background:'#f0f6fc', cursor:'pointer' },
  stat: (bg,color) => ({ background:bg, border:`1px solid ${color}30`, borderRadius:'8px', padding:'16px 28px', textAlign:'center', minWidth:'120px' }),
};

/* ══════════════════════════════════════════════════════
   HELPER: significant digits parent logic
══════════════════════════════════════════════════════ */
function significantDigits(code) {
  return code.replace(/0+$/, '') || code[0];
}

function findParentCode(code, codeSet) {
  const sig = significantDigits(code);
  let best = null;
  let bestLen = 0;
  for (const c of codeSet) {
    if (c === code) continue;
    const s = significantDigits(c);
    if (s.length < sig.length && sig.startsWith(s) && s.length > bestLen) {
      best = c;
      bestLen = s.length;
    }
  }
  return best;
}

function getAccountType(code) {
  const f = code[0];
  return { '1':'asset','2':'liability','3':'equity','4':'revenue','3':'expense' }[f] || 'asset';
}

function getBalanceType(code) {
  return ['1','3'].includes(code[0]) ? 'debit' : 'credit';
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function ImportPage() {
  const [activeTab, setActiveTab] = useState('accounts'); // accounts | costcenters

  return (
    <div style={S.page}>
      <div style={S.header('#4a7ab5')}>
        <span style={{ fontSize:'18px', fontWeight:700 }}>📥 استيراد البيانات</span>
      </div>
      <div style={{ display:'flex', padding:'8px 16px 0', gap:'4px', background:'#b0c8e0' }}>
        <button style={S.tabBtn(activeTab==='accounts')} onClick={() => setActiveTab('accounts')}>📊 شجرة الحسابات</button>
        <button style={S.tabBtn(activeTab==='costcenters')} onClick={() => setActiveTab('costcenters')}>📋 مراكز التكلفة الإضافية</button>
      </div>
      {activeTab==='accounts' && <AccountsImport />}
      {activeTab==='costcenters' && <CostCentersImport />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 1: استيراد شجرة الحسابات
   الأعمدة المتوقعة من الملف:
   col[13]=رقم الحساب | col[8]=اسم الحساب | col[7]=مدين | col[2]=دائن | col[1]=الرصيد
   (بنفس هيكل ملف "شجرة الحسابات بالأرصدة")
══════════════════════════════════════════════════════ */
function AccountsImport() {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const fileRef = useRef();

  const EXPECTED_COLS = {
    account_code: 13,  // آخر عمود (index 13)
    name_ar: 8,        // عمود 8
    debit: 7,          // عمود 7
    credit: 2,         // عمود 2
    balance: 1,        // عمود 1
  };

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMessage('');
    setErrors([]);

    // قراءة الملف كـ ArrayBuffer
    const buf = await file.arrayBuffer();
    try {
      // استخدام FileReader API بديل
      parseXLSX(buf, file.name);
    } catch(err) {
      setMessage('خطأ في قراءة الملف: ' + err.message);
    }
  }

  function parseXLSX(buf, filename) {
    // نرسل الملف للـ supabase edge function أو نقرأه client-side
    // لأننا في React browser — نستخدم SheetJS
    import(/* webpackIgnore: true */ 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs').then(XLSX => {
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      // إيجاد صف رؤوس الأعمدة
      let headerIdx = -1;
      for (let i = 0; i < Math.min(allRows.length, 15); i++) {
        const r = allRows[i];
        if (r && r.some(c => String(c||'').includes('رقم الحساب'))) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) {
        setMessage('❌ لم يُعثر على صف رؤوس الأعمدة — تأكد أن الملف يحتوي "رقم الحساب"');
        return;
      }

      // تحديد أعمدة فعلية من الرأس
      const headerRow = allRows[headerIdx];
      let colMap = {};
      headerRow.forEach((cell, idx) => {
        const v = String(cell||'').trim();
        if (v === 'رقم الحساب') colMap.account_code = idx;
        else if (v === 'اسم الحساب') colMap.name_ar = idx;
        else if (v === 'مدين') colMap.debit = idx;
        else if (v === 'دائن') colMap.credit = idx;
        else if (v === 'الرصيد') colMap.balance = idx;
      });

      // fallback للأعمدة الثابتة لو ما اتعرفوش
      if (!colMap.account_code) colMap = EXPECTED_COLS;

      const parsed = [];
      const errs = [];

      for (let i = headerIdx + 1; i < allRows.length; i++) {
        const row = allRows[i];
        if (!row || !row.some(c => c !== null)) continue;
        const code = String(row[colMap.account_code] || '').trim();
        const name = String(row[colMap.name_ar] || '').trim();
        if (!code || !/^\d+$/.test(code)) continue;
        if (!name) { errs.push(`سطر ${i+1}: اسم الحساب فارغ للكود ${code}`); continue; }

        parsed.push({
          account_code: code,
          name_ar: name,
          debit_balance: parseFloat(row[colMap.debit] || 0),
          credit_balance: parseFloat(row[colMap.credit] || 0),
          opening_balance: parseFloat(row[colMap.balance] || 0),
        });
      }

      setErrors(errs);
      setRows(parsed);
      if (parsed.length > 0) setStep(2);
      else setMessage('لم يتم استخراج أي حسابات صالحة');
    });
  }

  async function handleImport() {
    setImporting(true);
    setProgress(0);

    // بناء code_set للـ parent logic
    const codeSet = new Set(rows.map(r => r.account_code));

    // جلب الحسابات الموجودة
    const { data: existing } = await supabase.from('accounts').select('id, account_code');
    const codeToId = {};
    (existing || []).forEach(a => { codeToId[a.account_code] = a.id; });

    let inserted = 0, skipped = 0, failed = 0;
    const failedRows = [];

    // الرفع على مراحل حسب المستوى (من الأعلى للأسفل)
    const sorted = [...rows].sort((a, b) => {
      const sigA = significantDigits(a.account_code).length;
      const sigB = significantDigits(b.account_code).length;
      return sigA - sigB;
    });

    const BATCH = 50;
    for (let i = 0; i < sorted.length; i += BATCH) {
      const batch = sorted.slice(i, i + BATCH);
      setProgress(Math.round((i / sorted.length) * 100));

      for (const r of batch) {
        if (codeToId[r.account_code]) { skipped++; continue; }

        const parentCode = findParentCode(r.account_code, codeSet);
        const parentId = parentCode ? (codeToId[parentCode] || null) : null;
        const level = significantDigits(r.account_code).length - 1; // 1-based

        const { data: ins, error } = await supabase.from('accounts').insert({
          account_code: r.account_code,
          name_ar: r.name_ar,
          account_type: getAccountType(r.account_code),
          balance_type: getBalanceType(r.account_code),
          parent_id: parentId,
          level: level,
          is_active: true,
          allow_posting: !rows.some(x => findParentCode(x.account_code, codeSet) === r.account_code),
          opening_balance: r.opening_balance || 0,
          currency: 'KWD',
        }).select('id').single();

        if (error) {
          failed++;
          failedRows.push({ code: r.account_code, name: r.name_ar, error: error.message });
        } else {
          codeToId[r.account_code] = ins.id;
          inserted++;
        }
      }
    }

    setProgress(100);
    setResult({ inserted, skipped, failed, failedRows });
    setImporting(false);
    setStep(3);
  }

  return (
    <div style={S.body}>
      {/* خطوات */}
      <StepIndicator step={step} steps={['رفع الملف','مراجعة البيانات','النتيجة']} />

      {step===1 && (
        <div style={S.card}>
          {message && <div style={S.alert('red')}>{message}</div>}
          <h3 style={{ margin:'0 0 12px', color:'#1a365d', fontSize:'15px' }}>متطلبات الملف</h3>

          {/* جدول الأعمدة المتوقعة */}
          <div style={{ overflowX:'auto', marginBottom:'14px' }}>
            <table style={{ borderCollapse:'collapse', fontSize:'12px', width:'100%' }}>
              <thead>
                <tr>
                  {['العمود','الاسم','مطلوب؟','مثال'].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ['رقم الحساب','account_code','✅','1103011'],
                  ['اسم الحساب','name_ar','✅','احمد شوقي حسن المسلمي'],
                  ['مدين','debit','اختياري','1203478.769'],
                  ['دائن','credit','اختياري','220761.013'],
                  ['الرصيد','balance','اختياري','982717.756'],
                ].map(r => (
                  <tr key={r[0]}>
                    <td style={{...S.td,fontWeight:700,color:'#2c5282'}}>{r[0]}</td>
                    <td style={{...S.td,fontFamily:'monospace'}}>{r[1]}</td>
                    <td style={{...S.td,textAlign:'center'}}>{r[2]}</td>
                    <td style={{...S.td,color:'#6b7280'}}>{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'4px', padding:'10px', marginBottom:'14px', fontSize:'12px' }}>
            <strong>⚠️ ملاحظة:</strong> النظام يقرأ الملف <strong>بنفس هيكل ملف "شجرة الحسابات بالأرصدة"</strong> — رقم الحساب في العمود الأخير، اسم الحساب في العمود التاسع.
            الـ parent يُحسب تلقائياً من الكود.
          </div>

          <div
            style={S.dropzone}
            onClick={() => fileRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){fileRef.current.files=e.dataTransfer.files; handleFile({target:{files:[f]}}); } }}
          >
            <div style={{ fontSize:'40px', marginBottom:'8px' }}>📊</div>
            <p style={{ margin:0, fontSize:'14px', color:'#2c5282', fontWeight:600 }}>اسحب ملف Excel هنا أو اضغط للاختيار</p>
            <p style={{ margin:'4px 0 0', fontSize:'12px', color:'#6b7280' }}>xlsx فقط</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display:'none' }} onChange={handleFile} />
        </div>
      )}

      {step===2 && (
        <div>
          {errors.length > 0 && (
            <div style={S.alert('yellow')}>
              ⚠️ {errors.length} تحذير — {errors.slice(0,3).join(' | ')}
              {errors.length > 3 && ` ... و ${errors.length-3} أخرى`}
            </div>
          )}
          <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom:'10px' }}>
            <span style={{ fontWeight:700, color:'#1a365d' }}>✅ {rows.length} حساب جاهز للرفع</span>
            <button style={S.btn('#2c7a2c')} onClick={handleImport} disabled={importing}>
              {importing ? `جارٍ الرفع... ${progress}%` : '🚀 ابدأ الرفع'}
            </button>
            <button style={S.btn('#8aabcc')} onClick={() => {setStep(1);setRows([]);}} disabled={importing}>← رجوع</button>
          </div>
          {importing && (
            <div style={S.progress()}>
              <div style={S.progressBar(progress, false)}>{progress}%</div>
            </div>
          )}
          <PreviewTable rows={rows.slice(0,100)} cols={[
            {key:'account_code', label:'رقم الحساب'},
            {key:'name_ar', label:'اسم الحساب'},
            {key:'opening_balance', label:'الرصيد'},
          ]} total={rows.length} />
        </div>
      )}

      {step===3 && result && (
        <ResultCard result={result} onReset={() => {setStep(1);setRows([]);setErrors([]);setResult(null);}} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TAB 2: استيراد مراكز التكلفة الإضافية
   الأعمدة من الملف (بنفس الهيكل):
   0=رقم الملف | 1=الاسم | 2=الاسم الإنجليزي | 3=الرقم الآلي
   4=اسم المحامي | 5=رقم القضية | 6=نوع القضية
   7=رقم الحساب | 8=اسم الموكل | 9=رقم المرجع | 10=الملاحظات
══════════════════════════════════════════════════════ */
function CostCentersImport() {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const fileRef = useRef();

  const COLS = [
    { idx:0, key:'file_code', label:'رقم الملف', required:true },
    { idx:1, key:'name_ar', label:'الاسم', required:true },
    { idx:2, key:'name_en', label:'الاسم الإنجليزي', required:false },
    { idx:3, key:'auto_number', label:'الرقم الآلي', required:false },
    { idx:4, key:'lawyer_name', label:'اسم المحامي', required:false },
    { idx:5, key:'case_number', label:'رقم القضية', required:false },
    { idx:6, key:'case_type', label:'نوع القضية', required:false },
    { idx:7, key:'account_code', label:'رقم الحساب', required:false },
    { idx:8, key:'client_name', label:'اسم الموكل', required:false },
    { idx:9, key:'ref_number', label:'رقم المرجع', required:false },
    { idx:10, key:'notes', label:'الملاحظات', required:false },
  ];

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMessage(''); setErrors([]);
    const buf = await file.arrayBuffer();

    import(/* webpackIgnore: true */ 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs').then(XLSX => {
      const wb = XLSX.read(buf, { type:'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const allRows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });

      // إيجاد صف رؤوس الأعمدة
      let headerIdx = 0;
      for (let i = 0; i < Math.min(allRows.length, 5); i++) {
        const r = allRows[i];
        if (r && r.some(c => String(c||'').includes('رقم الملف'))) {
          headerIdx = i; break;
        }
      }

      // بناء خريطة الأعمدة من الرأس
      const headerRow = allRows[headerIdx] || [];
      const colMap = {};
      COLS.forEach(col => {
        const idx = headerRow.findIndex(h => String(h||'').trim() === col.label);
        colMap[col.key] = idx >= 0 ? idx : col.idx; // fallback للـ index الثابت
      });

      const parsed = [];
      const errs = [];

      for (let i = headerIdx+1; i < allRows.length; i++) {
        const row = allRows[i];
        if (!row || !row.some(c => c !== null)) continue;
        const fileCode = row[colMap.file_code];
        const nameAr = String(row[colMap.name_ar] || '').trim();
        if (!fileCode && !nameAr) continue;
        if (!fileCode) { errs.push(`سطر ${i+1}: رقم الملف فارغ`); continue; }

        parsed.push({
          file_code: String(fileCode).trim(),
          name_ar: nameAr,
          name_en: String(row[colMap.name_en] || '').trim() || null,
          auto_number: row[colMap.auto_number] ? String(row[colMap.auto_number]).trim() : null,
          lawyer_name: row[colMap.lawyer_name] ? String(row[colMap.lawyer_name]).trim() : null,
          case_number: row[colMap.case_number] ? String(row[colMap.case_number]).trim() : null,
          case_type: row[colMap.case_type] ? String(row[colMap.case_type]).trim() : null,
          account_code: row[colMap.account_code] ? String(row[colMap.account_code]).trim() : null,
          client_name: row[colMap.client_name] ? String(row[colMap.client_name]).trim() : null,
          ref_number: row[colMap.ref_number] ? String(row[colMap.ref_number]).trim() : null,
          notes: row[colMap.notes] ? String(row[colMap.notes]).trim() : null,
        });
      }

      setErrors(errs);
      setRows(parsed);
      if (parsed.length > 0) setStep(2);
      else setMessage('لم يتم استخراج أي سجلات صالحة');
    });
  }

  async function handleImport() {
    setImporting(true);
    setProgress(0);

    // جلب الموجود مسبقاً
    const { data: existing } = await supabase.from('additional_cost_centers').select('file_code');
    const existingCodes = new Set((existing||[]).map(r => String(r.file_code)));

    // جلب account_id map
    const { data: accounts } = await supabase.from('accounts').select('id, account_code');
    const accMap = {};
    (accounts||[]).forEach(a => { accMap[a.account_code] = a.id; });

    let inserted=0, skipped=0, failed=0;
    const failedRows=[];
    const BATCH = 100;

    for (let i=0; i<rows.length; i+=BATCH) {
      setProgress(Math.round((i/rows.length)*100));
      const batch = rows.slice(i, i+BATCH);
      const toInsert = [];

      for (const r of batch) {
        if (existingCodes.has(r.file_code)) { skipped++; continue; }
        const accCode = r.account_code ? r.account_code.trim() : null;
        toInsert.push({
          file_code: r.file_code,
          name_ar: r.name_ar,
          name_en: r.name_en,
          auto_number: r.auto_number,
          lawyer_name: r.lawyer_name,
          case_number: r.case_number,
          case_type: r.case_type,
          account_id: accCode ? (accMap[accCode] || null) : null,
          account_code: accCode,
          client_name: r.client_name,
          ref_number: r.ref_number,
          notes: r.notes,
          is_active: true,
        });
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('additional_cost_centers').insert(toInsert);
        if (error) {
          failed += toInsert.length;
          failedRows.push(error.message);
        } else {
          inserted += toInsert.length;
          toInsert.forEach(r => existingCodes.add(r.file_code));
        }
      }
    }

    setProgress(100);
    setResult({ inserted, skipped, failed, failedRows });
    setImporting(false);
    setStep(3);
  }

  return (
    <div style={S.body}>
      <StepIndicator step={step} steps={['رفع الملف','مراجعة البيانات','النتيجة']} />

      {step===1 && (
        <div style={S.card}>
          {message && <div style={S.alert('red')}>{message}</div>}
          <h3 style={{ margin:'0 0 12px', color:'#1a365d', fontSize:'15px' }}>هيكل ملف مراكز التكلفة الإضافية</h3>

          <div style={{ overflowX:'auto', marginBottom:'14px' }}>
            <table style={{ borderCollapse:'collapse', fontSize:'12px', width:'100%' }}>
              <thead>
                <tr>{['العمود','المفتاح','مطلوب؟','مثال'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {COLS.map(col => (
                  <tr key={col.key}>
                    <td style={{...S.td,fontWeight:700,color:'#2c5282'}}>{col.label}</td>
                    <td style={{...S.td,fontFamily:'monospace',fontSize:'11px'}}>{col.key}</td>
                    <td style={{...S.td,textAlign:'center'}}>{col.required?'✅':'—'}</td>
                    <td style={{...S.td,color:'#6b7280',fontSize:'11px'}}>
                      {col.key==='file_code'?'12345':col.key==='name_ar'?'حسن حسين':col.key==='account_code'?'110301539':col.key==='client_name'?'سندس القطان':''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'4px', padding:'10px', marginBottom:'14px', fontSize:'12px' }}>
            <strong>⚠️ مهم:</strong> رقم الملف = رقم مركز التكلفة الإضافي = يُستخدم في القيود والسندات لجلب بيانات الموكل تلقائياً.
          </div>

          <div
            style={S.dropzone}
            onClick={() => fileRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){fileRef.current.files=e.dataTransfer.files; handleFile({target:{files:[f]}}); } }}
          >
            <div style={{ fontSize:'40px', marginBottom:'8px' }}>📋</div>
            <p style={{ margin:0, fontSize:'14px', color:'#2c5282', fontWeight:600 }}>اسحب ملف Excel هنا أو اضغط للاختيار</p>
            <p style={{ margin:'4px 0 0', fontSize:'12px', color:'#6b7280' }}>xlsx أو xls</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleFile} />
        </div>
      )}

      {step===2 && (
        <div>
          {errors.length > 0 && (
            <div style={S.alert('yellow')}>⚠️ {errors.length} تحذير — {errors.slice(0,3).join(' | ')}</div>
          )}
          <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom:'10px' }}>
            <span style={{ fontWeight:700, color:'#1a365d' }}>✅ {rows.length} سجل جاهز للرفع</span>
            <button style={S.btn('#2c7a2c')} onClick={handleImport} disabled={importing}>
              {importing ? `جارٍ الرفع... ${progress}%` : '🚀 ابدأ الرفع'}
            </button>
            <button style={S.btn('#8aabcc')} onClick={() => {setStep(1);setRows([]);}} disabled={importing}>← رجوع</button>
          </div>
          {importing && (
            <div style={S.progress()}>
              <div style={S.progressBar(progress, false)}>{progress}%</div>
            </div>
          )}
          <PreviewTable rows={rows.slice(0,100)} cols={[
            {key:'file_code', label:'رقم الملف'},
            {key:'name_ar', label:'الاسم'},
            {key:'account_code', label:'رقم الحساب'},
            {key:'client_name', label:'اسم الموكل'},
            {key:'case_number', label:'رقم القضية'},
            {key:'case_type', label:'نوع القضية'},
          ]} total={rows.length} />
        </div>
      )}

      {step===3 && result && (
        <ResultCard result={result} onReset={() => {setStep(1);setRows([]);setErrors([]);setResult(null);}} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════════════════ */
function StepIndicator({ step, steps }) {
  return (
    <div style={{ display:'flex', gap:'0', marginBottom:'12px', alignItems:'center' }}>
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ background: step > i+1 ? '#2c7a2c' : step===i+1 ? '#2c5282' : '#8aabcc', color:'#fff', width:'26px', height:'26px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, flexShrink:0 }}>
              {step > i+1 ? '✓' : i+1}
            </div>
            <span style={{ fontSize:'13px', fontWeight: step===i+1 ? 700 : 400, color: step>=i+1 ? '#1a365d' : '#6b7280', whiteSpace:'nowrap' }}>{label}</span>
          </div>
          {i < steps.length-1 && <span style={{ color:'#8aabcc', margin:'0 8px', fontSize:'16px' }}>◄</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

function PreviewTable({ rows, cols, total }) {
  return (
    <div>
      {total > 100 && <div style={S.alert('yellow')}>عرض أول 100 سجل فقط من إجمالي {total}</div>}
      <div style={{ overflowX:'auto', border:'1px solid #8aabcc', borderRadius:'4px' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', background:'#fff' }}>
          <thead>
            <tr>{['#',...cols.map(c=>c.label)].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i%2===0 ? '#fff' : '#f8fafc', borderBottom:'1px solid #e0eaf5' }}>
                <td style={{...S.td, textAlign:'center', color:'#9ca3af', width:'32px'}}>{i+1}</td>
                {cols.map(c => (
                  <td key={c.key} style={{ ...S.td, fontWeight: c.key==='file_code'||c.key==='account_code' ? 700 : 400, color: c.key==='file_code' ? '#2c5282' : '#374151', fontFamily: c.key==='account_code'||c.key==='file_code' ? 'monospace' : 'inherit' }}>
                    {r[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultCard({ result, onReset }) {
  return (
    <div style={S.card}>
      <h3 style={{ margin:'0 0 16px', textAlign:'center', color:'#1a365d' }}>✅ اكتمل الرفع</h3>
      <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap', marginBottom:'16px' }}>
        <div style={S.stat('#dcfce7','#166534')}>
          <div style={{ fontSize:'32px', fontWeight:700, color:'#166534' }}>{result.inserted}</div>
          <div style={{ fontSize:'12px', color:'#166534', fontWeight:600 }}>تم إدراجها</div>
        </div>
        <div style={S.stat('#fef9c3','#92400e')}>
          <div style={{ fontSize:'32px', fontWeight:700, color:'#92400e' }}>{result.skipped}</div>
          <div style={{ fontSize:'12px', color:'#92400e', fontWeight:600 }}>موجودة مسبقاً</div>
        </div>
        <div style={S.stat('#fee2e2','#991b1b')}>
          <div style={{ fontSize:'32px', fontWeight:700, color:'#991b1b' }}>{result.failed}</div>
          <div style={{ fontSize:'12px', color:'#991b1b', fontWeight:600 }}>فشل</div>
        </div>
      </div>
      {result.failedRows?.length > 0 && (
        <div style={S.alert('red')}>
          <strong>أخطاء:</strong>
          <ul style={{ margin:'4px 0 0', paddingRight:'16px', fontSize:'11px' }}>
            {result.failedRows.slice(0,5).map((e,i)=><li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
      <div style={{ textAlign:'center' }}>
        <button style={S.btn('#2c5282')} onClick={onReset}>رفع ملف آخر</button>
      </div>
    </div>
  );
}
