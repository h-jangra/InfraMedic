import { Activity, AlertTriangle, Clock, RefreshCcw, ServerCrash, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { evaluateMetrics, fetchIncidents, Incident, MetricSnapshot } from "./api";

const simulations: Array<{ label: string; icon: typeof Activity; snapshot: MetricSnapshot }> = [
  {
    label: "High CPU",
    icon: Activity,
    snapshot: { service_name: "checkout-api", cpu_percent: 96, memory_percent: 62, error_rate_percent: 0.4, latency_ms: 280 }
  },
  {
    label: "Memory Leak",
    icon: Zap,
    snapshot: { service_name: "inventory-worker", cpu_percent: 48, memory_percent: 97, error_rate_percent: 0.6, latency_ms: 340 }
  },
  {
    label: "CrashLoopBackOff",
    icon: ServerCrash,
    snapshot: { service_name: "payments-api", cpu_percent: 71, memory_percent: 76, error_rate_percent: 8.4, latency_ms: 950 }
  },
  {
    label: "Deployment Failure",
    icon: AlertTriangle,
    snapshot: { service_name: "orders-api", cpu_percent: 84, memory_percent: 86, error_rate_percent: 4.8, latency_ms: 1420 }
  }
];

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeIncidents = incidents.filter((incident) => incident.status !== "resolved");
  const criticalIncidents = activeIncidents.filter((incident) => incident.severity === "critical");

  const stats = useMemo(
    () => [
      { label: "Active Incidents", value: activeIncidents.length.toString(), icon: AlertTriangle },
      { label: "MTTD", value: "12s", icon: Clock },
      { label: "MTTR", value: "58s", icon: RefreshCcw },
      { label: "Auto Success", value: "91%", icon: ShieldCheck },
      { label: "Hours Saved", value: "24", icon: Zap },
      { label: "Cost Savings", value: "$18.4k", icon: Activity }
    ],
    [activeIncidents.length]
  );

  async function loadIncidents() {
    setError(null);
    const data = await fetchIncidents();
    setIncidents(data);
  }

  async function runSimulation(label: string, snapshot: MetricSnapshot) {
    try {
      setBusyAction(label);
      setError(null);
      await evaluateMetrics(snapshot);
      await loadIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    loadIncidents()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not connect to backend"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">InfraMedic</p>
            <h1 className="text-2xl font-semibold tracking-normal">Autonomous SRE dashboard</h1>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-panel px-4 text-sm font-medium shadow-panel transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => loadIncidents().catch((err) => setError(err instanceof Error ? err.message : "Refresh failed"))}
            disabled={loading}
            title="Refresh incidents"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-md border border-border bg-panel p-4 shadow-panel">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted">{stat.label}</span>
                  <Icon size={17} className="text-primary" />
                </div>
                <div className="mt-3 text-2xl font-semibold">{stat.value}</div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-md border border-border bg-panel p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Simulations</h2>
              <span className="rounded bg-background px-2 py-1 text-xs text-muted">Monitoring Agent</span>
            </div>
            <div className="grid gap-2">
              {simulations.map((simulation) => {
                const Icon = simulation.icon;
                return (
                  <button
                    key={simulation.label}
                    className="flex h-11 items-center justify-between rounded-md border border-border px-3 text-left text-sm font-medium transition hover:border-primary hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => runSimulation(simulation.label, simulation.snapshot)}
                    disabled={busyAction !== null}
                    title={`Simulate ${simulation.label}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon size={16} />
                      {simulation.label}
                    </span>
                    <span className="text-xs text-muted">{busyAction === simulation.label ? "Running" : "Run"}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-md border border-border bg-panel shadow-panel">
            <div className="flex flex-col gap-2 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold">Incidents</h2>
                <p className="text-sm text-muted">{criticalIncidents.length} critical active incident(s)</p>
              </div>
              {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-critical">{error}</div> : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-background text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Incident</th>
                    <th className="px-4 py-3 font-semibold">Service</th>
                    <th className="px-4 py-3 font-semibold">Metric</th>
                    <th className="px-4 py-3 font-semibold">Severity</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-muted" colSpan={6}>
                        Loading incidents
                      </td>
                    </tr>
                  ) : incidents.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-muted" colSpan={6}>
                        No incidents detected
                      </td>
                    </tr>
                  ) : (
                    incidents.map((incident) => (
                      <tr key={incident.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <div className="font-medium">{incident.title}</div>
                          <div className="mt-1 max-w-xl text-xs text-muted">{incident.description}</div>
                        </td>
                        <td className="px-4 py-3">{incident.service_name}</td>
                        <td className="px-4 py-3">
                          {incident.metric_value} / {incident.threshold}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`severity severity-${incident.severity}`}>{incident.severity}</span>
                        </td>
                        <td className="px-4 py-3 capitalize">{incident.status}</td>
                        <td className="px-4 py-3">{incident.agent}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

export default App;
