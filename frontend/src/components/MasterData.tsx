import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, Users, Plus, X, Save, Trash2, Pencil, History, Globe, Phone, Mail, UserCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getProjects, getClients, getEmployees,
  createProject, createClient, createEmployee,
  updateProject, updateClient, updateEmployee,
  deleteProject, deleteClient, deleteEmployee,
  getHistory,
} from '../api';
import type { Project, Client, Employee, POC, EditHistoryEntry } from '../types';
import Panel from './ui/Panel';
import Button from './ui/Button';
import { useAuth } from '../context/AuthContext';

const fDate = (d?: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y.slice(-2)}`;
};

const emptyPOC = (): POC => ({ name: '', designation: '', phone: '', email: '' });

const parsePOCs = (raw?: string): POC[] => {
  try { return JSON.parse(raw || '[]') as POC[]; }
  catch { return []; }
};

type TabId = 'PROJECTS' | 'EMPLOYEES' | 'CLIENTS';

interface FormState {
  // shared
  name?: string;
  // client
  website?: string;
  // employee
  roles?: string;
  // project
  client_id?: number | string;
  manager_id?: number | string;
  budget?: number | string;
  currency?: string;
  start_date?: string;
  original_deadline?: string;
  pocs?: POC[];
  // editing
  id?: number;
}

// ── DateInput ─────────────────────────────────────────────────────────────────
const inputCls = 'w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all [color-scheme:dark]';
const labelCls = 'text-xs font-semibold text-slate-500 uppercase tracking-widest px-1';

const DateInput = ({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) => (
  <div className="space-y-2">
    <label className={labelCls}>{label}</label>
    <input
      required={required}
      type="date"
      className={inputCls}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

// ── HistoryModal ──────────────────────────────────────────────────────────────
const HistoryModal = ({ entityType, entityId, entityName, onClose }: {
  entityType: string; entityId: number; entityName: string; onClose: () => void;
}) => {
  const [entries, setEntries] = useState<EditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getHistory(entityType, entityId)
      .then(r => setEntries(r.data))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-10 sm:pt-0 backdrop-blur-sm bg-slate-950/60 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 p-6 sm:p-8 my-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Edit History</h3>
            <p className="text-xs text-slate-500 mt-0.5">{entityName}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X size={22} />
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm text-center py-8">Loading history…</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-8">No edits recorded yet.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {entries.map((e, i) => {
              let snap: Record<string, any> = {};
              try { snap = JSON.parse(e.snapshot); } catch {}
              const open = expanded === i;
              return (
                <div key={e.id} className="border border-white/[0.07] rounded-2xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
                    onClick={() => setExpanded(open ? null : i)}
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-200">{fDate(e.edited_at)}</p>
                      <p className="text-xs text-slate-500">by <span className="text-indigo-400">{e.edited_by}</span></p>
                    </div>
                    {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-1">
                      {Object.entries(snap).filter(([k]) => !['id'].includes(k)).map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-xs">
                          <span className="text-slate-600 w-32 shrink-0 font-mono">{k}</span>
                          <span className="text-slate-300 break-all">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── MasterData ────────────────────────────────────────────────────────────────
const MasterData: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('PROJECTS');
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormState>({});
  const [historyTarget, setHistoryTarget] = useState<{ type: string; id: number; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, eRes] = await Promise.all([getProjects(), getClients(), getEmployees()]);
      setProjects(pRes.data);
      setClients(cRes.data);
      setEmployees(eRes.data);
    } catch (err) {
      console.error('Failed to fetch master data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setIsEditing(false);
    setFormData({ pocs: [], currency: 'USD' });
    setShowModal(true);
  };

  const openEdit = (item: Project | Client | Employee) => {
    setIsEditing(true);
    if (activeTab === 'PROJECTS') {
      const p = item as Project;
      setFormData({
        id: p.id, name: p.name, client_id: p.client_id, manager_id: p.manager_id,
        budget: p.budget, currency: p.currency, start_date: p.start_date,
        original_deadline: p.original_deadline, pocs: parsePOCs(p.pocs),
      });
    } else if (activeTab === 'CLIENTS') {
      const c = item as Client;
      setFormData({ id: c.id, name: c.name, website: c.website });
    } else {
      const em = item as Employee;
      setFormData({ id: em.id, name: em.name, roles: em.roles });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (activeTab === 'PROJECTS') {
        const projectPayload = {
          ...payload,
          client_id: Number(payload.client_id),
          manager_id: Number(payload.manager_id),
          budget: Number(payload.budget),
          pocs: payload.pocs ?? [],
        };
        if (isEditing && payload.id) await updateProject(payload.id, projectPayload);
        else await createProject(projectPayload);
      } else if (activeTab === 'CLIENTS') {
        if (isEditing && payload.id) await updateClient(payload.id, { name: payload.name, website: payload.website });
        else await createClient({ name: payload.name, website: payload.website });
      } else {
        if (isEditing && payload.id) await updateEmployee(payload.id, { name: payload.name, roles: payload.roles });
        else await createEmployee({ name: payload.name, roles: payload.roles });
      }
      setShowModal(false);
      setFormData({});
      fetchData();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: TabId, id: number) => {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    try {
      if (type === 'PROJECTS') await deleteProject(id);
      else if (type === 'CLIENTS') await deleteClient(id);
      else await deleteEmployee(id);
      fetchData();
    } catch (err) { console.error('Delete failed', err); }
  };

  const setPOC = (idx: number, field: keyof POC, val: string) => {
    const pocs = [...(formData.pocs ?? [])];
    pocs[idx] = { ...pocs[idx], [field]: val };
    setFormData(f => ({ ...f, pocs }));
  };

  const addPOC = () => {
    if ((formData.pocs?.length ?? 0) >= 3) return;
    setFormData(f => ({ ...f, pocs: [...(f.pocs ?? []), emptyPOC()] }));
  };

  const removePOC = (idx: number) => {
    setFormData(f => ({ ...f, pocs: (f.pocs ?? []).filter((_, i) => i !== idx) }));
  };

  const renderTable = () => {
    if (loading) return <div className="p-8 text-center text-slate-500">Loading…</div>;

    switch (activeTab) {
      case 'PROJECTS':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-4 px-4 font-medium">Project</th>
                  <th className="py-4 px-4 font-medium">Client</th>
                  <th className="py-4 px-4 font-medium hidden md:table-cell">Manager</th>
                  <th className="py-4 px-4 font-medium text-indigo-400 hidden sm:table-cell">Budget</th>
                  <th className="py-4 px-4 font-medium hidden lg:table-cell">Deadline</th>
                  <th className="py-4 px-4 font-medium w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3.5 px-4 font-semibold text-white text-sm">{p.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-sm">{clients.find(c => c.id === p.client_id)?.name || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-sm hidden md:table-cell">{employees.find(e => e.id === p.manager_id)?.name || '—'}</td>
                    <td className="py-3.5 px-4 text-indigo-400 font-mono text-sm hidden sm:table-cell">{p.budget.toLocaleString()} {p.currency}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-sm hidden lg:table-cell">{fDate(p.original_deadline)}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setHistoryTarget({ type: 'project', id: p.id!, name: p.name })} className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all" title="History">
                          <History size={13} />
                        </button>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Edit">
                          <Pencil size={13} />
                        </button>
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete('PROJECTS', p.id!)} className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'CLIENTS':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-4 px-4 font-medium">Client Name</th>
                  <th className="py-4 px-4 font-medium">Website</th>
                  <th className="py-4 px-4 font-medium w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3.5 px-4 font-semibold text-white text-sm">{c.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-sm">
                      {c.website ? (
                        <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors">
                          <Globe size={12} />{c.website}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setHistoryTarget({ type: 'client', id: c.id!, name: c.name })} className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all" title="History">
                          <History size={13} />
                        </button>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Edit">
                          <Pencil size={13} />
                        </button>
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete('CLIENTS', c.id!)} className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'EMPLOYEES':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-4 px-4 font-medium">Name</th>
                  <th className="py-4 px-4 font-medium">Roles</th>
                  <th className="py-4 px-4 font-medium w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employees.map((em) => (
                  <tr key={em.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3.5 px-4 font-semibold text-white text-sm">{em.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {em.roles.split(',').map((r, i) => (
                          <span key={i} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-bold border border-indigo-500/20">
                            {r.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setHistoryTarget({ type: 'employee', id: em.id!, name: em.name })} className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all" title="History">
                          <History size={13} />
                        </button>
                        <button onClick={() => openEdit(em)} className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Edit">
                          <Pencil size={13} />
                        </button>
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete('EMPLOYEES', em.id!)} className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  const modalTitle = isEditing
    ? `Edit ${activeTab === 'PROJECTS' ? 'Project' : activeTab === 'CLIENTS' ? 'Client' : 'Employee'}`
    : `New ${activeTab === 'PROJECTS' ? 'Project' : activeTab === 'CLIENTS' ? 'Client' : 'Employee'}`;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex overflow-x-auto bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 scrollbar-none">
          {[
            { id: 'PROJECTS' as TabId, icon: Briefcase, label: 'Projects' },
            { id: 'EMPLOYEES' as TabId, icon: Users, label: 'Employees' },
            { id: 'CLIENTS' as TabId, icon: Building2, label: 'Clients' },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'ghost'}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 sm:px-6 py-2.5 whitespace-nowrap"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <Button
          icon={Plus}
          onClick={openCreate}
          className="w-full sm:w-auto justify-center"
        >
          Add {activeTab === 'PROJECTS' ? 'Project' : activeTab === 'CLIENTS' ? 'Client' : 'Employee'}
        </Button>
      </div>

      {/* Table */}
      <Panel className="overflow-hidden border border-white/5 bg-slate-900/20 shadow-2xl p-0">
        {renderTable()}
      </Panel>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-10 sm:pt-0 backdrop-blur-sm bg-slate-950/60 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 p-6 sm:p-8 my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">{modalTitle}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ── CLIENT FORM ── */}
              {activeTab === 'CLIENTS' && (
                <>
                  <div className="space-y-2">
                    <label className={labelCls}>Client Name</label>
                    <input required type="text" className={inputCls} placeholder="Company name"
                      value={formData.name || ''}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Website</label>
                    <div className="relative">
                      <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      <input type="url" className={`${inputCls} pl-10`} placeholder="https://company.com"
                        value={formData.website || ''}
                        onChange={e => setFormData(f => ({ ...f, website: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}

              {/* ── EMPLOYEE FORM ── */}
              {activeTab === 'EMPLOYEES' && (
                <>
                  <div className="space-y-2">
                    <label className={labelCls}>Full Name</label>
                    <input required type="text" className={inputCls} placeholder="Employee name"
                      value={formData.name || ''}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Roles (comma separated)</label>
                    <input required type="text" className={inputCls} placeholder="e.g. Developer, Odoo Consultant"
                      value={formData.roles || ''}
                      onChange={e => setFormData(f => ({ ...f, roles: e.target.value }))} />
                  </div>
                </>
              )}

              {/* ── PROJECT FORM ── */}
              {activeTab === 'PROJECTS' && (
                <>
                  <div className="space-y-2">
                    <label className={labelCls}>Project Name</label>
                    <input required type="text" className={inputCls} placeholder="Project name"
                      value={formData.name || ''}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={labelCls}>Client</label>
                      <select required className={inputCls}
                        value={formData.client_id || ''}
                        onChange={e => setFormData(f => ({ ...f, client_id: e.target.value }))}>
                        <option value="">Select Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className={labelCls}>Manager</label>
                      <select required className={inputCls}
                        value={formData.manager_id || ''}
                        onChange={e => setFormData(f => ({ ...f, manager_id: e.target.value }))}>
                        <option value="">Select Manager</option>
                        {employees.map(em => <option key={em.id} value={em.id}>{em.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DateInput label="Start Date" required value={formData.start_date || ''} onChange={v => setFormData(f => ({ ...f, start_date: v }))} />
                    <DateInput label="Deadline"   required value={formData.original_deadline || ''} onChange={v => setFormData(f => ({ ...f, original_deadline: v }))} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={labelCls}>Budget</label>
                      <input required type="number" className={inputCls} placeholder="0.00"
                        value={formData.budget || ''}
                        onChange={e => setFormData(f => ({ ...f, budget: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelCls}>Currency</label>
                      <select required className={inputCls}
                        value={formData.currency || 'USD'}
                        onChange={e => setFormData(f => ({ ...f, currency: e.target.value }))}>
                        <option value="USD">USD ($)</option>
                        <option value="BDT">BDT (৳)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>

                  {/* ── POC Section ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className={labelCls}>Points of Contact <span className="text-slate-700 normal-case">({formData.pocs?.length ?? 0}/3)</span></label>
                      {(formData.pocs?.length ?? 0) < 3 && (
                        <button type="button" onClick={addPOC}
                          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                          <Plus size={12} /> Add POC
                        </button>
                      )}
                    </div>

                    {(formData.pocs ?? []).map((poc, idx) => (
                      <div key={idx} className="relative border border-white/[0.08] rounded-2xl p-4 space-y-3 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                            <UserCircle size={14} className="text-indigo-400" />
                            POC {idx + 1}
                          </div>
                          <button type="button" onClick={() => removePOC(idx)}
                            className="text-slate-600 hover:text-rose-400 transition-colors p-0.5">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-600 uppercase tracking-wider px-1">Name</label>
                            <input type="text" className={inputCls} placeholder="Full name"
                              value={poc.name} onChange={e => setPOC(idx, 'name', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-600 uppercase tracking-wider px-1">Designation</label>
                            <input type="text" className={inputCls} placeholder="e.g. CTO"
                              value={poc.designation} onChange={e => setPOC(idx, 'designation', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-600 uppercase tracking-wider px-1">Phone</label>
                            <div className="relative">
                              <Phone size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                              <input type="tel" className={`${inputCls} pl-9`} placeholder="+880…"
                                value={poc.phone} onChange={e => setPOC(idx, 'phone', e.target.value)} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-600 uppercase tracking-wider px-1">Email</label>
                            <div className="relative">
                              <Mail size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                              <input type="email" className={`${inputCls} pl-9`} placeholder="email@co.com"
                                value={poc.email} onChange={e => setPOC(idx, 'email', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(formData.pocs?.length ?? 0) === 0 && (
                      <button type="button" onClick={addPOC}
                        className="w-full py-3 border border-dashed border-white/10 rounded-2xl text-slate-600 text-sm hover:border-indigo-500/30 hover:text-indigo-400 transition-all flex items-center justify-center gap-2">
                        <Plus size={14} /> Add Point of Contact
                      </button>
                    )}
                  </div>
                </>
              )}

              <Button type="submit" fullWidth size="lg" icon={Save} loading={saving}>
                {isEditing ? 'Save Changes' : 'Create'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyTarget && (
        <HistoryModal
          entityType={historyTarget.type}
          entityId={historyTarget.id}
          entityName={historyTarget.name}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
};

export default MasterData;
