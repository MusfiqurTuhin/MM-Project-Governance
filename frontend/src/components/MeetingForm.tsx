import { useState, useEffect } from 'react';
import { getProjects, getEmployees, createUpdate } from '../api';
import type { Project, Employee } from '../types';
import { AlertCircle, CheckCircle, Send, Briefcase, User as UserIcon, Calendar, Activity, ShieldAlert, CreditCard } from 'lucide-react';
import Panel from './ui/Panel';
import Button from './ui/Button';

const MeetingForm = ({ preselectedProjectId }: { preselectedProjectId?: number | null }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    project_id: '',
    rag_status: 'GREEN',
    current_estimated_deadline: '',
    blocker_type: 'NONE',
    action_owner_id: '',
    next_invoice_amount: 0,
    notes: ''
  });

  useEffect(() => {
    getProjects().then(res => setProjects(res.data));
    getEmployees().then(res => setEmployees(res.data));
  }, []);

  useEffect(() => {
    if (preselectedProjectId) {
      setFormData(f => ({ ...f, project_id: String(preselectedProjectId) }));
    }
  }, [preselectedProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (formData.rag_status === 'GREEN' && formData.blocker_type === 'BUREAUCRACY') {
      setMessage({ type: 'error', text: 'Impossible state: Green status cannot have a Bureaucracy blocker.' });
      setLoading(false);
      return;
    }

    try {
      await createUpdate({
        ...formData,
        project_id: parseInt(formData.project_id),
        action_owner_id: parseInt(formData.action_owner_id)
      });
      setMessage({ type: 'success', text: 'Update submitted successfully!' });
      setFormData({
        project_id: '',
        rag_status: 'GREEN',
        current_estimated_deadline: '',
        blocker_type: 'NONE',
        action_owner_id: '',
        next_invoice_amount: 0,
        notes: ''
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to submit update.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Panel className="p-8">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 blur-3xl -z-10" />

        <div className="mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight mb-2">Add New Update</h2>
          <p className="text-slate-400">Save the latest project status and risk assessments.</p>
        </div>
        
        {message && (
          <div className={`p-4 mb-8 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}>
            {message.type === 'success' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 ml-1">
                <Briefcase size={16} className="text-indigo-400" />
                Target Project
              </label>
              <select 
                required
                className="w-full p-4 bg-slate-800/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer text-slate-200"
                value={formData.project_id}
                onChange={e => setFormData({...formData, project_id: e.target.value})}
              >
                <option value="" className="bg-slate-900">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 ml-1">
                <Activity size={16} className="text-indigo-400" />
                RAG Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['GREEN', 'AMBER', 'RED'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({...formData, rag_status: status})}
                    className={`p-3 rounded-xl border font-bold text-xs transition-all ${
                      formData.rag_status === status
                      ? status === 'GREEN' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                        status === 'AMBER' ? 'bg-amber-500/20 border-amber-500 text-amber-400' :
                        'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'bg-slate-800/30 border-white/5 text-slate-500 hover:border-white/10'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 ml-1">
                <ShieldAlert size={16} className="text-indigo-400" />
                Blocker Type
              </label>
              <select 
                className="w-full p-4 bg-slate-800/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer text-slate-200"
                value={formData.blocker_type}
                onChange={e => setFormData({...formData, blocker_type: e.target.value})}
              >
                <option value="NONE" className="bg-slate-900">No Active Blocker</option>
                <option value="TECHNICAL" className="bg-slate-900">Technical Debt / Issue</option>
                <option value="BUREAUCRACY" className="bg-slate-900">Bureaucracy / Red Tape</option>
                <option value="CLIENT" className="bg-slate-900">Client Dependency</option>
                <option value="RESOURCE" className="bg-slate-900">Resource Constraint</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 ml-1">
                <Calendar size={16} className="text-indigo-400" />
                Estimated Deadline
              </label>
              <input 
                required
                type="date"
                className="w-full p-4 bg-slate-800/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-slate-200 [color-scheme:dark]"
                value={formData.current_estimated_deadline}
                onChange={e => setFormData({...formData, current_estimated_deadline: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 ml-1">
                <UserIcon size={16} className="text-indigo-400" />
                Action Owner
              </label>
              <select 
                required
                className="w-full p-4 bg-slate-800/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer text-slate-200"
                value={formData.action_owner_id}
                onChange={e => setFormData({...formData, action_owner_id: e.target.value})}
              >
                <option value="" className="bg-slate-900">Assign Action Owner</option>
                {employees.map(e => <option key={e.id} value={e.id} className="bg-slate-900">{e.name} — {e.roles}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 ml-1">
                <CreditCard size={16} className="text-indigo-400" />
                Next Invoice Target ({projects.find(p => p.id === parseInt(formData.project_id))?.currency || 'USD'})
              </label>
              <input 
                required
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full p-4 bg-slate-800/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-slate-200"
                value={formData.next_invoice_amount}
                onChange={e => setFormData({...formData, next_invoice_amount: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 ml-1">
              Notes & Project Context
            </label>
            <textarea 
              required
              placeholder="Provide detailed context on project status and risk mitigation..."
              className="w-full p-4 bg-slate-800/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all h-40 text-slate-200 resize-none placeholder:text-slate-600"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <Button 
            type="submit"
            fullWidth
            size="lg"
            icon={Send}
            loading={loading}
          >
            Dispatch Update
          </Button>
        </form>
      </Panel>
    </div>
  );
};

export default MeetingForm;
