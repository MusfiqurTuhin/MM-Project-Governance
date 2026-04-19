import axios from 'axios';
import type { Client, Employee, Project, DashboardData } from './types';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

export const getProjects = () => api.get<Project[]>('/projects');
export const getEmployees = () => api.get<Employee[]>('/employees');
export const getClients = () => api.get<Client[]>('/clients');

export const createProject = (data: any) => api.post('/projects', data);
export const createClient = (data: any) => api.post('/clients', data);
export const createEmployee = (data: any) => api.post('/employees', data);

export const createUpdate = (data: any) => api.post('/updates', data);
export const getUpdates = () => api.get<any[]>('/updates');
export const getDashboard = () => api.get<DashboardData>('/dashboard');

export const deleteProject = (id: number) => api.delete(`/projects/${id}`);
export const deleteClient = (id: number) => api.delete(`/clients/${id}`);
export const deleteEmployee = (id: number) => api.delete(`/employees/${id}`);

export default api;
