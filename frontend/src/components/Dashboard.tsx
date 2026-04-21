import { useState, useEffect, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { getDashboard, getUpdates } from '../api';
import type { DashboardData } from '../types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  ShieldAlert, CreditCard, Activity, ArrowUpRight, TrendingUp, TrendingDown,
  Users, AlertTriangle, Zap, ChevronRight, ChevronDown, ChevronUp,
  Search, Bell, Download, RefreshCw, X, Clock, CheckCircle2,
  MoreHorizontal, ArrowUpDown, LayoutGrid, DollarSign,
  Bookmark, SlidersHorizontal, Star, Globe,
  Eye, Filter, Sparkles, FileEdit, Copy,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════════════════

const CURR_SYMBOLS: Record<string, string> = { USD: '$', BDT: '৳', EUR: '€' };

const fDate = (d?: string) => {
  if (!d) return '—';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const [y, m, d_] = parts;
  return `${d_}:${m}:${y.slice(-2)}`;
};

const TIME_RANGES = ['7D', '30D', '90D', '1Y'] as const;
type TimeRange = typeof TIME_RANGES[number];

const RAG_OPTIONS = ['All', 'RED', 'AMBER', 'GREEN'] as const;
type RagFilter = typeof RAG_OPTIONS[number];

const TABS = [
  { id: 'overview',   label: 'General Info',     icon: LayoutGrid  },
  { id: 'risk',       label: 'Priority List',    icon: ShieldAlert },
  { id: 'resources',  label: 'Team Load',        icon: Users       },
  { id: 'finance',    label: 'Financials',       icon: DollarSign  },
  { id: 'admin',      label: 'Actions Needed',   icon: AlertTriangle },
] as const;
type Tab = typeof TABS[number]['id'];

type SortKey = 'score' | 'name' | 'deadline';
type Currency = 'USD' | 'BDT' | 'EUR';

interface Notif {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
  sev: 'critical' | 'warning' | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════
// Static / Enrichment Data
// ═══════════════════════════════════════════════════════════════════════════

const SPARKLINES = {
  watchlist: [2, 4, 3, 6, 5, 8, 7].map(v => ({ v })),
  revenue:   [9, 12, 10, 15, 13, 18, 16].map(v => ({ v })),
  health:    [85, 80, 88, 76, 83, 79, 74].map(v => ({ v })),
  team:      [2.8, 3.2, 2.6, 3.9, 3.4, 4.0, 3.6].map(v => ({ v })),
};


const NOTIFS: Notif[] = [
  { id: 1, title: 'Critical deadline breach',   body: 'Project Alpha is 3 days past its original deadline.',     time: '2m ago',  read: false, sev: 'critical' },
  { id: 2, title: 'Overdue invoice detected',   body: 'Invoice #INV-089 has been unpaid for 14+ days.',          time: '18m ago', read: false, sev: 'warning'  },
  { id: 3, title: 'Resource overload warning',  body: 'Rahul Sharma has 5 concurrent task assignments.',         time: '1h ago',  read: true,  sev: 'warning'  },
  { id: 4, title: 'Q4 strategic report ready',  body: 'Executive governance report is ready for review.',        time: '3h ago',  read: true,  sev: 'info'     },
];

const SAVED_VIEWS = ['All Projects', 'High Risk', 'Finance Focus', 'This Quarter', 'My Projects'];

const BLOCKER_CFG: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  BUREAUCRACY: { bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  text: 'text-blue-400',  bar: 'bg-blue-500'  },
  CLIENT:      { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', bar: 'bg-amber-500' },
  TECHNICAL:   { bg: 'bg-rose-500/10',  border: 'border-rose-500/20',  text: 'text-rose-400',  bar: 'bg-rose-500'  },
};

const RAG_CFG: Record<string, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  RED:   { bg: 'bg-rose-500/10',    border: 'border-rose-500/25',    text: 'text-rose-400',    dot: 'bg-rose-500',    glow: 'shadow-rose-500/20'    },
  AMBER: { bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   text: 'text-amber-400',   dot: 'bg-amber-500',   glow: 'shadow-amber-500/20'   },
  GREEN: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', dot: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
};

// ═══════════════════════════════════════════════════════════════════════════
// Atomic UI Components
// ═══════════════════════════════════════════════════════════════════════════

const Sparkline = ({ data, color }: { data: { v: number }[]; color: string }) => (
  <ResponsiveContainer width="100%" height={44}>
    <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0}   />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.75}
        fill={`url(#sg-${color})`} dot={false} isAnimationActive={false} />
    </AreaChart>
  </ResponsiveContainer>
);

const RagBadge = ({ status }: { status: string }) => {
  const c = RAG_CFG[status] ?? RAG_CFG.GREEN;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-[0.1em] border ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
      {status}
    </span>
  );
};

const ScoreBar = ({ score }: { score: number }) => {
  const pct = Math.min(score, 100);
  const color = pct > 70 ? 'from-rose-500 to-rose-600' : pct > 40 ? 'from-amber-500 to-amber-600' : 'from-emerald-500 to-teal-500';
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-black tabular-nums text-slate-300 w-7 text-right shrink-0">{score}</span>
    </div>
  );
};

