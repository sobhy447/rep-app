import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// ═══════════════════════════════════════════
// نظام العهدة الكامل - 4 مراحل
// ═══════════════════════════════════════════
export default function CustodyPage() {
  const [activeTab, setActiveTab] = useState('requests');
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const tabs = [
    { key: 'requests', label: '📋 طلبات الصرف', color: '#2563eb' },
    { key: 'vouchers', label: '📄 سندات العهدة', color: '#7c3aed' },
    { key: 'reports', label: '📊 التقارير', color: '#0284c7' },
    { key: 'settings', label: '⚙️ الإعدادات', color: '#64748b' },
  ];

  return (
    <div style={{ fontFamily: 'Tajawal, Arial, sans-serif', direction: 'rtl', padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: 22 }}>🗂️ نظام العهدة</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #e2e8f0' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: activeTab === t.key ? t.color : '#64748b', borderBottom: activeTab === t.key ? `3px solid ${t.color}` : '3px solid transparent', marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'requests' && <CustodyRequests user={user} />}
      {activeTab === 'vouchers' && <CustodyVouchers user={user} />}
      {activeTab === 'reports' && <CustodyReports />}
      {activeTab === 'settings' && <CustodySettings user={user} />}
    </div>
  );
}

// ═══════════════════════════════════════════
// المرحلة 1: طلبات صرف العهدة (المندوب)
// ═══════════════════════════════════════════
function CustodyRequests({ user }) {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    custody_employee_id: '',
    custody_item_id: '',
    additional_cost_center_code: '',
    additional_cost_center_id: '',
    client_name: '',
    defendant_name: '',
    amount: '',
    description: '',
    notes: '',
  });
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: emps }, { data: itms }, { data: reqs }] = await Promise.all([
      supabase.from('custody_employees').select('*').eq('is_active', true).order('full_name'),
      supabase.from('custody_items').select('*,cost_centers(name_ar),accounts(name_ar)').eq('is_active', true).order('full_name_ar'),
      supabase.from('custody_requests').select('*,custody_employees(full_name),custody_items(name)').order('created_at', { ascending: false }).limit(100),
    ]);
    setEmployees(emps || []);
    setItems(itms || []);
    setRequests(reqs || []);
    setLoading(false);
  }

  async function handleItemChange(itemId) {
    const item = items.find(i => i.id === itemId);
    setSelectedItem(item);
    setForm(f => ({
      ...f,
      custody_item_id: itemId,
      amount: item?.fixed_amount?.toString() || '',
    }));
  }

  async function handleCCCode(code) {
    setForm(f => ({ ...f, additional_cost_center_code: code, additional_cost_center_id: '', client_name: '', defendant_name: '' }));
    if (/^\d{5}$/.test(code)) {
      const { data } = await supabase.from('additional_cost_centers').select('id,client_name,defendant_name').eq('code', code).single();
      if (data) setForm(f => ({ ...f, additional_cost_center_id: data.id, client_name: data.client_name, defendant_name: data.defendant_name }));
      else setForm(f => ({ ...f, client_name: '⚠ كود غير موجود' }));
    }
  }

  async function handleSave() {
    setError('');
    if (!form.custody_employee_id) { setError('اختر الموظف'); return; }
    if (!form.custody_item_id) { setError('اختر بند العهدة'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('أدخل مبلغاً صحيحاً'); return; }
    if (!form.description) { setError('الوصف مطلوب'); return; }

    setSaving(true);
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      const { count } = await supabase.from('custody_requests').select('*', { count: 'exact', head: true });
      const requestNumber = `CRQ${year}-${String((count || 0) + 1).padStart(4, '0')}`;

      const { error: e } = await supabase.from('custody_requests').insert({
        request_number: requestNumber,
        request_date: new Date().toISOString().split('T')[0],
        custody_employee_id: form.custody_employee_id,
        custody_item_id: form.custody_item_id,
        additional_cost_center_id: form.additional_cost_center_id || null,
        client_name: form.client_name || null,
        defendant_name: form.defendant_name || null,
        amount: parseFloat(form.amount),
        description: form.description,
        notes: form.notes || null,
        status: 'pending',
        created_by: user?.id,
      });
      if (e) throw e;

      setSuccess('تم إنشاء طلب العهدة ✓');
      setShowForm(false);
      resetForm();
      loadAll();
    } catch (e) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  async function handleApprove(req) {
    if (!window.confirm(`الموافقة على طلب ${req.request_number}؟`)) return;
    const { error } = await supabase.from('custody_requests').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', req.id);
    if (!error) { setSuccess('تم الاعتماد ✓'); loadAll(); }
  }

  async function handleReject(req) {
    const reason = prompt('سبب الرفض:');
    if (!reason) return;
    const { error } = await supabase.from('custody_requests').update({ status: 'rejected', rejection_reason: reason }).eq('id', req.id);
    if (!error) { setSuccess('تم الرفض'); loadAll(); }
  }

  function resetForm() {
    setForm({ custody_employee_id: '', custody_item_id: '', additional_cost_center_code: '', additional_cost_center_id: '', client_name: '', defendant_name: '', amount: '', description: '', notes: '' });
    setSelectedItem(null);
    setError('');
  }

  const statusBadge = (s) => ({
    pending: { bg: '#fef9c3', color: '#a16207', label: 'معلّق' },
    approved: { bg: '#dcfce7', color: '#16a34a', label: 'معتمد' },
    rejected: { bg: '#fee2e2', color: '#dc2626', label: 'مرفوض' },
    posted: { bg: '#e0f2fe', color: '#0284c7', label: 'مرحّل' },
  }[s] || { bg: '#f1f5f9', color: '#64748b', label: s });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#1e293b' }}>طلبات صرف العهدة</h3>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
          + طلب صرف جديد
        </button>
      </div>

      {error && <div style={alertStyle('red')}>{error} <button onClick={() => setError('')} style={closeBtn}>×</button></div>}
      {success && <div style={alertStyle('green')}>{success} <button onClick={() => setSuccess('')} style={closeBtn}>×</button></div>}

      {/* نموذج الطلب */}
      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 16px', color: '#2563eb' }}>طلب صرف عهدة جديد</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>

            <label style={lbl}>
              الموظف المندوب *
              <select value={form.custody_employee_id} onChange={e => setForm(f => ({ ...f, custody_employee_id: e.target.value }))} style={inp}>
                <option value="">-- اختر --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code || '—'})</option>)}
              </select>
            </label>

            <label style={lbl}>
              بند العهدة *
              <select value={form.custody_item_id} onChange={e => handleItemChange(e.target.value)} style={inp}>
                <option value="">-- اختر --</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.recurrence === 'monthly' ? 'شهري' : i.recurrence === 'once' ? 'لمرة واحدة' : i.recurrence})</option>)}
              </select>
            </label>

            {selectedItem && (
              <div style={{ background: '#e0f2fe', borderRadius: 8, padding: 12, fontSize: 13 }}>
                <div><b>النوع:</b> {selectedItem.item_type === 'cost_center' ? 'مركز تكلفة' : 'حساب مباشر'}</div>
                <div><b>المبلغ الثابت:</b> {selectedItem.fixed_amount} {selectedItem.currency}</div>
                <div><b>التكرار:</b> {selectedItem.recurrence}</div>
              </div>
            )}

            {/* كود الملف */}
            <label style={lbl}>
              كود الملف (5 أرقام) *
              <input value={form.additional_cost_center_code} onChange={e => handleCCCode(e.target.value)}
                style={{ ...inp, fontWeight: 700, fontSize: 16, textAlign: 'center' }} maxLength={5} placeholder="12345" />
            </label>

            <label style={lbl}>
              الموكل (تلقائي)
              <div style={{ ...inp, background: '#f0f9ff', color: form.client_name?.startsWith('⚠') ? '#dc2626' : '#1e293b', minHeight: 38 }}>
                {form.client_name || '—'}
              </div>
            </label>

            <label style={lbl}>
              الخصم (تلقائي)
              <div style={{ ...inp, background: '#f0f9ff', color: '#1e293b', minHeight: 38 }}>
                {form.defendant_name || '—'}
              </div>
            </label>

            <label style={lbl}>
              المبلغ *
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={inp} min="0" step="0.001" />
            </label>

            <label style={{ ...lbl, gridColumn: 'span 2' }}>
              الوصف *
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={inp} placeholder="وصف الصرف" />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            <button onClick={handleSave} disabled={saving}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? '...' : 'إنشاء الطلب'}
            </button>
          </div>
        </div>
      )}

      {/* قائمة الطلبات */}
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>⏳ جار التحميل...</div> : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['رقم الطلب', 'التاريخ', 'الموظف', 'البند', 'كود الملف', 'الموكل', 'المبلغ', 'الحالة', 'إجراءات'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {requests.length === 0
                ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>لا توجد طلبات</td></tr>
                : requests.map(r => {
                  const st = statusBadge(r.status);
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ ...td, fontWeight: 600, color: '#2563eb' }}>{r.request_number}</td>
                      <td style={td}>{r.request_date}</td>
                      <td style={td}>{r.custody_employees?.full_name}</td>
                      <td style={td}>{r.custody_items?.name}</td>
                      <td style={{ ...td, fontWeight: 700, color: '#1d4ed8' }}>{r.additional_cost_center_id ? '✓' : '—'}</td>
                      <td style={td}>{r.client_name || '—'}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{parseFloat(r.amount || 0).toFixed(3)}</td>
                      <td style={td}><span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{st.label}</span></td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {r.status === 'pending' && (<>
                            <button onClick={() => handleApprove(r)} style={btnSmall('#16a34a')}>اعتماد</button>
                            <button onClick={() => handleReject(r)} style={btnSmall('#dc2626')}>رفض</button>
                          </>)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// المرحلة 2: سندات العهدة + الترحيل (المحاسب)
// ═══════════════════════════════════════════
function CustodyVouchers({ user }) {
  const [vouchers, setVouchers] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ custody_request_id: '', voucher_type: 'custody_out', description: '', notes: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: vchs }, { data: reqs }] = await Promise.all([
      supabase.from('custody_vouchers')
        .select('*,custody_employees(full_name),custody_requests(request_number,amount,client_name,custody_items(name))')
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('custody_requests')
        .select('*,custody_employees(full_name),custody_items(name)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
    ]);
    setVouchers(vchs || []);
    setApprovedRequests(reqs || []);
    setLoading(false);
  }

  async function handleRequestSelect(reqId) {
    const req = approvedRequests.find(r => r.id === reqId);
    setSelectedRequest(req);
    setForm(f => ({
      ...f,
      custody_request_id: reqId,
      description: req ? `عهدة: ${req.custody_items?.name} - ${req.client_name || ''}` : '',
    }));
  }

  async function handleCreateVoucher() {
    setError('');
    if (!form.custody_request_id) { setError('اختر الطلب'); return; }
    if (!form.description) { setError('الوصف مطلوب'); return; }

    setSaving(true);
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      const { count } = await supabase.from('custody_vouchers').select('*', { count: 'exact', head: true });
      const voucherNumber = `CVS${year}-${String((count || 0) + 1).padStart(4, '0')}`;

      const { data: saved, error: ve } = await supabase.from('custody_vouchers').insert({
        voucher_number: voucherNumber,
        voucher_date: new Date().toISOString().split('T')[0],
        voucher_type: form.voucher_type,
        custody_request_id: form.custody_request_id,
        custody_employee_id: selectedRequest.custody_employee_id,
        total_amount: selectedRequest.amount,
        currency: 'KWD',
        description: form.description,
        notes: form.notes || null,
        status: 'draft',
        created_by: user?.id,
      }).select().single();
      if (ve) throw ve;

      // إنشاء سطور السند
      const employee = await supabase.from('custody_employees').select('credit_account_id').eq('id', selectedRequest.custody_employee_id).single();
      const item = await supabase.from('custody_items').select('*').eq('id', selectedRequest.custody_item_id).single();

      if (employee.data && item.data) {
        await supabase.from('custody_voucher_lines').insert([
          {
            voucher_id: saved.id,
            line_number: 1,
            account_id: item.data.account_id || item.data.cost_center_id, // حساب البند
            additional_cost_center_id: selectedRequest.additional_cost_center_id || null,
            debit_amount: selectedRequest.amount,
            credit_amount: 0,
            description: form.description,
          },
          {
            voucher_id: saved.id,
            line_number: 2,
            account_id: employee.data.credit_account_id, // الحساب الدائن للموظف
            additional_cost_center_id: selectedRequest.additional_cost_center_id || null,
            debit_amount: 0,
            credit_amount: selectedRequest.amount,
            description: form.description,
          },
        ]);
      }

      // تحديث حالة الطلب → posted
      await supabase.from('custody_requests').update({ status: 'posted' }).eq('id', form.custody_request_id);

      setSuccess(`تم إنشاء سند العهدة ${voucherNumber} ✓`);
      setShowForm(false);
      setForm({ custody_request_id: '', voucher_type: 'custody_out', description: '', notes: '' });
      setSelectedRequest(null);
      loadAll();
    } catch (e) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  async function handlePost(v) {
    if (!window.confirm(`ترحيل سند العهدة ${v.voucher_number}؟`)) return;
    const { error } = await supabase.from('custody_vouchers').update({
      status: 'posted',
      posted_by: user?.id,
      posted_at: new Date().toISOString(),
    }).eq('id', v.id);
    if (!error) { setSuccess('تم الترحيل ✓'); loadAll(); }
    else setError(error.message);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#1e293b' }}>سندات العهدة</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {approvedRequests.length > 0 && (
            <span style={{ background: '#fef9c3', color: '#a16207', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
              {approvedRequests.length} طلب بانتظار السند
            </span>
          )}
          <button onClick={() => setShowForm(true)} disabled={approvedRequests.length === 0}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, opacity: approvedRequests.length === 0 ? 0.5 : 1 }}>
            + سند عهدة جديد
          </button>
        </div>
      </div>

      {error && <div style={alertStyle('red')}>{error} <button onClick={() => setError('')} style={closeBtn}>×</button></div>}
      {success && <div style={alertStyle('green')}>{success} <button onClick={() => setSuccess('')} style={closeBtn}>×</button></div>}

      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 16px', color: '#7c3aed' }}>إنشاء سند عهدة</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            <label style={lbl}>
              الطلب المعتمد *
              <select value={form.custody_request_id} onChange={e => handleRequestSelect(e.target.value)} style={inp}>
                <option value="">-- اختر طلباً معتمداً --</option>
                {approvedRequests.map(r => <option key={r.id} value={r.id}>{r.request_number} - {r.custody_employees?.full_name} - {r.custody_items?.name}</option>)}
              </select>
            </label>

            {selectedRequest && (
              <div style={{ background: '#ede9fe', borderRadius: 8, padding: 12, fontSize: 13 }}>
                <div><b>الموظف:</b> {selectedRequest.custody_employees?.full_name}</div>
                <div><b>البند:</b> {selectedRequest.custody_items?.name}</div>
                <div><b>الموكل:</b> {selectedRequest.client_name || '—'}</div>
                <div><b>المبلغ:</b> {parseFloat(selectedRequest.amount || 0).toFixed(3)}</div>
              </div>
            )}

            <label style={lbl}>
              نوع السند
              <select value={form.voucher_type} onChange={e => setForm(f => ({ ...f, voucher_type: e.target.value }))} style={inp}>
                <option value="custody_out">صرف عهدة</option>
                <option value="custody_in">استرداد عهدة</option>
                <option value="custody_settle">تسوية عهدة</option>
              </select>
            </label>

            <label style={{ ...lbl, gridColumn: 'span 2' }}>
              الوصف *
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inp} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setSelectedRequest(null); }}
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            <button onClick={handleCreateVoucher} disabled={saving}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? '...' : 'إنشاء السند'}
            </button>
          </div>
        </div>
      )}

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>⏳ جار التحميل...</div> : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['رقم السند', 'النوع', 'التاريخ', 'الموظف', 'المبلغ', 'الحالة', 'القيد المحاسبي', 'إجراءات'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {vouchers.length === 0
                ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>لا توجد سندات</td></tr>
                : vouchers.map(v => (
                  <tr key={v.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ ...td, fontWeight: 600, color: '#7c3aed' }}>{v.voucher_number}</td>
                    <td style={td}><span style={{ background: '#ede9fe', color: '#7c3aed', padding: '3px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {v.voucher_type === 'custody_out' ? 'صرف' : v.voucher_type === 'custody_in' ? 'استرداد' : 'تسوية'}
                    </span></td>
                    <td style={td}>{v.voucher_date}</td>
                    <td style={td}>{v.custody_employees?.full_name}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{parseFloat(v.total_amount || 0).toFixed(3)}</td>
                    <td style={td}>
                      <span style={{ background: v.status === 'posted' ? '#dcfce7' : v.status === 'draft' ? '#fef9c3' : '#fee2e2', color: v.status === 'posted' ? '#16a34a' : v.status === 'draft' ? '#a16207' : '#dc2626', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {v.status === 'posted' ? 'مرحّل' : v.status === 'draft' ? 'مسودة' : 'ملغي'}
                      </span>
                    </td>
                    <td style={td}>{v.journal_entry_id ? <span style={{ color: '#16a34a' }}>✓ مرتبط</span> : '—'}</td>
                    <td style={td}>
                      {v.status === 'draft' && (
                        <button onClick={() => handlePost(v)} style={btnSmall('#16a34a')}>ترحيل</button>
                      )}
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

// ═══════════════════════════════════════════
// المرحلة 3: تقارير العهدة
// ═══════════════════════════════════════════
function CustodyReports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ employee: '', status: '', dateFrom: '', dateTo: '', ccCode: '' });

  useEffect(() => { loadReport(); }, []);

  async function loadReport() {
    setLoading(true);
    let q = supabase.from('custody_report').select('*').order('request_date', { ascending: false }).limit(200);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.dateFrom) q = q.gte('request_date', filters.dateFrom);
    if (filters.dateTo) q = q.lte('request_date', filters.dateTo);
    if (filters.ccCode) q = q.eq('additional_cost_center_code', filters.ccCode);
    const { data: rows } = await q;
    setData(rows || []);
    setLoading(false);
  }

  const total = data.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', color: '#1e293b' }}>تقارير العهدة</h3>
      {/* فلاتر */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit', fontSize: 14 }}>
          <option value="">كل الحالات</option>
          <option value="pending">معلّق</option>
          <option value="approved">معتمد</option>
          <option value="posted">مرحّل</option>
          <option value="rejected">مرفوض</option>
        </select>
        <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit', fontSize: 14 }} />
        <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit', fontSize: 14 }} />
        <input value={filters.ccCode} onChange={e => setFilters(f => ({ ...f, ccCode: e.target.value }))} placeholder="كود الملف"
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit', fontSize: 14, width: 100 }} maxLength={5} />
        <button onClick={loadReport}
          style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>
          بحث
        </button>
      </div>

      {/* إجمالي */}
      <div style={{ background: '#e0f2fe', borderRadius: 10, padding: '12px 20px', marginBottom: 16, display: 'flex', gap: 30 }}>
        <div><b>عدد السجلات:</b> {data.length}</div>
        <div><b>الإجمالي:</b> {total.toFixed(3)} KWD</div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>⏳ جار التحميل...</div> : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['رقم الطلب', 'التاريخ', 'الموظف', 'البند', 'كود الملف', 'الموكل', 'الخصم', 'المبلغ', 'الحالة', 'السند', 'القيد'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {data.length === 0
                ? <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>لا توجد بيانات</td></tr>
                : data.map((r, i) => (
                  <tr key={r.id || i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ ...td, color: '#2563eb', fontWeight: 600 }}>{r.request_number}</td>
                    <td style={td}>{r.request_date}</td>
                    <td style={td}>{r.employee_name}</td>
                    <td style={td}>{r.item_name}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#1d4ed8' }}>{r.additional_cost_center_code}</td>
                    <td style={td}>{r.client_name || '—'}</td>
                    <td style={td}>{r.defendant_name || '—'}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{parseFloat(r.amount || 0).toFixed(3)}</td>
                    <td style={td}><span style={{ background: r.status === 'posted' ? '#dcfce7' : r.status === 'pending' ? '#fef9c3' : '#f1f5f9', color: r.status === 'posted' ? '#16a34a' : r.status === 'pending' ? '#a16207' : '#64748b', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                      {r.status === 'posted' ? 'مرحّل' : r.status === 'pending' ? 'معلّق' : r.status === 'approved' ? 'معتمد' : 'مرفوض'}
                    </span></td>
                    <td style={td}>{r.voucher_number || '—'}</td>
                    <td style={td}>{r.journal_entry_number || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// إعدادات العهدة (بنود + موظفون)
// ═══════════════════════════════════════════
function CustodySettings({ user }) {
  const [settingsTab, setSettingsTab] = useState('items');
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => setSettingsTab('items')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, color: settingsTab === 'items' ? '#64748b' : '#94a3b8', borderBottom: settingsTab === 'items' ? '2px solid #64748b' : '2px solid transparent' }}>📦 بنود العهدة</button>
        <button onClick={() => setSettingsTab('employees')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, color: settingsTab === 'employees' ? '#64748b' : '#94a3b8', borderBottom: settingsTab === 'employees' ? '2px solid #64748b' : '2px solid transparent' }}>👤 موظفو العهدة</button>
      </div>
      {settingsTab === 'items' && <CustodyItems user={user} />}
      {settingsTab === 'employees' && <CustodyEmployees user={user} />}
    </div>
  );
}

function CustodyItems({ user }) {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', item_type: 'cost_center', cost_center_id: '', account_id: '', fixed_amount: '', recurrence: 'monthly', currency: 'KWD', notes: '' });

  useEffect(() => {
    Promise.all([
      supabase.from('custody_items').select('*,cost_centers(name_ar),accounts(name_ar)').order('full_name_ar'),
      supabase.from('accounts').select('id,account_code,name_ar').order('account_code'),
      supabase.from('cost_centers').select('id,code,name_ar').eq('is_active', true).order('code'),
    ]).then(([{ data: i }, { data: a }, { data: c }]) => { setItems(i || []); setAccounts(a || []); setCostCenters(c || []); });
  }, []);

  async function handleSave() {
    setError('');
    if (!form.name) { setError('الاسم مطلوب'); return; }
    if (form.item_type === 'cost_center' && !form.cost_center_id) { setError('اختر مركز التكلفة'); return; }
    if (form.item_type === 'direct_account' && !form.account_id) { setError('اختر الحساب'); return; }
    setSaving(true);
    const { error: e } = await supabase.from('custody_items').insert({ ...form, fixed_amount: parseFloat(form.fixed_amount) || 0, created_by: user?.id });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSuccess('تم الحفظ ✓');
    setShowForm(false);
    setForm({ name: '', item_type: 'cost_center', cost_center_id: '', account_id: '', fixed_amount: '', recurrence: 'monthly', currency: 'KWD', notes: '' });
    const { data } = await supabase.from('custody_items').select('*,cost_centers(name_ar),accounts(name_ar)').order('full_name_ar');
    setItems(data || []);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0 }}>بنود العهدة</h4>
        <button onClick={() => setShowForm(true)} style={{ background: '#64748b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>+ بند جديد</button>
      </div>
      {error && <div style={alertStyle('red')}>{error}</div>}
      {success && <div style={alertStyle('green')}>{success}</div>}
      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <label style={lbl}>الاسم *<input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} /></label>
            <label style={lbl}>النوع<select value={form.item_type} onChange={e => setForm(f => ({ ...f, item_type: e.target.value }))} style={inp}>
              <option value="cost_center">مركز تكلفة</option>
              <option value="direct_account">حساب مباشر</option>
            </select></label>
            {form.item_type === 'cost_center'
              ? <label style={lbl}>مركز التكلفة *<select value={form.cost_center_id} onChange={e => setForm(f => ({ ...f, cost_center_id: e.target.value }))} style={inp}><option value="">-- اختر --</option>{costCenters.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name_ar}</option>)}</select></label>
              : <label style={lbl}>الحساب *<select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} style={inp}><option value="">-- اختر --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}</select></label>
            }
            <label style={lbl}>القيمة الثابتة<input type="number" value={form.fixed_amount} onChange={e => setForm(f => ({ ...f, fixed_amount: e.target.value }))} style={inp} min="0" step="0.001" /></label>
            <label style={lbl}>التكرار<select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))} style={inp}>
              <option value="monthly">شهري</option>
              <option value="quarterly">ربع سنوي</option>
              <option value="yearly">سنوي</option>
              <option value="once">لمرة واحدة</option>
              <option value="on_demand">عند الطلب</option>
            </select></label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            <button onClick={handleSave} disabled={saving} style={{ background: '#64748b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>حفظ</button>
          </div>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <thead><tr style={{ background: '#f8fafc' }}>{['الاسم', 'النوع', 'مركز/حساب', 'القيمة', 'التكرار', 'الحالة'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {items.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>لا توجد بنود</td></tr>
            : items.map(i => <tr key={i.id} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ ...td, fontWeight: 600 }}>{i.name}</td>
              <td style={td}>{i.item_type === 'cost_center' ? 'مركز تكلفة' : 'حساب مباشر'}</td>
              <td style={td}>{i.cost_centers?.name_ar || i.accounts?.name_ar || '—'}</td>
              <td style={{ ...td, fontWeight: 700 }}>{parseFloat(i.fixed_amount || 0).toFixed(3)}</td>
              <td style={td}>{i.recurrence === 'monthly' ? 'شهري' : i.recurrence === 'once' ? 'مرة واحدة' : i.recurrence}</td>
              <td style={td}><span style={{ background: i.is_active ? '#dcfce7' : '#fee2e2', color: i.is_active ? '#16a34a' : '#dc2626', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>{i.is_active ? 'نشط' : 'موقوف'}</span></td>
            </tr>)}
        </tbody>
      </table>
    </div>
  );
}

function CustodyEmployees({ user }) {
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ full_name: '', employee_id: '', employee_code: '', credit_account_id: '', max_custody_amount: '', notes: '' });

  useEffect(() => {
    Promise.all([
      supabase.from('custody_employees').select('*,accounts(name,code)').order('full_name'),
      supabase.from('accounts').select('id,account_code,name_ar').order('account_code'),
      supabase.from('employees').select('id,full_name_ar,employee_number').order('full_name_ar'),
    ]).then(([{ data: ce }, { data: a }, { data: e }]) => { setEmployees(ce || []); setAccounts(a || []); setAllEmployees(e || []); });
  }, []);

  async function handleSave() {
    setError('');
    if (!form.full_name) { setError('الاسم مطلوب'); return; }
    if (!form.credit_account_id) { setError('الحساب الدائن مطلوب'); return; }
    setSaving(true);
    const { error: e } = await supabase.from('custody_employees').insert({ ...form, max_custody_amount: parseFloat(form.max_custody_amount) || 0, created_by: user?.id });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSuccess('تم الحفظ ✓');
    setShowForm(false);
    setForm({ full_name: '', employee_id: '', employee_code: '', credit_account_id: '', max_custody_amount: '', notes: '' });
    const { data } = await supabase.from('custody_employees').select('*,accounts(name,code)').order('full_name');
    setEmployees(data || []);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0 }}>موظفو العهدة</h4>
        <button onClick={() => setShowForm(true)} style={{ background: '#64748b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>+ موظف جديد</button>
      </div>
      {error && <div style={alertStyle('red')}>{error}</div>}
      {success && <div style={alertStyle('green')}>{success}</div>}
      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <label style={lbl}>الاسم الكامل *<input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} style={inp} /></label>
            <label style={lbl}>الموظف (اختياري)<select value={form.employee_id} onChange={e => { const emp = allEmployees.find(x => x.id === e.target.value); setForm(f => ({ ...f, employee_id: e.target.value, full_name: emp?.full_name_ar || f.full_name, employee_code: emp?.employee_number || f.employee_code })); }} style={inp}>
              <option value="">-- اختر --</option>{allEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name_ar}</option>)}
            </select></label>
            <label style={lbl}>رقم الموظف<input value={form.employee_code} onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))} style={inp} /></label>
            <label style={lbl}>الحساب الدائن *<select value={form.credit_account_id} onChange={e => setForm(f => ({ ...f, credit_account_id: e.target.value }))} style={inp}><option value="">-- اختر --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}</select></label>
            <label style={lbl}>الحد الأقصى للعهدة<input type="number" value={form.max_custody_amount} onChange={e => setForm(f => ({ ...f, max_custody_amount: e.target.value }))} style={inp} min="0" step="0.001" /></label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            <button onClick={handleSave} disabled={saving} style={{ background: '#64748b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>حفظ</button>
          </div>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <thead><tr style={{ background: '#f8fafc' }}>{['الاسم', 'كود الموظف', 'الحساب الدائن', 'الحد الأقصى', 'الحالة'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {employees.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>لا يوجد موظفون</td></tr>
            : employees.map(e => <tr key={e.id} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ ...td, fontWeight: 600 }}>{e.full_name}</td>
              <td style={td}>{e.employee_code || '—'}</td>
              <td style={td}>{e.accounts?.code} - {e.accounts?.name_ar}</td>
              <td style={{ ...td, fontWeight: 700 }}>{parseFloat(e.max_custody_amount || 0).toFixed(3)}</td>
              <td style={td}><span style={{ background: e.is_active ? '#dcfce7' : '#fee2e2', color: e.is_active ? '#16a34a' : '#dc2626', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>{e.is_active ? 'نشط' : 'موقوف'}</span></td>
            </tr>)}
        </tbody>
      </table>
    </div>
  );
}

// ─── Shared Styles ───
const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 600 };
const inp = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontFamily: 'Tajawal, Arial, sans-serif', fontSize: 14, background: '#fff' };
const th = { padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#374151', borderLeft: '1px solid #e2e8f0' };
const td = { padding: '8px 10px', textAlign: 'right', verticalAlign: 'middle' };
const alertStyle = (c) => ({ background: c === 'red' ? '#fee2e2' : '#dcfce7', color: c === 'red' ? '#dc2626' : '#16a34a', padding: '10px 16px', borderRadius: 8, marginBottom: 12 });
const closeBtn = { float: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 };
const btnSmall = (color) => ({ background: color + '15', color, border: `1px solid ${color}40`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 });
