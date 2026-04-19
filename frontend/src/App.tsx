import { useState } from 'react';
import MeetingForm from './components/MeetingForm';
import Dashboard from './components/Dashboard';
import MasterData from './components/MasterData';
import MeetingLogs from './components/MeetingLogs';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LayoutDashboard, FileEdit, Bell, ShieldCheck, Database, History, LogOut, Crown, User } from 'lucide-react';

type Mode = 'INPUT' | 'CXO' | 'MASTER_DATA' | 'LOGS';

const NAV_ITEMS: { id: Mode; label: string; icon: typeof FileEdit; sub?: string }[] = [
  { id: 'CXO',         label: 'Dashboard',   icon: LayoutDashboard, sub: 'Summary' },
  { id: 'INPUT',       label: 'Add Update',  icon: FileEdit,        sub: 'Enter status' },
  { id: 'LOGS',        label: 'History',     icon: History,         sub: 'Past records' },
  { id: 'MASTER_DATA', label: 'Master Data', icon: Database,        sub: 'Setup data' },
];

const PAGE_TITLES: Record<Mode, string> = {
  INPUT:       'Meeting Entry',
  CXO:         'Main Dashboard',
  LOGS:        'Update History',
  MASTER_DATA: 'Master Data',
};

function AppShell() {
  const { user, logout, isSuperAdmin } = useAuth();
  const [mode, setMode] = useState<Mode>('CXO');

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-[#040d1a] text-slate-100 flex">

      {/* ── Sidebar ── */}
      <aside className="w-[72px] lg:w-60 bg-[#060e1c]/95 backdrop-blur-2xl border-r border-white/[0.05] flex flex-col h-screen sticky top-0 z-50">

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 lg:px-5 h-[72px] border-b border-white/[0.05]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div className="hidden lg:block min-w-0">
            <p className="text-sm font-black text-white tracking-tight truncate">Project Hub</p>
            <p className="text-[10px] text-slate-600 font-medium uppercase tracking-[0.15em]">Status Tracker</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon, sub }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left transition-all duration-200 group ${
                  active
                    ? 'bg-indigo-500/12 border border-indigo-500/20 text-indigo-300'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon size={16} className={`shrink-0 transition-colors ${active ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                <div className="hidden lg:block min-w-0">
                  <p className="text-xs font-bold truncate leading-none">{label}</p>
                  {sub && <p className="text-[10px] text-slate-600 font-medium mt-0.5 truncate">{sub}</p>}
                </div>
                {active && <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 space-y-2 border-t border-white/[0.05] pt-4">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-600 hover:text-rose-400 hover:bg-rose-500/[0.06] transition-all group"
          >
            <LogOut size={15} className="shrink-0" />
            <span className="hidden lg:block text-xs font-bold">Sign Out</span>
          </button>

          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shrink-0 border border-white/[0.12] flex items-center justify-center">
              {isSuperAdmin
                ? <Crown size={12} className="text-yellow-300" />
                : <User size={12} className="text-white" />
              }
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-xs font-bold text-slate-300 truncate">{user.username}</p>
              <p className="text-[10px] font-medium truncate" style={{ color: isSuperAdmin ? '#fbbf24' : '#818cf8' }}>
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">

        {/* Top bar */}
        <header className="h-[72px] px-8 flex items-center justify-between border-b border-white/[0.05] bg-[#040d1a]/80 backdrop-blur-md sticky top-0 z-40 shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.18em]">MM Project Governance</p>
            <h2 className="text-lg font-black text-white tracking-tight leading-tight">{PAGE_TITLES[mode]}</h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] text-slate-500 hover:text-slate-200 transition-all">
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-[#040d1a]" />
            </button>

            <div className="h-6 w-px bg-white/[0.07]" />

            {/* Role badge */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold ${
              isSuperAdmin
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
            }`}>
              {isSuperAdmin ? <Crown size={13} /> : <ShieldCheck size={13} />}
              <span className="hidden sm:inline">{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-8 max-w-[1400px] mx-auto w-full">
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
            {mode === 'INPUT'       && <MeetingForm />}
            {mode === 'CXO'         && <Dashboard onNavigate={(page) => setMode(page as Mode)} />}
            {mode === 'LOGS'        && <MeetingLogs />}
            {mode === 'MASTER_DATA' && <MasterData />}
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
