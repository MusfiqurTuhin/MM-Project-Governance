export interface POC {
  name: string;
  designation: string;
  phone: string;
  email: string;
}

export interface Client {
  id: number;
  name: string;
  website: string;
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
  pocs?: string; // JSON string of POC[]
}

export interface EditHistoryEntry {
  id: number;
  entity_type: string;
  entity_id: number;
  edited_by: string;
  edited_at: string;
  snapshot: string; // JSON string
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
