import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AccountsPage from './pages/AccountsPage';
import CustomersPage from './pages/CustomersPage';
import EmployeesPage from './pages/EmployeesPage';
import JournalPage from './pages/JournalPage';
import VouchersPage from './pages/VouchersPage';
import CustodyPage from './pages/CustodyPage';
import ImportAccountsPage from './pages/ImportAccountsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Cairo, sans-serif', background: '#c8d8e8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚖️</div>
        <p style={{ color: '#2c5282', fontSize: '16px', fontWeight: 600 }}>جارٍ التحميل...</p>
      </div>
    </div>
  );

  if (!session) return <LoginPage />;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':        return <Dashboard />;
      case 'accounts':         return <AccountsPage />;
      case 'customers':        return <CustomersPage />;
      case 'employees':        return <EmployeesPage />;
      case 'journal':          return <JournalPage />;
      case 'vouchers':         return <VouchersPage />;
      case 'custody':          return <CustodyPage />;
      case 'import-accounts':  return <ImportAccountsPage />;
      case 'settings':         return <SettingsPage />;
      default:                 return <Dashboard />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {renderPage()}
    </MainLayout>
  );
}
