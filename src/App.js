import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import AccountsPage from "./pages/AccountsPage";
import CustomersPage from "./pages/CustomersPage";
import EmployeesPage from "./pages/EmployeesPage";
import SettingsPage from "./pages/SettingsPage";
import JournalPage from "./pages/JournalPage";
import VouchersPage from "./pages/VouchersPage";
import CustodyPage from "./pages/CustodyPage";

// ─── Auth Context ────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ─── App Context (current company/branch) ───────────────────
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export default function App() {
  const [session, setSession]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [currentPage, setPage]      = useState("dashboard");
  const [company, setCompany]       = useState(null);
  const [notification, setNotif]    = useState(null);

  // ── Session listener ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load company after login ──────────────────────────────
  useEffect(() => {
    if (session) loadCompany();
  }, [session]);

  const loadCompany = async () => {
    const { data } = await supabase
      .from("companies")
      .select("*, currencies(code, symbol, decimal_places)")
      .eq("is_active", true)
      .is("deleted_at", null)
      .limit(1)
      .single();
    if (data) setCompany(data);
  };

  // ── Toast notification ────────────────────────────────────
  const notify = (msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  if (loading) return <Splash />;
  if (!session) return (
    <AuthContext.Provider value={{ session, notify }}>
      <LoginPage onLogin={setSession} />
    </AuthContext.Provider>
  );

  const pageMap = {
    dashboard:  <Dashboard />,
    accounts:   <AccountsPage />,
    customers:  <CustomersPage />,
    employees:  <EmployeesPage />,
    settings:   <SettingsPage />,
    journal:    <JournalPage />,
    vouchers:   <VouchersPage />,
    custody:    <CustodyPage />,
  };

  return (
    <AuthContext.Provider value={{ session, notify }}>
      <AppContext.Provider value={{ company, setCompany, notify }}>
        <MainLayout currentPage={currentPage} setPage={setPage}>
          {pageMap[currentPage] || <Dashboard />}
        </MainLayout>
        {notification && <Toast msg={notification.msg} type={notification.type} />}
      </AppContext.Provider>
    </AuthContext.Provider>
  );
}

// ─── Splash ───────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0f172a", flexDirection: "column", gap: 16
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, fontWeight: 800, color: "white",
        animation: "pulse 1.5s infinite"
      }}>م</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontFamily: "Tajawal, sans-serif" }}>
        جاري التحميل...
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ msg, type }) {
  const colors = {
    success: { bg: "#f0fdf4", border: "#86efac", color: "#166534" },
    error:   { bg: "#fff5f5", border: "#fca5a5", color: "#991b1b" },
    warning: { bg: "#fffbeb", border: "#fcd34d", color: "#92400e" },
  };
  const c = colors[type] || colors.success;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: c.bg, border: `1.5px solid ${c.border}`, color: c.color,
      padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
      fontFamily: "Tajawal, sans-serif", zIndex: 9999,
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      animation: "slideUp 0.3s ease"
    }}>
      {msg}
      <style>{`@keyframes slideUp { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }`}</style>
    </div>
  );
}
