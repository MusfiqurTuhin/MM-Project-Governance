export interface Client {
  id: number;
  name: string;
  contact_email: string;
}

export interface Employee {
  id: number;
  name: string;
  roles: string;
}

export interface Project {
  id: number;
  name: string;
  client_id: number;
  manager_id: number;
  budget: number;
  currency: string;
  start_date: string;
  original_deadline: string;
}

export interface DashboardData {
  important_projects: {
    project_id: number;
    name: string;
    rag_status: string;
    score: number;
    deadline: string;
  }[];
  team_workload: Record<string, number>;
  financial_summary: Record<string, number>;
  needed_actions: {
    project: string;
    notes: string;
    blocker: string;
  }[];
  team_details: Record<string, {
    project: string;
    rag_status: string;
    deadline: string;
    blocker: string;
    notes: string;
  }[]>;
}
