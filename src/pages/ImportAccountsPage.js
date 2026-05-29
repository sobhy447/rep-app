import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ─── منطق الـ Parent (Significant Digits) ───────────────────────────────────
function significantDigits(code) {
  return code.replace(/0+$/, '') || code[0];
}

function buildParentMap(codes) {
  // يبني map: code → parentCode بدون أي طلب من الشبكة
  const codeSet = new Set(codes);
  const parentMap = {};
  for (const code of codes) {
    const sig = significantDigits(code);
    let best = null, bestLen = 0;
    for (const c of codeSet) {
      if (c === code) continue;
      const s = significantDigits(c);
      if (s.length < sig.length && sig.startsWith(s) && s.length > bestLen) {
        best = c; bestLen = s.length;
      }
    }
    parentMap[code] = best; // null = لا يوجد parent
  }
  return parentMap;
}

function getAccountType(code) {
  const first = String(code)[0];
  if (first === '1') return 'asset';
  if (first === '2') return 'liability';
  if (first === '3') return 'expense';
  if (first === '4') return 'revenue';
  return 'asset';
}

function getBalanceType(code) {
  const first = String(code)[0];
  return (first === '1' || first === '3') ? 'debit' : 'credit';
}

// ─── الكومبوننت ───────────────────────────────────────────────────────────────
export default function ImportAccountsPage() {
  const [activeTab, setActiveTab] = useState('accounts');

  // شجرة الحسابات
  const [accFile, setAccFile] = useState(null);
  const [accPreview, setAccPreview] = useState([]);
  const [accStatus, setAccStatus] = useState('');
  const [accRunning, setAccRunning] = useState(false);
  const [accProgress, setAccProgress] = useState(0);
  const [accTotal, setAccTotal] = useState(0);
  const [accResult, setAccResult] = useState(null);

  // مراكز التكلفة الإضافية
  const [ccFile, setCcFile] = useState(null);
  const [ccPreview, setCcPreview] = useState([]);
  const [ccStatus, setCcStatus] = useState('');
  const [ccRunning, setCcRunning] = useState(false);
  const [ccProgress, setCcProgress] = useState(0);
  const [ccTotal, setCcTotal] = useState(0);
  const [ccResult, setCcResult] = useState(null);

  const accFileRef = useRef();
  const ccFileRef = useRef();

  // ─── قراءة ملف شجرة الحسابات ──────────────────────────────────────────────
  const handleAccFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAccFile(file);
    setAccPreview([]);
    setAccResult(null);
    setAccStatus('جارٍ قراءة الملف...');

    import(/* webpackIgnore: true */ 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs').then(XLSX => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          // إيجاد صف الرؤوس
          let headerRow = -1;
          for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const r = rows[i].map(c => String(c));
            if (r.some(c => c.includes('رقم الحساب') || c.includes('كود') || c.includes('الحساب'))) {
              headerRow = i; break;
            }
          }
          if (headerRow === -1) {
            setAccStatus('❌ لم يُعثر على صف رؤوس الأعمدة. تأكد أن الملف يحتوي على "رقم الحساب"');
            return;
          }

          const headers = rows[headerRow].map(c => String(c).trim());
          const findCol = (...terms) => headers.findIndex(h => terms.some(t => h.includes(t)));

          const codeCol  = findCol('رقم الحساب', 'الكود', 'كود');
          const nameCol  = findCol('اسم الحساب', 'الاسم', 'البيان');
          const debitCol = findCol('مدين', 'debit');
          const creditCol= findCol('دائن', 'credit');
          const balCol   = findCol('الرصيد', 'رصيد', 'balance');

          if (codeCol === -1 || nameCol === -1) {
            setAccStatus('❌ لم يُعثر على أعمدة رقم الحساب أو اسم الحساب');
            return;
          }

          const data = [];
          for (let i = headerRow + 1; i < rows.length; i++) {
            const row = rows[i];
            const code = String(row[codeCol] || '').trim().replace(/[^0-9]/g, '');
            const name = String(row[nameCol] || '').trim();
            if (!code || !name || code.length < 1) continue;

            let balance = 0;
            if (balCol !== -1 && row[balCol]) {
              balance = parseFloat(String(row[balCol]).replace(/,/g, '')) || 0;
            } else if (debitCol !== -1 && creditCol !== -1) {
              const d = parseFloat(String(row[debitCol] || '0').replace(/,/g, '')) || 0;
              const c = parseFloat(String(row[creditCol] || '0').replace(/,/g, '')) || 0;
              balance = d - c;
            }

            data.push({ account_code: code, name_ar: name, opening_balance: balance });
          }

          setAccPreview(data.slice(0, 10));
          setAccTotal(data.length);
          setAccStatus(`✅ تم قراءة ${data.length} حساب — راجع المعاينة ثم اضغط "ابدأ الرفع"`);

          // حفظ البيانات الكاملة للرفع
          accFileRef.current = data;
        } catch (err) {
          setAccStatus('❌ خطأ في قراءة الملف: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // ─── رفع شجرة الحسابات (المحسّن) ─────────────────────────────────────────
  const uploadAccounts = async () => {
    const data = accFileRef.current;
    if (!data || data.length === 0) { setAccStatus('❌ لا توجد بيانات للرفع'); return; }

    setAccRunning(true);
    setAccProgress(0);
    setAccResult(null);
    let inserted = 0, skipped = 0, failed = 0;

    try {
      // 1) جلب الحسابات الموجودة مرة واحدة
      setAccStatus('⏳ جارٍ جلب الحسابات الموجودة...');
      const { data: existingRaw, error: fetchErr } = await supabase
        .from('accounts')
        .select('account_code, id');
      if (fetchErr) throw fetchErr;

      const existingMap = {}; // code → id
      for (const row of (existingRaw || [])) {
        existingMap[row.account_code] = row.id;
      }

      // 2) تصفية الجديد فقط
      const newData = data.filter(d => !existingMap[d.account_code]);
      skipped = data.length - newData.length;

      if (newData.length === 0) {
        setAccStatus(`✅ جميع الحسابات (${data.length}) موجودة مسبقاً — لا يوجد جديد للرفع`);
        setAccResult({ inserted: 0, skipped, failed: 0 });
        setAccRunning(false);
        return;
      }

      setAccStatus(`⏳ حساب العلاقات الأبوية لـ ${newData.length} حساب جديد...`);

      // 3) حساب parentMap محلياً (بدون أي طلب شبكة)
      const allCodes = data.map(d => d.account_code);
      const parentMap = buildParentMap(allCodes); // code → parentCode | null

      // 4) ترتيب حسب طول الكود (الأب قبل الابن)
      newData.sort((a, b) => a.account_code.length - b.account_code.length || a.account_code.localeCompare(b.account_code));

      // 5) رفع على مراحل حسب الـ level (لضمان وجود الأب قبل الابن)
      // نجمع حسابات نفس الطول في batch واحد
      const levelGroups = {};
      for (const acc of newData) {
        const len = acc.account_code.length;
        if (!levelGroups[len]) levelGroups[len] = [];
        levelGroups[len].push(acc);
      }

      const sortedLengths = Object.keys(levelGroups).map(Number).sort((a, b) => a - b);
      const BATCH = 200;
      let done = 0;

      // map محدَّث يضاف إليه كل ما نرفعه
      const liveMap = { ...existingMap };

      for (const len of sortedLengths) {
        const group = levelGroups[len];

        // نقسّم الـ group إلى batches
        for (let start = 0; start < group.length; start += BATCH) {
          const batch = group.slice(start, start + BATCH);

          const rows = batch.map(acc => {
            const parentCode = parentMap[acc.account_code];
            const parentId = parentCode ? (liveMap[parentCode] || null) : null;
            const level = parentId ? (len <= 7 ? 2 : len <= 9 ? 3 : 4) : 1;

            return {
              account_code: acc.account_code,
              name_ar: acc.name_ar,
              account_type: getAccountType(acc.account_code),
              balance_type: getBalanceType(acc.account_code),
              parent_id: parentId,
              level,
              opening_balance: acc.opening_balance || 0,
              is_active: true,
              allow_posting: true,
              currency: 'KWD',
            };
          });

          const { data: inserted_rows, error } = await supabase
            .from('accounts')
            .insert(rows)
            .select('account_code, id');

          if (error) {
            // نحاول سجل سجل لو فشل الـ batch
            for (const row of rows) {
              const { data: sr, error: se } = await supabase
                .from('accounts').insert([row]).select('account_code, id');
              if (se) { failed++; }
              else { inserted++; if (sr?.[0]) liveMap[sr[0].account_code] = sr[0].id; }
            }
          } else {
            inserted += rows.length;
            for (const r of (inserted_rows || [])) liveMap[r.account_code] = r.id;
          }

          done += batch.length;
          setAccProgress(Math.round((done / newData.length) * 100));
          setAccStatus(`⏳ جارٍ الرفع... ${done} / ${newData.length}`);

          // استراحة صغيرة لتجنب rate limit
          await new Promise(r => setTimeout(r, 50));
        }
      }

      setAccStatus(`✅ اكتمل الرفع بنجاح`);
      setAccResult({ inserted, skipped, failed });

    } catch (err) {
      setAccStatus('❌ خطأ: ' + err.message);
    } finally {
      setAccRunning(false);
    }
  };

  // ─── قراءة ملف مراكز التكلفة ──────────────────────────────────────────────
  const handleCcFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCcFile(file);
    setCcPreview([]);
    setCcResult(null);
    setCcStatus('جارٍ قراءة الملف...');

    import(/* webpackIgnore: true */ 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs').then(XLSX => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          let headerRow = -1;
          for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const r = rows[i].map(c => String(c));
            if (r.some(c => c.includes('رقم الملف') || c.includes('ملف'))) {
              headerRow = i; break;
            }
          }
          if (headerRow === -1) {
            setCcStatus('❌ لم يُعثر على صف رؤوس الأعمدة');
            return;
          }

          const data = [];
          for (let i = headerRow + 1; i < rows.length; i++) {
            const row = rows[i];
            const fileCode = String(row[0] || '').trim();
            if (!fileCode || fileCode.length < 1) continue;
            data.push({
              file_code:    fileCode,
              name_ar:      String(row[1] || '').trim(),
              name_en:      String(row[2] || '').trim(),
              auto_number:  String(row[3] || '').trim(),
              lawyer_name:  String(row[4] || '').trim(),
              case_number:  String(row[5] || '').trim(),
              case_type:    String(row[6] || '').trim(),
              account_code: String(row[7] || '').trim(),
              client_name:  String(row[8] || '').trim(),
              ref_number:   String(row[9] || '').trim(),
              notes:        String(row[10] || '').trim(),
            });
          }

          setCcPreview(data.slice(0, 10));
          setCcTotal(data.length);
          setCcStatus(`✅ تم قراءة ${data.length} سجل — راجع المعاينة ثم اضغط "ابدأ الرفع"`);
          ccFileRef.current = data;
        } catch (err) {
          setCcStatus('❌ خطأ في قراءة الملف: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // ─── رفع مراكز التكلفة الإضافية ───────────────────────────────────────────
  const uploadCostCenters = async () => {
    const data = ccFileRef.current;
    if (!data || data.length === 0) { setCcStatus('❌ لا توجد بيانات للرفع'); return; }

    setCcRunning(true);
    setCcProgress(0);
    setCcResult(null);
    let inserted = 0, skipped = 0, failed = 0;

    try {
      // 1) جلب السجلات الموجودة
      setCcStatus('⏳ جارٍ جلب السجلات الموجودة...');
      const { data: existing } = await supabase
        .from('additional_cost_centers')
        .select('file_code');
      const existingSet = new Set((existing || []).map(r => r.file_code));

      // 2) جلب الحسابات للربط
      setCcStatus('⏳ جارٍ جلب الحسابات للربط...');
      const { data: accounts } = await supabase
        .from('accounts')
        .select('account_code, id');
      const accountMap = {};
      for (const a of (accounts || [])) accountMap[a.account_code] = a.id;

      // 3) تصفية الجديد
      const newData = data.filter(d => !existingSet.has(d.file_code));
      skipped = data.length - newData.length;

      if (newData.length === 0) {
        setCcStatus(`✅ جميع السجلات (${data.length}) موجودة مسبقاً`);
        setCcResult({ inserted: 0, skipped, failed: 0 });
        setCcRunning(false);
        return;
      }

      // 4) رفع بالـ batch
      const BATCH = 200;
      for (let start = 0; start < newData.length; start += BATCH) {
        const batch = newData.slice(start, start + BATCH);
        const rows = batch.map(d => ({
          file_code:    d.file_code,
          name_ar:      d.name_ar || null,
          name_en:      d.name_en || null,
          auto_number:  d.auto_number || null,
          lawyer_name:  d.lawyer_name || null,
          case_number:  d.case_number || null,
          case_type:    d.case_type || null,
          account_code: d.account_code || null,
          account_id:   accountMap[d.account_code] || null,
          client_name:  d.client_name || null,
          ref_number:   d.ref_number || null,
          notes:        d.notes || null,
          is_active:    true,
        }));

        const { error } = await supabase.from('additional_cost_centers').insert(rows);

        if (error) {
          // fallback: سجل سجل
          for (const row of rows) {
            const { error: se } = await supabase.from('additional_cost_centers').insert([row]);
            if (se) failed++; else inserted++;
          }
        } else {
          inserted += rows.length;
        }

        setCcProgress(Math.round(((start + batch.length) / newData.length) * 100));
        setCcStatus(`⏳ جارٍ الرفع... ${start + batch.length} / ${newData.length}`);
        await new Promise(r => setTimeout(r, 30));
      }

      setCcStatus('✅ اكتمل الرفع بنجاح');
      setCcResult({ inserted, skipped, failed });

    } catch (err) {
      setCcStatus('❌ خطأ: ' + err.message);
    } finally {
      setCcRunning(false);
    }
  };

  // ─── الستايل ───────────────────────────────────────────────────────────────
  const S = {
    page: { padding: '24px', fontFamily: 'Cairo, Tahoma, sans-serif', direction: 'rtl', background: '#c8d8e8', minHeight: '100vh' },
    card: { background: '#dce8f5', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    header: { background: 'linear-gradient(135deg, #4a7ab5, #1a365d)', color: '#fff', borderRadius: 10, padding: '16px 24px', marginBottom: 24 },
    tabs: { display: 'flex', gap: 8, marginBottom: 20 },
    tab: (active) => ({
      padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: 15, fontWeight: 600,
      background: active ? '#2c5282' : '#b0c4de', color: active ? '#fff' : '#2c3e50',
    }),
    btn: (color) => ({
      padding: '10px 28px', borderRadius: 8, border: 'none', cursor: 'pointer',
      background: color || '#2c5282', color: '#fff', fontFamily: 'Cairo, Tahoma, sans-serif',
      fontSize: 15, fontWeight: 600, opacity: 1,
    }),
    btnDisabled: {
      padding: '10px 28px', borderRadius: 8, border: 'none',
      background: '#a0aec0', color: '#fff', fontFamily: 'Cairo, Tahoma, sans-serif',
      fontSize: 15, fontWeight: 600, cursor: 'not-allowed',
    },
    progressBar: (pct) => ({
      height: 22, borderRadius: 11, background: `linear-gradient(90deg, #2c7a2c ${pct}%, #e2e8f0 ${pct}%)`,
      transition: 'background 0.3s', marginTop: 10,
    }),
    statusBox: (err) => ({
      marginTop: 12, padding: '10px 16px', borderRadius: 8, fontSize: 14,
      background: err ? '#fff0f0' : '#f0fff4', color: err ? '#c0392b' : '#276749', border: `1px solid ${err ? '#fca5a5' : '#9ae6b4'}`,
    }),
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
    th: { background: 'linear-gradient(135deg, #5b8fc9, #2c5282)', color: '#fff', padding: '8px 12px', textAlign: 'right', borderBottom: '2px solid #2c5282' },
    td: { padding: '7px 12px', borderBottom: '1px solid #bee3f8', background: '#f7faff' },
    resultBox: { display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' },
    resultItem: (color) => ({ padding: '10px 20px', borderRadius: 8, background: color, color: '#fff', fontWeight: 700, fontSize: 15, minWidth: 100, textAlign: 'center' }),
    fileLabel: {
      display: 'inline-block', padding: '10px 20px', borderRadius: 8, background: '#4a7ab5', color: '#fff',
      cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: 14, marginBottom: 12,
    },
  };

  const isStatusError = (s) => s.startsWith('❌');

  const renderAccountsTab = () => (
    <div>
      <div style={S.card}>
        <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>📂 اختر ملف شجرة الحسابات (.xlsx)</h3>
        <label style={S.fileLabel}>
          اختر ملف Excel
          <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleAccFile} disabled={accRunning} />
        </label>
        {accFile && <span style={{ marginRight: 12, color: '#2c5282', fontWeight: 600 }}>{accFile.name}</span>}

        {accStatus && (
          <div style={S.statusBox(isStatusError(accStatus))}>{accStatus}</div>
        )}

        {accTotal > 0 && (
          <div style={{ marginTop: 12, color: '#2c5282', fontWeight: 600 }}>
            إجمالي الحسابات في الملف: {accTotal.toLocaleString()}
          </div>
        )}
      </div>

      {accPreview.length > 0 && (
        <div style={S.card}>
          <h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>معاينة أول 10 سجلات</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>رقم الحساب</th>
                  <th style={S.th}>اسم الحساب</th>
                  <th style={S.th}>الرصيد الافتتاحي</th>
                  <th style={S.th}>النوع</th>
                </tr>
              </thead>
              <tbody>
                {accPreview.map((row, i) => (
                  <tr key={i}>
                    <td style={S.td}>{row.account_code}</td>
                    <td style={S.td}>{row.name_ar}</td>
                    <td style={{ ...S.td, textAlign: 'left', direction: 'ltr' }}>{row.opening_balance?.toFixed(3)}</td>
                    <td style={S.td}>{getAccountType(row.account_code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16 }}>
            {accRunning ? (
              <div>
                <div style={{ color: '#2c5282', fontWeight: 600, marginBottom: 6 }}>{accStatus}</div>
                <div style={S.progressBar(accProgress)}>
                  <div style={{ textAlign: 'center', lineHeight: '22px', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                    {accProgress}%
                  </div>
                </div>
              </div>
            ) : (
              <button
                style={accPreview.length === 0 ? S.btnDisabled : S.btn('#2c7a2c')}
                onClick={uploadAccounts}
                disabled={accPreview.length === 0}
              >
                ⬆️ ابدأ الرفع
              </button>
            )}
          </div>
        </div>
      )}

      {accResult && (
        <div style={S.card}>
          <h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>نتيجة الرفع</h4>
          <div style={S.resultBox}>
            <div style={S.resultItem('#2c7a2c')}>✅ تم رفع<br />{accResult.inserted.toLocaleString()}</div>
            <div style={S.resultItem('#b7791f')}>⏭️ موجود مسبقاً<br />{accResult.skipped.toLocaleString()}</div>
            <div style={S.resultItem(accResult.failed > 0 ? '#c0392b' : '#718096')}>❌ فشل<br />{accResult.failed.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCostCentersTab = () => (
    <div>
      <div style={S.card}>
        <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>📂 اختر ملف مراكز التكلفة الإضافية (.xlsx)</h3>
        <label style={S.fileLabel}>
          اختر ملف Excel
          <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleCcFile} disabled={ccRunning} />
        </label>
        {ccFile && <span style={{ marginRight: 12, color: '#2c5282', fontWeight: 600 }}>{ccFile.name}</span>}

        {ccStatus && (
          <div style={S.statusBox(isStatusError(ccStatus))}>{ccStatus}</div>
        )}

        {ccTotal > 0 && (
          <div style={{ marginTop: 12, color: '#2c5282', fontWeight: 600 }}>
            إجمالي السجلات في الملف: {ccTotal.toLocaleString()}
          </div>
        )}
      </div>

      {ccPreview.length > 0 && (
        <div style={S.card}>
          <h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>معاينة أول 10 سجلات</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>رقم الملف</th>
                  <th style={S.th}>اسم الموكل</th>
                  <th style={S.th}>اسم المحامي</th>
                  <th style={S.th}>رقم القضية</th>
                  <th style={S.th}>رقم الحساب</th>
                </tr>
              </thead>
              <tbody>
                {ccPreview.map((row, i) => (
                  <tr key={i}>
                    <td style={S.td}>{row.file_code}</td>
                    <td style={S.td}>{row.name_ar}</td>
                    <td style={S.td}>{row.lawyer_name}</td>
                    <td style={S.td}>{row.case_number}</td>
                    <td style={S.td}>{row.account_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16 }}>
            {ccRunning ? (
              <div>
                <div style={{ color: '#2c5282', fontWeight: 600, marginBottom: 6 }}>{ccStatus}</div>
                <div style={S.progressBar(ccProgress)}>
                  <div style={{ textAlign: 'center', lineHeight: '22px', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                    {ccProgress}%
                  </div>
                </div>
              </div>
            ) : (
              <button
                style={ccPreview.length === 0 ? S.btnDisabled : S.btn('#2c7a2c')}
                onClick={uploadCostCenters}
                disabled={ccPreview.length === 0}
              >
                ⬆️ ابدأ الرفع
              </button>
            )}
          </div>
        </div>
      )}

      {ccResult && (
        <div style={S.card}>
          <h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>نتيجة الرفع</h4>
          <div style={S.resultBox}>
            <div style={S.resultItem('#2c7a2c')}>✅ تم رفع<br />{ccResult.inserted.toLocaleString()}</div>
            <div style={S.resultItem('#b7791f')}>⏭️ موجود مسبقاً<br />{ccResult.skipped.toLocaleString()}</div>
            <div style={S.resultItem(ccResult.failed > 0 ? '#c0392b' : '#718096')}>❌ فشل<br />{ccResult.failed.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h2 style={{ margin: 0, fontSize: 22 }}>📥 استيراد البيانات</h2>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>رفع شجرة الحسابات ومراكز التكلفة الإضافية</div>
      </div>

      <div style={S.tabs}>
        <button style={S.tab(activeTab === 'accounts')} onClick={() => setActiveTab('accounts')}>
          🌳 شجرة الحسابات
        </button>
        <button style={S.tab(activeTab === 'costcenters')} onClick={() => setActiveTab('costcenters')}>
          📁 مراكز التكلفة الإضافية
        </button>
      </div>

      {activeTab === 'accounts' ? renderAccountsTab() : renderCostCentersTab()}
    </div>
  );
}
