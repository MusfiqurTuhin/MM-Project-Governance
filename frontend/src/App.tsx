import { useState } from 'react';
import MeetingForm from './components/MeetingForm';
import Dashboard from './components/Dashboard';
import MasterData from './components/MasterData';
import MeetingLogs from './components/MeetingLogs';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LayoutDashboard, FileEdit, ShieldCheck, Database, History, LogOut, Crown, User, Menu, X, ChevronRight, Sun, Moon } from 'lucide-react';

type Mode = 'INPUT' | 'CXO' | 'MASTER_DATA' | 'LOGS';

const NAV_ITEMS: { id: Mode; label: string; icon: typeof FileEdit; sub: string }[] = [
  { id: 'CXO',         label: 'Dashboard',   icon: LayoutDashboard, sub: 'Summary & KPIs' },
  { id: 'INPUT',       label: 'Add Update',  icon: FileEdit,        sub: 'Enter project status' },
  { id: 'LOGS',        label: 'History',     icon: History,         sub: 'Past records' },
  { id: 'MASTER_DATA', label: 'Master Data', icon: Database,        sub: 'Clients, projects, team' },
];

const PAGE_TITLES: Record<Mode, string> = {
  INPUT:       'Add Update',
  CXO:         'Dashboard',
  LOGS:        'History',
  MASTER_DATA: 'Master Data',
};

function AppShell() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<Mode>('CXO');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preselectedProjectId, setPreselectedProjectId] = useState<number | null>(null);

  if (!user) return <LoginPage />;

  const navigate = (id: Mode) => {
    setMode(id);
    setDrawerOpen(false);
  };

  const ThemeToggle = ({ size = 16 }: { size?: number }) => (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-yellow-300 hover:bg-yellow-500/[0.08] hover:border-yellow-500/20 transition-all"
    >
      {theme === 'dark' ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#040d1a] text-slate-100 flex">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-60 bg-[#060e1c]/95 backdrop-blur-2xl border-r border-white/[0.05] flex-col h-screen sticky top-0 z-50">
        <div className="flex items-center gap-3 px-5 h-[68px] border-b border-white/[0.05]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-white tracking-tight truncate">Project Hub</p>
            <p className="text-[10px] text-slate-600 font-medium uppercase tracking-[0.15em]">MM Governance</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon, sub }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left transition-all duration-200 group ${
                  active
                    ? 'bg-indigo-500/12 border border-indigo-500/20 text-indigo-300'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon size={16} className={`shrink-0 transition-colors ${active ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate leading-none">{label}</p>
                  <p className="text-[10px] text-slate-600 font-medium mt-0.5 truncate">{sub}</p>
                </div>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-white/[0.05] pt-4 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <ThemeToggle size={14} />
            <span className="text-xs text-slate-600 font-medium">{theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-600 hover:text-rose-400 hover:bg-rose-500/[0.06] transition-all group"
          >
            <LogOut size={15} className="shrink-0" />
            <span className="text-xs font-bold">Sign Out</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shrink-0 border border-white/[0.12] flex items-center justify-center">
              {isSuperAdmin ? <Crown size={12} className="text-yellow-300" /> : <User size={12} className="text-white" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-300 truncate">{user.username}</p>
              <p className="text-[10px] font-medium truncate" style={{ color: isSuperAdmin ? '#fbbf24' : '#818cf8' }}>
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Drawer Backdrop ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#060e1c] border-r border-white/[0.07] flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white tracking-tight">Project Hub</p>
              <p className="text-[10px] text-slate-600 font-medium uppercase tracking-[0.15em]">MM Governance</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon, sub }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all duration-200 ${
                  active
                    ? 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-300'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-indigo-500/20' : 'bg-white/[0.04]'}`}>
                  <Icon size={16} className={active ? 'text-indigo-400' : 'text-slate-500'} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate leading-none">{label}</p>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5 truncate">{sub}</p>
                </div>
                {active && <ChevronRight size={14} className="text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-6 pt-4 border-t border-white/[0.05] space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shrink-0 border border-white/[0.12] flex items-center justify-center">
              {isSuperAdmin ? <Crown size={13} className="text-yellow-300" /> : <User size={13} className="text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-200 truncate">{user.username}</p>
              <p className="text-[11px] font-semibold truncate" style={{ color: isSuperAdmin ? '#fbbf24' : '#818cf8' }}>
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-yellow-300 hover:bg-yellow-500/[0.08] border border-transparent transition-all"
          >
            {theme === 'dark' ? <Sun size={15} className="shrink-0" /> : <Moon size={15} className="shrink-0" />}
            <span className="text-sm font-bold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={() => { logout(); setDrawerOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/[0.08] border border-transparent transition-all"
          >
            <LogOut size={15} className="shrink-0" />
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className="h-16 px-4 lg:px-8 flex items-center justify-between border-b border-white/[0.05] bg-[#040d1a]/90 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.18em] hidden sm:block">MM Project Governance</p>
              <h2 className="text-base lg:text-lg font-black text-white tracking-tight leading-tight">{PAGE_TITLES[mode]}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isSuperAdmin
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
            }`}>
              {isSuperAdmin ? <Crown size={12} /> : <ShieldCheck size={12} />}
              <span className="hidden sm:inline">{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 max-w-[1400px] mx-auto w-full">
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
            {mode === 'INPUT'       && <MeetingForm preselectedProjectId={preselectedProjectId} />}
            {mode === 'CXO'         && <Dashboard onNavigate={(page, projectId) => { setMode(page as Mode); setPreselectedProjectId(projectId ?? null); }} />}
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
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
