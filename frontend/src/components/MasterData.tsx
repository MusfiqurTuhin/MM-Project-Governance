import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, Users, Plus, X, Save, Trash2 } from 'lucide-react';
import { getProjects, getClients, getEmployees, createProject, createClient, createEmployee, deleteProject, deleteClient, deleteEmployee } from '../api';
import type { Project, Client, Employee } from '../types';
import Panel from './ui/Panel';
import Button from './ui/Button';
import { useAuth } from '../context/AuthContext';

const fDate = (d?: string) => {
  if (!d) return '—';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const [y, m, d_] = parts;
  return `${d_}:${m}:${y.slice(-2)}`;
};

const MasterData: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'PROJECTS' | 'EMPLOYEES' | 'CLIENTS'>('PROJECTS');
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, eRes] = await Promise.all([
        getProjects(),
        getClients(),
        getEmployees()
      ]);
      setProjects(pRes.data);
      setClients(cRes.data);
      setEmployees(eRes.data);
    } catch (err) {
      console.error('Failed to fetch master data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'PROJECTS') await createProject(formData);
      else if (activeTab === 'CLIENTS') await createClient(formData);
      else if (activeTab === 'EMPLOYEES') await createEmployee(formData);
      
      setShowModal(false);
      setFormData({});
      fetchData();
    } catch (err) {
      console.error('Failed to create entity', err);
    }
  };

  const handleDelete = async (type: 'PROJECTS' | 'CLIENTS' | 'EMPLOYEES', id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      if (type === 'PROJECTS') await deleteProject(id);
      else if (type === 'CLIENTS') await deleteClient(id);
      else if (type === 'EMPLOYEES') await deleteEmployee(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const renderTable = () => {
    if (loading) return <div className="p-8 text-center text-slate-500">Loading intelligence data...</div>;

    switch (activeTab) {
      case 'PROJECTS':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-sm uppercase tracking-wider">
                  <th className="py-4 px-6 font-medium">Project Name</th>
                  <th className="py-4 px-6 font-medium">Client</th>
                  <th className="py-4 px-6 font-medium">Manager</th>
                  <th className="py-4 px-6 font-medium text-indigo-400">Budget</th>
                  <th className="py-4 px-6 font-medium">Currency</th>
                  <th className="py-4 px-6 font-medium">Start Date</th>
                  <th className="py-4 px-6 font-medium">Deadline</th>
                  {isSuperAdmin && <th className="py-4 px-6 font-medium w-16" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.04] transition-colors group bg-white/[0.01]">
                    <td className="py-4 px-6 font-semibold text-white">{p.name}</td>
                    <td className="py-4 px-6 text-slate-400">{clients.find(c => c.id === p.client_id)?.name || 'Unknown'}</td>
                    <td className="py-4 px-6 text-slate-400">{employees.find(e => e.id === p.manager_id)?.name || 'Unknown'}</td>
                    <td className="py-4 px-6 text-indigo-400 font-mono font-bold">{p.budget.toLocaleString()}</td>
                    <td className="py-4 px-6 text-slate-400 font-bold">{p.currency}</td>
                    <td className="py-4 px-6 text-slate-500 font-mono">{fDate(p.start_date)}</td>
                    <td className="py-4 px-6 text-slate-500 font-mono">{fDate(p.original_deadline)}</td>
                    {isSuperAdmin && (
                      <td className="py-4 px-6">
                        <button onClick={() => handleDelete('PROJECTS', p.id!)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
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
                <tr className="border-b border-white/5 text-slate-400 text-sm uppercase tracking-wider">
                  <th className="py-4 px-6 font-medium">Client Name</th>
                  <th className="py-4 px-6 font-medium">Email</th>
                  {isSuperAdmin && <th className="py-4 px-6 font-medium w-16" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6 font-semibold text-white">{c.name}</td>
                    <td className="py-4 px-6 text-slate-400">{c.contact_email}</td>
                    {isSuperAdmin && (
                      <td className="py-4 px-6">
                        <button onClick={() => handleDelete('CLIENTS', c.id!)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
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
                <tr className="border-b border-white/5 text-slate-400 text-sm uppercase tracking-wider">
                  <th className="py-4 px-6 font-medium">Name</th>
                  <th className="py-4 px-6 font-medium">Roles</th>
                  {isSuperAdmin && <th className="py-4 px-6 font-medium w-16" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6 font-semibold text-white">{e.name}</td>
                    <td className="py-4 px-6 text-slate-400">
                      <div className="flex flex-wrap gap-1">
                        {e.roles.split(',').map((role, i) => (
                          <span key={i} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-bold border border-indigo-500/20">
                            {role.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-4 px-6">
                        <button onClick={() => handleDelete('EMPLOYEES', e.id!)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex overflow-x-auto bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 scrollbar-none">
          {[
            { id: 'PROJECTS', icon: Briefcase, label: 'Projects' },
            { id: 'EMPLOYEES', icon: Users, label: 'Employees' },
            { id: 'CLIENTS', icon: Building2, label: 'Customers' }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'ghost'}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.id as any)}
              className="px-4 sm:px-6 py-2.5 whitespace-nowrap"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <Button
          icon={Plus}
          onClick={() => {
            setFormData({});
            setShowModal(true);
          }}
          className="w-full sm:w-auto justify-center"
        >
          Add New {activeTab === 'PROJECTS' ? 'Project' : activeTab === 'CLIENTS' ? 'Client' : 'Employee'}
        </Button>
      </div>

      {/* Main Table Container */}
      <Panel className="overflow-hidden border border-white/5 bg-slate-900/20 shadow-2xl p-0">
        {renderTable()}
      </Panel>

      {/* Add Entity Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 pt-10 sm:pt-0 backdrop-blur-sm bg-slate-950/60 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 p-6 sm:p-8 my-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white">
                New {activeTab === 'PROJECTS' ? 'Project' : activeTab === 'CLIENTS' ? 'Client' : 'Employee'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'PROJECTS' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Project Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      placeholder="Project name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Client</label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        value={formData.client_id || ''}
                        onChange={(e) => setFormData({...formData, client_id: parseInt(e.target.value)})}
                      >
                        <option value="">Select Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Manager</label>
                      <select
                        required
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        value={formData.manager_id || ''}
                        onChange={(e) => setFormData({...formData, manager_id: parseInt(e.target.value)})}
                      >
                        <option value="">Select Manager</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Start Date</label>
                      <input
                        required
                        type="date"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        value={formData.start_date || ''}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Deadline</label>
                      <input
                        required
                        type="date"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        value={formData.original_deadline || ''}
                        onChange={(e) => setFormData({...formData, original_deadline: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Budget</label>
                      <input
                        required
                        type="number"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        placeholder="0.00"
                        value={formData.budget || ''}
                        onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Currency</label>
                       <select
                         required
                         className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                         value={formData.currency || 'USD'}
                         onChange={(e) => setFormData({...formData, currency: e.target.value})}
                       >
                         <option value="USD">USD ($)</option>
                         <option value="BDT">BDT (৳)</option>
                         <option value="EUR">EUR (€)</option>
                       </select>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'CLIENTS' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Client Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      placeholder="Company name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Contact Email</label>
                    <input 
                      required
                      type="email" 
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      placeholder="email@company.com"
                      value={formData.contact_email || ''}
                      onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                    />
                  </div>
                </>
              )}

              {activeTab === 'EMPLOYEES' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      placeholder="Employee name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">Roles (comma separated)</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      placeholder="e.g. Developer, Odoo Consultant"
                      value={formData.roles || ''}
                      onChange={(e) => setFormData({...formData, roles: e.target.value})}
                    />
                  </div>
                </>
              )}

              <Button 
                type="submit"
                fullWidth
                size="lg"
                icon={Save}
              >
                Save Intelligence
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterData;
