import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  th: { background: 'linear-gradient(135deg, #5b8fc9, #2c5282)', color: '#fff', padding: '10px 12px', textAlign: 'right', fontSize: '13px', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2 },
  td: { padding: '8px 12px', borderBottom: '1px solid #dde8f5', fontSize: '12px', verticalAlign: 'middle' },
  filterRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' },
  badge: (type) => {
    const map = { asset: { bg: '#cce5ff', color: '#004085', label: 'أصول' }, liability: { bg: '#f8d7da', color: '#721c24', label: 'خصوم' }, equity: { bg: '#d4edda', color: '#155724', label: 'حقوق ملكية' }, revenue: { bg: '#fff3cd', color: '#856404', label: 'إيرادات' }, expense: { bg: '#e2d9f3', color: '#432874', label: 'مصروفات' } };
    const s = map[type] || { bg: '#eee', color: '#555', label: type };
    return { bg: s.bg, color: s.color, label: s.label };
  },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' },
  modalBox: { background: '#dce8f5', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '700px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', marginTop: '10px' },
  formRow: { display: 'grid', gap: '12px', marginBottom: '12px' },
};

const ACCOUNT_TYPES = [
  { val: 'asset', label: 'أصول' }, { val: 'liability', label: 'خصوم' },
  { val: 'equity', label: 'حقوق ملكية' }, { val: 'revenue', label: 'إيرادات' }, { val: 'expense', label: 'مصروفات' },
];
const BALANCE_TYPES = [{ val: 'debit', label: 'مدين' }, { val: 'credit', label: 'دائن' }];

