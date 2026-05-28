import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const menuItems = [
  {
    group: 'الرئيسية',
    items: [
      { key: 'dashboard', label: 'لوحة التحكم', icon: '🏠' },
    ]
  },
  {
    group: 'المحاسبة',
    items: [
      { key: 'journal',   label: 'القيود المحاسبية', icon: '📒' },
      { key: 'vouchers',  label: 'سندات القبض والصرف', icon: '🧾' },
    ]
  },
  {
    group: 'الإدارة المالية',
    items: [
      { key: 'accounts',  label: 'دليل الحسابات', icon: '📊' },
      { key: 'custody',   label: 'نظام العهدة', icon: '🗃️' },
    ]
  },
  {
    group: 'البيانات الأساسية',
    items: [
      { key: 'customers', label: 'العملاء والموكلين', icon: '👥' },
      { key: 'employees', label: 'الموظفين', icon: '👤' },
    ]
  },
  {
    group: 'الأدوات',
    items: [
      { key: 'import',   label: 'استيراد البيانات', icon: '📥' },
      { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
    ]
  },
];

export default function MainLayout({ children, currentPage, setCurrentPage }) {
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Cairo, Tahoma, sans-serif', direction: 'rtl', overflow: 'hidden' }}>

      {/* ── القائمة الجانبية ── */}
      <div style={{
        width: collapsed ? '56px' : '230px',
        minWidth: collapsed ? '56px' : '230px',
        background: 'linear-gradient(180deg, #1a2a5d 0%, #2c3e7a 60%, #1a365d 100%)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s',
        overflow: 'hidden', boxShadow: '2px 0 8px rgba(0,0,0,0.3)',
        zIndex: 100,
      }}>

        {/* شعار */}
        <div style={{ padding: '14px 10px', borderBottom: '1px solid #3a5090', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '56px' }}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>⚖️</span>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700, lineHeight: 1.3 }}>نظام ERP</div>
              <div style={{ color: '#93c5fd', fontSize: '11px' }}>Universal</div>
            </div>
          )}
        </div>

        {/* روابط القائمة */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
          {menuItems.map(group => (
            <div key={group.group}>
              {!collapsed && (
                <div style={{ color: '#93c5fd', fontSize: '10px', fontWeight: 700, padding: '8px 14px 3px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {group.group}
                </div>
              )}
              {collapsed && <div style={{ borderTop: '1px solid #3a5090', margin: '4px 0' }} />}

              {group.items.map(item => {
                const isActive = currentPage === item.key;
                return (
                  <div
                    key={item.key}
                    onClick={() => setCurrentPage(item.key)}
                    title={collapsed ? item.label : ''}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: collapsed ? '10px 0' : '9px 14px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                      borderRight: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                      borderRadius: '0 4px 4px 0',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                    {!collapsed && (
                      <span style={{ color: isActive ? '#fff' : '#cbd5e1', fontSize: '13px', fontWeight: isActive ? 700 : 400, whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* طي + خروج */}
        <div style={{ borderTop: '1px solid #3a5090', padding: '8px' }}>
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderRadius: '4px', color: '#93c5fd', fontSize: '13px', justifyContent: collapsed ? 'center' : 'flex-start' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: '18px' }}>{collapsed ? '◄' : '►'}</span>
            {!collapsed && <span>طي القائمة</span>}
          </div>
          <div
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderRadius: '4px', color: '#fca5a5', fontSize: '13px', justifyContent: collapsed ? 'center' : 'flex-start' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: '18px' }}>🚪</span>
            {!collapsed && <span>تسجيل الخروج</span>}
          </div>
        </div>
      </div>

      {/* ── محتوى الصفحة ── */}
      <div style={{ flex: 1, overflow: 'auto', background: '#c8d8e8', display: 'flex', flexDirection: 'column' }}>

        {/* شريط علوي */}
        <div style={{ background: 'linear-gradient(90deg,#2c5282,#1a365d)', padding: '0 16px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ color: '#93c5fd', fontSize: '12px' }}>
            {menuItems.flatMap(g => g.items).find(i => i.key === currentPage)?.icon}{' '}
            {menuItems.flatMap(g => g.items).find(i => i.key === currentPage)?.label}
          </span>
          <span style={{ color: '#64748b', fontSize: '11px' }}>
            {new Date().toLocaleDateString('ar-KW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
