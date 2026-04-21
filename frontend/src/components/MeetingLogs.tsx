import React, { useState, useEffect } from 'react';
import { History, Calendar, User, AlertCircle, CreditCard, CheckCircle2, EyeOff, SlidersHorizontal, Trash2 } from 'lucide-react';
import { getUpdates, deleteUpdate } from '../api';
import Panel from './ui/Panel';
import Badge from './ui/Badge';
import { useAuth } from '../context/AuthContext';

const fDate = (d?: string) => {
  if (!d) return '—';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) {
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    const [y, m, d_] = parts;
    return `${d_}:${m}:${y.slice(-2)}`;
  }
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear()).slice(-2);
  return `${day}:${month}:${year}`;
};

type RagFilter = 'All' | 'RED' | 'AMBER' | 'GREEN';

const RAG_CHIP: Record<RagFilter, string> = {
  All:   'bg-indigo-500/15 border-indigo-500/40 text-indigo-300',
  RED:   'bg-rose-500/15   border-rose-500/40   text-rose-300',
  AMBER: 'bg-amber-500/15  border-amber-500/40  text-amber-300',
  GREEN: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
};

const MeetingLogs: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [updates, setUpdates]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [ragFilter, setRagFilter] = useState<RagFilter>('All');
  const [hideDone, setHideDone]   = useState(false);
  const [doneIds, setDoneIds]     = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem('done_updates');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  const loadUpdates = () => {
    getUpdates()
      .then(res => setUpdates(res.data))
      .catch(err => console.error('Failed to fetch updates', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUpdates(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this update record? This cannot be undone.')) return;
    try {
      await deleteUpdate(id);
      loadUpdates();
    } catch (err) { console.error('Delete failed', err); }
  };

  const toggleDone = (id: number) => {
    setDoneIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('done_updates', JSON.stringify([...next]));
      return next;
    });
  };

  const filtered = updates
    .filter(u => ragFilter === 'All' || u.rag_status === ragFilter)
    .filter(u => !hideDone || !doneIds.has(u.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <History className="text-indigo-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Project History</h2>
          <p className="text-slate-500 text-sm">A list of all past project updates and notes</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={12} className="text-slate-600" />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] mr-1">Status</span>
          {(['All', 'RED', 'AMBER', 'GREEN'] as RagFilter[]).map(r => (
            <button
              key={r}
              onClick={() => setRagFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-200 ${
                ragFilter === r
                  ? RAG_CHIP[r]
                  : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 font-medium">
            {filtered.length} of {updates.length} records
            {doneIds.size > 0 && ` · ${doneIds.size} done`}
          </span>
          <button
            onClick={() => setHideDone(h => !h)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              hideDone
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300'
            }`}
          >
            <EyeOff size={11} /> {hideDone ? 'Show Done' : 'Hide Done'}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <Panel className="p-12 text-center text-slate-500">
            No records match the current filter.
          </Panel>
        ) : (
          filtered.map((update) => {
            const isDone = doneIds.has(update.id);
            return (
              <Panel
                key={update.id}
                className={`p-6 transition-all group ${
                  isDone
                    ? 'opacity-50 bg-white/[0.008] border-white/[0.03]'
                    : 'hover:border-white/20 cursor-pointer bg-white/[0.015] hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={update.rag_status === 'GREEN' ? 'success' : update.rag_status === 'AMBER' ? 'warning' : 'error'}>
                        {update.rag_status}
                      </Badge>
                      <span className="text-white font-bold text-lg">{update.project_name}</span>
                      <span className="text-slate-600">|</span>
                      <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                        <Calendar size={14} />
                        {fDate(update.updated_at)}
                      </div>
                      {isDone && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                          <CheckCircle2 size={10} /> Done
                        </span>
                      )}
                    </div>

                    <p className="text-slate-300 leading-relaxed italic">
                      "{update.notes}"
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <User size={14} className="text-indigo-400" />
                        <span className="font-medium text-slate-300">{update.owner_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <AlertCircle size={14} className="text-amber-400" />
                        <span>Blocker: <span className="text-slate-300 uppercase font-semibold text-xs">{update.blocker_type}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <CreditCard size={14} className="text-emerald-400" />
                        <span>Target: <span className="text-emerald-400 font-mono font-bold">${update.next_invoice_amount?.toLocaleString()}</span></span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDone(update.id); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                          isDone
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20'
                        }`}
                      >
                        <CheckCircle2 size={11} />
                        {isDone ? 'Marked Done' : 'Mark Done'}
                      </button>
                      {isDone && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleDone(update.id); }}
                          className="text-[10px] text-slate-600 hover:text-slate-400 font-medium transition-colors"
                        >
                          Undo
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(update.id); }}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-transparent text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Est. Deadline</div>
                    <div className="text-white font-mono bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                      {fDate(update.current_estimated_deadline)}
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MeetingLogs;
