export type IncidentStatus = "active" | "resolving" | "resolved";
export type IncidentSeverity = "info" | "warning" | "critical";

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
}

export interface MetricSnapshot {
  service_name: string;
  cpu_percent: number;
  memory_percent: number;
  error_rate_percent: number;
  latency_ms: number;
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
