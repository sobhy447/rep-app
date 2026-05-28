import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const EMPTY_LINE = { account_id: '', cost_center_id: '', additional_cost_center_code: '', additional_cost_center_id: '', client_name: '', defendant_name: '', amount: '', description: '' };

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('receipt'); // receipt | payment
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    voucher_type: 'receipt',
    voucher_date: new Date().toISOString().split('T')[0],
    cash_account_id: '',
    party_type: 'customer',
    customer_id: '',
    party_name: '',
    additional_cost_center_code: '',
    additional_cost_center_id: '',
    client_name: '',
    defendant_name: '',
    description: '',
    payment_method: 'cash',
    reference_number: '',
    currency: 'KWD',
    exchange_rate: '1',
    notes: '',
  });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: accs }, { data: ccs }, { data: custs }, { data: vchs }] = await Promise.all([
      supabase.from('accounts').select('id,account_code,name_ar,account_type').order('account_code'),
      supabase.from('cost_centers').select('id,code,name_ar').eq('is_active', true).order('code'),
      supabase.from('customers').select('id,name_ar,code').order('name_ar'),
      supabase.from('vouchers').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setAccounts(accs || []);
    setCostCenters(ccs || []);
    setCustomers(custs || []);
    setVouchers(vchs || []);
    setLoading(false);
  }

  // جلب مركز التكلفة الإضافي (رأس السند)
  async function handleHeaderCCCode(code) {
    setForm(f => ({ ...f, additional_cost_center_code: code, additional_cost_center_id: '', client_name: '', defendant_name: '' }));
    if (/^\d{5}$/.test(code)) {
      const { data } = await supabase.from('additional_cost_centers').select('id,client_name,defendant_name').eq('code', code).single();
      if (data) setForm(f => ({ ...f, additional_cost_center_id: data.id, client_name: data.client_name, defendant_name: data.defendant_name }));
      else setForm(f => ({ ...f, client_name: '⚠ كود غير موجود' }));
    }
  }

  // جلب مركز التكلفة الإضافي (سطور السند)
  async function handleLineCCCode(idx, code) {
    const updated = [...lines];
    updated[idx].additional_cost_center_code = code;
    updated[idx].additional_cost_center_id = '';
    updated[idx].client_name = '';
    updated[idx].defendant_name = '';
    if (/^\d{5}$/.test(code)) {
      const { data } = await supabase.from('additional_cost_centers').select('id,client_name,defendant_name').eq('code', code).single();
      if (data) { updated[idx].additional_cost_center_id = data.id; updated[idx].client_name = data.client_name; updated[idx].defendant_name = data.defendant_name; }
      else updated[idx].client_name = '⚠ غير موجود';
    }
    setLines(updated);
  }

  const totalLines = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

  async function handleSave(saveStatus = 'draft') {
    setError('');
    if (!form.description) { setError('الوصف مطلوب'); return; }
    if (!form.cash_account_id) { setError('حساب الصندوق/البنك مطلوب'); return; }
    const validLines = lines.filter(l => l.account_id && parseFloat(l.amount) > 0);
    if (validLines.length === 0) { setError('يجب إدخال سطر واحد على الأقل'); return; }
    if (totalLines <= 0) { setError('المبلغ الإجمالي يجب أن يكون أكبر من صفر'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = form.voucher_type === 'receipt' ? 'RCP' : 'PAY';
      const { count } = await supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('voucher_type', form.voucher_type);
      const voucherNumber = `${prefix}${year}-${String((count || 0) + 1).padStart(4, '0')}`;

      const voucherData = {
        voucher_number: voucherNumber,
        voucher_type: form.voucher_type,
        voucher_date: form.voucher_date,
        cash_account_id: form.cash_account_id,
        party_type: form.party_type || null,
        customer_id: form.customer_id || null,
        party_name: form.party_name || null,
        additional_cost_center_id: form.additional_cost_center_id || null,
        client_name: form.client_name || null,
        defendant_name: form.defendant_name || null,
        total_amount: totalLines,
        currency: form.currency,
        exchange_rate: parseFloat(form.exchange_rate) || 1,
        description: form.description,
        payment_method: form.payment_method,
        reference_number: form.reference_number || null,
        notes: form.notes || null,
        status: saveStatus,
        created_by: user?.id,
      };

      const { data: saved, error: ve } = await supabase.from('vouchers').insert(voucherData).select().single();
      if (ve) throw ve;

      const linesData = validLines.map((l, i) => ({
        voucher_id: saved.id,
        line_number: i + 1,
        account_id: l.account_id,
        cost_center_id: l.cost_center_id || null,
        additional_cost_center_id: l.additional_cost_center_id || form.additional_cost_center_id || null,
        amount: parseFloat(l.amount),
        description: l.description || form.description,
      }));
      const { error: le } = await supabase.from('voucher_lines').insert(linesData);
      if (le) throw le;

      // ترحيل فوري إذا طُلب
      if (saveStatus === 'posted') {
        await supabase.rpc('post_voucher', { p_voucher_id: saved.id, p_user_id: user?.id });
      }

      setSuccess(`تم ${saveStatus === 'posted' ? 'إنشاء وترحيل' : 'حفظ'} السند ${voucherNumber} ✓`);
      setShowForm(false);
      resetForm();
      loadAll();
    } catch (e) {
      setError(e.message || 'خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  }

  async function handlePost(v) {
    if (!window.confirm(`ترحيل السند ${v.voucher_number}؟`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.rpc('post_voucher', { p_voucher_id: v.id, p_user_id: user?.id });
    if (error) setError(error.message);
    else { setSuccess('تم الترحيل ✓'); loadAll(); }
  }

  async function handleCancel(v) {
    if (v.status === 'posted') { setError('لا يمكن إلغاء سند مرحّل'); return; }
    if (!window.confirm('إلغاء السند؟')) return;
    const { error } = await supabase.from('vouchers').update({ status: 'cancelled' }).eq('id', v.id);
    if (!error) { setSuccess('تم الإلغاء ✓'); loadAll(); }
  }

  function resetForm() {
    setForm({ voucher_type: activeTab, voucher_date: new Date().toISOString().split('T')[0], cash_account_id: '', party_type: 'customer', customer_id: '', party_name: '', additional_cost_center_code: '', additional_cost_center_id: '', client_name: '', defendant_name: '', description: '', payment_method: 'cash', reference_number: '', currency: 'KWD', exchange_rate: '1', notes: '' });
    setLines([{ ...EMPTY_LINE }]);
    setError('');
  }

  const cashAccounts = accounts.filter(a => a.account_type === 'assets');
  const filtered = vouchers.filter(v => {
    const mt = filterType === 'all' || v.voucher_type === filterType;
    const ms = filterStatus === 'all' || v.status === filterStatus;
    const mq = !search || v.voucher_number?.includes(search) || v.description?.includes(search) || v.client_name?.includes(search);
    return mt && ms && mq;
  });

  return (
    <div style={{ fontFamily: 'Tajawal, Arial, sans-serif', direction: 'rtl', padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: '#1e293b' }}>🧾 سندات القبض والصرف</h2>
        <button onClick={() => { resetForm(); setForm(f => ({ ...f, voucher_type: activeTab })); setShowForm(true); }}
          style={{ background: activeTab === 'receipt' ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}>
          + {activeTab === 'receipt' ? 'سند قبض' : 'سند صرف'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {[{ key: 'receipt', label: '📥 سندات القبض', color: '#16a34a' }, { key: 'payment', label: '📤 سندات الصرف', color: '#dc2626' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: activeTab === t.key ? t.color : '#64748b', borderBottom: activeTab === t.key ? `3px solid ${t.color}` : '3px solid transparent', marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 12 }}>{error} <button onClick={() => setError('')} style={{ float: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button></div>}
      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: 8, marginBottom: 12 }}>{success} <button onClick={() => setSuccess('')} style={{ float: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button></div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم أو وصف أو موكل..."
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', flex: 1, fontFamily: 'inherit', fontSize: 14 }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit', fontSize: 14 }}>
          <option value="all">كل الأنواع</option>
          <option value="receipt">قبض</option>
          <option value="payment">صرف</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit', fontSize: 14 }}>
          <option value="all">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="posted">مرحّل</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {/* ─── نموذج السند ─── */}
      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', color: form.voucher_type === 'receipt' ? '#16a34a' : '#dc2626' }}>
            {form.voucher_type === 'receipt' ? '📥 سند قبض جديد' : '📤 سند صرف جديد'}
          </h3>

          {/* بيانات الرأس */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <label style={lbl}>
              نوع السند
              <select value={form.voucher_type} onChange={e => setForm(f => ({ ...f, voucher_type: e.target.value }))} style={inp}>
                <option value="receipt">سند قبض</option>
                <option value="payment">سند صرف</option>
              </select>
            </label>
            <label style={lbl}>
              التاريخ
              <input type="date" value={form.voucher_date} onChange={e => setForm(f => ({ ...f, voucher_date: e.target.value }))} style={inp} />
            </label>
            <label style={lbl}>
              حساب الصندوق/البنك *
              <select value={form.cash_account_id} onChange={e => setForm(f => ({ ...f, cash_account_id: e.target.value }))} style={inp}>
                <option value="">-- اختر --</option>
                {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}
                {accounts.filter(a => !cashAccounts.includes(a)).map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}
              </select>
            </label>
            <label style={lbl}>
              طريقة الدفع
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} style={inp}>
                <option value="cash">نقدي</option>
                <option value="check">شيك</option>
                <option value="transfer">تحويل بنكي</option>
                <option value="card">بطاقة</option>
              </select>
            </label>
            {(form.payment_method === 'check' || form.payment_method === 'transfer') && (
              <label style={lbl}>
                رقم الشيك/التحويل
                <input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} style={inp} placeholder="رقم المرجع" />
              </label>
            )}
            <label style={lbl}>
              الطرف المقابل
              <select value={form.party_type} onChange={e => setForm(f => ({ ...f, party_type: e.target.value }))} style={inp}>
                <option value="customer">عميل</option>
                <option value="employee">موظف</option>
                <option value="other">آخر</option>
              </select>
            </label>
            {form.party_type === 'customer' ? (
              <label style={lbl}>
                اختر العميل
                <select value={form.customer_id} onChange={e => { const c = customers.find(x => x.id === e.target.value); setForm(f => ({ ...f, customer_id: e.target.value, party_name: c?.name_ar || '' })); }} style={inp}>
                  <option value="">-- اختر --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{{c.name_ar}</option>)}
                </select>
              </label>
            ) : (
              <label style={lbl}>
                اسم الطرف
                <input value={form.party_name} onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))} style={inp} placeholder="اسم الطرف المقابل" />
              </label>
            )}
          </div>

          {/* كود الملف (مركز تكلفة إضافي) - رأس السند */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 10, fontSize: 14 }}>📁 مركز التكلفة الإضافي (كود الملف)</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label style={{ ...lbl, flex: '0 0 120px' }}>
                كود الملف (5 أرقام)
                <input value={form.additional_cost_center_code} onChange={e => handleHeaderCCCode(e.target.value)}
                  style={{ ...inp, fontWeight: 700, fontSize: 16, textAlign: 'center' }} maxLength={5} placeholder="12345" />
              </label>
              <label style={{ ...lbl, flex: 1 }}>
                اسم الموكل (تلقائي)
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', background: '#f0f9ff', color: form.client_name?.startsWith('⚠') ? '#dc2626' : '#1e293b', minHeight: 38 }}>
                  {form.client_name || '—'}
                </div>
              </label>
              <label style={{ ...lbl, flex: 1 }}>
                اسم الخصم (تلقائي)
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', background: '#f0f9ff', color: '#1e293b', minHeight: 38 }}>
                  {form.defendant_name || '—'}
                </div>
              </label>
            </div>
          </div>

          <label style={{ ...lbl, marginBottom: 16 }}>
            الوصف *
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inp} placeholder="وصف السند" />
          </label>

          {/* سطور التوزيع */}
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: 10 }}>توزيع المبلغ على الحسابات</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#e2e8f0' }}>
                  <th style={th}>#</th>
                  <th style={th}>الحساب</th>
                  <th style={th}>مركز التكلفة</th>
                  <th style={{ ...th, background: '#dbeafe' }}>كود الملف</th>
                  <th style={{ ...th, background: '#dbeafe' }}>الموكل</th>
                  <th style={th}>المبلغ</th>
                  <th style={th}>بيان</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td style={td}>{idx + 1}</td>
                    <td style={td}>
                      <select value={line.account_id} onChange={e => { const updated = [...lines]; updated[idx].account_id = e.target.value; setLines(updated); }}
                        style={{ ...cellInp, minWidth: 160 }}>
                        <option value="">-- اختر --</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <select value={line.cost_center_id} onChange={e => { const updated = [...lines]; updated[idx].cost_center_id = e.target.value; setLines(updated); }}
                        style={{ ...cellInp, minWidth: 120 }}>
                        <option value="">-- اختياري --</option>
                        {costCenters.map(c => <option key={c.id} value={c.id}>{c.code} - {{c.name_ar}</option>)}
                      </select>
                    </td>
                    <td style={{ ...td, background: '#eff6ff' }}>
                      <input value={line.additional_cost_center_code} onChange={e => handleLineCCCode(idx, e.target.value)}
                        style={{ ...cellInp, width: 70, background: '#eff6ff' }} maxLength={5} placeholder="12345" />
                    </td>
                    <td style={{ ...td, background: '#eff6ff' }}>
                      <div style={{ fontSize: 12, color: line.client_name?.startsWith('⚠') ? '#dc2626' : '#374151', minWidth: 80 }}>
                        {line.client_name || form.client_name || '—'}
                      </div>
                    </td>
                    <td style={td}>
                      <input type="number" value={line.amount} onChange={e => { const updated = [...lines]; updated[idx].amount = e.target.value; setLines(updated); }}
                        style={{ ...cellInp, width: 100, fontWeight: 700 }} min="0" step="0.001" />
                    </td>
                    <td style={td}>
                      <input value={line.description} onChange={e => { const updated = [...lines]; updated[idx].description = e.target.value; setLines(updated); }}
                        style={{ ...cellInp, minWidth: 120 }} placeholder="بيان" />
                    </td>
                    <td style={td}>
                      <button onClick={() => setLines(lines.filter((_, i) => i !== idx))} disabled={lines.length <= 1}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                  <td colSpan={5} style={{ ...td, textAlign: 'center' }}>
                    <button onClick={() => setLines([...lines, { ...EMPTY_LINE }])}
                      style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      + إضافة سطر
                    </button>
                  </td>
                  <td style={{ ...td, fontSize: 16 }}>{totalLines.toFixed(3)}</td>
                  <td colSpan={2} style={td}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* أزرار */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>
              إلغاء
            </button>
            <button onClick={() => handleSave('draft')} disabled={saving}
              style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              حفظ كمسودة
            </button>
            <button onClick={() => handleSave('posted')} disabled={saving}
              style={{ background: form.voucher_type === 'receipt' ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? '...' : 'حفظ وترحيل'}
            </button>
          </div>
        </div>
      )}

      {/* ─── قائمة السندات ─── */}
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>⏳ جار التحميل...</div> : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>رقم السند</th>
                <th style={th}>النوع</th>
                <th style={th}>التاريخ</th>
                <th style={th}>الوصف</th>
                <th style={th}>كود الملف</th>
                <th style={th}>الموكل</th>
                <th style={th}>المبلغ</th>
                <th style={th}>الحالة</th>
                <th style={th}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.filter(v => filterType === 'all' || v.voucher_type === (filterType !== 'all' ? filterType : v.voucher_type))
                .filter(v => activeTab === 'all' || v.voucher_type === activeTab)
                .length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>لا توجد سندات</td></tr>
              ) : filtered.filter(v => v.voucher_type === activeTab).map(v => (
                <tr key={v.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 600, color: v.voucher_type === 'receipt' ? '#16a34a' : '#dc2626' }}>{v.voucher_number}</td>
                  <td style={td}>
                    <span style={{ background: v.voucher_type === 'receipt' ? '#dcfce7' : '#fee2e2', color: v.voucher_type === 'receipt' ? '#16a34a' : '#dc2626', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {v.voucher_type === 'receipt' ? 'قبض' : 'صرف'}
                    </span>
                  </td>
                  <td style={td}>{v.voucher_date}</td>
                  <td style={td}>{v.description}</td>
                  <td style={{ ...td, color: '#2563eb', fontWeight: 600 }}>{v.additional_cost_center_id ? '✓' : '—'}</td>
                  <td style={td}>{v.client_name || '—'}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{parseFloat(v.total_amount || 0).toFixed(3)} {v.currency}</td>
                  <td style={td}>
                    <span style={{ background: v.status === 'posted' ? '#dcfce7' : v.status === 'draft' ? '#fef9c3' : '#fee2e2', color: v.status === 'posted' ? '#16a34a' : v.status === 'draft' ? '#a16207' : '#dc2626', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {v.status === 'posted' ? 'مرحّل' : v.status === 'draft' ? 'مسودة' : 'ملغي'}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {v.status === 'draft' && (
                        <button onClick={() => handlePost(v)} style={btnSmall('#16a34a')}>ترحيل</button>
                      )}
                      {v.status !== 'posted' && (
                        <button onClick={() => handleCancel(v)} style={btnSmall('#dc2626')}>إلغاء</button>
                      )}
                      <button onClick={() => alert('طباعة قريباً')} style={btnSmall('#64748b')}>طباعة</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 600 };
const inp = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontFamily: 'Tajawal, Arial, sans-serif', fontSize: 14, background: '#fff' };
const th = { padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#374151', borderLeft: '1px solid #e2e8f0' };
const td = { padding: '8px 10px', textAlign: 'right', verticalAlign: 'middle' };
const cellInp = { border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontFamily: 'Tajawal, Arial, sans-serif', fontSize: 13, width: '100%', background: '#fff' };
const btnSmall = (color) => ({ background: color + '15', color, border: `1px solid ${color}40`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 });
