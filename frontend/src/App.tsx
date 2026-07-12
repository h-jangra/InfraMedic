import {
  Activity,
  AlertTriangle,
  Clock,
  RefreshCcw,
  ServerCrash,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Circle,
  X,
  Terminal,
  FileText,
  UserCheck,
  GitCommit,
  GitPullRequest,
  Database,
  ShieldAlert,
  TrendingUp,
  Coins,
  Info,
  Lock,
  Unlock,
  History,
  Shield,
  Trash2,
  Settings,
  Cloud,
  Sun,
  Moon,
  Search,
  Play,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Cpu,
  Copy,
  HelpCircle,
  HardDrive
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";

import {
  evaluateMetrics,
  fetchIncidents,
  fetchIncident,
  fetchDashboardStats,
  approveIncident,
  clearIncidents,
  fetchCloudSettings,
  updateCloudSettings,
  CloudSettings,
  Incident,
  MetricSnapshot,
  DashboardStats,
  CloudConnection,
  fetchConnections,
  testConnection,
  connectConnection,
  disconnectConnection,
  syncConnection,
  fetchDiscoveredResources,
  provisionDemoInfrastructure,
  teardownInfrastructure,
  DiscoveredResources,
  fetchTelemetryHistory
} from "./api";
import { DocsConsole } from "./DocsConsole";

const simulations: Array<{ label: string; icon: typeof Activity; snapshot: MetricSnapshot }> = [
  {
    label: "High CPU Anomaly",
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
  },
  {
    label: "Database Connection Storm",
    icon: Database,
    snapshot: { service_name: "database-storm", cpu_percent: 88, memory_percent: 74, error_rate_percent: 15.5, latency_ms: 2450 }
  }
];

function App() {
  // Navigation
  const [currentView, setCurrentView] = useState<"dashboard" | "incidents" | "s3" | "compute" | "rds" | "lambda" | "settings" | "docs">("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  // Global Core State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dbStats, setDbStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // Cloud Connections Integrations State
  const [connections, setConnections] = useState<CloudConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<CloudConnection | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [syncingConnection, setSyncingConnection] = useState<string | null>(null);
  const [togglingConnection, setTogglingConnection] = useState<string | null>(null);

  // Detail panel states
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeTab, setActiveTab] = useState<"trace" | "change_intel" | "time_machine" | "guardrails" | "reports">("trace");
  const [activeSummaryTab, setActiveSummaryTab] = useState<"engineer" | "manager" | "executive">("engineer");
  const [viewMode, setViewMode] = useState<"engineer" | "manager" | "executive">("engineer");

  // Discovered Resources State
  const [discoveredResources, setDiscoveredResources] = useState<DiscoveredResources | null>(null);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedComputeId, setSelectedComputeId] = useState<string | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<Record<string, Record<string, number[]>> | null>(null);

  // S3 Explorer States
  const [selectedS3Key, setSelectedS3Key] = useState<string | null>(null);
  const [s3Filter, setS3Filter] = useState<string>("");

  // RDS Explorer States
  const [selectedRDSTable, setSelectedRDSTable] = useState<string | null>(null);

  // Lambda Explorer States
  const [selectedLambdaName, setSelectedLambdaName] = useState<string | null>(null);
  const [lambdaPayload, setLambdaPayload] = useState<string>('{\n  "service": "checkout-api",\n  "action": "scale",\n  "replicas": 4\n}');
  const [lambdaOutput, setLambdaOutput] = useState<string | null>(null);
  const [invokingLambda, setInvokingLambda] = useState<boolean>(false);

  // Cloud settings modal/form states
  const [settingsTab, setSettingsTab] = useState<"connections" | "aws" | "azure" | "gcp" | "resources">("connections");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [cloudSettings, setCloudSettings] = useState<CloudSettings>({
    aws_endpoint_url: "",
    aws_region: "us-east-1",
    aws_access_key_id: "floci",
    aws_secret_access_key: "floci",
    aws_bucket_name: "inframedic-artifacts",

    azure_endpoint_url: "",
    azure_account_name: "devstoreaccount1",
    azure_account_key: "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ5n941",
    azure_container_name: "inframedic-container",

    gcp_endpoint_url: "",
    gcp_project_id: "floci-gcp-project",
    gcp_credentials_json: "{}",
    gcp_bucket_name: "inframedic-gcp-bucket"
  });

  // Theme state for Light/Dark mode
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const activeIncidents = incidents.filter((incident) => incident.status !== "resolved");

  const getAgentConfidenceBadge = (agent: string) => {
    let text = "";
    let color = "bg-charcoal/4 text-charcoal/83 border-light-cream";
    if (agent.includes("Monitoring")) {
      text = "Confidence: 97%";
    } else if (agent.includes("Diagnostic")) {
      text = "Confidence: 91%";
      color = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    } else if (agent.includes("Time Machine")) {
      text = "Similarity: 94%";
    } else if (agent.includes("Remediation")) {
      text = "Success Prediction: 88%";
      color = "bg-blue-50 text-blue-700 border-blue-200/60";
    } else if (agent.includes("Change Intelligence")) {
      text = "Correlation: 95%";
    } else if (agent.includes("Knowledge")) {
      text = "Relevance: 89%";
    } else if (agent.includes("Validation")) {
      text = "Verification: 99%";
      color = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    } else if (agent.includes("Safety Guardrails")) {
      text = "Safety: 99%";
      color = "bg-amber-50 text-amber-700 border-amber-200/60";
    } else if (agent.includes("Communication")) {
      text = "Accuracy: 98%";
    }

    if (!text) return null;
    return (
      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${color}`}>
        {text}
      </span>
    );
  };

  const nothingImpact = useMemo(() => {
    if (!selectedIncident) return { resolutionTime: "32 minutes", customerImpact: "12,400 sessions", revenueImpact: "$4,800", withInfraMedicTime: "52 seconds" };
    const svc = selectedIncident.service_name;

    if (svc === "checkout-api") {
      return {
        resolutionTime: "32 minutes",
        customerImpact: "12,400 sessions",
        revenueImpact: "$4,800",
        withInfraMedicTime: "45 seconds"
      };
    } else if (svc === "inventory-worker") {
      return {
        resolutionTime: "45 minutes",
        customerImpact: "8,200 sessions",
        revenueImpact: "$2,100",
        withInfraMedicTime: "35 seconds"
      };
    } else if (svc === "payments-api") {
      return {
        resolutionTime: "68 minutes",
        customerImpact: "24,000 sessions",
        revenueImpact: "$18,500",
        withInfraMedicTime: "55 seconds"
      };
    } else if (svc === "orders-api") {
      return {
        resolutionTime: "55 minutes",
        customerImpact: "15,300 sessions",
        revenueImpact: "$9,400",
        withInfraMedicTime: "50 seconds"
      };
    } else if (svc === "database-storm" || svc === "db-storm") {
      return {
        resolutionTime: "90 minutes",
        customerImpact: "42,000 sessions",
        revenueImpact: "$36,000",
        withInfraMedicTime: "48 seconds"
      };
    }
    return {
      resolutionTime: "32 minutes",
      customerImpact: "12,400 sessions",
      revenueImpact: "$4,800",
      withInfraMedicTime: "52 seconds"
    };
  }, [selectedIncident]);

  const explanation = useMemo(() => {
    if (!selectedIncident) return { title: "", description: "" };
    const svc = selectedIncident.service_name;
    const isResolved = selectedIncident.status === "resolved";

    if (viewMode === "engineer") {
      return {
        title: selectedIncident.title,
        description: selectedIncident.description
      };
    } else if (viewMode === "manager") {
      let title = `Service Anomaly: ${svc} metric out of bounds`;
      let description = `Automated telemetry validation detected a threshold breach. Core incident response protocol has been initiated, correlating configs and git changes.`;

      if (svc === "checkout-api") {
        title = "Resource Constraint Warning: checkout-api CPU spiked";
        description = "Core checkout API is operating near resource limits. Automatic scaling policies triggered to provision extra Kubernetes pods.";
      } else if (svc === "inventory-worker") {
        title = "JVM Heap Exhaustion Warning: inventory-worker memory leak";
        description = "Heap memory usage growing steadily. Automated mitigation staged a systemd service restart to clean old-generation garbage collection leak.";
      } else if (svc === "payments-api") {
        title = "Service Disruptions: payments-api crashlooping";
        description = "Payments API error rate surged due to failed DB connection handshake. Configuration rollback staged and waiting human operator gate authorization.";
      } else if (svc === "orders-api") {
        title = "Latency Degradation: orders-api response time spike";
        description = "Orders endpoint response latency crossed threshold limit. Automatic deployment rollback initiated to discard experimental canary release routes.";
      } else if (svc === "db-storm" || svc === "database-storm") {
        title = "Database Connection Pool Warning: storm locks Postgres";
        description = "Database connection pool saturated with active queries. Self-healing agent is scaling read replicas and purging dead pools.";
      }
      return { title, description };
    } else {
      // Executive mode
      let title = isResolved
        ? "Critical service degradation resolved automatically"
        : "Critical service degradation resolving automatically";
      let description = isResolved
        ? "No customer impact observed. InfraMedic AI intercepted the telemetry drift and deployed self-healing measures in under 60 seconds."
        : "No customer impact observed. InfraMedic AI has intercepted the telemetry anomaly and is applying an autonomous remediation patch.";

      if (svc === "payments-api" && !isResolved) {
        description = "No customer impact observed. InfraMedic AI intercepted the database credential mismatch and is awaiting operator authorization to roll back to safe revision.";
      }
      return { title, description };
    }
  }, [selectedIncident, viewMode]);

  const reasoningTrace = useMemo(() => {
    if (!selectedIncident) return [];
    const steps = selectedIncident.steps || [];

    const hasAlert = steps.some(s => s.step_type === "alert" || s.agent.includes("Monitoring"));
    const hasCorrelation = steps.some(s => s.step_type === "correlation" || s.agent.includes("Change"));
    const hasHistory = steps.some(s => s.step_type === "history_correlation" || s.agent.includes("Time Machine"));
    const hasRemediation = steps.some(s => s.step_type === "remediation" || s.agent.includes("Remediation"));
    const hasValidation = steps.some(s => s.step_type === "validation" || s.agent.includes("Validation"));

    const svc = selectedIncident.service_name;
    let anomalyText = "Anomaly detected";
    if (svc === "checkout-api") anomalyText = "CPU anomaly detected";
    else if (svc === "inventory-worker") anomalyText = "Memory leak anomaly detected";
    else if (svc === "payments-api") anomalyText = "Error rate anomaly detected";
    else if (svc === "orders-api") anomalyText = "Latency anomaly detected";
    else if (svc === "db-storm" || svc === "database-storm") anomalyText = "Database storm anomaly detected";

    let remediationText = "Remediation choice selected";
    if (svc === "checkout-api") remediationText = "Scale Deployment chosen";
    else if (svc === "inventory-worker") remediationText = "Restart Service chosen";
    else if (svc === "payments-api") remediationText = "Rollback Deployment chosen";
    else if (svc === "orders-api") remediationText = "Rollback Deployment chosen";
    else if (svc === "db-storm" || svc === "database-storm") remediationText = "Rollback Deployment chosen";

    return [
      { label: anomalyText, status: hasAlert ? "done" : "pending" },
      { label: "Deployment correlation found", status: hasCorrelation ? "done" : hasAlert ? "active" : "pending" },
      { label: "Historical matches identified", status: hasHistory ? "done" : hasCorrelation ? "active" : "pending" },
      { label: remediationText, status: hasRemediation ? "done" : hasHistory ? "active" : "pending" },
      { label: "Validation passed", status: hasValidation ? "done" : hasRemediation ? "active" : "pending" },
      { label: "Incident closed", status: selectedIncident.status === "resolved" ? "done" : hasValidation ? "active" : "pending" }
    ];
  }, [selectedIncident]);

  // Statistics calculated/fetched from the backend DB
  const stats = useMemo(() => {
    const activeCount = activeIncidents.length.toString();
    return [
      { label: "Active Incidents", value: activeCount, icon: AlertTriangle, color: "text-amber-700 bg-amber-50 border-amber-250/20" },
      { label: "MTTD (Detection)", value: dbStats?.mttd ?? "12s", icon: Clock, color: "text-blue-750 bg-blue-50 border-blue-200/20" },
      { label: "MTTR (Resolution)", value: dbStats?.mttr ?? "45s", icon: RefreshCcw, color: "text-emerald-750 bg-emerald-50 border-emerald-200/20" },
      { label: "Auto Success Rate", value: dbStats?.auto_success_rate ?? "96%", icon: ShieldCheck, color: "text-indigo-750 bg-indigo-50 border-indigo-200/20" },
      { label: "SRE Hours Saved", value: dbStats?.hours_saved ?? "8.4", icon: Zap, color: "text-purple-750 bg-purple-50 border-purple-200/20" },
      { label: "Revenue Saved", value: dbStats?.revenue_impact_avoided ?? "$25.0k", icon: Coins, color: "text-rose-750 bg-rose-50 border-rose-200/20" }
    ];
  }, [activeIncidents.length, dbStats]);

  async function loadIncidentsAndStats() {
    try {
      const list = await fetchIncidents();
      setIncidents(list);
      const statData = await fetchDashboardStats();
      setDbStats(statData);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
  }

  const loadResources = useCallback(async () => {
    try {
      setLoadingResources(true);
      const data = await fetchDiscoveredResources();
      setDiscoveredResources(data);
    } catch (err) {
      console.error("Failed to fetch discovered resources", err);
    } finally {
      setLoadingResources(false);
    }
  }, []);

  const loadTelemetryHistory = useCallback(async () => {
    try {
      const data = await fetchTelemetryHistory();
      setTelemetryHistory(data);
    } catch (err) {
      console.error("Failed to fetch telemetry history", err);
    }
  }, []);

  async function loadSettings() {
    try {
      const data = await fetchCloudSettings();
      setCloudSettings(data);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }

  const loadConnections = useCallback(async () => {
    try {
      const list = await fetchConnections();
      setConnections(list);
      setSelectedConnection((prev) => {
        if (!prev) return null;
        const matched = list.find((c) => c.provider === prev.provider);
        return matched || prev;
      });
    } catch (e) {
      console.error("Failed to load connections:", e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([
      loadIncidentsAndStats(),
      loadConnections(),
      loadResources(),
      loadSettings(),
      loadTelemetryHistory()
    ])
      .catch((err) => setError(err instanceof Error ? err.message : "Could not connect to backend"))
      .finally(() => setLoading(false));
  }, []);

  // Poll list if active incidents exist or refresh connections list
  useEffect(() => {
    const interval = setInterval(() => {
      const hasActive = incidents.some((inc) => inc.status !== "resolved");
      if (hasActive) {
        loadIncidentsAndStats().catch(console.error);
      }
      loadConnections().catch(console.error);
      loadResources().catch(console.error);
      loadTelemetryHistory().catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [incidents, loadConnections, loadResources, loadTelemetryHistory]);

  // Load and poll selected incident details
  useEffect(() => {
    if (selectedIncidentId === null) {
      setSelectedIncident(null);
      return;
    }
    setViewMode("engineer");

    let active = true;
    async function loadDetails() {
      try {
        const data = await fetchIncident(selectedIncidentId!);
        if (active) {
          setSelectedIncident(data);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadDetails();

    const interval = setInterval(() => {
      if (selectedIncident && (selectedIncident.status === "active" || selectedIncident.status === "resolving")) {
        loadDetails();
      }
    }, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedIncidentId, selectedIncident?.status]);

  // Actions
  async function runSimulation(label: string, snapshot: MetricSnapshot) {
    try {
      setBusyAction(label);
      setError(null);
      await evaluateMetrics(snapshot);
      await loadIncidentsAndStats();
      setCurrentView("incidents");
      // Select the newly spawned incident if possible
      const list = await fetchIncidents();
      if (list.length > 0) {
        setSelectedIncidentId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleApprove(id: number) {
    try {
      setApprovingId(id);
      setError(null);
      const updated = await approveIncident(id);
      setSelectedIncident(updated);
      await loadIncidentsAndStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleClearLogs() {
    if (!window.confirm("Are you sure you want to clear all incident activity logs?")) {
      return;
    }
    try {
      setError(null);
      await clearIncidents();
      setIncidents([]);
      setSelectedIncidentId(null);
      setSelectedIncident(null);
      await loadIncidentsAndStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear logs");
    }
  }

  async function handleProvision() {
    try {
      setBusyAction("Provisioning...");
      setError(null);
      await provisionDemoInfrastructure();
      await loadResources();
      alert("Demo infrastructure provisioned successfully in Local Floci Cloud!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTeardown() {
    try {
      if (!confirm("Are you sure you want to destroy all local sandbox resources?")) return;
      setBusyAction("Tearing down...");
      setError(null);
      await teardownInfrastructure();
      await loadResources();
      alert("Demo infrastructure destroyed successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Teardown failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTestConnection(provider: string) {
    try {
      setTestingConnection(provider);
      const res = await testConnection(provider);
      await loadConnections();
      alert(`Connection to ${provider.toUpperCase()}: ${res.health}\nAuth Method: ${res.auth_method}\nAccount: ${res.account}`);
    } catch (err) {
      alert(`Test failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTestingConnection(null);
    }
  }

  async function handleToggleConnection(provider: string, currentStatus: "connected" | "disconnected" | "error") {
    try {
      setTogglingConnection(provider);
      if (currentStatus === "connected" || currentStatus === "error") {
        await disconnectConnection(provider);
      } else {
        await connectConnection(provider);
      }
      await loadConnections();
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingConnection(null);
    }
  }

  async function handleSyncConnection(provider: string) {
    try {
      setSyncingConnection(provider);
      await syncConnection(provider);
      await loadConnections();
      await loadResources();
      alert(`Successfully synced local resource inventory for ${provider.toUpperCase()}`);
    } catch (err) {
      alert(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncingConnection(null);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsError(null);
      setSettingsSuccess(false);
      const updated = await updateCloudSettings(cloudSettings);
      setCloudSettings(updated);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
      loadResources();
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to save cloud settings");
    } finally {
      setSavingSettings(false);
    }
  }

  // S3 Explorer Mock Files list
  const mockS3Files = useMemo<Array<{ key: string; size: string; type: string; lastModified: string; content: string }>>(() => {
    return [
      {
        key: "reports/incident_checkout-api_rca_summary.json",
        size: "1.24 KB",
        type: "application/json",
        lastModified: "2026-07-12 04:10:02",
        content: JSON.stringify({
          incident_id: 104,
          service_name: "checkout-api",
          anomaly: "High CPU Spike",
          confidence_score: 0.97,
          diagnostic_rca: "Traffic volume increased by 3.2x, causing pod resource limits breach.",
          action_taken: "Scale Deployment",
          status: "Resolved",
          saved_downtime_minutes: 32,
          saved_revenue_dollars: 4800
        }, null, 2)
      },
      {
        key: "reports/incident_inventory-worker_leak_rca.json",
        size: "860 B",
        type: "application/json",
        lastModified: "2026-07-12 03:52:14",
        content: JSON.stringify({
          incident_id: 105,
          service_name: "inventory-worker",
          anomaly: "Memory Leak",
          confidence_score: 0.91,
          diagnostic_rca: "Steady growth in JVM old generation heap garbage.",
          action_taken: "Restart Service",
          status: "Resolved",
          saved_downtime_minutes: 45,
          saved_revenue_dollars: 2100
        }, null, 2)
      },
      {
        key: "runbooks/sop_scale_deployment.sh",
        size: "1.85 KB",
        type: "text/x-shellscript",
        lastModified: "2026-07-11 18:22:05",
        content: `#!/usr/bin/env bash
# SOP-023: Kubernetes Deployment Auto-Scaling Hook
# Usage: ./sop_scale_deployment.sh <deployment-name> <max-replicas>

DEPLOYMENT=$1
MAX_REPLICAS=\${2:-4}
NAMESPACE=\${3:-"default"}

echo "[INFO] Running SRE scale hooks for deployment/\${DEPLOYMENT}..."
CURRENT_REPLICAS=$(kubectl get deployment \${DEPLOYMENT} -n \${NAMESPACE} -o jsonpath='{.spec.replicas}')

if [ "\${CURRENT_REPLICAS}" -lt "\${MAX_REPLICAS}" ]; then
  NEW_REPLICAS=$((CURRENT_REPLICAS + 2))
  if [ "\${NEW_REPLICAS}" -gt "\${MAX_REPLICAS}" ]; then
    NEW_REPLICAS=\${MAX_REPLICAS}
  fi
  echo "[INFO] Scaling from \${CURRENT_REPLICAS} to \${NEW_REPLICAS}..."
  kubectl scale deployment/\${DEPLOYMENT} --replicas=\${NEW_REPLICAS} -n \${NAMESPACE}
  echo "[SUCCESS] Scale transaction committed successfully."
else
  echo "[WARNING] Deployment already scaled to maximum replica capacity (\${MAX_REPLICAS})."
fi`
      },
      {
        key: "runbooks/sop_restart_service.sh",
        size: "1.12 KB",
        type: "text/x-shellscript",
        lastModified: "2026-07-11 18:21:40",
        content: `#!/usr/bin/env bash
# SOP-048: Remote Host systemd daemon recycle hook
# Usage: ./sop_restart_service.sh <service-name>

SERVICE=$1

echo "[INFO] Recyling systemd daemon service: \${SERVICE}..."
systemctl is-active --quiet \${SERVICE}
if [ $? -eq 0 ]; then
  echo "[INFO] Daemon is currently running. Issuing restart command..."
  systemctl restart \${SERVICE}
  echo "[SUCCESS] Service \${SERVICE} restarted successfully."
else
  echo "[WARNING] Daemon is inactive. Attempting cold start..."
  systemctl start \${SERVICE}
  echo "[SUCCESS] Service started from offline state."
fi`
      },
      {
        key: "logs/checkout-api-stdout.log",
        size: "3.42 KB",
        type: "text/plain",
        lastModified: "2026-07-12 04:12:00",
        content: `2026-07-12T04:10:00Z [INFO] Incoming POST /cart/checkout from IP 198.51.100.42
2026-07-12T04:10:01Z [INFO] Processing payment token: tok_9281a8c8e1
2026-07-12T04:10:01Z [WARNING] Database connection latency: 450ms (threshold: 200ms)
2026-07-12T04:10:02Z [ERROR] CPU usage surged to 96%! Container limits: 1000m.
2026-07-12T04:10:02Z [ERROR] Kubernetes kubelet detected CPU throttling on checkout-api-pod-2
2026-07-12T04:10:03Z [INFO] InfraMedic SRE Monitoring Agent triggered CPU_ANOMALY hook.
2026-07-12T04:10:04Z [INFO] Orchestrator instantiated incident ID #104.
2026-07-12T04:10:05Z [INFO] Change Intelligence scanning commit repository: main...`
      },
      {
        key: "logs/database-locks.log",
        size: "2.15 KB",
        type: "text/plain",
        lastModified: "2026-07-12 04:05:00",
        content: `2026-07-12T04:02:12Z [INFO] Postgres Stats Collector: active_connections=185/200
2026-07-12T04:02:15Z [WARNING] Query execution time exceeds threshold: "SELECT * FROM orders WHERE status = 'pending' FOR UPDATE" (8.5 seconds)
2026-07-12T04:02:18Z [ERROR] Postgres locking engine: detected row lock conflict on table 'orders'
2026-07-12T04:02:18Z [INFO] Blocking PID: 421 (active since 12s), Waiting PID: 508 (blocked since 6s)
2026-07-12T04:02:20Z [ERROR] Connection Pool Exhausted! Cannot allocate new database handles.
2026-07-12T04:02:22Z [INFO] Diagnostic Swarm: executing lock purge algorithm.`
      }
    ];
  }, []);

  const filteredS3Files = useMemo(() => {
    return mockS3Files.filter(file => {
      if (s3Filter === "reports") return file.key.startsWith("reports/");
      if (s3Filter === "runbooks") return file.key.startsWith("runbooks/");
      if (s3Filter === "logs") return file.key.startsWith("logs/");
      return file.key.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [mockS3Files, s3Filter, searchTerm]);

  const selectedS3File = useMemo(() => {
    return mockS3Files.find(file => file.key === selectedS3Key) || null;
  }, [mockS3Files, selectedS3Key]);

  // RDS Explorer tables schema and live data mapping
  const databaseTables = useMemo(() => {
    return {
      incidents: {
        columns: ["id", "title", "service", "metric", "value", "severity", "status", "created_at"],
        rows: incidents.map(inc => ({
          id: inc.id,
          title: inc.title,
          service: inc.service_name,
          metric: inc.metric_name,
          value: `${inc.metric_value} ${inc.metric_name === "latency_ms" ? "ms" : "%"}`,
          severity: inc.severity,
          status: inc.status,
          created_at: new Date(inc.created_at).toLocaleTimeString()
        }))
      },
      incident_steps: {
        columns: ["id", "incident_id", "agent", "step_type", "message", "timestamp"],
        rows: incidents.flatMap(inc => (inc.steps || []).map(step => ({
          id: step.id,
          incident_id: step.incident_id,
          agent: step.agent,
          step_type: step.step_type,
          message: step.message,
          timestamp: new Date(step.created_at).toLocaleTimeString()
        })))
      },
      cloud_connections: {
        columns: ["provider", "status", "auth_method", "region", "health", "resources_monitored"],
        rows: connections.map(conn => ({
          provider: conn.provider,
          status: conn.status,
          auth_method: conn.auth_method,
          region: conn.region,
          health: conn.health,
          resources_monitored: conn.resources
        }))
      },
      settings_cache: {
        columns: ["key", "value"],
        rows: Object.entries(cloudSettings).map(([key, val]) => ({
          key,
          value: typeof val === "string" && val.length > 30 ? val.slice(0, 30) + "..." : String(val)
        }))
      }
    };
  }, [incidents, connections, cloudSettings]);

  const selectedTableData = useMemo(() => {
    if (!selectedRDSTable) return null;
    return databaseTables[selectedRDSTable as keyof typeof databaseTables] || null;
  }, [selectedRDSTable, databaseTables]);

  // Lambda functions mock list
  const lambdaFunctions = [
    { name: "remediation-scale-deployment", runtime: "Python 3.11", memory: "256 MB", timeout: "30s", desc: "Kubernetes scaling client hook to provision pods." },
    { name: "remediation-restart-daemon", runtime: "Python 3.11", memory: "128 MB", timeout: "15s", desc: "Systemd host daemon restart execution hook." },
    { name: "remediation-flush-redis", runtime: "Node.js 20", memory: "128 MB", timeout: "10s", desc: "Redis database flush and stale memory buffer cleaner." },
    { name: "remediation-rollback-git", runtime: "Go 1.21", memory: "256 MB", timeout: "60s", desc: "Git repository revert script to restore stable revisions." }
  ];

  async function handleInvokeLambda() {
    setInvokingLambda(true);
    setLambdaOutput(null);

    // Simulate AWS Lambda container execution
    setTimeout(() => {
      setInvokingLambda(false);
      try {
        const parsed = JSON.parse(lambdaPayload);
        const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        setLambdaOutput(
`START RequestId: ${uuid} Version: $LATEST
[INFO] Lambda invoked with payload: ${JSON.stringify(parsed)}
[INFO] Establishing secure Kubernetes API connection to EKS...
[INFO] Locating deployment resources for target: "${parsed.service || "checkout-api"}"
[INFO] Invoking SRE scaling rule SOP-023...
[SUCCESS] Resource scaling committed. Current replicas: ${parsed.replicas || 4}.
END RequestId: ${uuid}
REPORT RequestId: ${uuid} Duration: 382.42 ms Billed Duration: 400 ms Memory Size: 256 MB Max Memory Used: 68 MB`);
      } catch (err) {
        setLambdaOutput(`[ERROR] JSON Payload Parsing Failed:\n${err instanceof Error ? err.message : String(err)}`);
      }
    }, 1500);
  }

  // Extract summaries from resolution_summary text
  const summaries = useMemo(() => {
    if (!selectedIncident?.resolution_summary) return null;
    const text = selectedIncident.resolution_summary;

    const parseSection = (header: string) => {
      const idx = text.indexOf(header);
      if (idx === -1) return "";
      const start = idx + header.length;
      const nextHeaderIdx = text.substring(start).search(/### [A-Z]/);
      if (nextHeaderIdx === -1) {
        return text.substring(start).trim();
      }
      return text.substring(start, start + nextHeaderIdx).trim();
    };

    return {
      engineer: parseSection("### ENGINEER SUMMARY"),
      manager: parseSection("### MANAGER SUMMARY"),
      executive: parseSection("### EXECUTIVE SUMMARY"),
    };
  }, [selectedIncident?.resolution_summary]);

  // Parsed structured JSONs from backend
  const changeIntelligence = useMemo(() => {
    if (!selectedIncident?.change_intelligence_json) return null;
    try {
      return JSON.parse(selectedIncident.change_intelligence_json);
    } catch (e) {
      console.error("Failed to parse change_intelligence_json", e);
      return null;
    }
  }, [selectedIncident?.change_intelligence_json]);

  const timeMachine = useMemo(() => {
    if (!selectedIncident?.time_machine_json) return null;
    try {
      return JSON.parse(selectedIncident.time_machine_json);
    } catch (e) {
      console.error("Failed to parse time_machine_json", e);
      return null;
    }
  }, [selectedIncident?.time_machine_json]);

  // Determine stage execution status for live visualization
  const pipelineStages = useMemo(() => {
    if (!selectedIncident) return [];
    const steps = selectedIncident.steps || [];

    const hasAlert = steps.some(s => s.step_type === "alert");
    const hasCorrelation = steps.some(s => s.step_type === "correlation");
    const hasDiagnosis = steps.some(s => s.step_type === "diagnosis");
    const hasKnowledge = steps.some(s => s.step_type === "knowledge_retrieval");
    const hasHistory = steps.some(s => s.step_type === "history_correlation");
    const hasRemediation = steps.some(s => s.step_type === "remediation");
    const hasValidation = steps.some(s => s.step_type === "validation");
    const hasSummarization = steps.some(s => s.step_type === "summarization");

    const requiresApproval = selectedIncident.requires_approval;
    const approvalStatus = selectedIncident.approval_status;

    return [
      { id: "monitor", label: "Monitoring", status: hasAlert ? "completed" : "active", agent: "Monitoring Agent" },
      { id: "change_intel", label: "Change Intel", status: hasCorrelation ? "completed" : hasAlert ? "active" : "pending", agent: "Change Intelligence Agent" },
      { id: "diagnostic", label: "Diagnosis", status: hasDiagnosis ? "completed" : hasCorrelation ? "active" : "pending", agent: "Diagnostic Agent" },
      { id: "knowledge", label: "SOP Search", status: hasKnowledge ? "completed" : hasDiagnosis ? "active" : "pending", agent: "Knowledge Agent" },
      { id: "time_machine", label: "Time Match", status: hasHistory ? "completed" : hasKnowledge ? "active" : "pending", agent: "Incident Time Machine Agent" },
      {
        id: "guardrails",
        label: "Safety Gate",
        status: requiresApproval ? (approvalStatus === "approved" ? "completed" : "halted") : (hasHistory ? "completed" : "pending"),
        agent: "Safety Guardrails Agent"
      },
      {
        id: "remediation",
        label: "Remediation",
        status: hasRemediation ? "completed" : (hasHistory && (!requiresApproval || approvalStatus === "approved") ? "active" : "pending"),
        agent: "Remediation Agent"
      },
      { id: "validation", label: "Validation", status: hasValidation ? "completed" : hasRemediation ? "active" : "pending", agent: "Validation Agent" },
      { id: "communication", label: "Stakeholders", status: hasSummarization ? "completed" : hasValidation ? "active" : "pending", agent: "Communication Agent" },
    ];
  }, [selectedIncident]);

  const activeComputeInstance = useMemo(() => {
    if (!selectedComputeId || !discoveredResources?.compute) return null;
    return discoveredResources.compute.find(c => c.id === selectedComputeId) || null;
  }, [selectedComputeId, discoveredResources]);

  return (
    <main className="app-container font-sans text-charcoal selection:bg-amber-100 relative overflow-hidden bg-cream">

      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar select-none">
        {/* Brand/Logo Area */}
        <div className="brand">
          <button
            onClick={() => setCurrentView("dashboard")}
            className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted/60"
          >
            <img
              src="/Inframedic.png"
              alt="InfraMedic"
              className="h-9 w-9 shrink-0 object-contain"
            />

            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold tracking-tight text-charcoal">
                InfraMedic
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-gray">
                Autonomous SRE
              </span>
            </div>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="nav-menu">

          <div className="nav-section">
            <span className="nav-label">Global Console</span>
            <button
              onClick={() => { setCurrentView("dashboard"); setSelectedIncidentId(null); }}
              className={`w-full text-left nav-link ${currentView === "dashboard" ? "active" : ""}`}
            >
              <Activity size={14} />
              <span>Console Home</span>
            </button>
            <button
              onClick={() => setCurrentView("incidents")}
              className={`w-full text-left nav-link ${currentView === "incidents" ? "active" : ""}`}
            >
              <AlertTriangle size={14} />
              <span>Incidents & Trace</span>
              {activeIncidents.length > 0 && (
                <span className="ml-auto bg-amber-500 text-charcoal text-[9px] font-semibold px-1.5 py-0.2 rounded-full">
                  {activeIncidents.length}
                </span>
              )}
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-label">Cloud Explorer</span>
            <button
              onClick={() => setCurrentView("compute")}
              className={`w-full text-left nav-link ${currentView === "compute" ? "active" : ""}`}
            >
              <Cpu size={14} />
              <span>EC2 Compute</span>
            </button>
            <button
              onClick={() => setCurrentView("s3")}
              className={`w-full text-left nav-link ${currentView === "s3" ? "active" : ""}`}
            >
              <Cloud size={14} />
              <span>S3 Storage</span>
            </button>
            <button
              onClick={() => setCurrentView("rds")}
              className={`w-full text-left nav-link ${currentView === "rds" ? "active" : ""}`}
            >
              <Database size={14} />
              <span>RDS Databases</span>
            </button>
            <button
              onClick={() => setCurrentView("lambda")}
              className={`w-full text-left nav-link ${currentView === "lambda" ? "active" : ""}`}
            >
              <Zap size={14} />
              <span>Lambda Functions</span>
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-label">Configure</span>
            <button
              onClick={() => setCurrentView("settings")}
              className={`w-full text-left nav-link ${currentView === "settings" ? "active" : ""}`}
            >
              <Settings size={14} />
              <span>Connections</span>
            </button>
            <button
              onClick={() => setCurrentView("docs")}
              className={`w-full text-left nav-link ${currentView === "docs" ? "active" : ""}`}
            >
              <FileText size={14} />
              <span>System Docs</span>
            </button>
          </div>
        </nav>

        {/* Footer Area */}
        <div className="sidebar-footer">
          <div className="flex items-center justify-between text-[10px]">
            <span>Console Version: 1.2.0</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT BODY */}
      <section className="shell">

        {/* GLOBAL TOPBAR NAVBAR */}
        <header className="topbar select-none">
          {/* Search bar */}
          <div className="search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search services, buckets, incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Connection badge */}
          <div className="connection hidden md:inline-flex">
            <Cloud size={12} className="text-muted-gray" />
            <span className="connection-state">Floci:</span>
            <span className="connection-target">Local Dev Cloud (4566)</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
          </div>

          {/* Account selector */}
          <div className="account-switcher ml-auto hidden sm:block">
            <div className="account-trigger">
              <UserCheck size={13} className="text-muted-gray" />
              <div className="account-meta">
                <span className="account-label">Account</span>
                <span className="account-value text-[10px]">000000000000</span>
              </div>
            </div>
          </div>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            className="p-1.5 rounded hover:bg-charcoal/4 text-muted-gray hover:text-charcoal transition-colors border border-transparent"
            title="Toggle Light/Dark Theme"
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {/* Docs Button */}
          <button
            onClick={() => setCurrentView("docs")}
            className="p-1.5 rounded hover:bg-charcoal/4 text-muted-gray hover:text-charcoal transition-colors border border-transparent"
            title="Technical Documentation"
          >
            <HelpCircle size={14} />
          </button>

          {/* Refresh Button */}
          <button
            onClick={async () => {
              setLoading(true);
              await Promise.all([loadIncidentsAndStats(), loadConnections(), loadResources()]);
              setLoading(false);
            }}
            disabled={loading}
            className="p-1.5 rounded hover:bg-charcoal/4 text-muted-gray hover:text-charcoal transition-colors border border-transparent disabled:opacity-50"
            title="Reload Console Data"
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          {/* User Profile avatar */}
          <div className="h-7 w-7 rounded-full bg-charcoal text-off-white font-semibold flex items-center justify-center text-xs shadow-btn-inset select-none ml-1">
            H
          </div>
        </header>

        {/* MAIN BODY CONTENTS */}
        <main className="main-content">

          {error && (
            <div className="m-4 rounded border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          {busyAction && (
            <div className="m-4 rounded border border-indigo-200 bg-indigo-50/50 p-3 text-xs font-semibold text-indigo-700 flex items-center gap-2 animate-pulse">
              <RefreshCcw size={14} className="animate-spin" />
              <span>Running: {busyAction}</span>
            </div>
          )}

          {/* A. VIEW: CONSOLE HOME / DASHBOARD */}
          {currentView === "dashboard" && (
            <div className="content-pane animate-fade-in">

            {/* Banner Welcome */}
            <div className="relative overflow-hidden rounded-xl border border-light-cream bg-cream p-5 transition-colors">
              <div className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-15">
                <div className="absolute -top-[20%] -left-[10%] h-[140%] w-[50%] rounded-full bg-orange-500/30 blur-[90px]" />
                <div className="absolute -bottom-[20%] right-[10%] h-[140%] w-[50%] rounded-full bg-violet-500/30 blur-[90px]" />
              </div>

              <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Site Reliability Engineering
                  </span>

                  <h2 className="text-xl font-semibold text-charcoal">
                    InfraMedic Autonomous SRE Dashboard
                  </h2>

                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-gray">
                    Powered by a swarming multi-agent LangGraph orchestrator. InfraMedic
                    intercepts monitoring telemetry anomalies, isolates Git
                    configurations, performs runbook search, and executes remediation
                    workflows inside the local Floci cloud.
                  </p>
                </div>
              </div>
            </div>

              {/* Six stats widgets */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="aws-widget p-4 flex flex-col justify-between min-h-[90px]">
                      <div className="flex items-center justify-between text-[10px] text-muted-gray uppercase tracking-wider font-semibold">
                        <span>{stat.label}</span>
                        <div className="p-1 rounded bg-charcoal/4">
                          <Icon size={12} className="text-charcoal" />
                        </div>
                      </div>
                      <span className="text-xl font-semibold mt-2 text-charcoal font-sans">{stat.value}</span>
                    </div>
                  );
                })}
              </div>

              {/* Two Column details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Column 1 & 2: Simulator & Incidents */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                  {/* Simulator */}
                  <div className="card-panel">
                    <div className="card-header">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-charcoal" />
                        <h3 className="font-semibold text-xs text-charcoal uppercase tracking-wider">Telemetry Failure Simulator</h3>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {simulations.map((sim, idx) => {
                          const Icon = sim.icon;
                          const isBusy = busyAction === sim.label;
                          return (
                            <button
                              key={idx}
                              onClick={() => runSimulation(sim.label, sim.snapshot)}
                              disabled={busyAction !== null}
                              className={`flex items-center justify-between rounded border p-3.5 text-left text-xs font-semibold transition-all ${
                                isBusy
                                  ? "bg-charcoal text-off-white border-charcoal shadow-btn-inset"
                                  : "border-light-cream bg-transparent hover:bg-hover text-charcoal active:opacity-80"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Icon size={14} className={isBusy ? "text-off-white" : "text-muted-gray"} />
                                <span>{sim.label}</span>
                              </span>
                              <span className={`text-[10px] ${isBusy ? "text-off-white/80" : "text-muted-gray"}`}>
                                {isBusy ? "Simulating..." : "Trigger"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Active Incidents list */}
                  <div className="card-panel">
                    <div className="card-header">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-charcoal" />
                        <h3 className="font-semibold text-xs text-charcoal uppercase tracking-wider">Active Telemetry Anomalies</h3>
                      </div>
                      <span className="text-[10px] font-mono text-muted-gray">{activeIncidents.length} active</span>
                    </div>
                    <div className="card-body p-0">
                      {activeIncidents.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-gray">
                          No active incidents detected. Click a simulator button to trigger an anomaly.
                        </div>
                      ) : (
                        <div className="divide-y divide-light-cream">
                          {activeIncidents.map((incident) => (
                            <div
                              key={incident.id}
                              onClick={() => {
                                setSelectedIncidentId(incident.id);
                                setCurrentView("incidents");
                              }}
                              className="p-4 flex items-center justify-between hover:bg-hover cursor-pointer transition-colors"
                            >
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-xs text-charcoal line-clamp-1">{incident.title}</span>
                                <div className="flex items-center gap-3 text-[10px] font-mono text-muted-gray">
                                  <span className="bg-charcoal/4 px-1 py-0.5 rounded text-charcoal">{incident.service_name}</span>
                                  <span>{incident.metric_value} {incident.metric_name === "latency_ms" ? "ms" : "%"}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border uppercase ${
                                  incident.severity === "critical" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"
                                }`}>
                                  {incident.severity}
                                </span>
                                <ChevronRight size={14} className="text-muted-gray" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Column 3: Cloud inventory summary */}
                <div className="flex flex-col gap-6">

                  {/* Cloud Inventory card */}
                  <div className="card-panel">
                    <div className="card-header">
                      <div className="flex items-center gap-2">
                        <Cloud size={14} className="text-charcoal" />
                        <h3 className="font-semibold text-xs text-charcoal uppercase tracking-wider">
                          Cloud Inventory ({connections.find(c => c.status === "connected" && c.provider !== "floci")?.provider.toUpperCase() || "Local"})
                        </h3>
                      </div>
                    </div>
                    <div className="card-body">
                      {loadingResources ? (
                        <div className="text-center py-4 text-xs text-muted-gray">
                          Querying {
                            connections.find(c => c.status === "connected" && c.provider !== "floci")?.provider.toUpperCase() === "AWS" ? "AWS" :
                            connections.find(c => c.status === "connected" && c.provider !== "floci")?.provider.toUpperCase() === "GCP" ? "GCP" :
                            connections.find(c => c.status === "connected" && c.provider !== "floci")?.provider.toUpperCase() === "AZURE" ? "Azure" :
                            "Localstack"
                          }...
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3.5 text-xs">
                          <div
                            onClick={() => setCurrentView("compute")}
                            className="flex items-center justify-between border-b border-light-cream pb-2 hover:bg-hover cursor-pointer p-1 rounded"
                          >
                            <span className="text-muted-gray flex items-center gap-1.5">
                              <Cpu size={12} /> Compute Nodes (EC2)
                            </span>
                            <span className="font-semibold text-charcoal font-mono">{discoveredResources?.compute?.length || 0}</span>
                          </div>
                          <div
                            onClick={() => setCurrentView("s3")}
                            className="flex items-center justify-between border-b border-light-cream pb-2 hover:bg-hover cursor-pointer p-1 rounded"
                          >
                            <span className="text-muted-gray flex items-center gap-1.5">
                              <HardDrive size={12} /> Storage Buckets (S3)
                            </span>
                            <span className="font-semibold text-charcoal font-mono">{discoveredResources?.storage?.length || 0}</span>
                          </div>
                          <div
                            onClick={() => setCurrentView("rds")}
                            className="flex items-center justify-between border-b border-light-cream pb-2 hover:bg-hover cursor-pointer p-1 rounded"
                          >
                            <span className="text-muted-gray flex items-center gap-1.5">
                              <Database size={12} /> SQL Databases (RDS)
                            </span>
                            <span className="font-semibold text-charcoal font-mono">{discoveredResources?.databases?.length || 0}</span>
                          </div>
                          <div
                            onClick={() => setCurrentView("lambda")}
                            className="flex items-center justify-between hover:bg-hover cursor-pointer p-1 rounded"
                          >
                            <span className="text-muted-gray flex items-center gap-1.5">
                              <Zap size={12} /> Automation Functions (Lambda)
                            </span>
                            <span className="font-semibold text-charcoal font-mono">{discoveredResources?.functions?.length || 0}</span>
                          </div>

                          <button
                            onClick={() => setCurrentView("compute")}
                            className="w-full text-center py-1.5 bg-charcoal text-off-white text-[10px] uppercase font-semibold tracking-wider rounded shadow-btn-inset hover:opacity-90 active:opacity-80 transition-all mt-1"
                          >
                            Browse Cloud Resources
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SRE Agent swarm status */}
                  <div className="card-panel">
                    <div className="card-header">
                      <div className="flex items-center gap-2">
                        <UserCheck size={14} className="text-charcoal" />
                        <h3 className="font-semibold text-xs text-charcoal uppercase tracking-wider">SRE Subagents (AGENTS.md)</h3>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="flex flex-col gap-2.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal font-semibold">1. Monitoring Agent</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal font-semibold">2. Change Intel Agent</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal font-semibold">3. Diagnostic Agent</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal font-semibold">4. Knowledge Agent</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal font-semibold">5. Time Machine Agent</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal font-semibold">6. Remediation Agent</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal font-semibold">7. Validation Agent</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-charcoal font-semibold">8. Communication Agent</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* B. VIEW: INCIDENTS & TRACE EXPLORER */}
          {currentView === "incidents" && (
            <div className="aws-split animate-fade-in">
              {/* Left Incidents List Sidebar */}
              <div className="aws-split-list select-none">
                <div className="p-3 border-b border-light-cream flex items-center justify-between bg-charcoal/2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-gray">Telemetry Incidents</span>
                  {incidents.length > 0 && (
                    <button
                      onClick={handleClearLogs}
                      className="text-[10px] text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded px-2 py-0.5 font-semibold transition-all"
                    >
                      Clear Log
                    </button>
                  )}
                </div>

                <div className="divide-y divide-light-cream">
                  {incidents.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-gray leading-relaxed">
                      No incidents logged.<br />Go to Console Home to trigger a telemetry simulation.
                    </div>
                  ) : (
                    incidents.map((incident) => {
                      const isSelected = incident.id === selectedIncidentId;
                      return (
                        <div
                          key={incident.id}
                          onClick={() => setSelectedIncidentId(incident.id)}
                          className={`p-3.5 cursor-pointer transition-all duration-150 border-l-2 text-xs hover:bg-hover ${
                            isSelected ? "bg-charcoal/3 border-charcoal" : "border-transparent"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-charcoal line-clamp-1">{incident.title}</h4>
                            <span className={`text-[8px] font-semibold px-1.5 py-0.2 rounded border uppercase shrink-0 ${
                              incident.severity === "critical"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : incident.severity === "warning"
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-blue-50 border-blue-200 text-blue-700"
                            }`}>
                              {incident.severity}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-gray font-mono">
                            <span className="bg-charcoal/4 px-1 rounded text-charcoal">{incident.service_name}</span>
                            <span>{incident.metric_value} {incident.metric_name === "latency_ms" ? "ms" : "%"}</span>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8px] font-semibold uppercase tracking-wider border ${
                              incident.status === "resolved"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : incident.status === "resolving"
                                ? "bg-blue-50 border-blue-200 text-blue-700 animate-pulse"
                                : "bg-red-50 border-red-200 text-red-700"
                            }`}>
                              {incident.status}
                            </span>
                            <span className="text-[9px] text-muted-gray">
                              {new Date(incident.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Workspace detail */}
              <div className="aws-split-detail">
                {selectedIncidentId ? (
                  selectedIncident ? (
                    <div className="p-5 flex flex-col gap-5">

                      {/* workspace header */}
                      <div className="border-b border-light-cream pb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider">Incident #{selectedIncident.id}</span>
                            {selectedIncident.risk_score && selectedIncident.risk_score >= 60 && (
                              <span className="text-[9px] font-medium uppercase text-red-700 bg-red-50 border border-red-250 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <ShieldAlert size={10} /> Human Gate Halted
                              </span>
                            )}
                          </div>
                          <h2 className="text-base font-semibold text-charcoal mt-1 font-sans">{explanation.title}</h2>
                          <p className="text-xs text-muted-gray mt-0.5">{explanation.description}</p>
                        </div>

                        {/* View mode selector */}
                        <div className="flex items-center gap-1 bg-charcoal/3 border border-light-cream p-0.5 rounded text-xs shrink-0 self-start">
                          {(["engineer", "manager", "executive"] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => {
                                setViewMode(mode);
                                setActiveSummaryTab(mode);
                              }}
                              className={`px-2 py-1 rounded text-[8px] font-semibold uppercase tracking-wider transition-all duration-120 ${
                                viewMode === mode
                                  ? "bg-charcoal text-off-white shadow-btn-inset"
                                  : "text-muted-gray hover:text-charcoal"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* pipeline live animation */}
                      <div className="aws-widget bg-charcoal/3 border-light-cream p-4">
                        <div className="flex items-center justify-between border-b border-light-cream pb-2 mb-3">
                          <span className="text-[9px] font-semibold uppercase text-muted-gray tracking-wider flex items-center gap-1.5">
                            <Activity size={11} /> Live Swarm Orchestrator Pipeline
                          </span>
                          <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded uppercase font-semibold">State Machine Flow</span>
                        </div>
                        <div className="overflow-x-auto pb-1 scrollbar-thin">
                          <div className="flex items-center justify-between min-w-[750px] relative px-2 py-1">
                            <div className="absolute top-[18px] left-6 right-6 h-0.5 bg-light-cream z-0" />
                            {pipelineStages.map((stage) => {
                              const isCompleted = stage.status === "completed";
                              const isActive = stage.status === "active";
                              const isHalted = stage.status === "halted";
                              return (
                                <div key={stage.id} className="relative z-10 flex flex-col items-center flex-1">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-cream transition-all ${
                                      isCompleted
                                        ? "border-emerald-600 text-emerald-700 shadow-focus"
                                        : isActive
                                        ? "border-blue-600 text-blue-700 shadow-focus animate-pulse scale-105"
                                        : isHalted
                                        ? "border-amber-600 text-amber-705 shadow-focus animate-bounce"
                                        : "border-light-cream text-muted-gray"
                                    }`}
                                    title={`${stage.agent} (${stage.status})`}
                                  >
                                    {isCompleted ? <CheckCircle2 size={14} /> : isHalted ? <Shield size={14} /> : isActive ? <Zap size={12} className="animate-spin" /> : <Circle size={8} />}
                                  </div>
                                  <span className={`text-[9px] font-semibold mt-1.5 truncate max-w-[80px] ${
                                    isCompleted ? "text-emerald-700" : isActive ? "text-blue-750" : isHalted ? "text-amber-705" : "text-muted-gray"
                                  }`}>
                                    {stage.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* tab headers */}
                      <div className="flex border-b border-light-cream gap-1 overflow-x-auto scrollbar-thin">
                        {[
                          { id: "trace", icon: Terminal, label: "Trace Logs" },
                          { id: "change_intel", icon: GitCommit, label: "Change Intel" },
                          { id: "time_machine", icon: History, label: "Time Machine" },
                          { id: "guardrails", icon: ShieldCheck, label: "Guardrails & Safety" },
                          { id: "reports", icon: FileText, label: "ROI Reports", show: selectedIncident.status === "resolved" }
                        ].filter(t => t.show !== false).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px flex items-center gap-1.5 transition-all ${
                              activeTab === t.id ? "text-charcoal border-charcoal font-semibold" : "text-muted-gray border-transparent hover:text-charcoal"
                            }`}
                          >
                            <t.icon size={13} />
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* tab contents */}
                      <div className="min-h-[280px]">

                        {/* TAB CONTENT: TRACE */}
                        {activeTab === "trace" && (
                          <div className="flex flex-col gap-4">
                            <div className="bg-charcoal/3 border border-light-cream rounded p-3">
                              <span className="text-[9px] uppercase tracking-wider text-muted-gray font-semibold block mb-2">Swarm Decision Checklist</span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {reasoningTrace.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-[10px] font-mono">
                                    {item.status === "done" ? (
                                      <span className="text-emerald-600 font-semibold">✓</span>
                                    ) : item.status === "active" ? (
                                      <span className="text-blue-600 animate-pulse font-semibold">•</span>
                                    ) : (
                                      <span className="text-charcoal/40">•</span>
                                    )}
                                    <span className={item.status === "done" ? "text-charcoal/80" : item.status === "active" ? "text-blue-600 font-semibold" : "text-muted-gray"}>
                                      {item.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="border-l border-light-cream pl-5 space-y-4">
                              {selectedIncident.steps && selectedIncident.steps.length > 0 ? (
                                selectedIncident.steps.map((step) => (
                                  <div key={step.id} className="relative">
                                    <span className="absolute -left-[24.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-charcoal" />
                                    <div className="flex items-center justify-between text-[9px] font-semibold text-muted-gray uppercase tracking-wider">
                                      <span className="text-charcoal">{step.agent}</span>
                                      <span>{new Date(step.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-charcoal/82 font-mono bg-charcoal/3 border border-light-cream p-2.5 rounded whitespace-pre-line leading-relaxed">
                                      {step.message}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-muted-gray py-4 flex items-center gap-2">
                                  <span className="h-1.5 w-1.5 rounded-full bg-charcoal animate-ping" />
                                  Orchestration agent thread initializing...
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* TAB CONTENT: CHANGE INTEL */}
                        {activeTab === "change_intel" && (
                          <div className="flex flex-col gap-4">
                            {changeIntelligence ? (
                              <>
                                <div className="flex items-center justify-between bg-charcoal/3 border border-light-cream p-3 rounded">
                                  <div>
                                    <span className="text-[9px] font-semibold text-muted-gray uppercase tracking-wider">Correlation Engine</span>
                                    <h4 className="text-xs font-semibold text-charcoal mt-0.5">Deployment Config Scan</h4>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-muted-gray">Drift Match Probability</span>
                                    <span className="text-lg font-semibold text-charcoal">{Math.round(changeIntelligence.correlation_score * 100)}%</span>
                                  </div>
                                </div>

                                {changeIntelligence.deployments && changeIntelligence.deployments.length > 0 && (
                                  <div className="flex flex-col gap-2">
                                    <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-gray flex items-center gap-1"><GitPullRequest size={11} /> Correlated Releases</span>
                                    <div className="card-panel">
                                      <table className="aws-table text-[11px]">
                                        <thead>
                                          <tr>
                                            <th>Service</th>
                                            <th>Revision</th>
                                            <th>Timestamp</th>
                                            <th>Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="font-mono">
                                          {changeIntelligence.deployments.map((d: any, idx: number) => (
                                            <tr key={idx}>
                                              <td className="font-semibold text-charcoal">{d.service}</td>
                                              <td>{d.version}</td>
                                              <td>{d.timestamp}</td>
                                              <td>{d.status}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {changeIntelligence.git_commits && changeIntelligence.git_commits.length > 0 && (
                                  <div className="flex flex-col gap-2">
                                    <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-gray flex items-center gap-1"><GitCommit size={11} /> Recent Commit Diff Log</span>
                                    <div className="flex flex-col gap-2">
                                      {changeIntelligence.git_commits.map((c: any, idx: number) => (
                                        <div key={idx} className="bg-cream border border-light-cream rounded p-3 text-[11px] font-mono flex flex-col gap-1">
                                          <div className="flex justify-between text-[10px] text-muted-gray">
                                            <span>SHA: {c.sha}</span>
                                            <span>{c.timestamp}</span>
                                          </div>
                                          <span className="font-semibold text-charcoal mt-1">{c.message}</span>
                                          <div className="flex justify-between items-center mt-1 text-[10px] pt-1.5 border-t border-light-cream/40">
                                            <span>Author: {c.author}</span>
                                            <span className={`px-1.5 rounded uppercase font-semibold text-[8px] ${c.impact === "High" ? "bg-red-50 text-red-750" : "bg-blue-50 text-blue-750"}`}>Impact: {c.impact}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-8 text-xs text-muted-gray font-mono border border-dashed border-light-cream rounded">
                                Change Intelligence agent has not returned drift matrix mappings.
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB CONTENT: TIME MACHINE */}
                        {activeTab === "time_machine" && (
                          <div className="flex flex-col gap-4">
                            {timeMachine ? (
                              <>
                                <div className="flex items-center gap-2.5 bg-charcoal/3 border border-light-cream p-3 rounded text-[11px]">
                                  <Info size={14} className="text-charcoal shrink-0" />
                                  <span className="font-mono text-charcoal/80">
                                    <strong className="text-charcoal">Prediction:</strong> {timeMachine.expected_recovery_prediction}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-gray flex items-center gap-1"><History size={11} /> Similar Historical Incidents</span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {timeMachine.similar_incidents?.map((s: any, idx: number) => (
                                      <div key={idx} className="bg-cream border border-light-cream rounded p-3 flex flex-col gap-2">
                                        <div className="flex items-center justify-between text-[10px] font-mono">
                                          <span className="bg-charcoal/4 px-1 rounded text-charcoal">#{s.incident_id}</span>
                                          <span className="font-semibold text-emerald-700">{s.similarity_score}% Match</span>
                                        </div>
                                        <span className="font-semibold text-xs text-charcoal line-clamp-1">{s.title}</span>
                                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-light-cream/40 pt-2 mt-1 text-muted-gray">
                                          <div>
                                            <span className="block text-[8px] uppercase">Remediation</span>
                                            <span className="text-charcoal font-semibold">{s.resolution}</span>
                                          </div>
                                          <div>
                                            <span className="block text-[8px] uppercase">Duration</span>
                                            <span className="text-charcoal font-semibold">{s.recovery_time}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-8 text-xs text-muted-gray font-mono border border-dashed border-light-cream rounded">
                                Time Machine agent has not correlated historical incident datasets.
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB CONTENT: GUARDRAILS */}
                        {activeTab === "guardrails" && (() => {
                          const service = selectedIncident.service_name;
                          let proposedAction = "Restart Pod";
                          let proposedDetails = `kubectl rollout restart deployment/${service}`;

                          if (service === "checkout-api") {
                            proposedAction = "Scale Deployment";
                            proposedDetails = "kubectl scale deployment checkout-api --replicas=4";
                          } else if (service === "inventory-worker") {
                            proposedAction = "Restart Service";
                            proposedDetails = "systemctl restart inventory-worker";
                          } else if (service === "payments-api") {
                            proposedAction = "Rollback Deployment";
                            proposedDetails = "kubectl rollout undo deployment/payments-api --to-revision=12";
                          } else if (service === "orders-api") {
                            proposedAction = "Rollback Deployment";
                            proposedDetails = "helm rollback orders-api 3";
                          } else if (service === "db-storm" || service === "database-storm") {
                            proposedAction = "Rollback Deployment";
                            proposedDetails = "kubectl rollout undo deployment/postgres-db";
                          }

                          return (
                            <div className="flex flex-col gap-4">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="bg-charcoal/3 border border-light-cream p-3 rounded flex flex-col gap-1.5">
                                  <span className="text-[9px] font-semibold text-muted-gray uppercase tracking-wider">Safety Risk Evaluation</span>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-semibold text-charcoal">{selectedIncident.risk_score ?? "0.0"}%</span>
                                    <span className="text-[10px] text-muted-gray">Risk Score</span>
                                  </div>
                                  <div className="w-full bg-charcoal/10 h-1 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        (selectedIncident.risk_score ?? 0) >= 60 ? "bg-red-600" : "bg-emerald-600"
                                      }`}
                                      style={{ width: `${selectedIncident.risk_score ?? 0}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="bg-charcoal/3 border border-light-cream p-3 rounded flex flex-col gap-1">
                                  <span className="text-[9px] font-semibold text-muted-gray uppercase tracking-wider">Approval Policy Mode</span>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {(selectedIncident.risk_score ?? 0) >= 60 ? (
                                      <>
                                        <Lock className="text-red-600" size={14} />
                                        <span className="text-xs font-semibold text-charcoal">Operator Sign-Off Required</span>
                                      </>
                                    ) : (
                                      <>
                                        <Unlock className="text-emerald-600" size={14} />
                                        <span className="text-xs font-semibold text-charcoal">Autonomous Mode Allowed</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {selectedIncident.requires_approval && selectedIncident.approval_status === "pending" && (
                                <div className="bg-amber-50/50 border border-amber-200/80 rounded p-4 flex flex-col gap-3">
                                  <div className="flex items-start gap-2.5">
                                    <ShieldAlert className="text-amber-700 shrink-0 mt-0.5" size={18} />
                                    <div>
                                      <h4 className="font-semibold text-charcoal text-xs">Human Verification Gate Halted</h4>
                                      <p className="text-[11px] text-muted-gray mt-0.5 leading-relaxed">
                                        Remediation requires manual sign-off due to policy thresholds. Review SRE script commands before executing.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="bg-cream/80 border border-amber-200/60 rounded p-3 text-[11px] flex flex-col gap-1.5 font-mono">
                                    <div><strong className="text-charcoal font-sans">Proposed:</strong> <span className="bg-amber-100 text-amber-900 px-1 rounded uppercase tracking-wider text-[9px] font-semibold">{proposedAction}</span></div>
                                    <div><strong className="text-charcoal font-sans">Command:</strong> <code className="text-charcoal bg-charcoal/4 px-1 rounded break-all">$ {proposedDetails}</code></div>
                                  </div>

                                  <div className="flex justify-end pt-1">
                                    <button
                                      onClick={() => handleApprove(selectedIncident.id)}
                                      disabled={approvingId !== null}
                                      className="h-8 rounded bg-charcoal text-off-white text-xs font-semibold px-4 shadow-btn-inset hover:opacity-90 active:opacity-80 transition-all disabled:opacity-50"
                                    >
                                      {approvingId === selectedIncident.id ? "Rollout staging..." : "Authorize & Rollout"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* TAB CONTENT: REPORTS */}
                        {activeTab === "reports" && summaries && (
                          <div className="flex flex-col gap-4">
                            <div className="flex border border-light-cream bg-charcoal/2 text-xs select-none">
                              {(["engineer", "manager", "executive"] as const).map((tab) => (
                                <button
                                  key={tab}
                                  onClick={() => setActiveSummaryTab(tab)}
                                  className={`flex-1 py-2 text-center font-semibold border-b-2 uppercase tracking-wider text-[9px] transition-all ${
                                    activeSummaryTab === tab ? "border-charcoal text-charcoal font-semibold bg-cream" : "border-transparent text-muted-gray hover:text-charcoal"
                                  }`}
                                >
                                  {tab} summary
                                </button>
                              ))}
                            </div>

                            <div className="bg-cream border border-light-cream rounded p-3.5 font-mono text-xs leading-relaxed whitespace-pre-line max-h-[300px] overflow-y-auto">
                              {activeSummaryTab === "engineer" && <div className="text-charcoal/80">{summaries.engineer}</div>}
                              {activeSummaryTab === "manager" && <div className="text-charcoal/80">{summaries.manager}</div>}
                              {activeSummaryTab === "executive" && <div className="text-charcoal/80">{summaries.executive}</div>}
                            </div>

                            {/* ROI metrics details */}
                            <div className="bg-charcoal/3 border border-light-cream rounded p-3 flex flex-col gap-3">
                              <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-gray flex items-center gap-1"><Coins size={11} /> Swarm ROI Impact Ledger</span>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="border border-light-cream rounded p-3 bg-cream">
                                  <span className="block text-[8px] uppercase text-muted-gray">Labor cost savings</span>
                                  <span className="text-base font-semibold text-charcoal block mt-0.5">
                                    ${((dbStats?.hours_saved ? parseFloat(dbStats.hours_saved) / (incidents.filter(i => i.status === "resolved").length || 1) : 4.2) * 150).toFixed(0)}
                                  </span>
                                  <span className="block text-[9px] text-muted-gray mt-0.5 leading-none">@$150/hr SRE rates</span>
                                </div>
                                <div className="border border-light-cream rounded p-3 bg-cream">
                                  <span className="block text-[8px] uppercase text-muted-gray">Downtime Prevented</span>
                                  <span className="text-base font-semibold text-emerald-700 block mt-0.5">
                                    {selectedIncident.service_name === "payments-api" || selectedIncident.service_name === "database-storm" ? "$12,500" : "$0"}
                                  </span>
                                  <span className="block text-[9px] text-muted-gray mt-0.5 leading-none">Assessed SLA boundaries</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-muted-gray">Loading details...</div>
                  )
                ) : (
                  <div className="empty">
                    <div className="empty-icon">
                      <Terminal size={24} />
                    </div>
                    <h3>Incident Workspace Standby</h3>
                    <p>Select an incident ticket from the log list on the left to inspect multi-agent reasoning, git commits, configuration drift, and approve staged remediations.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* C. VIEW: S3 OBJECT STORAGE EXPLORER */}
          {currentView === "s3" && (
            <div className="aws-split animate-fade-in">
              {/* Left Bucket browser sidebar */}
              <div className="aws-split-list select-none">
                <div className="p-3 border-b border-light-cream bg-charcoal/2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-gray">S3 Buckets</span>
                </div>
                <div className="p-3">
                  <div className="border border-charcoal/30 bg-off-white rounded p-3.5 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Cloud size={14} className="text-charcoal" />
                      <span className="font-semibold text-xs text-charcoal">{cloudSettings.aws_bucket_name || "inframedic-artifacts"}</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-gray flex flex-col gap-0.5 mt-1 border-t border-light-cream/40 pt-1.5">
                      <span>Region: {cloudSettings.aws_region || "us-east-1"}</span>
                      <span>Access: Private</span>
                      <span>Items: {mockS3Files.length} objects</span>
                    </div>
                  </div>
                </div>

                {/* S3 Quick Filter prefixes */}
                <div className="border-t border-light-cream pt-2">
                  <span className="nav-label">Prefix Filters</span>
                  <div className="px-3 space-y-1 text-xs">
                    <button
                      onClick={() => setS3Filter("")}
                      className={`w-full text-left px-2.5 py-1.5 rounded transition-all font-semibold ${
                        s3Filter === "" ? "bg-charcoal text-off-white shadow-btn-inset" : "text-muted-gray hover:text-charcoal hover:bg-hover"
                      }`}
                    >
                      All Objects
                    </button>
                    <button
                      onClick={() => setS3Filter("reports")}
                      className={`w-full text-left px-2.5 py-1.5 rounded transition-all font-semibold ${
                        s3Filter === "reports" ? "bg-charcoal text-off-white shadow-btn-inset" : "text-muted-gray hover:text-charcoal hover:bg-hover"
                      }`}
                    >
                      reports/
                    </button>
                    <button
                      onClick={() => setS3Filter("runbooks")}
                      className={`w-full text-left px-2.5 py-1.5 rounded transition-all font-semibold ${
                        s3Filter === "runbooks" ? "bg-charcoal text-off-white shadow-btn-inset" : "text-muted-gray hover:text-charcoal hover:bg-hover"
                      }`}
                    >
                      runbooks/
                    </button>
                    <button
                      onClick={() => setS3Filter("logs")}
                      className={`w-full text-left px-2.5 py-1.5 rounded transition-all font-semibold ${
                        s3Filter === "logs" ? "bg-charcoal text-off-white shadow-btn-inset" : "text-muted-gray hover:text-charcoal hover:bg-hover"
                      }`}
                    >
                      logs/
                    </button>
                  </div>
                </div>
              </div>

              {/* Right S3 files explorer main view */}
              <div className="aws-split-detail flex flex-col">
                <div className="p-4 border-b border-light-cream bg-surface flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-gray">
                    <span>S3 Buckets</span>
                    <ChevronRight size={10} />
                    <span className="font-semibold text-charcoal">{cloudSettings.aws_bucket_name || "inframedic-artifacts"}</span>
                    {s3Filter && (
                      <>
                        <ChevronRight size={10} />
                        <span className="font-mono bg-charcoal/4 px-1 rounded text-charcoal">{s3Filter}/</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Files table list */}
                    <div className="xl:col-span-2 card-panel">
                      <table className="aws-table text-xs">
                        <thead>
                          <tr className="bg-charcoal/2">
                            <th>Object Key Name</th>
                            <th>Size</th>
                            <th>Storage Class</th>
                            <th>Last Modified</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-[11px]">
                          {filteredS3Files.map((file) => (
                            <tr
                              key={file.key}
                              onClick={() => setSelectedS3Key(file.key)}
                              className={`cursor-pointer ${selectedS3Key === file.key ? "bg-charcoal/3" : ""}`}
                            >
                              <td className="font-semibold text-charcoal flex items-center gap-1.5 py-2.5">
                                <FileText size={12} className="text-muted-gray shrink-0" />
                                <span className="break-all">{file.key}</span>
                              </td>
                              <td>{file.size}</td>
                              <td>Standard</td>
                              <td className="text-muted-gray">{file.lastModified}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* S3 object inspector detail panel */}
                    <div>
                      {selectedS3File ? (
                        <div className="card-panel sticky top-4 flex flex-col gap-4 p-4 text-xs">
                          <div className="border-b border-light-cream pb-2.5 flex items-center justify-between">
                            <span className="text-[10px] uppercase font-semibold text-muted-gray tracking-wider">Object Properties</span>
                            <button
                              onClick={() => setSelectedS3Key(null)}
                              className="text-muted-gray hover:text-charcoal"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="flex flex-col gap-2 font-mono text-[11px] text-charcoal/82 border-b border-light-cream pb-3">
                            <div className="flex justify-between"><span className="text-muted-gray">Bucket:</span> <span className="text-charcoal font-semibold">{cloudSettings.aws_bucket_name || "inframedic-artifacts"}</span></div>
                            <div className="flex justify-between"><span className="text-muted-gray">Key Name:</span> <span className="text-charcoal font-semibold break-all text-right max-w-[200px]">{selectedS3File.key}</span></div>
                            <div className="flex justify-between"><span className="text-muted-gray">Type:</span> <span>{selectedS3File.type}</span></div>
                            <div className="flex justify-between"><span className="text-muted-gray">Size:</span> <span>{selectedS3File.size}</span></div>
                            <div className="flex justify-between"><span className="text-muted-gray">Modified:</span> <span className="text-muted-gray">{selectedS3File.lastModified}</span></div>
                          </div>

                          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                            <div className="flex justify-between items-center select-none"><span className="text-[10px] uppercase font-semibold text-muted-gray">Object Body Content</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedS3File.content);
                                  alert("Content copied to clipboard!");
                                }}
                                className="text-[10px] text-muted-gray hover:text-charcoal flex items-center gap-1 border border-light-cream rounded px-1.5 py-0.5"
                              >
                                <Copy size={10} /> Copy
                              </button>
                            </div>
                            <pre className="p-3 bg-charcoal/4 border border-light-cream rounded font-mono text-[10px] text-charcoal/82 overflow-auto max-h-[300px] leading-relaxed whitespace-pre-wrap">
                              {selectedS3File.content}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-light-cream rounded p-6 text-center text-xs text-muted-gray font-sans">
                          Select an S3 object key to inspect properties and file body.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* D. VIEW: EC2 / EKS COMPUTE RESOURCES */}
          {currentView === "compute" && (
            <div className="aws-split animate-fade-in">
              {/* Left pane: instances table list */}
              <div className="aws-split-list select-none">
                <div className="p-3 border-b border-light-cream bg-charcoal/2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-gray">Compute Registry</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleProvision}
                      disabled={busyAction !== null}
                      className="text-[9px] uppercase font-semibold bg-charcoal text-off-white shadow-btn-inset rounded px-2.5 py-1.5 border border-transparent disabled:opacity-50"
                      title="Deploy Sandbox Clusters to LocalStack"
                    >
                      Provision
                    </button>
                    <button
                      onClick={handleTeardown}
                      disabled={busyAction !== null}
                      className="text-[9px] uppercase font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5 hover:bg-red-100/80 disabled:opacity-50"
                      title="Destroy all sandbox mock resources"
                    >
                      Teardown
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-light-cream">
                  {loadingResources ? (
                    <div className="p-8 text-center text-xs text-muted-gray">Discovering Compute components...</div>
                  ) : !discoveredResources?.compute || discoveredResources.compute.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-gray leading-relaxed font-sans">
                      No compute instances discovered.<br /><br />
                      <button
                        onClick={handleProvision}
                        className="py-1.5 px-3 bg-charcoal text-off-white text-[10px] font-semibold uppercase rounded shadow-btn-inset"
                      >
                        Provision Sandbox Nodes
                      </button>
                    </div>
                  ) : (
                    discoveredResources.compute.map((inst) => {
                      const isSelected = inst.id === selectedComputeId;
                      // Determine if service has active incident
                      const isDegraded = activeIncidents.some(i => i.service_name === inst.name);
                      return (
                        <div
                          key={inst.id}
                          onClick={() => setSelectedComputeId(inst.id)}
                          className={`p-3.5 cursor-pointer transition-all duration-150 border-l-2 text-xs hover:bg-hover ${
                            isSelected ? "bg-charcoal/3 border-charcoal" : "border-transparent"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-charcoal">{inst.name}</h4>
                            <span className={`aws-dot ${isDegraded ? "degraded animate-pulse" : "healthy"}`} />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-gray font-mono">
                            <span>ID: {inst.id.slice(0, 10)}...</span>
                            <span>{inst.ip || "10.0.0.1"}</span>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between">
                            <span className="bg-charcoal/4 px-1 py-0.2 rounded text-[9px] font-mono text-charcoal">{inst.type}</span>
                            <span className="text-[10px] font-semibold text-charcoal/80 uppercase font-mono">{inst.status}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right pane: instance detail inspector */}
              <div className="aws-split-detail">
                {selectedComputeId ? (
                  activeComputeInstance ? (() => {
                    const isDegraded = activeIncidents.some(i => i.service_name === activeComputeInstance.name);
                    const matchedIncident = activeIncidents.find(i => i.service_name === activeComputeInstance.name);
                    const latestCpu = telemetryHistory?.[activeComputeInstance.name]?.cpu?.slice(-1)[0];
                    const latestMemory = telemetryHistory?.[activeComputeInstance.name]?.memory?.slice(-1)[0];
                    const latestLatency = telemetryHistory?.[activeComputeInstance.name]?.latency?.slice(-1)[0];
                    const isCpuBreached = (latestCpu !== undefined && latestCpu > 92.0) || (isDegraded && matchedIncident?.metric_name === "cpu_percent");
                    const isMemBreached = (latestMemory !== undefined && latestMemory > 94.0) || (isDegraded && matchedIncident?.metric_name === "memory_percent");
                    const isLatBreached = (latestLatency !== undefined && latestLatency > 1000.0) || (isDegraded && matchedIncident?.metric_name === "latency_ms");

                    return (
                      <div className="p-5 flex flex-col gap-5 text-xs">
                        {/* Title block */}
                        <div className="border-b border-light-cream pb-3 flex items-start justify-between">
                          <div>
                            <span className="text-[9px] font-semibold text-muted-gray uppercase tracking-wider font-mono">Instance ID: {activeComputeInstance.id}</span>
                            <h2 className="text-base font-semibold text-charcoal mt-1 font-sans">{activeComputeInstance.name}</h2>
                          </div>
                          <span className={`px-2 py-0.5 rounded border uppercase text-[9px] font-semibold ${
                            isDegraded ? "bg-amber-50 border-amber-200 text-amber-700 animate-pulse" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}>
                            {isDegraded ? "degraded / telemetry drift" : "healthy"}
                          </span>
                        </div>

                        {/* Metrics specs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="bg-charcoal/3 p-3 border border-light-cream rounded">
                            <span className="block text-[8px] uppercase text-muted-gray font-semibold">CPU cores usage</span>
                            <span className={`text-lg font-semibold block mt-0.5 font-mono ${isCpuBreached ? "text-amber-600 animate-pulse" : "text-charcoal"}`}>
                              {latestCpu !== undefined ? `${latestCpu.toFixed(1)}%` : (isDegraded && matchedIncident?.metric_name === "cpu_percent" ? `${matchedIncident.metric_value}%` : "14.2%")}
                            </span>
                          </div>
                          <div className="bg-charcoal/3 p-3 border border-light-cream rounded">
                            <span className="block text-[8px] uppercase text-muted-gray font-semibold">Memory working set</span>
                            <span className={`text-lg font-semibold block mt-0.5 font-mono ${isMemBreached ? "text-amber-600 animate-pulse" : "text-charcoal"}`}>
                              {latestMemory !== undefined ? `${latestMemory.toFixed(1)}%` : (isDegraded && matchedIncident?.metric_name === "memory_percent" ? `${matchedIncident.metric_value}%` : "42.5%")}
                            </span>
                          </div>
                          <div className="bg-charcoal/3 p-3 border border-light-cream rounded">
                            <span className="block text-[8px] uppercase text-muted-gray font-semibold">Response latency</span>
                            <span className={`text-lg font-semibold block mt-0.5 font-mono ${isLatBreached ? "text-amber-600 animate-pulse" : "text-charcoal"}`}>
                              {latestLatency !== undefined ? `${latestLatency.toFixed(0)}ms` : (isDegraded && matchedIncident?.metric_name === "latency_ms" ? `${matchedIncident.metric_value}ms` : "75ms")}
                            </span>
                          </div>
                          <div className="bg-charcoal/3 p-3 border border-light-cream rounded">
                            <span className="block text-[8px] uppercase text-muted-gray font-semibold">Instance Class</span>
                            <span className="text-xs font-semibold block mt-1.5 font-mono text-charcoal">
                              {activeComputeInstance.type}
                            </span>
                          </div>
                        </div>

                        {/* instance properties metadata */}
                        <div className="card-panel">
                          <div className="card-header bg-charcoal/2">
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-gray">Instance Metadata Properties</span>
                          </div>
                          <div className="p-3.5 font-mono text-[11px] text-charcoal/82 flex flex-col gap-2.5">
                            <div className="flex justify-between"><span className="text-muted-gray">Private IP address:</span> <span className="text-charcoal font-semibold">{activeComputeInstance.ip || "10.0.0.1"}</span></div>
                            <div className="flex justify-between"><span className="text-muted-gray">AWS VPC Mapped:</span> <span className="text-charcoal">vpc-0182d8a8</span></div>
                            <div className="flex justify-between"><span className="text-muted-gray">Security Group:</span> <span className="text-charcoal">sg-allow-http (sg-2900ea1e)</span></div>
                            <div className="flex justify-between"><span className="text-muted-gray">Kubernetes Pod Namespace:</span> <span className="text-charcoal">default</span></div>
                            <div className="flex justify-between"><span className="text-muted-gray">Node Status:</span> <span className="text-charcoal uppercase font-semibold">{activeComputeInstance.status}</span></div>
                          </div>
                        </div>

                        {/* stdout Logs container */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] uppercase font-semibold text-muted-gray font-mono">stdout Container logs (Real-time tail)</span>
                          <pre className="p-3 bg-charcoal/4 border border-light-cream rounded font-mono text-[10px] text-charcoal/82 overflow-y-auto max-h-[220px] leading-relaxed">
                            {isDegraded
                              ? `[INFO] Container startup initialized.
[INFO] Port bindings verified. Listening on container port 8080.
[WARNING] Slow database connection handshakes detected.
[ERROR] Threat breach: ${matchedIncident?.metric_name} spiked to ${matchedIncident?.metric_value}!
[ERROR] JVM container thread pool saturated. OutOfMemory exceptions queued.
[INFO] Staging automated SRE validation recovery scripts...`
                              : `[INFO] Container startup initialized.
[INFO] Port bindings verified. Listening on container port 8080.
[INFO] Heartbeat diagnostics passed. Endpoints reporting HTTP 200 OK.
[INFO] Thread count stable. GC collections occurring within 45ms bounds.`}
                          </pre>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="p-8 text-center text-xs text-muted-gray">Loading resource details...</div>
                  )
                ) : (
                  <div className="empty">
                    <div className="empty-icon">
                      <Cpu size={24} />
                    </div>
                    <h3>EC2 Instance Inspector</h3>
                    <p>Select a compute instance or Kubernetes pod from the sidebar list to inspect live memory/CPU counters, metadata configurations, and container stdout logs.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* E. VIEW: RDS SQL DATABASES */}
          {currentView === "rds" && (
            <div className="aws-split animate-fade-in">
              {/* Left sidebar: DB tables directory */}
              <div className="aws-split-list select-none">
                <div className="p-3 border-b border-light-cream bg-charcoal/2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-gray">RDS postgres databases</span>
                </div>

                <div className="p-3">
                  <div className="border border-charcoal/30 bg-off-white rounded p-3 text-xs flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Database size={13} className="text-charcoal" />
                      <span className="font-semibold text-charcoal">inframedic-db</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-gray mt-1 flex flex-col gap-0.5 border-t border-light-cream/40 pt-1.5">
                      <span>Engine: PostgreSQL 16</span>
                      <span>Host: localhost:5432</span>
                      <span>Status: Healthy (Online)</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-light-cream pt-2">
                  <span className="nav-label">Database Tables</span>
                  <div className="px-3 space-y-1 text-xs">
                    {Object.keys(databaseTables).map((tbl) => (
                      <button
                        key={tbl}
                        onClick={() => setSelectedRDSTable(tbl)}
                        className={`w-full text-left px-2.5 py-1.5 rounded transition-all font-semibold ${
                          selectedRDSTable === tbl ? "bg-charcoal text-off-white shadow-btn-inset" : "text-muted-gray hover:text-charcoal hover:bg-hover"
                        }`}
                      >
                        {tbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right view: table explorer and queries */}
              <div className="aws-split-detail flex flex-col">
                <div className="p-4 border-b border-light-cream bg-surface flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-gray">
                    <span>RDS Databases</span>
                    <ChevronRight size={10} />
                    <span className="font-semibold text-charcoal">inframedic-db</span>
                    {selectedRDSTable && (
                      <>
                        <ChevronRight size={10} />
                        <span className="font-mono bg-charcoal/4 px-1 rounded text-charcoal">{selectedRDSTable}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-1 overflow-y-auto">
                  {selectedRDSTable ? (
                    selectedTableData ? (
                      <div className="flex flex-col gap-5 text-xs">
                        {/* Table header meta */}
                        <div className="border-b border-light-cream pb-2.5 flex justify-between items-center select-none">
                          <div>
                            <span className="text-[9px] font-semibold text-muted-gray uppercase tracking-wider font-mono">SQL Table Target</span>
                            <h3 className="text-sm font-semibold text-charcoal mt-0.5">SELECT * FROM {selectedRDSTable};</h3>
                          </div>
                          <span className="text-[10px] font-mono text-muted-gray bg-charcoal/3 border border-light-cream px-2 py-0.5 rounded">
                            {selectedTableData.rows.length} rows returned
                          </span>
                        </div>

                        {/* Table View */}
                        <div className="card-panel overflow-x-auto">
                          {selectedTableData.rows.length === 0 ? (
                            <div className="p-8 text-center text-muted-gray">No records exist in table: {selectedRDSTable}</div>
                          ) : (
                            <table className="aws-table text-xs">
                              <thead>
                                <tr className="bg-charcoal/2 font-semibold">
                                  {selectedTableData.columns.map((col) => (
                                    <th key={col} className="p-2.5 border-b border-light-cream uppercase text-[9px] tracking-wider">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="font-mono text-[11px] divide-y divide-light-cream/40">
                                {selectedTableData.rows.map((row: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-hover">
                                    {selectedTableData.columns.map((col) => (
                                      <td key={col} className="p-2.5 truncate max-w-[200px]" title={String(row[col] || "")}>
                                        {row[col] === null || row[col] === undefined ? "NULL" : String(row[col])}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-muted-gray">Loading table contents...</div>
                    )
                  ) : (
                    <div className="empty">
                      <div className="empty-icon">
                        <Database size={24} />
                      </div>
                      <h3>RDS PostgreSQL Table Browser</h3>
                      <p>Select a table in the database folder sidebar to query its active row records, schema fields, and live database values.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* F. VIEW: LAMBDA AUTOMATION FUNCTIONS */}
          {currentView === "lambda" && (
            <div className="content-pane text-xs animate-fade-in">
              <div className="border-b border-light-cream pb-3">
                <h2 className="text-base font-semibold text-charcoal font-sans">AWS Lambda Functions</h2>
                <p className="text-xs text-muted-gray mt-0.5">Test invoke serverless SRE remediation scripts and inspect runtimes.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Functions cards list */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-gray">Functions Directory</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lambdaFunctions.map((fn) => {
                      const isSelected = fn.name === selectedLambdaName;
                      return (
                        <div
                          key={fn.name}
                          onClick={() => {
                            setSelectedLambdaName(fn.name);
                            setLambdaOutput(null);
                          }}
                          className={`card-panel cursor-pointer hover:border-charcoal transition-all p-4 flex flex-col justify-between min-h-[140px] ${
                            isSelected ? "border-charcoal bg-charcoal/3" : ""
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-xs text-charcoal">{fn.name}</span>
                            <p className="text-[11px] text-muted-gray font-normal mt-1 leading-relaxed">{fn.desc}</p>
                          </div>
                          <div className="flex justify-between items-center border-t border-light-cream/40 pt-2.5 mt-3 text-[10px] font-mono text-muted-gray">
                            <span className="bg-charcoal/4 px-1.5 py-0.2 rounded text-charcoal font-semibold">{fn.runtime}</span>
                            <span>Memory: {fn.memory}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Test invoke console */}
                <div className="flex flex-col gap-4">
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-gray">Test Harness Console</span>
                  {selectedLambdaName ? (
                    <div className="card-panel p-4 flex flex-col gap-4">
                      <div className="border-b border-light-cream pb-2 flex justify-between items-center select-none">
                        <span className="font-semibold text-charcoal">{selectedLambdaName}</span>
                        <span className="text-[9px] text-muted-gray font-mono">arn:aws:lambda:...</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase font-semibold text-muted-gray">Invoke JSON Payload</span>
                        <textarea
                          rows={4}
                          value={lambdaPayload}
                          onChange={(e) => setLambdaPayload(e.target.value)}
                          className="w-full rounded border border-light-cream bg-cream p-2.5 font-mono text-[11px] text-charcoal outline-none focus:border-charcoal"
                        />
                      </div>

                      <button
                        onClick={handleInvokeLambda}
                        disabled={invokingLambda}
                        className="w-full py-2 bg-charcoal text-off-white text-xs font-semibold rounded shadow-btn-inset hover:opacity-90 active:opacity-80 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Play size={12} />
                        {invokingLambda ? "Invoking Serverless..." : "Test Invoke"}
                      </button>

                      {lambdaOutput && (
                        <div className="flex flex-col gap-1.5 mt-2">
                          <span className="text-[10px] uppercase font-semibold text-muted-gray">Invocation Logs Output</span>
                          <pre className="p-3 bg-charcoal/4 border border-light-cream rounded font-mono text-[10px] text-charcoal/82 overflow-y-auto max-h-[180px] whitespace-pre-wrap leading-relaxed">
                            {lambdaOutput}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-dashed border-light-cream rounded p-6 text-center text-xs text-muted-gray font-sans">
                      Select a Lambda SRE function card to launch the invoke test console.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* G. VIEW: CONNECTIONS & SETTINGS */}
          {currentView === "settings" && (
            <div className="content-pane text-xs animate-fade-in">
              <div className="border-b border-light-cream pb-3 flex justify-between items-center select-none">
                <div>
                  <h2 className="text-base font-semibold text-charcoal font-sans">Connections & Cloud Settings</h2>
                  <p className="text-xs text-muted-gray mt-0.5">Integrate AWS, Azure, and GCP accounts and verify inventory synchronization status.</p>
                </div>
              </div>

              <div className="card-panel overflow-hidden">
                {/* Internal settings tab selector */}
                <div className="flex border-b border-light-cream bg-charcoal/2 text-xs select-none">
                  {[
                    { id: "connections", label: "Cloud Connections" },
                    { id: "aws", label: "AWS Config" },
                    { id: "azure", label: "Azure Config" },
                    { id: "gcp", label: "GCP Config" },
                    { id: "resources", label: "Inventory Resources Status" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsTab(tab.id as any)}
                      className={`flex-1 py-3 text-center font-semibold border-b-2 uppercase tracking-wider text-[9px] transition-all outline-none ${
                        settingsTab === tab.id ? "border-charcoal text-charcoal bg-cream font-semibold" : "border-transparent text-muted-gray hover:text-charcoal"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={settingsTab === "connections" ? (e) => e.preventDefault() : saveSettings} className="p-5 flex flex-col gap-4 bg-cream">
                  {settingsTab === "connections" && (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        {connections.length === 0 ? (
                          <div className="py-6 text-center text-muted-gray border border-dashed border-light-cream rounded bg-charcoal/2">
                            Loading cloud connections...
                          </div>
                        ) : (
                          connections.map((conn) => {
                            const isSelected = selectedConnection?.provider === conn.provider;
                            const isTesting = testingConnection === conn.provider;
                            const isSyncing = syncingConnection === conn.provider;
                            const isToggling = togglingConnection === conn.provider;

                            return (
                              <div
                                key={conn.provider}
                                className={`border rounded transition-all ${
                                  isSelected ? "border-charcoal bg-off-white" : "border-light-cream bg-charcoal/2 hover:bg-charcoal/3"
                                }`}
                              >
                                <div
                                  onClick={() => setSelectedConnection(isSelected ? null : conn)}
                                  className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-1 bg-cream border border-light-cream rounded text-charcoal font-semibold uppercase tracking-wider text-[9px]">
                                      {conn.provider.slice(0, 3)}
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-charcoal uppercase">{conn.provider}</h4>
                                      <p className="text-[10px] text-muted-gray mt-0.5">{conn.auth_method || "No Auth Configured"}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                                      conn.status === "connected"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : conn.status === "error"
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : "bg-charcoal/10 text-muted-gray border-charcoal/20"
                                    }`}>
                                      {conn.status.toUpperCase()}
                                    </span>

                                    <button
                                      type="button"
                                      disabled={isToggling}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleConnection(conn.provider, conn.status);
                                      }}
                                      className={`px-2.5 py-1 rounded text-[9px] font-semibold transition-all border ${
                                        conn.status === "connected" || conn.status === "error"
                                          ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                      }`}
                                    >
                                      {isToggling ? "..." : conn.status === "connected" || conn.status === "error" ? "Suspend" : "Activate"}
                                    </button>
                                  </div>
                                </div>

                                {isSelected && (
                                  <div className="px-4 pb-4 pt-2 border-t border-light-cream/40 bg-cream/30 flex flex-col gap-3 text-[11px] text-charcoal">
                                    <div className="grid grid-cols-2 gap-2 text-muted-gray font-mono">
                                      <div><span className="font-semibold text-charcoal">Scope:</span> {conn.account || conn.project || "Not available"}</div>
                                      <div><span className="font-semibold text-charcoal">Regions:</span> {conn.region || "None"}</div>
                                      <div><span className="font-semibold text-charcoal">Inventory Items:</span> {conn.resources || 0}</div>
                                      <div><span className="font-semibold text-charcoal">Monitoring:</span> {conn.monitoring}</div>
                                    </div>

                                    {conn.status === "error" && conn.health && (
                                      <div className="p-2 border border-red-200 bg-red-50 rounded text-red-800 text-[10px]">
                                        {conn.health}
                                      </div>
                                    )}

                                    <div className="flex gap-2 mt-1">
                                      <button
                                        type="button"
                                        disabled={isTesting}
                                        onClick={() => handleTestConnection(conn.provider)}
                                        className="flex-1 py-1.5 px-2 border border-light-cream bg-cream hover:bg-charcoal/5 rounded transition-all text-[10px] font-semibold text-charcoal"
                                      >
                                        {isTesting ? "Testing..." : "Test Connection"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSyncing || conn.status !== "connected"}
                                        onClick={() => handleSyncConnection(conn.provider)}
                                        className={`flex-1 py-1.5 px-2 border border-light-cream rounded transition-all text-[10px] font-semibold ${
                                          conn.status === "connected" ? "bg-cream hover:bg-charcoal/5 text-charcoal" : "bg-charcoal/5 text-muted-gray cursor-not-allowed border-light-cream/40"
                                        }`}
                                      >
                                        {isSyncing ? "Syncing..." : "Sync Inventory"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {settingsTab !== "connections" && settingsError && (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2.5">
                      {settingsError}
                    </div>
                  )}

                  {settingsTab !== "connections" && settingsSuccess && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2.5">
                      Settings saved successfully!
                    </div>
                  )}

                  {/* AWS Config */}
                  {settingsTab === "aws" && (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">AWS Endpoint URL</label>
                        <input
                          type="text"
                          value={cloudSettings.aws_endpoint_url}
                          onChange={(e) => setCloudSettings({ ...cloudSettings, aws_endpoint_url: e.target.value })}
                          placeholder="Default: http://localhost:4566"
                          className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">AWS Region</label>
                          <input
                            type="text"
                            value={cloudSettings.aws_region}
                            onChange={(e) => setCloudSettings({ ...cloudSettings, aws_region: e.target.value })}
                            placeholder="Default: us-east-1"
                            className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">S3 Bucket Name</label>
                          <input
                            type="text"
                            value={cloudSettings.aws_bucket_name}
                            onChange={(e) => setCloudSettings({ ...cloudSettings, aws_bucket_name: e.target.value })}
                            placeholder="Default: inframedic-artifacts"
                            className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Access Key ID</label>
                        <input
                          type="text"
                          value={cloudSettings.aws_access_key_id}
                          onChange={(e) => setCloudSettings({ ...cloudSettings, aws_access_key_id: e.target.value })}
                          placeholder="Default: floci"
                          className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Secret Access Key</label>
                        <input
                          type="password"
                          value={cloudSettings.aws_secret_access_key}
                          onChange={(e) => setCloudSettings({ ...cloudSettings, aws_secret_access_key: e.target.value })}
                          placeholder="Default: floci"
                          className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="rounded bg-charcoal text-off-white px-4 py-1.5 text-xs font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-50 shadow-btn-inset"
                        >
                          {savingSettings ? "Saving..." : "Save AWS Config"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Azure Config */}
                  {settingsTab === "azure" && (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Azure Connection Endpoint</label>
                        <input
                          type="text"
                          value={cloudSettings.azure_endpoint_url}
                          onChange={(e) => setCloudSettings({ ...cloudSettings, azure_endpoint_url: e.target.value })}
                          placeholder="Default: http://localhost:10000"
                          className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Storage Account Name</label>
                          <input
                            type="text"
                            value={cloudSettings.azure_account_name}
                            onChange={(e) => setCloudSettings({ ...cloudSettings, azure_account_name: e.target.value })}
                            placeholder="Default: devstoreaccount1"
                            className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Blob Container Name</label>
                          <input
                            type="text"
                            value={cloudSettings.azure_container_name}
                            onChange={(e) => setCloudSettings({ ...cloudSettings, azure_container_name: e.target.value })}
                            placeholder="Default: inframedic-container"
                            className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Shared Access Account Key</label>
                        <input
                          type="password"
                          value={cloudSettings.azure_account_key}
                          onChange={(e) => setCloudSettings({ ...cloudSettings, azure_account_key: e.target.value })}
                          placeholder="Azure Storage Key"
                          className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="rounded bg-charcoal text-off-white px-4 py-1.5 text-xs font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-50 shadow-btn-inset"
                        >
                          {savingSettings ? "Saving..." : "Save Azure Config"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* GCP Config */}
                  {settingsTab === "gcp" && (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">GCP Emulator Endpoint</label>
                        <input
                          type="text"
                          value={cloudSettings.gcp_endpoint_url}
                          onChange={(e) => setCloudSettings({ ...cloudSettings, gcp_endpoint_url: e.target.value })}
                          placeholder="Default: http://localhost:4443"
                          className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">GCP Project ID</label>
                          <input
                            type="text"
                            value={cloudSettings.gcp_project_id}
                            onChange={(e) => setCloudSettings({ ...cloudSettings, gcp_project_id: e.target.value })}
                            placeholder="Default: floci-gcp-project"
                            className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Storage Bucket Name</label>
                          <input
                            type="text"
                            value={cloudSettings.gcp_bucket_name}
                            onChange={(e) => setCloudSettings({ ...cloudSettings, gcp_bucket_name: e.target.value })}
                            placeholder="Default: inframedic-gcp-bucket"
                            className="rounded-md border border-light-cream bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-ring-blue placeholder:text-muted-gray transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Service Account JSON Credentials</label>
                        <textarea
                          rows={3}
                          value={cloudSettings.gcp_credentials_json}
                          onChange={(e) => setCloudSettings({ ...cloudSettings, gcp_credentials_json: e.target.value })}
                          placeholder="{}"
                          className="rounded border border-charcoal/20 bg-cream/50 px-3 py-1.5 text-xs text-charcoal font-mono focus:border-charcoal outline-none transition-colors"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="rounded bg-charcoal text-off-white px-4 py-1.5 text-xs font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-50 shadow-btn-inset"
                        >
                          {savingSettings ? "Saving..." : "Save GCP Config"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Resources Status Table */}
                  {settingsTab === "resources" && (() => {
                    const getMode = (url: string) => {
                      if (!url || url.includes("localhost") || url.includes("127.0.0.1") || url.includes("host.docker.internal")) {
                        return "Local Emulator";
                      }
                      return "Production Cloud";
                    };

                    const resourceList = [
                      { platform: "AWS", name: `S3::Bucket::${cloudSettings.aws_bucket_name || "inframedic-artifacts"}`, type: "Object Storage", status: "Active", mode: getMode(cloudSettings.aws_endpoint_url) },
                      { platform: "AWS", name: "EKS::Cluster::inframedic-prod-cluster", type: "Container Orchestrator", status: "Active", mode: getMode(cloudSettings.aws_endpoint_url) },
                      { platform: "AWS", name: "RDS::Database::inframedic-db", type: "Relational DB", status: "Active", mode: getMode(cloudSettings.aws_endpoint_url) },

                      { platform: "Azure", name: `Storage::Container::${cloudSettings.azure_container_name || "inframedic-container"}`, type: "Blob Storage", status: "Active", mode: getMode(cloudSettings.azure_endpoint_url) },
                      { platform: "Azure", name: "AKS::Cluster::inframedic-aks", type: "Kubernetes Cluster", status: "Active", mode: getMode(cloudSettings.azure_endpoint_url) },
                      { platform: "Azure", name: "AzureSQL::Database::inframedic-sql", type: "SQL Database", status: "Active", mode: getMode(cloudSettings.azure_endpoint_url) },

                      { platform: "GCP", name: `GCS::Bucket::${cloudSettings.gcp_bucket_name || "inframedic-gcp-bucket"}`, type: "Cloud Storage", status: "Active", mode: getMode(cloudSettings.gcp_endpoint_url) },
                      { platform: "GCP", name: "GKE::Cluster::inframedic-gke", type: "Kubernetes Cluster", status: "Active", mode: getMode(cloudSettings.gcp_endpoint_url) },
                      { platform: "GCP", name: "CloudSQL::Database::inframedic-postgres", type: "PostgreSQL Database", status: "Active", mode: getMode(cloudSettings.gcp_endpoint_url) },
                    ];

                    return (
                      <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1 animate-fade-in shrink-0">
                        {resourceList.map((res, idx) => (
                          <div key={idx} className="flex items-center justify-between border border-light-cream rounded-lg p-3 bg-cream/70  text-xs gap-3">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] font-semibold px-1.5 py-0.2 rounded border uppercase select-none ${
                                  res.platform === "AWS" ? "bg-orange-50 border-orange-200 text-orange-700" :
                                  res.platform === "Azure" ? "bg-blue-50 border-blue-200 text-blue-700" :
                                  "bg-red-50 border-red-200 text-red-700"
                                }`}>
                                  {res.platform}
                                </span>
                                <span className="font-mono font-semibold text-charcoal break-all">{res.name}</span>
                              </div>
                              <span className="text-[10px] text-muted-gray">{res.type}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 font-sans">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider rounded border text-emerald-700 bg-emerald-50 border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                {res.status}
                              </span>
                              <span className="text-[9px] font-medium text-muted-gray/80 italic">{res.mode}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </form>
              </div>

            </div>
          )}

          {/* H. VIEW: SYSTEM DOCS (EMBEDDED) */}
          {currentView === "docs" && (
            <div className="w-full h-[calc(100vh-48px)] overflow-hidden animate-fade-in">
              <DocsConsole />
            </div>
          )}

        </main>
      </section>
    </main>
  );
}

export default App;
