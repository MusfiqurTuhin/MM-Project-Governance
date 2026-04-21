import axios from 'axios';
import type { Client, Employee, Project, DashboardData, EditHistoryEntry } from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
});

// Auto-logout on expired/invalid token
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('mm_auth');
      delete api.defaults.headers.common['Authorization'];
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const getProjects  = () => api.get<Project[]>('/projects');
export const getEmployees = () => api.get<Employee[]>('/employees');
export const getClients   = () => api.get<Client[]>('/clients');

export const createProject  = (data: any) => api.post('/projects', data);
export const createClient   = (data: any) => api.post('/clients', data);
export const createEmployee = (data: any) => api.post('/employees', data);

export const updateProject  = (id: number, data: any) => api.put(`/projects/${id}`, data);
export const updateClient   = (id: number, data: any) => api.put(`/clients/${id}`, data);
export const updateEmployee = (id: number, data: any) => api.put(`/employees/${id}`, data);

export const deleteProject  = (id: number) => api.delete(`/projects/${id}`);
export const deleteClient   = (id: number) => api.delete(`/clients/${id}`);
export const deleteEmployee = (id: number) => api.delete(`/employees/${id}`);

export const createUpdate  = (data: any) => api.post('/updates', data);
export const deleteUpdate  = (id: number) => api.delete(`/updates/${id}`);
export const getUpdates   = () => api.get<any[]>('/updates');
export const getDashboard = () => api.get<DashboardData>('/dashboard');

export const getHistory = (entityType: string, entityId: number) =>
  api.get<EditHistoryEntry[]>(`/history/${entityType}/${entityId}`);

export default api;