const TrendChip = ({ delta, inverted = false }: { delta: number; inverted?: boolean }) => {
  const bad = inverted ? delta > 0 : delta < 0;
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black ${bad ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
      {delta >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
      {delta >= 0 ? '+' : ''}{delta}%
    </span>
  );
};

const Chip = ({ label, active, onClick, color = 'indigo' }: {
  label: string; active: boolean; onClick: () => void; color?: string;
}) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300',
    rose:   'bg-rose-500/15   border-rose-500/40   text-rose-300',
    amber:  'bg-amber-500/15  border-amber-500/40  text-amber-300',
    emerald:'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  };
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-200 ${
        active
          ? (colorMap[color] ?? colorMap.indigo)
          : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]'
      }`}
    >
      {label}
    </button>
  );
};

const EmptyState = ({ icon: Icon, title, body }: { icon: any; title: string; body: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-8">
    <div className="w-16 h-16 rounded-2xl bg-indigo-500/8 border border-indigo-500/12 flex items-center justify-center mb-5">
      <Icon size={24} className="text-indigo-400/50" />
    </div>
    <p className="text-sm font-black text-slate-400 tracking-tight">{title}</p>
    <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed max-w-[220px]">{body}</p>
  </div>
);

const Divider = () => <div className="border-b border-white/[0.05]" />;

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em]">{children}</p>
);

// ═══════════════════════════════════════════════════════════════════════════
// Notifications Drawer
// ═══════════════════════════════════════════════════════════════════════════

const NotificationsDrawer = ({
  open, onClose, notifs, onMarkAllRead,
}: {
  open: boolean;
  onClose: () => void;
  notifs: Notif[];
  onMarkAllRead: () => void;
}) => {
  const sevStyle: Record<string, string> = {
    critical: 'bg-rose-500',
    warning:  'bg-amber-500',
    info:     'bg-indigo-400',
  };
  const unread = notifs.filter(n => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-[380px] z-50 flex flex-col bg-[#060e1c] border-l border-white/[0.07] shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-white">Notifications</h3>
            {unread > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/25">
                {unread} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onMarkAllRead} className="text-[11px] font-bold text-slate-500 hover:text-indigo-400 transition-colors">
              Mark all read
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-white transition-all">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3">
            <SectionLabel>Today</SectionLabel>
          </div>
          {notifs.map(n => (
            <div key={n.id} className={`px-5 py-4 border-b border-white/[0.04] flex gap-4 hover:bg-white/[0.02] transition-colors ${!n.read ? 'bg-white/[0.015]' : ''}`}>
              <div className="mt-1 flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${n.read ? 'bg-slate-700' : sevStyle[n.sev]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-bold leading-snug ${n.read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                  <span className="text-[10px] text-slate-600 font-medium shrink-0 mt-0.5">{n.time}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed font-medium">{n.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold hover:bg-indigo-500/15 transition-colors">
            <Eye size={13} />
            View all notifications
          </button>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Command Strip (Search + Filters + Actions)
// ═══════════════════════════════════════════════════════════════════════════

interface CommandStripProps {
  search: string; onSearch: (v: string) => void;
  ragFilter: RagFilter; onRagFilter: (v: RagFilter) => void;
  timeRange: TimeRange; onTimeRange: (v: TimeRange) => void;
  savedView: string; onSavedView: (v: string) => void;
  unreadCount: number; onNotifs: () => void;
  onRefresh: () => void; refreshing: boolean;
}

const CommandStrip = ({
  search, onSearch, ragFilter, onRagFilter,
  timeRange, onTimeRange, savedView, onSavedView,
  unreadCount, onNotifs, onRefresh, refreshing,
}: CommandStripProps) => {
  const searchRef = useRef<HTMLInputElement>(null);
  const [viewsOpen, setViewsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="space-y-3">
      {/* Row 1: Search + actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative group">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search projects, clients, team members…"
            className="w-full pl-9 pr-24 py-2.5 bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] focus:border-indigo-500/40 focus:bg-white/[0.06] rounded-xl text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-all duration-200 font-medium"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] font-bold text-slate-600">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] font-bold text-slate-600">K</kbd>
          </div>
        </div>

        {/* Saved views */}
        <div className="relative">
          <button
            onClick={() => setViewsOpen(v => !v)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.12] text-slate-400 text-xs font-bold transition-all duration-200"
          >
            <Bookmark size={13} />
            <span className="hidden sm:inline">{savedView}</span>
            <ChevronDown size={11} className={`transition-transform ${viewsOpen ? 'rotate-180' : ''}`} />
          </button>
          {viewsOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#070e1d] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-30">
              {SAVED_VIEWS.map(v => (
                <button
                  key={v}
                  onClick={() => { onSavedView(v); setViewsOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${
                    savedView === v ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] text-slate-500 hover:text-slate-200 transition-all duration-200"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] text-slate-500 hover:text-slate-200 transition-all duration-200">
            <Download size={14} />
          </button>
          <button
            onClick={onNotifs}
            className="relative p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] text-slate-500 hover:text-slate-200 transition-all duration-200"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-[#040d1a] flex items-center justify-center text-[8px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Row 2: Filter chips + time range */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={12} className="text-slate-600" />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] mr-1">Status</span>
          {RAG_OPTIONS.map(r => (
            <Chip
              key={r} label={r} active={ragFilter === r}
              onClick={() => onRagFilter(r)}
              color={r === 'RED' ? 'rose' : r === 'AMBER' ? 'amber' : r === 'GREEN' ? 'emerald' : 'indigo'}
            />
          ))}
        </div>

        {/* Time range */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl">
          <span className="px-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.12em]">
            <Clock size={11} className="inline mb-0.5" />
          </span>
          {TIME_RANGES.map(t => (
            <button
              key={t}
              onClick={() => onTimeRange(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all duration-200 ${
                timeRange === t
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-600 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// KPI Card
// ═══════════════════════════════════════════════════════════════════════════

interface KpiCardProps {
  label: string;
  icon: ReactNode;
  iconColor: string;
  iconBg: string;
  value: ReactNode;
  subtext: string;
  trend: number;
  trendInverted?: boolean;
  sparkData: { v: number }[];
  sparkColor: string;
  status?: { label: string; color: string; dot: string };
  onClick?: () => void;
}

const KpiCard = ({ label, icon, iconColor, iconBg, value, subtext, trend, trendInverted, sparkData, sparkColor, status, onClick }: KpiCardProps) => (
  <button
    onClick={onClick}
    className={`executive-card group w-full text-left bg-[#080f1e]/80 ${iconBg.replace('border-', 'bg-').replace('/20', '/5')} backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl shadow-black/25`}
  >
    {/* Top section */}
    <div className="px-5 pt-5 pb-4">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
          <SectionLabel>{label}</SectionLabel>
        </div>
        {status && (
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
            <span className={`text-[10px] font-black ${status.color} uppercase tracking-[0.1em]`}>{status.label}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-3xl font-black tracking-tight text-white tabular-nums leading-none">{value}</div>
        <p className="text-xs text-slate-500 font-medium">{subtext}</p>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <TrendChip delta={trend} inverted={trendInverted} />
        <span className="text-[10px] text-slate-600 font-medium">vs last period</span>
      </div>
    </div>

    {/* Sparkline */}
    <div className="px-0 pb-0 -mb-0.5 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
      <Sparkline data={sparkData} color={sparkColor} />
    </div>
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════
// Tab Bar
// ═══════════════════════════════════════════════════════════════════════════

const TabBar = ({
  active, onChange, counts,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  counts: Partial<Record<Tab, number>>;
}) => (
  <div className="flex items-center gap-1 border-b border-white/[0.06] overflow-x-auto">
    {TABS.map(({ id, label, icon: Icon }) => {
      const isActive = active === id;
      const count = counts[id];
      return (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`relative flex items-center gap-2 px-4 py-3.5 text-xs font-bold whitespace-nowrap transition-all duration-200 ${
            isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Icon size={13} />
          {label}
          {count !== undefined && count > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              id === 'risk' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/15 text-indigo-400'
            }`}>
              {count}
            </span>
          )}
          {/* Active underline */}
          {isActive && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
          )}
        </button>
      );
    })}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Activity Feed
