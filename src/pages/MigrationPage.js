import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const COMPANY_ID = '30d868b2-b835-46ca-8d87-ae8e46bc38ec';

// ─── الستايل ──────────────────────────────────────────────────────────────────
const S = {
  page: { padding: '24px', fontFamily: 'Cairo, Tahoma, sans-serif', direction: 'rtl', background: '#c8d8e8', minHeight: '100vh' },
  header: { background: 'linear-gradient(135deg, #4a7ab5, #1a365d)', color: '#fff', borderRadius: 10, padding: '16px 24px', marginBottom: 24 },
  card: { background: '#dce8f5', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: (active) => ({
    padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: 14, fontWeight: 600,
    background: active ? '#2c5282' : '#b0c4de', color: active ? '#fff' : '#2c3e50',
  }),
  btn: (color) => ({
    padding: '10px 28px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: color || '#2c5282', color: '#fff',
    fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: 15, fontWeight: 600,
  }),
  btnDisabled: {
    padding: '10px 28px', borderRadius: 8, border: 'none',
    background: '#a0aec0', color: '#fff', cursor: 'not-allowed',
    fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: 15, fontWeight: 600,
  },
  statusBox: (err) => ({
    marginTop: 12, padding: '10px 16px', borderRadius: 8, fontSize: 14,
    background: err ? '#fff0f0' : '#f0fff4',
    color: err ? '#c0392b' : '#276749',
    border: `1px solid ${err ? '#fca5a5' : '#9ae6b4'}`,
  }),
  progressWrap: { marginTop: 12, background: '#e2e8f0', borderRadius: 11, height: 24, overflow: 'hidden' },
  progressBar: (pct) => ({
    height: '100%', borderRadius: 11, width: `${pct}%`,
    background: 'linear-gradient(90deg, #2c7a2c, #48bb78)',
    transition: 'width 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { background: 'linear-gradient(135deg, #5b8fc9, #2c5282)', color: '#fff', padding: '8px 12px', textAlign: 'right' },
  td: { padding: '7px 12px', borderBottom: '1px solid #bee3f8', background: '#f7faff' },
  resultBox: { display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  resultItem: (color) => ({
    padding: '10px 18px', borderRadius: 8, background: color, color: '#fff',
    fontWeight: 700, fontSize: 14, minWidth: 110, textAlign: 'center', lineHeight: 1.5,
  }),
  fileLabel: {
    display: 'inline-block', padding: '10px 20px', borderRadius: 8,
    background: '#4a7ab5', color: '#fff', cursor: 'pointer',
    fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: 14, marginBottom: 12,
  },
  warnBox: {
    background: '#fff8e1', border: '1px solid #f6c000', borderRadius: 8,
    padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#7c5a00',
  },
  logBox: {
    background: '#1a202c', color: '#68d391', borderRadius: 8, padding: 12,
    fontFamily: 'monospace', fontSize: 12, maxHeight: 200, overflowY: 'auto',
    marginTop: 12, direction: 'ltr',
  },
};

// ─── الكومبوننت ───────────────────────────────────────────────────────────────
export default function MigrationPage() {
  const [activeTab, setActiveTab] = useState('migrate');

  // حالة الترحيل
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { journals, receipts, payments }
  const [status, setStatus] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);

  // فلاتر
  const [migrateJournals, setMigrateJournals] = useState(true);
  const [migrateReceipts, setMigrateReceipts] = useState(true);
  const [migratePayments, setMigratePayments] = useState(true);

  const dataRef = useRef(null);
  const logsRef = useRef([]);

  const addLog = (msg) => {
    logsRef.current = [...logsRef.current.slice(-100), msg];
    setLogs([...logsRef.current]);
  };

  // ─── قراءة الملف ──────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(null);
    setResult(null);
    setStatus('⏳ جارٍ قراءة الملف...');
    logsRef.current = [];
    setLogs([]);

    import(/* webpackIgnore: true */ 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs').then(XLSX => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target.result, { type: 'array' });

          // ابحث عن ورقة "كل الحركات"
          let sheetName = wb.SheetNames.find(n => n.includes('الحركات') || n.includes('حركات'));
          if (!sheetName) sheetName = wb.SheetNames[0];

          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

          // إيجاد صف الرؤوس
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const r = rows[i].map(c => String(c || ''));
            if (r.some(c => c.includes('نوع') || c.includes('السند') || c.includes('رقم السند'))) {
              headerIdx = i; break;
            }
          }
          if (headerIdx === -1) headerIdx = 0;

          const headers = rows[headerIdx].map(c => String(c || '').trim());
          const ci = {
            type:    headers.findIndex(h => h.includes('نوع')),
            num:     headers.findIndex(h => h.includes('رقم') && h.includes('سند')),
            date:    headers.findIndex(h => h.includes('تاريخ') || h.includes('Date')),
            accCode: headers.findIndex(h => h.includes('رقم الحساب') || h.includes('حساب')),
            accName: headers.findIndex(h => h.includes('اسم الحساب')),
            desc:    headers.findIndex(h => h.includes('البيان') || h.includes('وصف')),
            debit:   headers.findIndex(h => h.includes('مدين') || h.includes('debit')),
            credit:  headers.findIndex(h => h.includes('دائن') || h.includes('credit')),
            cc:      headers.findIndex(h => h.includes('مركز') || h.includes('تكلفة')),
          };

          // fallback للأعمدة الثابتة (نوع، رقم، تاريخ، كود، اسم، بيان، مدين، دائن، م.ت)
          if (ci.type === -1) ci.type = 0;
          if (ci.num === -1) ci.num = 1;
          if (ci.date === -1) ci.date = 2;
          if (ci.accCode === -1) ci.accCode = 3;
          if (ci.accName === -1) ci.accName = 4;
          if (ci.desc === -1) ci.desc = 5;
          if (ci.debit === -1) ci.debit = 6;
          if (ci.credit === -1) ci.credit = 7;
          if (ci.cc === -1) ci.cc = 8;

          // تجميع السطور حسب (نوع + رقم السند)
          const voucherMap = new Map();
          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[ci.type]) continue;
            const type = String(row[ci.type] || '').trim();
            const num  = String(row[ci.num] || '').trim();
            if (!type || !num) continue;

            const key = `${type}__${num}`;
            if (!voucherMap.has(key)) {
              voucherMap.set(key, {
                type, num,
                date: row[ci.date] ? String(row[ci.date]).trim() : null,
                lines: [],
              });
            }
            voucherMap.get(key).lines.push({
              accCode:  String(row[ci.accCode] || '').trim(),
              accName:  String(row[ci.accName] || '').trim(),
              desc:     String(row[ci.desc] || '').trim(),
              debit:    parseFloat(row[ci.debit]) || 0,
              credit:   parseFloat(row[ci.credit]) || 0,
              cc:       row[ci.cc] ? String(row[ci.cc]).trim() : null,
            });
          }

          // تصنيف
          const journals = [], receipts = [], payments = [];
          for (const v of voucherMap.values()) {
            if (v.type === 'قيد' || v.type === 'يومية') journals.push(v);
            else if (v.type === 'قبض') receipts.push(v);
            else if (v.type === 'صرف') payments.push(v);
          }

          const totalLines = [...journals, ...receipts, ...payments]
            .reduce((s, v) => s + v.lines.length, 0);

          dataRef.current = { journals, receipts, payments, voucherMap };
          setPreview({ journals: journals.length, receipts: receipts.length, payments: payments.length, totalLines });
          setStatus(`✅ تم القراءة — ${journals.length} قيد | ${receipts.length} سند قبض | ${payments.length} سند صرف | ${totalLines.toLocaleString()} سطر`);

        } catch (err) {
          setStatus('❌ خطأ في قراءة الملف: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(f);
    });
  };

  // ─── الترحيل الرئيسي ──────────────────────────────────────────────────────
  const startMigration = async () => {
    const data = dataRef.current;
    if (!data) return;

    setRunning(true);
    setProgress(0);
    setResult(null);
    logsRef.current = [];
    setLogs([]);

    let totalInserted = 0, totalFailed = 0, totalSkipped = 0;
    const errors = [];

    try {
      // 1) جلب الحسابات مرة واحدة
      addLog('جارٍ جلب خريطة الحسابات...');
      setStatus('⏳ جارٍ جلب الحسابات من قاعدة البيانات...');
      const accountMap = {}; // account_code → id
      let from = 0;
      while (true) {
        const { data: accs, error } = await supabase
          .from('accounts').select('account_code, id').range(from, from + 999);
        if (error) throw error;
        for (const a of (accs || [])) accountMap[a.account_code] = a.id;
        if (!accs || accs.length < 1000) break;
        from += 1000;
      }
      addLog(`✅ تم جلب ${Object.keys(accountMap).length} حساب`);

      // 2) جلب مراكز التكلفة
      addLog('جارٍ جلب مراكز التكلفة...');
      const ccMap = {}; // name_ar → id (cost_centers)
      const { data: ccs } = await supabase.from('cost_centers').select('id, name_ar');
      for (const c of (ccs || [])) ccMap[c.name_ar] = c.id;

      // 3) تجميع السندات المطلوب ترحيلها
      const toMigrate = [
        ...(migrateJournals ? data.journals.map(v => ({ ...v, targetType: 'journal' })) : []),
        ...(migrateReceipts ? data.receipts.map(v => ({ ...v, targetType: 'receipt' })) : []),
        ...(migratePayments ? data.payments.map(v => ({ ...v, targetType: 'payment' })) : []),
      ];

      const total = toMigrate.length;
      addLog(`بدء ترحيل ${total} سند...`);

      // 4) ترحيل سند سند (مع batch للسطور)
      for (let i = 0; i < toMigrate.length; i++) {
        const v = toMigrate[i];

        try {
          if (v.targetType === 'journal') {
            await migrateJournalEntry(v, accountMap, ccMap);
          } else {
            await migrateVoucher(v, accountMap, ccMap);
          }
          totalInserted++;

          if (i % 50 === 0) {
            addLog(`✅ ${i + 1}/${total} — ${v.type} ${v.num} (${v.date})`);
          }
        } catch (err) {
          totalFailed++;
          const errMsg = `❌ فشل ${v.type} ${v.num}: ${err.message}`;
          errors.push(errMsg);
          if (errors.length <= 5) addLog(errMsg);
        }

        setProgress(Math.round(((i + 1) / total) * 100));
        setStatus(`⏳ جارٍ الترحيل... ${i + 1} / ${total}`);

        // استراحة كل 20 سند لتجنب rate limit
        if (i % 20 === 19) await new Promise(r => setTimeout(r, 100));
      }

      addLog(`🎉 اكتمل: ${totalInserted} نجح | ${totalFailed} فشل`);
      setStatus('✅ اكتمل الترحيل');
      setResult({ inserted: totalInserted, failed: totalFailed, skipped: totalSkipped, errors: errors.slice(0, 10) });

    } catch (err) {
      setStatus('❌ خطأ فادح: ' + err.message);
      addLog('❌ ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  // ─── ترحيل قيد يومي ───────────────────────────────────────────────────────
  const migrateJournalEntry = async (v, accountMap, ccMap) => {
    const totalDebit  = v.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = v.lines.reduce((s, l) => s + (l.credit || 0), 0);
    const desc = v.lines[0]?.desc || `قيد ${v.num}`;

    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert([{
        company_id:   COMPANY_ID,
        entry_date:   v.date,
        description:  desc,
        total_debit:  Math.round(totalDebit * 1000) / 1000,
        total_credit: Math.round(totalCredit * 1000) / 1000,
        is_balanced:  Math.abs(totalDebit - totalCredit) < 0.01,
        status:       'posted',
        posted_at:    new Date().toISOString(),
        voucher_type: 'journal',
        reference_number: v.num,
      }])
      .select('id')
      .single();

    if (entryErr) throw new Error(entryErr.message);

    const lines = v.lines.map((l, idx) => ({
      journal_entry_id: entry.id,
      line_number:      idx + 1,
      account_id:       accountMap[l.accCode] || null,
      debit_amount:     l.debit || 0,
      credit_amount:    l.credit || 0,
      description:      l.desc || null,
      cost_center_id:   l.cc ? (ccMap[l.cc] || null) : null,
    }));

    const { error: linesErr } = await supabase.from('journal_entry_lines').insert(lines);
    if (linesErr) throw new Error('lines: ' + linesErr.message);
  };

  // ─── ترحيل سند قبض/صرف ────────────────────────────────────────────────────
  const migrateVoucher = async (v, accountMap, ccMap) => {
    const isReceipt = v.type === 'قبض';
    const totalAmount = v.lines.reduce((s, l) => s + (l.debit || 0) + (l.credit || 0), 0) / 2 ||
                        v.lines.reduce((s, l) => s + Math.max(l.debit, l.credit), 0);
    const desc = v.lines[0]?.desc || `${v.type} ${v.num}`;

    // الحساب الرئيسي = أول سطر مدين في القبض أو أول سطر دائن في الصرف
    const mainLine = isReceipt
      ? v.lines.find(l => l.debit > 0)
      : v.lines.find(l => l.credit > 0);

    const { data: voucher, error: vErr } = await supabase
      .from('vouchers')
      .insert([{
        company_id:      COMPANY_ID,
        voucher_type:    isReceipt ? 'receipt' : 'payment',
        voucher_date:    v.date,
        description:     desc,
        reference_number: v.num,
        main_account_id: mainLine ? (accountMap[mainLine.accCode] || null) : null,
        main_amount:     mainLine ? Math.max(mainLine.debit, mainLine.credit) : 0,
        total_amount:    Math.round(v.lines.reduce((s,l) => s + Math.max(l.debit||0, l.credit||0), 0) * 1000) / 1000,
        status:          'posted',
        posted_at:       new Date().toISOString(),
      }])
      .select('id')
      .single();

    if (vErr) throw new Error(vErr.message);

    const lines = v.lines.map((l, idx) => ({
      voucher_id:    voucher.id,
      line_number:   idx + 1,
      account_id:    accountMap[l.accCode] || null,
      debit_amount:  l.debit || 0,
      credit_amount: l.credit || 0,
      description:   l.desc || null,
      cost_center_id: l.cc ? (ccMap[l.cc] || null) : null,
    }));

    const { error: linesErr } = await supabase.from('voucher_lines').insert(lines);
    if (linesErr) throw new Error('lines: ' + linesErr.message);
  };

  // ─── الـ UI ────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.header}>
        <h2 style={{ margin: 0, fontSize: 22 }}>🔄 ترحيل البيانات التاريخية</h2>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
          استيراد القيود اليومية وسندات القبض والصرف من ملف Excel
        </div>
      </div>

      <div style={S.tabs}>
        <button style={S.tab(activeTab === 'migrate')} onClick={() => setActiveTab('migrate')}>
          📥 ترحيل الحركات
        </button>
        <button style={S.tab(activeTab === 'help')} onClick={() => setActiveTab('help')}>
          📖 تعليمات وشكل الملف
        </button>
      </div>

      {activeTab === 'migrate' ? (
        <div>
          {/* اختيار الملف */}
          <div style={S.card}>
            <h3 style={{ margin: '0 0 8px', color: '#1a365d' }}>📂 اختر ملف الحركات</h3>
            <p style={{ margin: '0 0 12px', color: '#4a5568', fontSize: 13 }}>
              يجب أن يحتوي الملف على ورقة باسم "كل الحركات" بالأعمدة: نوع السند، رقم السند، التاريخ، رقم الحساب، البيان، مدين، دائن، مركز التكلفة
            </p>

            <label style={S.fileLabel}>
              اختر ملف Excel
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} disabled={running} />
            </label>
            {file && <span style={{ marginRight: 12, color: '#2c5282', fontWeight: 600 }}>{file.name}</span>}

            {status && <div style={S.statusBox(status.startsWith('❌'))}>{status}</div>}
          </div>

          {/* معاينة + خيارات */}
          {preview && (
            <div style={S.card}>
              <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>⚙️ خيارات الترحيل</h3>

              {/* إحصائيات */}
              <div style={S.resultBox}>
                <div style={S.resultItem('#2c5282')}>📋 قيود يومية<br />{preview.journals.toLocaleString()}</div>
                <div style={S.resultItem('#2c7a2c')}>🟢 سندات قبض<br />{preview.receipts.toLocaleString()}</div>
                <div style={S.resultItem('#c0392b')}>🔴 سندات صرف<br />{preview.payments.toLocaleString()}</div>
                <div style={S.resultItem('#718096')}>📄 إجمالي السطور<br />{preview.totalLines.toLocaleString()}</div>
              </div>

              {/* اختيار ما يتم ترحيله */}
              <div style={{ marginTop: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  [migrateJournals, setMigrateJournals, 'القيود اليومية', preview.journals],
                  [migrateReceipts, setMigrateReceipts, 'سندات القبض', preview.receipts],
                  [migratePayments, setMigratePayments, 'سندات الصرف', preview.payments],
                ].map(([val, setter, label, count]) => (
                  <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a365d' }}>
                    <input
                      type="checkbox" checked={val}
                      onChange={e => setter(e.target.checked)}
                      disabled={running}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    {label} ({count.toLocaleString()})
                  </label>
                ))}
              </div>

              <div style={S.warnBox}>
                ⚠️ تنبيه: الترحيل سيضيف البيانات كـ <b>posted</b> (مرحّل نهائي). تأكد من رفع شجرة الحسابات أولاً حتى تتربط الأكواد صح.
              </div>

              {/* زر الترحيل */}
              <div style={{ marginTop: 8 }}>
                {running ? (
                  <div>
                    <div style={{ color: '#2c5282', fontWeight: 600, marginBottom: 8 }}>{status}</div>
                    <div style={S.progressWrap}>
                      <div style={S.progressBar(progress)}>
                        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{progress}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    style={(!migrateJournals && !migrateReceipts && !migratePayments) ? S.btnDisabled : S.btn('#2c7a2c')}
                    onClick={startMigration}
                    disabled={!migrateJournals && !migrateReceipts && !migratePayments}
                  >
                    🚀 ابدأ الترحيل
                  </button>
                )}
              </div>

              {/* سجل العمليات */}
              {logs.length > 0 && (
                <div style={S.logBox}>
                  {logs.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
            </div>
          )}

          {/* النتيجة */}
          {result && (
            <div style={S.card}>
              <h3 style={{ margin: '0 0 12px', color: '#1a365d' }}>نتيجة الترحيل</h3>
              <div style={S.resultBox}>
                <div style={S.resultItem('#2c7a2c')}>✅ تم ترحيل<br />{result.inserted.toLocaleString()}</div>
                <div style={S.resultItem(result.failed > 0 ? '#c0392b' : '#718096')}>❌ فشل<br />{result.failed.toLocaleString()}</div>
              </div>
              {result.errors.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: 6 }}>أول الأخطاء:</div>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#c0392b', marginBottom: 4 }}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // تبويب التعليمات
        <div style={S.card}>
          <h3 style={{ margin: '0 0 16px', color: '#1a365d' }}>📖 شكل الملف المطلوب</h3>
          <p style={{ color: '#4a5568', fontSize: 14, lineHeight: 1.8 }}>
            الملف يجب أن يحتوي على ورقة <b>"كل الحركات"</b> بالأعمدة التالية:
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['العمود', 'المحتوى', 'مثال', 'ملاحظة'].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ['نوع السند', 'نوع الحركة', 'قبض / صرف / قيد', 'إلزامي'],
                  ['رقم السند', 'رقم السند أو القيد', '251904', 'إلزامي — يجمع السطور'],
                  ['التاريخ', 'تاريخ السند', '2025-12-31', 'إلزامي'],
                  ['رقم الحساب', 'كود الحساب', '1101023', 'إلزامي للربط'],
                  ['اسم الحساب', 'اسم الحساب', 'بنك الخليج', 'للمرجع فقط'],
                  ['البيان', 'وصف الحركة', 'رد راتب ديسمبر', 'اختياري'],
                  ['مدين', 'المبلغ المدين', '200', 'فارغ = صفر'],
                  ['دائن', 'المبلغ الدائن', '200', 'فارغ = صفر'],
                  ['مركز التكلفة', 'رقم م.ت', '14', 'اختياري'],
                ].map(([col, content, ex, note]) => (
                  <tr key={col}>
                    <td style={{ ...S.td, fontWeight: 700, color: '#2c5282' }}>{col}</td>
                    <td style={S.td}>{content}</td>
                    <td style={{ ...S.td, direction: 'ltr', textAlign: 'left', color: '#276749' }}>{ex}</td>
                    <td style={S.td}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ ...S.warnBox, marginTop: 16 }}>
            <b>مهم:</b> كل سطر في الملف = سطر واحد من القيد أو السند. السطور التي لها نفس رقم السند تُجمع تلقائياً في سند واحد.
          </div>
        </div>
      )}
    </div>
  );
}
