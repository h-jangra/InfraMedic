export type IncidentStatus = "active" | "resolving" | "resolved";
export type IncidentSeverity = "info" | "warning" | "critical";

export interface IncidentStep {
  id: number;
  incident_id: number;
  agent: string;
  message: string;
  step_type: string;
  created_at: string;
}

export interface Incident {
  id: number;
  title: string;
  description: string;
  service_name: string;
  metric_name: string;
  metric_value: number;
  threshold: number;
  severity: IncidentSeverity;
  status: IncidentStatus;
  agent: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_summary: string | null;
  change_intelligence_json: string | null;
  time_machine_json: string | null;
  risk_score: number | null;
  requires_approval: boolean | null;
  approval_status: string | null;
  steps: IncidentStep[];
}

export interface MetricSnapshot {
  service_name: string;
  cpu_percent: number;
  memory_percent: number;
  error_rate_percent: number;
  latency_ms: number;
}

export interface DashboardStats {
  mttd: string;
  mttr: string;
  auto_success_rate: string;
  hours_saved: string;
  revenue_impact_avoided: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function fetchIncidents(): Promise<Incident[]> {
  const response = await fetch(`${API_BASE_URL}/api/incidents`);
  if (!response.ok) {
    throw new Error("Failed to load incidents");
  }
  return response.json();
}

export async function evaluateMetrics(snapshot: MetricSnapshot): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/monitoring/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(snapshot)
  });
  if (!response.ok) {
    throw new Error("Monitoring evaluation failed");
  }
}

export async function fetchIncident(id: number): Promise<Incident> {
  const response = await fetch(`${API_BASE_URL}/api/incidents/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load incident details for ID ${id}`);
  }
  return response.json();
}

export async function approveIncident(id: number): Promise<Incident> {
  const response = await fetch(`${API_BASE_URL}/api/incidents/${id}/approve`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`Failed to approve incident ID ${id}`);
  }
  return response.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_BASE_URL}/api/incidents/stats`);
  if (!response.ok) {
    throw new Error("Failed to load dashboard statistics");
  }
  return response.json();
}

export async function clearIncidents(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/incidents`, {
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error("Failed to clear incidents");
  }
}

export interface CloudSettings {
  aws_endpoint_url: string;
  aws_region: string;
  aws_access_key_id: string;
  aws_secret_access_key: string;
  aws_bucket_name: string;

  azure_endpoint_url: string;
  azure_account_name: string;
  azure_account_key: string;
  azure_container_name: string;

  gcp_endpoint_url: string;
  gcp_project_id: string;
  gcp_credentials_json: string;
  gcp_bucket_name: string;
}

export async function fetchCloudSettings(): Promise<CloudSettings> {
  const response = await fetch(`${API_BASE_URL}/api/settings/cloud`);
  if (!response.ok) {
    throw new Error("Failed to load cloud settings");
  }
  return response.json();
}

export async function updateCloudSettings(settings: CloudSettings): Promise<CloudSettings> {
  const response = await fetch(`${API_BASE_URL}/api/settings/cloud`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(settings)
  });
  if (!response.ok) {
    throw new Error("Failed to update cloud settings");
  }
  return response.json();
}

export interface DiscoveredResources {
  compute: any[];
  storage: any[];
  databases: any[];
  secrets: any[];
  networking: any[];
  functions?: any[];
  clusters?: any[];
  load_balancers?: any[];
}

export async function fetchDiscoveredResources(): Promise<DiscoveredResources> {
  const response = await fetch(`${API_BASE_URL}/api/resources`);
  if (!response.ok) {
    throw new Error("Failed to discover resources");
  }
  return response.json();
}

export async function provisionDemoInfrastructure(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/resources/provision`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error("Failed to provision demo infrastructure");
  }
}

export async function teardownInfrastructure(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/resources/teardown`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error("Failed to teardown infrastructure");
  }
}

export async function fetchTelemetryHistory(): Promise<Record<string, Record<string, number[]>>> {
  const response = await fetch(`${API_BASE_URL}/api/monitoring/telemetry`);
  if (!response.ok) {
    throw new Error("Failed to load telemetry history");
  }
  return response.json();
}

export interface CloudConnection {
  provider: string;
  status: "connected" | "disconnected" | "error";
  auth_method: string;
  account: string;
  project: string;
  region: string;
  health: string;
  resources: number;
  monitoring: "Active" | "Suspended" | "Error";
}

export async function fetchConnections(): Promise<CloudConnection[]> {
  const response = await fetch(`${API_BASE_URL}/api/settings/connections`);
  if (!response.ok) {
    throw new Error("Failed to load integrations");
  }
  return response.json();
}

export async function testConnection(provider: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/settings/connections/${provider}/test`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`Failed to test connection to ${provider}`);
  }
  return response.json();
}

export async function connectConnection(provider: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/settings/connections/${provider}/connect`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`Failed to connect to ${provider}`);
  }
}

export async function disconnectConnection(provider: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/settings/connections/${provider}/disconnect`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`Failed to disconnect from ${provider}`);
  }
}

export async function syncConnection(provider: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/settings/connections/${provider}/sync`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`Failed to sync inventory for ${provider}`);
  }
}