// ============================================================
// نافذة تفاصيل الحساب
// ============================================================
function AccountDetailModal({ account, onClose, onEdit }) {
  const b = styles.badge(account.account_type);
  return (
    <div style={styles.modal} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a365d', fontFamily: 'Cairo, Tahoma, sans-serif' }}>📊 تفاصيل الحساب</h3>
          <button onClick={onClose} style={styles.btnSm('#888')}>✕</button>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a365d' }}>{account.account_code}</span>
            <span style={{ background: b.bg, color: b.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>{b.label}</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>{account.name_ar}</div>
          {account.name_en && <div style={{ color: '#888', marginBottom: '12px', direction: 'ltr', textAlign: 'right' }}>{account.name_en}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'طبيعة الحساب', val: account.balance_type === 'debit' ? 'مدين' : 'دائن' },
              { label: 'المستوى', val: account.level },
              { label: 'الحالة', val: account.is_active ? '✅ نشط' : '❌ غير نشط' },
              { label: 'يقبل قيود', val: account.allow_posting ? '✅ نعم' : '❌ لا' },
              { label: 'الرصيد الافتتاحي', val: Number(account.opening_balance || 0).toFixed(3) + ' د.ك' },
              { label: 'العملة', val: account.currency || 'KWD' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#f4f8fd', padding: '8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => onEdit(account)} style={styles.btn('#e67e22')}>✏️ تعديل</button>
          <button onClick={onClose} style={styles.btn('#888')}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// نافذة إنشاء/تعديل حساب
// ============================================================
function AccountFormModal({ account, onClose, onSaved }) {
  const isEdit = !!account?.id;
  const [form, setForm] = useState({
    account_code: account?.account_code || '',
    name_ar: account?.name_ar || '',
    name_en: account?.name_en || '',
    account_type: account?.account_type || 'asset',
    balance_type: account?.balance_type || 'debit',
    level: account?.level || 1,
    is_active: account?.is_active !== false,
    allow_posting: account?.allow_posting !== false,
    opening_balance: account?.opening_balance || 0,
    currency: account?.currency || 'KWD',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async () => {
    if (!form.account_code.trim()) { setMsg({ type: 'error', text: 'يجب إدخال كود الحساب' }); return; }
    if (!form.name_ar.trim()) { setMsg({ type: 'error', text: 'يجب إدخال اسم الحساب' }); return; }
    setLoading(true); setMsg(null);
    try {
      const payload = { ...form, company_id: COMPANY_ID, opening_balance: parseFloat(form.opening_balance) || 0 };
      if (isEdit) {
        const { error } = await supabase.from('accounts').update(payload).eq('id', account.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('accounts').insert(payload);
        if (error) throw error;
      }
      setMsg({ type: 'success', text: '✅ تم الحفظ بنجاح' });
      setTimeout(() => onSaved(), 800);
    } catch (e) {
      setMsg({ type: 'error', text: 'خطأ: ' + e.message });
    }
    setLoading(false);
  };

  return (
    <div style={styles.modal} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a365d', fontFamily: 'Cairo, Tahoma, sans-serif' }}>{isEdit ? '✏️ تعديل حساب' : '➕ حساب جديد'}</h3>
          <button onClick={onClose} style={styles.btnSm('#888')}>✕</button>
        </div>
        {msg && <div style={{ padding: '10px', borderRadius: '6px', marginBottom: '12px', background: msg.type === 'error' ? '#f8d7da' : '#d4edda', color: msg.type === 'error' ? '#721c24' : '#155724', fontSize: '13px' }}>{msg.text}</div>}
        <div style={{ ...styles.formRow, gridTemplateColumns: '1fr 2fr' }}>
          <div><label style={styles.label}>كود الحساب *</label><input style={styles.input} value={form.account_code} onChange={e => setForm({ ...form, account_code: e.target.value })} placeholder='مثال: 1101011' /></div>
          <div><label style={styles.label}>الاسم بالعربي *</label><input style={styles.input} value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
        </div>
        <div style={{ ...styles.formRow, gridTemplateColumns: '1fr 1fr' }}>
          <div><label style={styles.label}>الاسم بالإنجليزي</label><input style={styles.input} value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} dir='ltr' /></div>
          <div><label style={styles.label}>نوع الحساب</label>
            <select style={styles.select} value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })}>
              {ACCOUNT_TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ ...styles.formRow, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div><label style={styles.label}>طبيعة الحساب</label>
            <select style={styles.select} value={form.balance_type} onChange={e => setForm({ ...form, balance_type: e.target.value })}>
              {BALANCE_TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
            </select>
          </div>
          <div><label style={styles.label}>الرصيد الافتتاحي</label><input style={styles.input} type='number' step='0.001' value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} /></div>
          <div><label style={styles.label}>المستوى</label><input style={styles.input} type='number' min='1' max='10' value={form.level} onChange={e => setForm({ ...form, level: parseInt(e.target.value) || 1 })} /></div>
        </div>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
          {[{ key: 'is_active', label: 'الحساب نشط' }, { key: 'allow_posting', label: 'يقبل قيود مباشرة' }].map(cb => (
            <label key={cb.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif', fontSize: '13px' }}>
              <input type='checkbox' checked={form[cb.key]} onChange={e => setForm({ ...form, [cb.key]: e.target.checked })} style={{ width: '16px', height: '16px' }} />
              {cb.label}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #b0c4de', paddingTop: '12px' }}>
          <button onClick={save} disabled={loading} style={styles.btn('#2c7a2c')}>{loading ? '⏳ جاري الحفظ...' : '✅ حفظ'}</button>
          <button onClick={onClose} style={styles.btn('#888')}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// صف الحساب في الجدول
// ============================================================
function AccountRow({ account, depth, onSelect, expanded, onToggle, hasChildren }) {
  const b = styles.badge(account.account_type);
  const indent = depth * 20;
  return (
    <tr style={{ background: depth === 0 ? '#e8f0fb' : depth === 1 ? '#f0f6ff' : '#fff', cursor: 'pointer' }}
      onClick={() => onSelect(account)}
      onMouseEnter={e => { e.currentTarget.style.background = '#dce8ff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = depth === 0 ? '#e8f0fb' : depth === 1 ? '#f0f6ff' : '#fff'; }}>
      <td style={{ ...styles.td, paddingRight: (indent + 12) + 'px', whiteSpace: 'nowrap' }}>
        <span style={{ marginLeft: '4px' }}>
          {hasChildren ? (
            <span onClick={e => { e.stopPropagation(); onToggle(account.id); }} style={{ cursor: 'pointer', color: '#2c5282', fontWeight: 'bold', fontSize: '14px', marginLeft: '4px' }}>
              {expanded ? '▾' : '▸'}
            </span>
          ) : <span style={{ marginLeft: '16px' }}></span>}
          <span style={{ fontWeight: depth === 0 ? 'bold' : 'normal', color: '#2c5282' }}>{account.account_code}</span>
        </span>
      </td>
      <td style={{ ...styles.td, fontWeight: depth === 0 ? 'bold' : 'normal', paddingRight: (indent + 12) + 'px' }}>
        {account.name_ar}
        {account.name_en && <span style={{ color: '#aaa', fontSize: '11px', marginRight: '8px', direction: 'ltr' }}>({account.name_en})</span>}
      </td>
      <td style={styles.td}><span style={{ background: b.bg, color: b.color, padding: '1px 8px', borderRadius: '12px', fontSize: '11px' }}>{b.label}</span></td>
      <td style={styles.td}>{account.balance_type === 'debit' ? 'مدين' : 'دائن'}</td>
      <td style={{ ...styles.td, textAlign: 'left', direction: 'ltr', color: account.opening_balance >= 0 ? '#2c5282' : '#c0392b', fontWeight: 'bold' }}>
        {Number(account.opening_balance || 0).toFixed(3)}
      </td>
      <td style={styles.td}>
        <span style={{ background: account.is_active ? '#d4edda' : '#f8d7da', color: account.is_active ? '#155724' : '#721c24', padding: '1px 8px', borderRadius: '12px', fontSize: '11px' }}>
          {account.is_active ? 'نشط' : 'غير نشط'}
        </span>
      </td>
      <td style={styles.td}>{account.allow_posting ? '✅' : '—'}</td>
    </tr>
  );
}

// ============================================================
// الصفحة الرئيسية
// ============================================================
export default function AccountsPage() {
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [filter, setFilter] = useState({ search: '', type: '', active: '', posting: '' });
  const [expanded, setExpanded] = useState(new Set());
  const [detailAcc, setDetailAcc] = useState(null);
  const [formAcc, setFormAcc] = useState(null); // null = closed, {} = new, {id:...} = edit
  const [viewMode, setViewMode] = useState('tree'); // tree | flat

  // جلب الحسابات بدفعات
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setLoadProgress(0);
    const PAGE = 1000;
    let all = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from('accounts')
        .select('id, account_code, name_ar, name_en, account_type, balance_type, parent_id, level, is_active, allow_posting, opening_balance, currency')
        .order('account_code').range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all = [...all, ...data];
      setLoadProgress(all.length);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    setAllAccounts(all);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // بناء شجرة الحسابات
  const tree = useMemo(() => {
    const map = {};
    const roots = [];
    allAccounts.forEach(a => { map[a.id] = { ...a, children: [] }; });
    allAccounts.forEach(a => {
      if (a.parent_id && map[a.parent_id]) map[a.parent_id].children.push(map[a.id]);
      else roots.push(map[a.id]);
    });
    return roots;
  }, [allAccounts]);

  // تسطيح الشجرة مع مراعاة expand/collapse
  const flatTree = useMemo(() => {
    if (viewMode === 'flat') return allAccounts;
    const result = [];
    const walk = (nodes, depth) => {
      nodes.forEach(n => {
        result.push({ ...n, depth });
        if (expanded.has(n.id) && n.children?.length) walk(n.children, depth + 1);
      });
    };
    walk(tree, 0);
    return result;
  }, [tree, expanded, viewMode, allAccounts]);

  // تطبيق الفلاتر
  const filtered = useMemo(() => {
    const q = filter.search.toLowerCase();
    const src = viewMode === 'tree' ? flatTree : allAccounts;
    return src.filter(a => {
      if (filter.search && !a.account_code?.toLowerCase().includes(q) && !a.name_ar?.toLowerCase().includes(q) && !a.name_en?.toLowerCase().includes(q)) return false;
      if (filter.type && a.account_type !== filter.type) return false;
      if (filter.active === 'active' && !a.is_active) return false;
      if (filter.active === 'inactive' && a.is_active) return false;
      if (filter.posting === 'yes' && !a.allow_posting) return false;
      if (filter.posting === 'no' && a.allow_posting) return false;
      return true;
    });
  }, [flatTree, allAccounts, filter, viewMode]);

  // عند البحث: switch to flat view automatically
  useEffect(() => {
    if (filter.search || filter.type || filter.active || filter.posting) setViewMode('flat');
    else setViewMode('tree');
  }, [filter]);

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(allAccounts.map(a => a.id)));
  const collapseAll = () => setExpanded(new Set());

  // تصدير Excel
  const exportExcel = () => {
    const rows = [
      ['كود الحساب', 'الاسم (عربي)', 'الاسم (إنجليزي)', 'النوع', 'الطبيعة', 'الرصيد الافتتاحي', 'الحالة', 'يقبل قيود'],
      ...(filter.search || filter.type ? filtered : allAccounts).map(a => [
        a.account_code, a.name_ar, a.name_en || '',
        styles.badge(a.account_type).label,
        a.balance_type === 'debit' ? 'مدين' : 'دائن',
        Number(a.opening_balance || 0).toFixed(3),
        a.is_active ? 'نشط' : 'غير نشط',
        a.allow_posting ? 'نعم' : 'لا',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `دليل_الحسابات_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  // طباعة
  const printAccounts = () => {
    const src = filter.search || filter.type ? filtered : allAccounts;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>دليل الحسابات</title>
    <style>body{font-family:Cairo,Tahoma,sans-serif;direction:rtl;padding:20px;}h2{color:#1a365d;text-align:center;}table{width:100%;border-collapse:collapse;}th{background:#2c5282;color:#fff;padding:8px;text-align:right;font-size:12px;}td{padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;}tr:nth-child(even)td{background:#f9fbff;}.type{display:inline-block;padding:1px 6px;border-radius:10px;font-size:10px;}</style>
    </head><body><h2>📊 دليل الحسابات</h2><p style="text-align:center;color:#888;font-size:12px;">إجمالي: ${src.length} حساب — ${new Date().toLocaleDateString('ar-KW')}</p>
    <table><thead><tr><th>كود الحساب</th><th>الاسم</th><th>النوع</th><th>الطبيعة</th><th>الرصيد الافتتاحي</th><th>الحالة</th></tr></thead>
    <tbody>${src.map(a => `<tr><td style="font-weight:bold;color:#2c5282">${a.account_code}</td><td>${a.name_ar}</td><td>${styles.badge(a.account_type).label}</td><td>${a.balance_type === 'debit' ? 'مدين' : 'دائن'}</td><td style="text-align:left;direction:ltr">${Number(a.opening_balance || 0).toFixed(3)}</td><td>${a.is_active ? 'نشط' : 'غير نشط'}</td></tr>`).join('')}</tbody>
    </table><script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    w.document.close();
  };

  // إحصائيات
  const stats = useMemo(() => ({
    total: allAccounts.length,
    active: allAccounts.filter(a => a.is_active).length,
    types: ACCOUNT_TYPES.map(t => ({ ...t, count: allAccounts.filter(a => a.account_type === t.val).length })),
  }), [allAccounts]);

  // الشجرة لكل حساب
  const childrenMap = useMemo(() => {
    const m = {};
    allAccounts.forEach(a => { if (a.parent_id) { m[a.parent_id] = true; } });
    return m;
  }, [allAccounts]);

  // حد عرض الصفحة (virtual scroll بسيط)
  const [displayLimit, setDisplayLimit] = useState(200);
  const displayItems = filtered.slice(0, displayLimit);
  const hasMore = filtered.length > displayLimit;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>📊 دليل الحسابات</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setFormAcc({})} style={styles.btn()}>➕ حساب جديد</button>
          <button onClick={printAccounts} style={styles.btn('#1a365d')}>🖨️ طباعة PDF</button>
          <button onClick={exportExcel} style={styles.btn('#2c7a2c')}>📊 تصدير Excel</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ background: '#dce8f5', borderRadius: '8px', padding: '10px 16px' }}>
          <div style={{ fontSize: '11px', color: '#666' }}>إجمالي الحسابات</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c5282' }}>{loading ? '...' : stats.total.toLocaleString()}</div>
        </div>
        <div style={{ background: '#dce8f5', borderRadius: '8px', padding: '10px 16px' }}>
          <div style={{ fontSize: '11px', color: '#666' }}>حسابات نشطة</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#155724' }}>{loading ? '...' : stats.active.toLocaleString()}</div>
        </div>
        {!loading && stats.types.map(t => t.count > 0 && (
          <div key={t.val} style={{ background: styles.badge(t.val).bg, borderRadius: '8px', padding: '10px 16px' }}>
            <div style={{ fontSize: '11px', color: styles.badge(t.val).color }}>{t.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: styles.badge(t.val).color }}>{t.count.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={styles.card}>
        <div style={styles.filterRow}>
          <div style={{ flex: 3, minWidth: '200px' }}>
            <label style={styles.label}>🔍 بحث (كود أو اسم)</label>
            <input style={styles.input} value={filter.search} onChange={e => { setFilter({ ...filter, search: e.target.value }); setDisplayLimit(200); }} placeholder='اكتب كود الحساب أو الاسم...' />
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={styles.label}>نوع الحساب</label>
            <select style={styles.select} value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
              <option value=''>الكل</option>
              {ACCOUNT_TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '110px' }}>
            <label style={styles.label}>الحالة</label>
            <select style={styles.select} value={filter.active} onChange={e => setFilter({ ...filter, active: e.target.value })}>
              <option value=''>الكل</option><option value='active'>نشط فقط</option><option value='inactive'>غير نشط</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={styles.label}>يقبل قيود</label>
            <select style={styles.select} value={filter.posting} onChange={e => setFilter({ ...filter, posting: e.target.value })}>
              <option value=''>الكل</option><option value='yes'>نعم فقط</option><option value='no'>لا فقط</option>
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '6px' }}>
            <button onClick={() => { setFilter({ search: '', type: '', active: '', posting: '' }); setDisplayLimit(200); }} style={styles.btn('#888')}>🔄 مسح</button>
            {!filter.search && !filter.type && (
              <>
                <button onClick={expandAll} style={styles.btnSm('#2c7a2c')}>⊞ فتح الكل</button>
                <button onClick={collapseAll} style={styles.btnSm('#888')}>⊟ إغلاق الكل</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={styles.card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#2c5282' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>جاري تحميل الحسابات...</div>
            <div style={{ color: '#888', fontSize: '14px' }}>تم تحميل {loadProgress.toLocaleString()} حساب</div>
            <div style={{ background: '#b0c4de', borderRadius: '10px', height: '8px', marginTop: '12px', maxWidth: '300px', margin: '12px auto 0' }}>
              <div style={{ background: '#2c5282', height: '8px', borderRadius: '10px', width: Math.min(100, (loadProgress / 3200) * 100) + '%', transition: 'width 0.3s' }}></div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '8px', color: '#666', fontSize: '12px' }}>
              عرض {Math.min(displayLimit, filtered.length).toLocaleString()} من {filtered.length.toLocaleString()} حساب
              {viewMode === 'tree' && <span style={{ marginRight: '8px', color: '#2c5282' }}>(وضع الشجرة)</span>}
              {viewMode === 'flat' && <span style={{ marginRight: '8px', color: '#e67e22' }}>(وضع القائمة — نتيجة البحث)</span>}
            </div>
            <div style={{ ...styles.tableWrapper, maxHeight: '600px', overflowY: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['كود الحساب', 'الاسم', 'النوع', 'الطبيعة', 'الرصيد الافتتاحي', 'الحالة', 'قيود'].map((h, i) => (
                      <th key={i} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayItems.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>لا توجد حسابات مطابقة</td></tr>
                  ) : displayItems.map(acc => (
                    <AccountRow
                      key={acc.id}
                      account={acc}
                      depth={viewMode === 'tree' ? (acc.depth || 0) : 0}
                      onSelect={setDetailAcc}
                      expanded={expanded.has(acc.id)}
                      onToggle={toggleExpand}
                      hasChildren={!!childrenMap[acc.id]}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button onClick={() => setDisplayLimit(d => d + 200)} style={styles.btn('#2c5282')}>
                  تحميل المزيد ({(filtered.length - displayLimit).toLocaleString()} متبقي)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {detailAcc && (
        <AccountDetailModal account={detailAcc} onClose={() => setDetailAcc(null)} onEdit={(a) => { setDetailAcc(null); setFormAcc(a); }} />
      )}
      {formAcc !== null && (
        <AccountFormModal account={formAcc?.id ? formAcc : null} onClose={() => setFormAcc(null)} onSaved={() => { setFormAcc(null); fetchAccounts(); }} />
      )}
    </div>
  );
}