// ═══════════════════════════════════════════════════════════════════════════

const ActivityFeed = ({ updates }: { updates: any[] }) => {
  const ragStyle: Record<string, { dot: string; badge: string }> = {
    RED:   { dot: 'bg-rose-500',    badge: 'bg-rose-500/10 text-rose-400'    },
    AMBER: { dot: 'bg-amber-500',   badge: 'bg-amber-500/10 text-amber-400'  },
    GREEN: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400' },
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (!updates.length) return (
    <div className="flex items-center justify-center py-12 text-slate-600 text-xs font-medium">No activity yet</div>
  );

  return (
    <div className="space-y-1">
      {updates.slice(0, 8).map((u, i) => {
        const s = ragStyle[u.rag_status] ?? ragStyle.GREEN;
        return (
          <div key={u.id} className="group relative flex gap-4 px-5 py-3.5 hover:bg-white/[0.02] rounded-xl transition-colors duration-200">
            <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
              <div className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
              {i < Math.min(updates.length, 8) - 1 && <div className="flex-1 w-px bg-white/[0.04] min-h-[20px]" />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors leading-snug">
                {u.project_name}
              </p>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5 truncate">{u.notes}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-700 font-medium">{u.owner_name}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-slate-700" />
                <span className="text-[10px] text-slate-700 font-medium">{timeAgo(u.updated_at)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${s.badge}`}>{u.rag_status}</span>
              <span className="text-[10px] text-slate-700 font-medium">{u.blocker_type}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Risk Table (shared across Overview + Risk tab)
// ═══════════════════════════════════════════════════════════════════════════

interface RiskTableProps {
  items: DashboardData['important_projects'];
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  expandedRows: Set<number>;
  onToggleRow: (id: number) => void;
  compact?: boolean;
  onAction?: (action: 'view' | 'escalate' | 'actions', p: DashboardData['important_projects'][0]) => void;
}

const RiskTable = ({ items, sortKey, onSort, expandedRows, onToggleRow, compact = false, onAction }: RiskTableProps) => {
  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => onSort(k)}
      className="flex items-center gap-1 text-[10px] font-black text-slate-600 uppercase tracking-[0.12em] hover:text-slate-400 transition-colors"
    >
      {label}
      <ArrowUpDown size={9} className={sortKey === k ? 'text-indigo-400' : ''} />
    </button>
  );

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="All Clear — No Critical Projects"
        body="No projects are currently flagged as high-risk. System is operating nominally."
      />
    );
  }

  return (
    <div className="divide-y divide-white/[0.04]">
      {/* Column headers */}
      {!compact && (
        <div className="flex items-center gap-4 px-5 py-3">
          <span className="w-7 text-[10px] font-black text-slate-700 uppercase tracking-widest">#</span>
          <span className="flex-1 text-[10px] font-black text-slate-600 uppercase tracking-[0.12em]">Project</span>
          <div className="w-24 flex justify-center"><SortHeader k="deadline" label="Deadline" /></div>
          <div className="w-32"><SortHeader k="score" label="Score" /></div>
          <div className="w-20 flex justify-center"><SortHeader k="name" label="Status" /></div>
          <div className="w-8" />
        </div>
      )}

      {items.map((p, i) => {
        const r = RAG_CFG[p.rag_status] ?? RAG_CFG.GREEN;
        const expanded = expandedRows.has(p.project_id);
        return (
          <div key={p.project_id}>
            <div
              className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.025] transition-colors duration-150 cursor-pointer group"
              onClick={() => onToggleRow(p.project_id)}
            >
              {/* Rank */}
              <span className="w-7 text-xs font-black text-slate-700 tabular-nums shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Project name + pulsing dot */}
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <div className={`relative w-2.5 h-2.5 rounded-full ${r.dot} shrink-0`}>
                  <div className={`absolute inset-0 rounded-full ${r.dot} animate-ping opacity-40`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors truncate">{p.name}</p>
                </div>
              </div>

              {/* Deadline */}
              {!compact && (
                <div className="w-24 text-center hidden md:block">
                  <span className="text-xs font-medium text-slate-600 tabular-nums">{fDate(p.deadline)}</span>
                </div>
              )}

              {/* Score bar */}
              <div className={compact ? 'w-24' : 'w-32'}>
                <ScoreBar score={p.score} />
              </div>

              {/* RAG badge */}
              <div className="w-20 flex justify-center shrink-0">
                <RagBadge status={p.rag_status} />
              </div>

              {/* Expand toggle */}
              <div className="w-8 flex justify-end shrink-0">
                {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-600" />}
              </div>
            </div>

            {/* Expanded row detail */}
            {expanded && (
              <div className="px-14 pb-5 pt-2 bg-white/[0.015] border-t border-white/[0.04]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <SectionLabel>Project ID</SectionLabel>
                    <p className="text-xs font-bold text-slate-300 mt-1 tabular-nums">#{p.project_id}</p>
                  </div>
                  <div>
                    <SectionLabel>RAG Status</SectionLabel>
                    <div className="mt-1"><RagBadge status={p.rag_status} /></div>
                  </div>
                  <div>
                    <SectionLabel>Attention Score</SectionLabel>
                    <p className={`text-xl font-black tabular-nums mt-1 ${r.text}`}>{p.score}</p>
                  </div>
                  <div>
                    <SectionLabel>Deadline</SectionLabel>
                    <p className="text-xs font-bold text-slate-300 mt-1">{fDate(p.deadline)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.04]">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.('view', p); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold hover:bg-indigo-500/15 transition-colors">
                    <Eye size={11} /> View Project
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.('escalate', p); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold hover:bg-rose-500/15 transition-colors">
                    <ArrowUpRight size={11} /> Escalate
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.('actions', p); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 text-[11px] font-bold hover:bg-white/[0.07] transition-colors">
                    <MoreHorizontal size={11} /> Actions
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Overview Tab
// ═══════════════════════════════════════════════════════════════════════════

const OverviewTab = ({
  data, sortKey, sortDir, onSort, expandedRows, onToggleRow, filteredWatchlist, onAction, updates,
}: {
  data: DashboardData;
  sortKey: SortKey; sortDir: 'asc' | 'desc'; onSort: (k: SortKey) => void;
  expandedRows: Set<number>; onToggleRow: (id: number) => void;
  filteredWatchlist: DashboardData['important_projects'];
  onAction?: (action: 'view' | 'escalate' | 'actions', p: DashboardData['important_projects'][0]) => void;
  updates: any[];
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Risk Table */}
      <div className="lg:col-span-3 bg-[#080f1e]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl shadow-black/25">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-8 rounded-full bg-gradient-to-b from-rose-500 to-transparent" />
            <div>
              <h3 className="text-sm font-black text-white">Project Health Status</h3>
              <p className="text-[11px] text-slate-600 font-medium">{filteredWatchlist.length} projects need attention</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <Activity size={11} className="text-slate-600" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.12em]">Live</span>
          </div>
        </div>
        <RiskTable
          items={filteredWatchlist} sortKey={sortKey} sortDir={sortDir}
          onSort={onSort} expandedRows={expandedRows} onToggleRow={onToggleRow}
          onAction={onAction}
        />
      </div>

      {/* Activity Feed */}
      <div className="lg:col-span-2 bg-[#080f1e]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl shadow-black/25">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-8 rounded-full bg-gradient-to-b from-indigo-500 to-transparent" />
            <div>
              <h3 className="text-sm font-black text-white">Activity Stream</h3>
              <p className="text-[11px] text-slate-600 font-medium">Recent events across all projects</p>
            </div>
          </div>
          <button className="text-[11px] font-bold text-slate-600 hover:text-indigo-400 transition-colors flex items-center gap-1">
            All <ChevronRight size={11} />
          </button>
        </div>
        <div className="py-2">
          <ActivityFeed updates={updates} />
        </div>
      </div>
    </div>

    {/* Executive Interventions */}
    {data.needed_actions.length > 0 && (
      <div className="bg-[#080f1e]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl shadow-black/25">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-8 rounded-full bg-gradient-to-b from-amber-400 to-transparent" />
            <div>
              <h3 className="text-sm font-black text-white">Actions Needed</h3>
              <p className="text-[11px] text-slate-600 font-medium">{data.needed_actions.length} action{data.needed_actions.length !== 1 ? 's' : ''} require coordination</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-slate-400 text-xs font-bold hover:bg-white/[0.07] hover:text-white transition-all">
            <ArrowUpRight size={13} /> Export
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.needed_actions.map((a, i) => {
            const cfg = BLOCKER_CFG[a.blocker] ?? BLOCKER_CFG.BUREAUCRACY;
            return (
              <button 
                key={i} 
                onClick={() => console.log('Intervention view', a)}
                className={`executive-card group relative bg-[#080f1e]/80 ${cfg.bg.replace('/10', '/5')} border border-white/[0.05] rounded-xl p-5 hover:border-white/[0.09] transition-all duration-250 text-left`}
              >
                <div className={`absolute top-0 left-5 right-5 h-px ${cfg.bg}`} />
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <SectionLabel>Active Blocker</SectionLabel>
                    <h4 className="text-sm font-black text-white mt-1.5 group-hover:text-indigo-200 transition-colors truncate leading-tight">{a.project}</h4>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-wider border shrink-0 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                    {a.blocker}
                  </span>
                </div>
                <div className="flex gap-3">
                  <div className={`w-px ${cfg.bar} opacity-40 rounded-full shrink-0`} />
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{a.notes}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/[0.04]">
                  <AlertTriangle size={10} className="text-amber-500/40" />
                  <SectionLabel>Action pending</SectionLabel>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Risk Intel Tab
// ═══════════════════════════════════════════════════════════════════════════

const RiskTab = ({
  data, filteredWatchlist, sortKey, sortDir, onSort, expandedRows, onToggleRow, onAction,
}: {
  data: DashboardData;
  filteredWatchlist: DashboardData['important_projects'];
  sortKey: SortKey; sortDir: 'asc' | 'desc'; onSort: (k: SortKey) => void;
  expandedRows: Set<number>; onToggleRow: (id: number) => void;
  onAction?: (action: 'view' | 'escalate' | 'actions', p: DashboardData['important_projects'][0]) => void;
}) => {
  const [ragCardFilter, setRagCardFilter] = useState<string | null>(null);

  const redCount   = data.important_projects.filter(p => p.rag_status === 'RED').length;
  const amberCount = data.important_projects.filter(p => p.rag_status === 'AMBER').length;
  const greenCount = data.important_projects.filter(p => p.rag_status === 'GREEN').length;
  const avgScore   = data.important_projects.length
    ? Math.round(data.important_projects.reduce((s, p) => s + p.score, 0) / data.important_projects.length)
    : 0;

  const summaryCards = [
    { label: 'Critical', sub: 'RED',   count: redCount,   color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    ring: 'ring-rose-500/40',    ragKey: 'RED'   },
    { label: 'Warning',  sub: 'AMBER', count: amberCount,  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   ring: 'ring-amber-500/40',   ragKey: 'AMBER' },
    { label: 'Healthy',  sub: 'GREEN', count: greenCount,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', ring: 'ring-emerald-500/40', ragKey: 'GREEN' },
    { label: 'Avg Score', sub: 'ALL',  count: avgScore,    color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  ring: 'ring-indigo-500/40',  ragKey: null    },
  ];

  const localFiltered = ragCardFilter
    ? filteredWatchlist.filter(p => p.rag_status === ragCardFilter)
    : filteredWatchlist;

  return (
    <div className="space-y-6">
      {/* Summary cards — click to filter table */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(c => {
          const active = ragCardFilter === c.ragKey;
          return (
            <button
              key={c.label}
              onClick={() => setRagCardFilter(active ? null : c.ragKey)}
              className={`text-left bg-[#080f1e]/80 border rounded-2xl p-5 transition-all duration-200 cursor-pointer
                ${active ? `${c.border} ${c.bg} ring-1 ${c.ring}` : `${c.border} ${c.bg} hover:ring-1 ${c.ring} opacity-80 hover:opacity-100`}`}
            >
              <SectionLabel>{c.label} {c.sub !== 'ALL' && <span className="opacity-60">· {c.sub}</span>}</SectionLabel>
              <p className={`text-4xl font-black tabular-nums mt-2 ${c.color}`}>{c.count}</p>
              {active && <p className="text-[10px] text-slate-500 mt-1 font-medium">Filtering table ↓</p>}
            </button>
          );
        })}
      </div>

      {/* Full risk table */}
      <div className="bg-[#080f1e]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl shadow-black/25">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-8 rounded-full bg-gradient-to-b from-rose-500 to-transparent" />
            <div>
              <h3 className="text-sm font-black text-white">Full Risk Register</h3>
              <p className="text-[11px] text-slate-600 font-medium">
                {ragCardFilter ? `Filtered: ${ragCardFilter} · ` : ''}{localFiltered.length} of {filteredWatchlist.length} entries
              </p>
            </div>
          </div>
          {ragCardFilter && (
            <button
              onClick={() => setRagCardFilter(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-400 text-xs font-bold hover:bg-white/[0.07] transition-colors"
            >
              <X size={11} /> Clear filter
            </button>
          )}
        </div>
        <RiskTable
          items={localFiltered} sortKey={sortKey} sortDir={sortDir}
          onSort={onSort} expandedRows={expandedRows} onToggleRow={onToggleRow}
          onAction={onAction}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Resources Tab
// ═══════════════════════════════════════════════════════════════════════════

const ResourcesTab = ({ data, onMemberClick }: { data: DashboardData; onMemberClick: (name: string) => void }) => {
  const heatmapData = Object.entries(data.team_workload).map(([name, count]) => ({ name, count }));
  const maxLoad = Math.max(...heatmapData.map(d => d.count), 1);
  const avgLoad = heatmapData.length ? (heatmapData.reduce((s, d) => s + d.count, 0) / heatmapData.length).toFixed(1) : '0';
  const overloaded = heatmapData.filter(d => d.count > 2).length;

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Team Members', value: heatmapData.length,  color: 'text-white'       },
          { label: 'Avg Task Load',      value: avgLoad,              color: 'text-indigo-400'  },
          { label: 'Overloaded Members', value: overloaded,           color: overloaded > 0 ? 'text-rose-400' : 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#080f1e]/80 border border-white/[0.06] rounded-2xl p-5">
            <SectionLabel>{s.label}</SectionLabel>
            <p className={`text-3xl font-black tabular-nums mt-2 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Load bars */}
        <div className="lg:col-span-2 bg-[#080f1e]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl shadow-black/25">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
            <div className="w-0.5 h-8 rounded-full bg-gradient-to-b from-indigo-500 to-transparent" />
            <div>
              <h3 className="text-sm font-black text-white">Task Distribution</h3>
              <p className="text-[11px] text-slate-600 font-medium">Click a member to see their projects</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {heatmapData.map(item => {
              const pct = Math.round((item.count / maxLoad) * 100);
              const over = item.count > 2;
              return (
                <button
                  key={item.name}
                  onClick={() => onMemberClick(item.name)}
                  className="w-full space-y-2 text-left group/member hover:bg-white/[0.03] rounded-xl p-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 truncate max-w-[140px] group-hover/member:text-white transition-colors">{item.name}</span>
                    <div className="flex items-center gap-2">
                      {over && <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">OVERLOAD</span>}
                      <span className={`text-xs font-black tabular-nums ${over ? 'text-rose-400' : 'text-indigo-400'}`}>{item.count} active</span>
                      <ChevronRight size={10} className="text-slate-600 group-hover/member:text-slate-400 transition-colors" />
                    </div>
                  </div>
                  <div className="relative h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                        over ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bar chart */}
        <div className="lg:col-span-3 bg-[#080f1e]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl shadow-black/25">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
            <div className="w-0.5 h-8 rounded-full bg-gradient-to-b from-violet-500 to-transparent" />
            <div>
              <h3 className="text-sm font-black text-white">Leadership Bandwidth</h3>
              <p className="text-[11px] text-slate-600 font-medium">Cognitive load & talent allocation risks</p>
            </div>
          </div>
          <div className="p-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heatmapData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="iBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={v => v.split(' ')[0]}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ background: '#060e1c', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px' }}
                  itemStyle={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}
                  labelStyle={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32}>
                  {heatmapData.map((e, idx) => (
                    <Cell key={idx} fill={e.count > 2 ? 'url(#rBg)' : 'url(#iBg)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Finance Tab
// ═══════════════════════════════════════════════════════════════════════════

const FinanceTab = ({
  data, currency, onCurrency,
}: {
  data: DashboardData;
  currency: Currency;
  onCurrency: (c: Currency) => void;
}) => {
  const totalRevenue = Object.values(data.financial_summary).reduce((s, v) => s + v, 0);
  const isWarning = (data.financial_summary['USD'] ?? 0) > 10000;

  return (
    <div className="space-y-6">
      {/* Currency selector */}
      <div className="flex items-center gap-3">
        <SectionLabel>View in currency</SectionLabel>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl">
          {(['USD', 'BDT', 'EUR'] as Currency[]).map(c => (
            <button
              key={c}
              onClick={() => onCurrency(c)}
              className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest transition-all duration-200 ${
                currency === c ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-300'
              }`}
            >
              {CURR_SYMBOLS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['USD', 'BDT', 'EUR'] as Currency[]).map(c => {
          const val = data.financial_summary[c] ?? 0;
          const isActive = currency === c;
          return (
            <button
              key={c}
              onClick={() => onCurrency(c)}
              className={`text-left bg-[#080f1e]/80 border rounded-2xl p-6 transition-all duration-200 ${
                isActive ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <SectionLabel>Outstanding · {c}</SectionLabel>
                <Globe size={14} className="text-slate-600" />
              </div>
              <div className="flex items-end gap-1">
                <span className="text-lg text-slate-500 font-bold mb-1">{CURR_SYMBOLS[c]}</span>
                <span className="text-4xl font-black tabular-nums text-white">{val.toLocaleString()}</span>
              </div>
              <div className="mt-3 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  style={{ width: `${totalRevenue > 0 ? Math.round((val / totalRevenue) * 100) : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600 font-medium mt-1.5">
                {totalRevenue > 0 ? Math.round((val / totalRevenue) * 100) : 0}% of total exposure
              </p>
            </button>
          );
        })}
      </div>

      {/* Health indicator */}
      <div className={`bg-[#080f1e]/80 border rounded-2xl p-6 ${isWarning ? 'border-rose-500/20' : 'border-emerald-500/15'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isWarning ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
              {isWarning ? <AlertTriangle size={20} className="text-rose-400" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{isWarning ? 'Liquidity Risk Detected' : 'Invoicing Health Nominal'}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isWarning ? 'USD receivables exceed $10,000 — escalation recommended.' : 'All invoicing metrics within expected parameters.'}
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl border text-xs font-black ${isWarning ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            {isWarning ? 'WARNING' : 'STABLE'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Admin Tab
// ═══════════════════════════════════════════════════════════════════════════

const AdminTab = ({ data, onLogUpdate }: { data: DashboardData; onLogUpdate?: (projectName?: string) => void }) => {
  const [blockerFilter, setBlockerFilter] = useState<string>('All');
  const [selected, setSelected] = useState<DashboardData['needed_actions'][0] | null>(null);
  const blockerTypes = ['All', ...Array.from(new Set(data.needed_actions.map(a => a.blocker)))];
  const filtered = blockerFilter === 'All' ? data.needed_actions : data.needed_actions.filter(a => a.blocker === blockerFilter);

  return (
    <div className="space-y-5">
      {/* Detail modal */}
      {selected && (() => {
        const cfg = BLOCKER_CFG[selected.blocker] ?? BLOCKER_CFG.BUREAUCRACY;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-950/70" onClick={() => setSelected(null)}>
            <div className="bg-[#080f1e] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel>Active Blocker</SectionLabel>
                  <h3 className="text-lg font-black text-white mt-0.5">{selected.project}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider border ${cfg.bg} ${cfg.border} ${cfg.text}`}>{selected.blocker}</span>
                  <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                </div>
              </div>
              <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-4`}>
                <div className={`w-full h-px ${cfg.bar} opacity-30 mb-3 rounded-full`} />
                <p className="text-sm text-slate-300 leading-relaxed">{selected.notes}</p>
              </div>
              <div className="flex items-center gap-3 pt-1 border-t border-white/[0.05]">
                <button
                  onClick={() => { setSelected(null); onLogUpdate?.(selected?.project); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-bold hover:bg-indigo-500/20 transition-colors"
                >
                  <FileEdit size={13} /> Log Update
                </button>
                <button onClick={() => setSelected(null)} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-bold hover:bg-white/[0.07] transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filter strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-slate-600" />
          <SectionLabel>Filter by blocker</SectionLabel>
        </div>
        {blockerTypes.map(t => (
          <Chip key={t} label={t} active={blockerFilter === t} onClick={() => setBlockerFilter(t)}
            color={t === 'CLIENT' ? 'amber' : t === 'BUREAUCRACY' ? 'indigo' : t === 'TECHNICAL' ? 'rose' : 'indigo'}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#080f1e]/80 border border-white/[0.06] rounded-2xl">
          <EmptyState icon={CheckCircle2} title="No blockers in this category" body="There are currently no administrative interventions for the selected blocker type." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((a, i) => {
            const cfg = BLOCKER_CFG[a.blocker] ?? BLOCKER_CFG.BUREAUCRACY;
            return (
              <button
                key={i}
                onClick={() => setSelected(a)}
                className="group relative bg-[#080f1e]/80 border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.15] hover:bg-[#0a1220]/80 transition-all duration-200 shadow-lg shadow-black/20 text-left w-full"
              >
                <div className={`absolute top-0 left-6 right-6 h-px ${cfg.bg}`} />
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <SectionLabel>Blocker Active</SectionLabel>
                    <h4 className="text-sm font-black text-white mt-1.5 group-hover:text-indigo-200 transition-colors truncate leading-tight">{a.project}</h4>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-wider border shrink-0 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                    {a.blocker}
                  </span>
                </div>
                <div className="flex gap-3 mb-4">
                  <div className={`w-px ${cfg.bar} opacity-30 rounded-full shrink-0`} />
                  <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">{a.notes}</p>
                </div>
                <Divider />
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={10} className="text-amber-500/40 shrink-0" />
                    <SectionLabel>Requires action</SectionLabel>
                  </div>
                  <span className="text-[10px] text-slate-600 font-bold group-hover:text-indigo-400 transition-colors">View details →</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Member Detail Modal
// ═══════════════════════════════════════════════════════════════════════════

const MemberDetailModal = ({
  name, projects, onClose,
}: {
  name: string;
  projects: DashboardData['team_details'][string];
  onClose: () => void;
}) => {
  const ragStyle: Record<string, { dot: string; text: string; bg: string; border: string }> = {
    RED:   { dot: 'bg-rose-500',    text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20'    },
    AMBER: { dot: 'bg-amber-500',   text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
    GREEN: { dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-950/70" onClick={onClose}>
      <div className="bg-[#080f1e] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel>Team Member</SectionLabel>
            <h3 className="text-xl font-black text-white mt-0.5">{name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {projects.length === 0 ? (
          <div className="py-8 text-center text-slate-600 text-sm font-medium">No active projects requiring attention</div>
        ) : (
          <div className="space-y-3">
            <SectionLabel>{projects.length} active project{projects.length !== 1 ? 's' : ''} requiring attention</SectionLabel>
            {projects.map((p, i) => {
              const s = ragStyle[p.rag_status] ?? ragStyle.GREEN;
              return (
                <div key={i} className={`${s.bg} border ${s.border} rounded-xl p-4 space-y-2`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-white truncate">{p.project}</span>
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black ${s.bg} ${s.border} ${s.text} border shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{p.rag_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                    <span>Deadline: <span className="text-slate-300 font-mono">{fDate(p.deadline)}</span></span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-700" />
                    <span>Blocker: <span className="text-slate-300 font-bold uppercase">{p.blocker}</span></span>
                  </div>
                  {p.notes && <p className="text-[11px] text-slate-500 italic leading-relaxed truncate">"{p.notes}"</p>}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-bold hover:bg-white/[0.07] transition-colors">
          Close
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Project Detail Modal
// ═══════════════════════════════════════════════════════════════════════════

type ProjectWithMeta = DashboardData['important_projects'][0] & { notes?: string; blocker?: string };

const ProjectDetailModal = ({
  project, onClose, onLogUpdate,
}: {
  project: ProjectWithMeta;
  onClose: () => void;
  onLogUpdate: () => void;
}) => {
  const r = RAG_CFG[project.rag_status] ?? RAG_CFG.GREEN;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-950/70" onClick={onClose}>
      <div className="bg-[#080f1e] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white">Project Overview</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <RagBadge status={project.rag_status} />
            <span className="text-white font-black text-xl">{project.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <SectionLabel>Attention Score</SectionLabel>
              <p className={`text-3xl font-black tabular-nums mt-1 ${r.text}`}>{project.score}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <SectionLabel>Est. Deadline</SectionLabel>
              <p className="text-xl font-black text-white mt-1 font-mono">{fDate(project.deadline)}</p>
            </div>
          </div>
          {project.notes && (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
              <SectionLabel>Latest Notes</SectionLabel>
              <p className="text-sm text-slate-300 leading-relaxed mt-2 italic">"{project.notes}"</p>
            </div>
          )}
          {project.blocker && (
            <div className="flex items-center gap-2">
              <SectionLabel>Active Blocker</SectionLabel>
              <span className="text-xs font-black text-amber-400">{project.blocker}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-white/[0.05]">
          <button onClick={onLogUpdate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-bold hover:bg-indigo-500/20 transition-colors">
            <FileEdit size={13} /> Log Update
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-bold hover:bg-white/[0.07] transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Actions Modal
// ═══════════════════════════════════════════════════════════════════════════

const ActionsModal = ({
  project, onClose, onLogUpdate, onViewFinance,
}: {
  project: DashboardData['important_projects'][0];
  onClose: () => void;
  onLogUpdate: () => void;
  onViewFinance: () => void;
}) => {
  const copyId = () => {
    navigator.clipboard.writeText(`#${project.project_id} — ${project.name}`);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-950/70" onClick={onClose}>
      <div className="bg-[#080f1e] border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel>Quick Actions</SectionLabel>
            <h3 className="text-sm font-black text-white mt-0.5">{project.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-2">
          <button onClick={onLogUpdate} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-indigo-300 text-sm font-bold hover:bg-indigo-500/15 transition-colors text-left">
            <FileEdit size={15} /> Log Update <ChevronRight size={13} className="ml-auto text-indigo-400/50" />
          </button>
          <button onClick={onViewFinance} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 text-sm font-bold hover:bg-white/[0.06] transition-colors text-left">
            <DollarSign size={15} /> View in Finance <ChevronRight size={13} className="ml-auto text-slate-600" />
          </button>
          <button onClick={copyId} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 text-sm font-bold hover:bg-white/[0.06] transition-colors text-left">
            <Copy size={15} /> Copy Project ID <ChevronRight size={13} className="ml-auto text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════

const Dashboard = ({ onNavigate }: { onNavigate?: (page: string, projectId?: number) => void }) => {
  const [data, setData]               = useState<DashboardData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [currency, setCurrency]       = useState<Currency>('USD');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab]     = useState<Tab>('overview');
  const [search, setSearch]           = useState('');
  const [ragFilter, setRagFilter]     = useState<RagFilter>('All');
  const [timeRange, setTimeRange]     = useState<TimeRange>('30D');
  const [savedView, setSavedView]     = useState(SAVED_VIEWS[0]);
  const [sortKey, setSortKey]         = useState<SortKey>('score');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [notifOpen, setNotifOpen]     = useState(false);
  const [notifs, setNotifs]           = useState(NOTIFS);
  const [viewProject, setViewProject] = useState<ProjectWithMeta | null>(null);
  const [actionsProject, setActionsProject] = useState<DashboardData['important_projects'][0] | null>(null);
  const [updates, setUpdates]         = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  useEffect(() => {
    getDashboard().then(res => { setData(res.data); setLoading(false); });
    getUpdates().then(res => setUpdates(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    getDashboard().then(res => { setData(res.data); setRefreshing(false); });
  };

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const handleToggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredWatchlist = useMemo(() => {
    if (!data) return [];
    let list = [...data.important_projects];
    if (ragFilter !== 'All') list = list.filter(p => p.rag_status === ragFilter);
    if (search.trim()) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'score')    cmp = a.score - b.score;
      if (sortKey === 'name')     cmp = a.name.localeCompare(b.name);
      if (sortKey === 'deadline') cmp = (a.deadline ?? '').localeCompare(b.deadline ?? '');
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [data, ragFilter, search, sortKey, sortDir]);

  const unreadCount = notifs.filter(n => !n.read).length;

  const handleProjectAction = (action: 'view' | 'escalate' | 'actions', p: DashboardData['important_projects'][0]) => {
    if (action === 'view') {
      const match = data?.needed_actions.find(a => a.project === p.name);
      setViewProject({ ...p, notes: match?.notes, blocker: match?.blocker });
    } else if (action === 'escalate') {
      onNavigate?.('INPUT', p.project_id);
    } else {
      setActionsProject(p);
    }
  };

  if (loading || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-2 rounded-full border border-indigo-500/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
        <div className="absolute inset-4 rounded-full border-t-[1.5px] border-indigo-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/50" />
        </div>
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-base font-black text-white tracking-tight">Loading Intelligence</p>
        <p className="text-xs text-slate-600 font-medium">Updating data…</p>
      </div>
    </div>
  );

  const revenueVal  = (data.financial_summary[currency] ?? 0).toLocaleString();
  const isWarning   = (data.financial_summary['USD'] ?? 0) > 10000;
  const heatmapArr  = Object.entries(data.team_workload);
  const avgLoad     = heatmapArr.length ? (heatmapArr.reduce((s, [, v]) => s + v, 0) / heatmapArr.length).toFixed(1) : '—';

  const tabCounts: Partial<Record<Tab, number>> = {
    risk:  data.important_projects.length,
    admin: data.needed_actions.length,
  };

  return (
    <>
      {viewProject && (
        <ProjectDetailModal
          project={viewProject}
          onClose={() => setViewProject(null)}
          onLogUpdate={() => { setViewProject(null); onNavigate?.('INPUT', viewProject?.project_id); }}
        />
      )}
      {actionsProject && (
        <ActionsModal
          project={actionsProject}
          onClose={() => setActionsProject(null)}
          onLogUpdate={() => { setActionsProject(null); onNavigate?.('INPUT', actionsProject?.project_id); }}
          onViewFinance={() => { setActionsProject(null); setActiveTab('finance'); }}
        />
      )}
      {selectedMember && data && (
        <MemberDetailModal
          name={selectedMember}
          projects={data.team_details?.[selectedMember] ?? []}
          onClose={() => setSelectedMember(null)}
        />
      )}
      <NotificationsDrawer
        open={notifOpen} onClose={() => setNotifOpen(false)}
        notifs={notifs} onMarkAllRead={() => setNotifs(ns => ns.map(n => ({ ...n, read: true })))}
      />

      <div className="space-y-7 pb-10 grain-overlay">

        {/* ── Ambient glows ── */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute top-[-15%] left-[-8%]  w-[600px] h-[600px] bg-indigo-600/4  rounded-full blur-[130px]" />
          <div className="absolute bottom-[-10%] right-[-8%] w-[500px] h-[500px] bg-violet-600/4 rounded-full blur-[110px]" />
          <div className="absolute top-[55%] left-[40%]   w-[400px] h-[400px] bg-blue-600/3   rounded-full blur-[100px]" />
        </div>

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-[0.22em]">Live · Status Tracker</span>
            </div>
            <h1 className="text-[2.25rem] font-black tracking-tight leading-none">
              <span className="bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
                Project Governance
              </span>
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
              <span>{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-slate-700" />
              <span className="font-mono text-slate-500">{currentTime.toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Quick health strip */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Star size={12} className="text-amber-400" />
              <span className="text-slate-500 font-medium">Saved view:</span>
              <span className="font-bold text-slate-300">{savedView}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Sparkles size={12} className="text-indigo-400" />
              <span className="text-slate-500 font-medium">Range:</span>
              <span className="font-bold text-slate-300">{timeRange}</span>
            </div>
          </div>
        </div>

        {/* ── Command Strip ── */}
        <CommandStrip
          search={search} onSearch={setSearch}
          ragFilter={ragFilter} onRagFilter={setRagFilter}
          timeRange={timeRange} onTimeRange={setTimeRange}
          savedView={savedView} onSavedView={setSavedView}
          unreadCount={unreadCount} onNotifs={() => setNotifOpen(true)}
          onRefresh={handleRefresh} refreshing={refreshing}
        />

        {/* ── KPI Hero Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Important Projects" icon={<ShieldAlert size={13} />}
            iconColor="text-rose-400" iconBg="bg-rose-500/10 border-rose-500/20"
            value={
              <span className="text-rose-400 flex items-baseline gap-2">
                {filteredWatchlist.length}
                {(ragFilter !== 'All' || search.trim()) && filteredWatchlist.length !== data.important_projects.length && (
                  <span className="text-sm font-bold text-slate-500">/ {data.important_projects.length}</span>
                )}
              </span>
            }
            subtext={ragFilter !== 'All' || search.trim() ? `Filtered · ${timeRange}` : 'Initiatives requiring focus'}
            trend={12} trendInverted
            sparkData={SPARKLINES.watchlist} sparkColor="#f43f5e"
            status={{ label: filteredWatchlist.length > 0 ? 'INTERVENE' : 'NOMINAL', color: filteredWatchlist.length > 0 ? 'text-rose-400' : 'text-emerald-400', dot: filteredWatchlist.length > 0 ? 'bg-rose-500' : 'bg-emerald-500' }}
            onClick={() => setActiveTab('risk')}
          />
          <KpiCard
            label="Economic Exposure" icon={<CreditCard size={13} />}
            iconColor="text-sky-400" iconBg="bg-sky-500/10 border-sky-500/20"
            value={<span>{CURR_SYMBOLS[currency]}<span className="text-white">{revenueVal}</span></span>}
            subtext={`Projected receivables · ${currency} · ${timeRange}`}
            trend={8} trendInverted
            sparkData={SPARKLINES.revenue} sparkColor="#38bdf8"
            onClick={() => setActiveTab('finance')}
          />
          <KpiCard
            label="Governance Health" icon={<Zap size={13} />}
            iconColor={isWarning ? 'text-rose-400' : 'text-emerald-400'}
            iconBg={isWarning ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}
            value={<span className={isWarning ? 'text-rose-400' : 'text-emerald-400'}>{isWarning ? 'Alert' : 'Stable'}</span>}
            subtext="Compliance & fiscal status"
            trend={isWarning ? -5 : 3}
            sparkData={SPARKLINES.health} sparkColor={isWarning ? '#f43f5e' : '#10b981'}
            status={{ label: isWarning ? 'CAUTION' : 'OPTIMAL', color: isWarning ? 'text-rose-400' : 'text-emerald-400', dot: isWarning ? 'bg-rose-500' : 'bg-emerald-500' }}
            onClick={() => setActiveTab('admin')}
          />
          <KpiCard
            label="Leadership Coverage" icon={<Users size={13} />}
            iconColor="text-violet-400" iconBg="bg-violet-500/10 border-violet-500/20"
            value={<span className="text-violet-400">{avgLoad}x</span>}
            subtext="Average bandwidth across leadership"
            trend={4} trendInverted
            sparkData={SPARKLINES.team} sparkColor="#8b5cf6"
            onClick={() => setActiveTab('resources')}
          />
        </div>

        {/* ── Tab Navigation + Content ── */}
        <div className="bg-[#080f1e]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
          <div className="px-5 pt-1">
            <TabBar active={activeTab} onChange={setActiveTab} counts={tabCounts} />
          </div>
          <div className="p-6">
            {activeTab === 'overview' && (
              <OverviewTab
                data={data}
                sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
                expandedRows={expandedRows} onToggleRow={handleToggleRow}
                filteredWatchlist={filteredWatchlist}
                onAction={handleProjectAction}
                updates={updates}
              />
            )}
            {activeTab === 'risk' && (
              <RiskTab
                data={data} filteredWatchlist={filteredWatchlist}
                sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
                expandedRows={expandedRows} onToggleRow={handleToggleRow}
                onAction={handleProjectAction}
              />
            )}
            {activeTab === 'resources' && <ResourcesTab data={data} onMemberClick={setSelectedMember} />}
            {activeTab === 'finance'   && <FinanceTab   data={data} currency={currency} onCurrency={setCurrency} />}
            {activeTab === 'admin'     && <AdminTab     data={data} onLogUpdate={(projectName) => {
              const proj = updates.find(u => u.project_name === projectName);
              onNavigate?.('INPUT', proj?.project_id);
            }} />}
          </div>
        </div>

      </div>
    </>
  );
};

export default Dashboard;
