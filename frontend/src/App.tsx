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
  Cloud
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
  syncConnection
} from "./api";

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

  // Cloud settings modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"connections" | "aws" | "azure" | "gcp" | "resources">("connections");
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

  const activeIncidents = incidents.filter((incident) => incident.status !== "resolved");

  // Confidence & Performance mappings for all agent roles
  const agentMetrics = useMemo(() => ({
    monitor: { label: "Confidence", value: "97%", color: "text-charcoal/83 border-light-cream" },
    change_intel: { label: "Correlation", value: "95%", color: "text-charcoal/83 border-light-cream" },
    diagnostic: { label: "Confidence", value: "91%", color: "text-emerald-700 border-emerald-250/20" },
    knowledge: { label: "Relevance", value: "89%", color: "text-charcoal/83 border-light-cream" },
    time_machine: { label: "Similarity", value: "94%", color: "text-charcoal/83 border-light-cream" },
    guardrails: { label: "Safety Margin", value: "99%", color: "text-amber-700 border-amber-250/20" },
    remediation: { label: "Success Prediction", value: "88%", color: "text-emerald-700 border-emerald-250/20" },
    validation: { label: "Verification Confidence", value: "99%", color: "text-emerald-700 border-emerald-250/20" },
    communication: { label: "Accuracy", value: "98%", color: "text-charcoal/83 border-light-cream" }
  }), []);

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

  // Dynamic statistics calculated/fetched from the backend DB
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

  async function runSimulation(label: string, snapshot: MetricSnapshot) {
    try {
      setBusyAction(label);
      setError(null);
      await evaluateMetrics(snapshot);
      await loadIncidentsAndStats();
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

  async function openSettings() {
    try {
      setSettingsError(null);
      setSettingsSuccess(false);
      setShowSettingsModal(true);
      const data = await fetchCloudSettings();
      setCloudSettings(data);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to load cloud settings");
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
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to save cloud settings");
    } finally {
      setSavingSettings(false);
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
    } catch (err) {
      alert(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncingConnection(null);
    }
  }

  // Initial load
  useEffect(() => {
    loadIncidentsAndStats()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not connect to backend"))
      .finally(() => setLoading(false));
    loadConnections();
  }, []);

  // Poll list if active incidents exist or refresh connections list
  useEffect(() => {
    const interval = setInterval(() => {
      const hasActive = incidents.some((inc) => inc.status !== "resolved");
      if (hasActive) {
        loadIncidentsAndStats().catch(console.error);
      }
      loadConnections().catch(console.error);
    }, 4000);
    return () => clearInterval(interval);
  }, [incidents, loadConnections]);

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

    // Define 9 stages
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

  return (
    <main className="min-h-screen bg-cream text-charcoal font-sans selection:bg-ring-blue selection:text-charcoal relative overflow-x-hidden">
      {/* Soft multi-color background gradient wash based on DESIGN.md */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[60%] rounded-full bg-orange-200/20 blur-[130px]" />
        <div className="absolute top-[30%] right-[5%] w-[50%] h-[50%] rounded-full bg-pink-200/15 blur-[140px]" />
        <div className="absolute -bottom-[10%] left-[15%] w-[60%] h-[40%] rounded-full bg-blue-200/15 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
        
        {/* HEADER */}
        <header className="flex flex-col gap-4 border-b border-light-cream pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-charcoal text-off-white shadow-btn-inset">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-sub text-charcoal md:text-2xl mt-0.5 font-sans">
                InfraMedic
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-charcoal/83 bg-charcoal/4 px-2.5 py-0.5 rounded-full border border-light-cream">
                  Autonomous Enterprise Reliability Platform
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-charcoal/40 bg-transparent text-charcoal px-4 text-xs font-medium transition-all duration-150 hover:bg-charcoal/4 active:opacity-85 focus:shadow-focus"
              onClick={openSettings}
            >
              <Settings size={14} />
              Cloud Settings
            </button>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-charcoal/40 bg-transparent text-charcoal px-4 text-xs font-medium transition-all duration-150 hover:bg-charcoal/4 active:opacity-85 focus:shadow-focus disabled:opacity-50"
              onClick={() => loadIncidentsAndStats().catch((err) => setError(err instanceof Error ? err.message : "Refresh failed"))}
              disabled={loading}
            >
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
              Refresh Console
            </button>
          </div>
        </header>

        {/* METRICS DASHBOARD CARD PANEL */}
        <section className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="relative overflow-hidden rounded-xl border border-light-cream bg-cream p-4 flex flex-col justify-between min-h-[96px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-gray">{stat.label}</span>
                  <div className="p-1 rounded-md bg-charcoal/3 text-charcoal">
                    <Icon size={13} />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-charcoal font-sans">{stat.value}</div>
              </div>
            );
          })}
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 flex items-center gap-2">
            <ShieldAlert size={18} />
            {error}
          </div>
        )}

        {/* MAIN DISPLAY SYSTEM */}
        <section className={`grid gap-6 ${selectedIncidentId ? "lg:grid-cols-[380px_1fr]" : "lg:grid-cols-[300px_1fr]"}`}>
          
          {/* LEFT COLUMN: SIMULATION & INCIDENT LOGS */}
          <div className="flex flex-col gap-6">
            
            {/* SIMULATOR */}
            <aside className="rounded-xl border border-light-cream bg-cream p-4">
              <div className="flex items-center justify-between border-b border-light-cream pb-3 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-charcoal/83">Simulate Scenario</h2>
                <span className="rounded-full bg-charcoal/3 border border-light-cream px-2 py-0.5 text-[9px] font-medium text-charcoal/83">Simulator API</span>
              </div>
              <div className="flex flex-col gap-2">
                {simulations.map((sim) => {
                  const Icon = sim.icon;
                  const isBusy = busyAction === sim.label;
                  return (
                    <button
                      key={sim.label}
                      className={`flex items-center justify-between rounded-md border p-3 text-left text-xs font-medium transition-all duration-150 ${
                        isBusy
                          ? "border-charcoal bg-charcoal text-off-white shadow-btn-inset"
                          : "border-charcoal/40 bg-transparent hover:bg-charcoal/4 text-charcoal active:opacity-80"
                      }`}
                      onClick={() => runSimulation(sim.label, sim.snapshot)}
                      disabled={busyAction !== null}
                    >
                      <span className="flex items-center gap-2">
                        <Icon size={14} className={isBusy ? "text-off-white" : "text-charcoal/83"} />
                        {sim.label}
                      </span>
                      <span className={`text-[10px] ${isBusy ? "text-off-white/80" : "text-muted-gray"} font-medium`}>
                        {isBusy ? "Simulating..." : "Trigger"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* LOG STORE LIST */}
            <section className="rounded-xl border border-light-cream bg-cream overflow-hidden">
              <div className="border-b border-light-cream p-4 bg-charcoal/3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-charcoal">Incident Activity Log</h2>
                  <p className="text-xs text-muted-gray mt-1">Select an incident to view real-time orchestrations.</p>
                </div>
                {incidents.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 hover:bg-red-100/80 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-all active:opacity-80 shadow-sm animate-fade-in"
                  >
                    <Trash2 size={13} className="text-red-700" />
                    <span>Clear Log</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-light-cream max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-xs text-muted-gray">Loading database records...</div>
                ) : incidents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-gray">No active/historical incidents. Trigger a simulation.</div>
                ) : (
                  incidents.map((incident) => {
                    const isSelected = incident.id === selectedIncidentId;
                    return (
                      <div
                        key={incident.id}
                        onClick={() => setSelectedIncidentId(incident.id)}
                        className={`p-4 cursor-pointer transition-all duration-150 border-l-2 hover:bg-charcoal/4 ${
                          isSelected ? "bg-charcoal/3 border-charcoal" : "border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-xs text-charcoal line-clamp-1">{incident.title}</h3>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                            incident.severity === "critical"
                              ? "bg-red-50 border-red-200 text-red-700"
                              : incident.severity === "warning"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-blue-50 border-blue-200 text-blue-700"
                          }`}>
                            {incident.severity}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-gray font-mono">
                          <span className="bg-charcoal/4 px-1 py-0.5 rounded text-charcoal/83">{incident.service_name}</span>
                          <span className="font-medium text-charcoal">{incident.metric_value} {incident.metric_name === "latency_ms" ? "ms" : "%"}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider border ${
                            incident.status === "resolved"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : incident.status === "resolving"
                              ? "bg-blue-50 border-blue-200 text-blue-700 animate-pulse"
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}>
                            {incident.status}
                          </span>
                          <span className="text-[10px] text-muted-gray font-medium">
                            {new Date(incident.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: WORKSPACE FOR SELECTED INCIDENT */}
          <div className="flex flex-col gap-6">
            {selectedIncidentId ? (
              selectedIncident ? (
                <div className="rounded-xl border border-light-cream bg-cream p-4 md:p-6 flex flex-col gap-6">
                  
                  {/* WORKSPACE HEADER */}
                  <div className="flex flex-col gap-4 border-b border-light-cream pb-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase text-muted-gray tracking-wider">Incident #{selectedIncident.id}</span>
                          {selectedIncident.risk_score && selectedIncident.risk_score >= 60 && (
                            <span className="text-[9px] font-medium uppercase text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <ShieldAlert size={10} /> High Risk Action Halted
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-semibold text-charcoal mt-1 font-sans">{explanation.title}</h2>
                        <p className="text-xs text-muted-gray mt-1">{explanation.description}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-start">
                        {/* VIEW MODE SELECTOR (EXECUTIVE MODE) */}
                        <div className="flex items-center gap-1 bg-charcoal/3 border border-light-cream p-1 rounded-md text-xs">
                          {(["engineer", "manager", "executive"] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => {
                                setViewMode(mode);
                                setActiveSummaryTab(mode);
                              }}
                              className={`px-2.5 py-1 rounded text-[9px] font-semibold uppercase tracking-wider transition-all duration-150 ${
                                viewMode === mode
                                  ? "bg-charcoal text-off-white shadow-btn-inset font-medium"
                                  : "text-muted-gray hover:text-charcoal hover:bg-charcoal/4"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>

                        <button
                          className="rounded-md p-1.5 bg-charcoal/3 hover:bg-charcoal/4 text-muted-gray hover:text-charcoal transition-all duration-150"
                          onClick={() => {
                            setSelectedIncidentId(null);
                            setSelectedIncident(null);
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE WORKFLOW PIPELINE ANIMATION */}
                  <div className="bg-charcoal/3 border border-light-cream rounded-xl p-4">
                    <h3 className="text-[10px] font-semibold uppercase text-muted-gray tracking-wider mb-4 flex items-center gap-1.5">
                      <Activity size={12} className="text-charcoal/83" />
                      Live Agent Orchestrator Pipeline
                    </h3>
                    <div className="overflow-x-auto pb-2 scrollbar-thin">
                      <div className="flex items-center justify-between min-w-[750px] px-2 relative">
                        {/* Connecting Line background */}
                        <div className="absolute top-[18px] left-6 right-6 h-0.5 bg-light-cream z-0" />
                        
                        {pipelineStages.map((stage) => {
                          const isCompleted = stage.status === "completed";
                          const isActive = stage.status === "active";
                          const isHalted = stage.status === "halted";
                          
                          return (
                            <div key={stage.id} className="relative z-10 flex flex-col items-center flex-1">
                              {/* Glowing nodes */}
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 bg-cream transition-all duration-350 ${
                                  isCompleted
                                    ? "border-emerald-600 text-emerald-700 shadow-focus"
                                    : isActive
                                    ? "border-blue-600 text-blue-700 shadow-focus animate-pulse scale-105"
                                    : isHalted
                                    ? "border-amber-600 text-amber-700 shadow-focus animate-bounce scale-105"
                                    : "border-light-cream text-muted-gray"
                                }`}
                                title={`${stage.agent} (${stage.status})`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 size={16} />
                                ) : isHalted ? (
                                  <Shield size={16} />
                                ) : isActive ? (
                                  <Zap size={14} className="animate-spin" />
                                ) : (
                                  <Circle size={10} />
                                )}
                              </div>
                              <span className={`text-[9px] font-medium text-center mt-2 max-w-[80px] truncate ${
                                isCompleted
                                  ? "text-emerald-700"
                                  : isActive
                                  ? "text-blue-750 font-medium"
                                  : isHalted
                                  ? "text-amber-705 font-medium"
                                  : "text-muted-gray"
                              }`}>
                                {stage.label}
                              </span>
                              {(isCompleted || isActive) && (
                                <span className="text-[8px] font-medium text-muted-gray mt-0.5">
                                  {stage.id === "monitor" && "97% Conf"}
                                  {stage.id === "change_intel" && "95% Corr"}
                                  {stage.id === "diagnostic" && "91% Conf"}
                                  {stage.id === "knowledge" && "89% Rel"}
                                  {stage.id === "time_machine" && "94% Sim"}
                                  {stage.id === "guardrails" && "99% Safe"}
                                  {stage.id === "remediation" && "88% Pred"}
                                  {stage.id === "validation" && "99% Conf"}
                                  {stage.id === "communication" && "98% Acc"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* TAB SWITCHER */}
                  <div className="flex border-b border-light-cream gap-1 overflow-x-auto scrollbar-thin">
                    <button
                      className={`px-4 py-2 text-xs font-semibold transition-all duration-150 shrink-0 border-b-2 -mb-px flex items-center gap-1.5 ${
                        activeTab === "trace" ? "text-charcoal border-charcoal" : "text-muted-gray border-transparent hover:text-charcoal"
                      }`}
                      onClick={() => setActiveTab("trace")}
                    >
                      <Terminal size={14} />
                      Orchestrator Trace
                    </button>
                    <button
                      className={`px-4 py-2 text-xs font-semibold transition-all duration-150 shrink-0 border-b-2 -mb-px flex items-center gap-1.5 ${
                        activeTab === "change_intel" ? "text-charcoal border-charcoal" : "text-muted-gray border-transparent hover:text-charcoal"
                      }`}
                      onClick={() => setActiveTab("change_intel")}
                    >
                      <GitCommit size={14} />
                      Change Intel
                    </button>
                    <button
                      className={`px-4 py-2 text-xs font-semibold transition-all duration-150 shrink-0 border-b-2 -mb-px flex items-center gap-1.5 ${
                        activeTab === "time_machine" ? "text-charcoal border-charcoal" : "text-muted-gray border-transparent hover:text-charcoal"
                      }`}
                      onClick={() => setActiveTab("time_machine")}
                    >
                      <History size={14} />
                      Time Machine
                    </button>
                    <button
                      className={`px-4 py-2 text-xs font-semibold transition-all duration-150 shrink-0 border-b-2 -mb-px flex items-center gap-1.5 ${
                        activeTab === "guardrails" ? "text-charcoal border-charcoal" : "text-muted-gray border-transparent hover:text-charcoal"
                      }`}
                      onClick={() => setActiveTab("guardrails")}
                    >
                      <ShieldCheck size={14} />
                      Guardrails & Safety
                    </button>
                    {selectedIncident.status === "resolved" && (
                      <button
                        className={`px-4 py-2 text-xs font-semibold transition-all duration-150 shrink-0 border-b-2 -mb-px flex items-center gap-1.5 ${
                          activeTab === "reports" ? "text-charcoal border-charcoal" : "text-muted-gray border-transparent hover:text-charcoal"
                        }`}
                        onClick={() => setActiveTab("reports")}
                      >
                        <FileText size={14} />
                        Stakeholder Updates & ROI
                      </button>
                    )}
                  </div>

                  {/* TAB CONTENT AREAS */}
                  <div className="min-h-[300px]">
                    
                    {/* TAB: TRACE */}
                    {activeTab === "trace" && (
                      <div className="flex flex-col gap-5">
                        {/* REASONING TRACE */}
                        <div className="relative bg-charcoal/3 border border-light-cream rounded-xl p-4">
                          <h4 className="text-[10px] font-semibold uppercase text-muted-gray tracking-wider mb-3 flex items-center gap-1.5">
                            <Activity size={12} className="text-charcoal/83" />
                            Reasoning Trace
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-light-cream pt-3">
                            {reasoningTrace.map((item, index) => (
                              <div key={index} className="flex items-center gap-2 text-[11px] font-mono">
                                {item.status === "done" ? (
                                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                                ) : item.status === "active" ? (
                                  <span className="text-blue-600 animate-pulse font-bold text-sm">•</span>
                                ) : (
                                  <span className="text-charcoal/40 font-bold text-sm">•</span>
                                )}
                                <span className={
                                  item.status === "done" 
                                    ? "text-charcoal/83" 
                                    : item.status === "active" 
                                    ? "text-blue-650 font-semibold" 
                                    : "text-muted-gray"
                                }>
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="relative pl-6 border-l border-light-cream flex flex-col gap-5 mt-2">
                          {selectedIncident.steps && selectedIncident.steps.length > 0 ? (
                            selectedIncident.steps.map((step) => (
                              <div key={step.id} className="relative group">
                                <span className="absolute -left-[30.5px] top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-charcoal group-hover:scale-125 transition-transform" />
                                <div>
                                  <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase">
                                    <div className="flex items-center gap-2">
                                      <span className="text-charcoal">{step.agent}</span>
                                      {getAgentConfidenceBadge(step.agent)}
                                    </div>
                                    <span className="text-muted-gray font-mono">
                                      {new Date(step.created_at).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-charcoal/82 leading-relaxed font-mono bg-charcoal/3 border border-light-cream p-3 rounded-md whitespace-pre-line shadow-sm">
                                    {step.message}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-muted-gray flex items-center gap-2 py-4">
                              <span className="h-2.5 w-2.5 rounded-full bg-charcoal animate-ping" />
                              Initializing orchestrator agents...
                            </div>
                          )}
                          
                          {selectedIncident.status !== "resolved" && (
                            <div className="relative flex items-center gap-2 py-2">
                              <span className="absolute -left-[30.5px] top-3.5 flex h-2 w-2 items-center justify-center rounded-full bg-charcoal/40 animate-ping" />
                              <div className="text-xs font-semibold text-charcoal/83 animate-pulse pl-1.5">
                                {selectedIncident.approval_status === "pending"
                                  ? "Execution halted. Operator action required on Guardrails & Safety."
                                  : "Orchestration running in background..."}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB: CHANGE INTEL */}
                    {activeTab === "change_intel" && (
                      <div className="flex flex-col gap-5">
                        {changeIntelligence ? (
                          <>
                            {/* Score header */}
                            <div className="flex items-center justify-between bg-charcoal/3 p-4 border border-light-cream rounded-xl">
                              <div>
                                <span className="text-[10px] font-semibold text-muted-gray uppercase tracking-wider">Analysis Result</span>
                                <h4 className="text-sm font-semibold text-charcoal mt-0.5 font-sans">Deployment & Config Correlation</h4>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-medium text-muted-gray">Match Correlation</span>
                                <span className="text-xl font-bold text-charcoal">{Math.round(changeIntelligence.correlation_score * 100)}%</span>
                              </div>
                            </div>

                            {/* Deployments Section */}
                            {changeIntelligence.deployments && changeIntelligence.deployments.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <h4 className="text-xs font-semibold text-muted-gray uppercase tracking-wider flex items-center gap-1.5">
                                  <GitPullRequest size={12} className="text-charcoal/83" />
                                  Correlated Deployments (Recent)
                                </h4>
                                <div className="border border-light-cream rounded-md overflow-hidden text-xs">
                                  <table className="w-full border-collapse text-left bg-cream">
                                    <thead className="bg-charcoal/3 border-b border-light-cream font-semibold text-charcoal/83">
                                      <tr>
                                        <th className="p-2.5">Service</th>
                                        <th className="p-2.5">Version</th>
                                        <th className="p-2.5">Timestamp</th>
                                        <th className="p-2.5">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-light-cream font-mono text-[11px] text-charcoal/82">
                                      {changeIntelligence.deployments.map((d: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-charcoal/4">
                                          <td className="p-2.5 text-charcoal font-semibold">{d.service}</td>
                                          <td className="p-2.5">{d.version}</td>
                                          <td className="p-2.5">{d.timestamp}</td>
                                          <td className="p-2.5 text-charcoal font-semibold">{d.status}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Git Commits Section */}
                            {changeIntelligence.git_commits && changeIntelligence.git_commits.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <h4 className="text-xs font-semibold text-muted-gray uppercase tracking-wider flex items-center gap-1.5">
                                  <GitCommit size={12} className="text-charcoal/83" />
                                  Commit Diff Ledger (Repo Logs)
                                </h4>
                                <div className="flex flex-col gap-2">
                                  {changeIntelligence.git_commits.map((c: any, idx: number) => (
                                    <div key={idx} className="bg-cream border border-light-cream rounded-md p-3 flex flex-col gap-2 text-xs">
                                      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-gray font-mono">
                                        <span className="font-semibold text-charcoal/83">SHA: {c.sha}</span>
                                        <span>{c.timestamp}</span>
                                      </div>
                                      <p className="font-semibold text-charcoal/83 text-xs">{c.message}</p>
                                      <div className="flex items-center justify-between text-[11px] font-mono mt-1 pt-1.5 border-t border-light-cream">
                                        <span className="text-muted-gray">Author: {c.author}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                          c.impact === "High" ? "bg-red-50 text-red-700 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                                        }`}>Impact: {c.impact}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Config Drift Section */}
                            {changeIntelligence.config_drifts && changeIntelligence.config_drifts.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <h4 className="text-xs font-semibold text-muted-gray uppercase tracking-wider flex items-center gap-1.5">
                                  <Database size={12} className="text-charcoal/83" />
                                  Environment Variables / Config Drift
                                </h4>
                                <div className="border border-light-cream rounded-md overflow-hidden text-xs">
                                  <table className="w-full border-collapse text-left bg-cream">
                                    <thead className="bg-charcoal/3 border-b border-light-cream font-semibold text-charcoal/83">
                                      <tr>
                                        <th className="p-2.5">Variable Key</th>
                                        <th className="p-2.5 text-red-700">Previous Value</th>
                                        <th className="p-2.5 text-emerald-700">Current Value</th>
                                        <th className="p-2.5">Operator</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-light-cream font-mono text-[11px] text-charcoal/82">
                                      {changeIntelligence.config_drifts.map((drift: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-charcoal/4">
                                          <td className="p-2.5 font-semibold text-charcoal">{drift.key}</td>
                                          <td className="p-2.5 text-red-650 line-through">{drift.previous_value}</td>
                                          <td className="p-2.5 text-emerald-700 font-semibold">{drift.current_value}</td>
                                          <td className="p-2.5">{drift.updated_by}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-muted-gray text-center py-10 font-mono border border-dashed border-light-cream rounded-xl">
                            Change Intelligence module has not analyzed this execution state yet.
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: TIME MACHINE */}
                    {activeTab === "time_machine" && (
                      <div className="flex flex-col gap-5">
                        {timeMachine ? (
                          <>
                            {/* Recovery info banner */}
                            <div className="flex items-center gap-3 bg-charcoal/3 border border-light-cream rounded-xl p-4 text-xs">
                              <Info size={18} className="text-charcoal/83 shrink-0" />
                              <div className="font-mono text-charcoal/82">
                                <span className="font-semibold text-charcoal">Time Machine Prediction:</span> {timeMachine.expected_recovery_prediction}
                              </div>
                            </div>

                            {/* Similar incidents */}
                            <div className="flex flex-col gap-2">
                              <h4 className="text-xs font-semibold text-muted-gray uppercase tracking-wider flex items-center gap-1.5">
                                <History size={12} className="text-charcoal/83" />
                                Top Historical Similarity Matches
                              </h4>
                              <div className="flex flex-col gap-3">
                                {timeMachine.similar_incidents && timeMachine.similar_incidents.map((s: any, idx: number) => (
                                  <div key={idx} className="bg-cream border border-light-cream rounded-xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                      <span className="font-semibold font-mono text-charcoal bg-charcoal/3 px-2 py-0.5 rounded border border-light-cream">{s.incident_id}</span>
                                      <span className="font-semibold text-charcoal font-mono">{s.similarity_score}% Confidence</span>
                                    </div>
                                    <h5 className="font-semibold text-charcoal text-xs">{s.title}</h5>
                                    <div className="grid grid-cols-3 gap-3 border-t border-light-cream pt-2.5 mt-1 text-[11px] font-mono text-muted-gray">
                                      <div>
                                        <p className="text-[9px] uppercase tracking-wider text-muted-gray font-medium">Resolution</p>
                                        <p className="mt-0.5 font-semibold text-charcoal">{s.resolution}</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase tracking-wider text-muted-gray font-medium">Duration</p>
                                        <p className="mt-0.5 font-semibold text-charcoal">{s.recovery_time}</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase tracking-wider text-muted-gray font-medium">Status</p>
                                        <p className="mt-0.5 font-semibold text-emerald-700">Resolved</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Remediation success rankings */}
                            <div className="flex flex-col gap-2">
                              <h4 className="text-xs font-semibold text-muted-gray uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp size={12} className="text-charcoal/83" />
                                Remediation Recommendation Rankings
                              </h4>
                              <div className="border border-light-cream rounded-md overflow-hidden text-xs">
                                <table className="w-full border-collapse text-left bg-cream">
                                  <thead className="bg-charcoal/3 border-b border-light-cream font-semibold text-charcoal/83">
                                    <tr>
                                      <th className="p-2.5">Action Method</th>
                                      <th className="p-2.5 text-right">Historical Success %</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-light-cream font-mono text-[11px] text-charcoal/82">
                                    {timeMachine.recommendations && timeMachine.recommendations.map((rec: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-charcoal/4">
                                        <td className="p-2.5 font-semibold text-charcoal">{rec.action}</td>
                                        <td className="p-2.5 text-right text-emerald-700 font-semibold">{rec.success_rate}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-gray text-center py-10 font-mono border border-dashed border-light-cream rounded-xl">
                            Incident Time Machine has not evaluated baseline matching configurations.
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: GUARDRAILS */}
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
                        proposedDetails = "kubectl rollout undo deployment/payments-api (revert credentials config to revision v1.8.3)";
                      } else if (service === "orders-api") {
                        proposedAction = "Rollback Deployment";
                        proposedDetails = "helm rollback orders-api (revert routes config to stable v2.0.8)";
                      } else if (service === "db-storm" || service === "database-storm") {
                        proposedAction = "Rollback Deployment";
                        proposedDetails = "kubectl rollout undo deployment/postgres-db (revert max_connections limits to 200)";
                      }

                      return (
                        <div className="flex flex-col gap-5">
                          
                          {/* Risk Gauge Header */}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="bg-charcoal/3 p-4 border border-light-cream rounded-xl flex flex-col gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Autonomous Safety Engine</span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-charcoal">{selectedIncident.risk_score ?? "0.0"}%</span>
                                <span className="text-xs text-muted-gray font-medium">Risk Score</span>
                              </div>
                              <div className="w-full bg-charcoal/10 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    (selectedIncident.risk_score ?? 0) >= 70
                                      ? "bg-red-600"
                                      : (selectedIncident.risk_score ?? 0) >= 40
                                      ? "bg-amber-500"
                                      : "bg-emerald-600"
                                  }`}
                                  style={{ width: `${selectedIncident.risk_score ?? 0}%` }}
                                />
                              </div>
                            </div>

                            <div className="bg-charcoal/3 p-4 border border-light-cream rounded-xl flex flex-col gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Approval Policy Mode</span>
                              <div className="flex items-center gap-2 mt-1">
                                {(selectedIncident.risk_score ?? 0) >= 60 ? (
                                  <>
                                    <Lock className="text-red-600" size={16} />
                                    <span className="text-xs font-semibold text-charcoal">Human Approval Gate Required</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="text-emerald-600" size={16} />
                                    <span className="text-xs font-semibold text-charcoal/83">Fully Autonomous Allowed</span>
                                  </>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-gray mt-1 font-sans">
                                {(selectedIncident.risk_score ?? 0) >= 60
                                  ? "Policy limits SRE remediation execution above 60% risk score tolerance."
                                  : "Remediation executed autonomously based on active risk tolerance parameters."}
                              </span>
                            </div>
                          </div>

                          {/* Interactive Approval Bar */}
                          {selectedIncident.requires_approval && selectedIncident.approval_status === "pending" && (
                            <div className="bg-orange-50 border border-orange-200/80 rounded-xl p-5 flex flex-col gap-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-md bg-orange-100 text-orange-700 border border-orange-200/60">
                                  <ShieldAlert size={20} />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-charcoal text-sm">Operator Approval Awaiting</h4>
                                  <p className="text-xs text-muted-gray leading-relaxed mt-1">
                                    Safety guardrails halted autonomous remediation execution because this action falls into a high-risk SRE category. Review details and authorize rollout below.
                                  </p>
                                </div>
                              </div>

                              {/* PROPOSED ACTION DETAILS */}
                              <div className="bg-white/90 border border-orange-200 rounded-lg p-3.5 text-xs flex flex-col gap-2 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-charcoal">Proposed Action:</span>
                                  <span className="bg-orange-100 text-orange-850 px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase tracking-wider">{proposedAction}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-charcoal">Target Service:</span>
                                  <span className="text-charcoal/80 font-mono">{service}</span>
                                </div>
                                <div className="flex flex-col gap-1 text-[11px] font-mono text-muted-gray mt-1 bg-charcoal/4 p-2.5 rounded border border-charcoal/5">
                                  <span className="text-[9px] uppercase font-semibold text-muted-gray mb-1 select-none">Execution Command:</span>
                                  <div className="flex items-start gap-1.5 text-charcoal font-semibold">
                                    <span className="text-charcoal/50 select-none">$</span>
                                    <span className="break-all">{proposedDetails}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 justify-end pt-1">
                                <button
                                  className="inline-flex h-9 items-center justify-center rounded-md bg-charcoal text-off-white font-medium px-5 text-xs tracking-wider uppercase transition-all duration-150 shadow-btn-inset hover:opacity-90 active:opacity-80 disabled:opacity-50"
                                  onClick={() => handleApprove(selectedIncident.id)}
                                  disabled={approvingId !== null}
                                >
                                  {approvingId === selectedIncident.id ? "Authorizing Rollout..." : "Approve & Execute Remediation"}
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="bg-cream border border-light-cream rounded-xl p-4 flex flex-col gap-3">
                            <h4 className="text-xs font-semibold text-muted-gray uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck size={12} className="text-charcoal/83" />
                              Incident Safety Audit Log
                            </h4>
                            <div className="flex flex-col gap-2 font-mono text-[11px] text-muted-gray">
                              <div className="flex justify-between border-b border-light-cream pb-1.5">
                                <span>Risk Scoring Model:</span>
                                <span className="text-charcoal/83">V2.1-Stochastic</span>
                              </div>
                              <div className="flex justify-between border-b border-light-cream pb-1.5">
                                <span>Auto Approval Cutoff:</span>
                                <span className="text-charcoal/83">60% Risk Limit</span>
                              </div>
                              <div className="flex justify-between border-b border-light-cream pb-1.5">
                                <span>Audit status:</span>
                                <span className="text-charcoal/83 uppercase">{selectedIncident.approval_status}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Safety Gate State:</span>
                                <span className={selectedIncident.approval_status === "approved" ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                                  {selectedIncident.approval_status === "approved" ? "PASSED" : "PENDING HUMAN SIGN-OFF"}
                                </span>
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })()}

                    {/* TAB: AUDIENCE TAILORED REPORTS & ROI */}
                    {activeTab === "reports" && selectedIncident.status === "resolved" && summaries && (
                      <div className="flex flex-col gap-5">
                        
                        {/* Summary tabs */}
                        <div className="flex border border-light-cream rounded-md overflow-hidden text-xs bg-cream">
                          <button
                            className={`flex-1 py-2 text-center font-semibold border-r border-light-cream transition-all duration-150 ${
                              activeSummaryTab === "engineer" ? "bg-charcoal text-off-white shadow-btn-inset" : "hover:bg-charcoal/4 text-muted-gray"
                            }`}
                            onClick={() => setActiveSummaryTab("engineer")}
                          >
                            <span className="flex items-center justify-center gap-1">
                              <Terminal size={12} />
                              SRE Engineer
                            </span>
                          </button>
                          <button
                            className={`flex-1 py-2 text-center font-semibold border-r border-light-cream transition-all duration-150 ${
                              activeSummaryTab === "manager" ? "bg-charcoal text-off-white shadow-btn-inset" : "hover:bg-charcoal/4 text-muted-gray"
                            }`}
                            onClick={() => setActiveSummaryTab("manager")}
                          >
                            <span className="flex items-center justify-center gap-1">
                              <FileText size={12} />
                              IT Manager
                            </span>
                          </button>
                          <button
                            className={`flex-1 py-2 text-center font-semibold transition-all duration-150 ${
                              activeSummaryTab === "executive" ? "bg-charcoal text-off-white shadow-btn-inset" : "hover:bg-charcoal/4 text-muted-gray"
                            }`}
                            onClick={() => setActiveSummaryTab("executive")}
                          >
                            <span className="flex items-center justify-center gap-1">
                              <UserCheck size={12} />
                              Executive
                            </span>
                          </button>
                        </div>

                        {/* Report contents */}
                        <div className="rounded-md bg-cream border border-light-cream p-4 font-mono text-xs leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-line shadow-sm">
                          {activeSummaryTab === "engineer" && (
                            <div className="text-charcoal/82">{summaries.engineer}</div>
                          )}
                          {activeSummaryTab === "manager" && (
                            <div className="text-charcoal/82">{summaries.manager}</div>
                          )}
                          {activeSummaryTab === "executive" && (
                            <div className="text-charcoal/82">{summaries.executive}</div>
                          )}
                        </div>

                        {/* "WHAT IF WE DID NOTHING?" COMPARISON */}
                        <div className="bg-charcoal/3 border border-light-cream rounded-xl p-4 flex flex-col gap-4">
                          <h4 className="text-xs font-semibold uppercase text-charcoal tracking-wider flex items-center gap-1.5">
                            <Activity size={12} className="text-charcoal/83" />
                            Business Impact: What If We Did Nothing?
                          </h4>
                          
                          <div className="grid gap-4 sm:grid-cols-2">
                            {/* WITHOUT INFRAMEDIC */}
                            <div className="relative overflow-hidden rounded-xl border border-red-200/60 bg-red-50/20 p-4">
                              <div className="flex items-center gap-1.5 text-red-700 text-xs font-semibold uppercase tracking-wider mb-3">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                                Without InfraMedic
                              </div>
                              <div className="flex flex-col gap-2 font-mono text-xs">
                                <div className="flex justify-between border-b border-red-100 pb-1.5">
                                  <span className="text-muted-gray">Resolution Time:</span>
                                  <span className="text-red-700 font-semibold">{nothingImpact.resolutionTime}</span>
                                </div>
                                <div className="flex justify-between border-b border-red-100 pb-1.5">
                                  <span className="text-muted-gray">Customer Impact:</span>
                                  <span className="text-red-700 font-semibold">{nothingImpact.customerImpact}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-gray">Revenue Impact:</span>
                                  <span className="text-red-700 font-semibold">{nothingImpact.revenueImpact}</span>
                                </div>
                              </div>
                            </div>

                            {/* WITH INFRAMEDIC */}
                            <div className="relative overflow-hidden rounded-xl border border-emerald-200/60 bg-emerald-50/20 p-4">
                              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-3">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                With InfraMedic
                              </div>
                              <div className="flex flex-col gap-2 font-mono text-xs">
                                <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                                  <span className="text-muted-gray">Resolution Time:</span>
                                  <span className="text-emerald-700 font-semibold">{nothingImpact.withInfraMedicTime}</span>
                                </div>
                                <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                                  <span className="text-muted-gray">Customer Impact:</span>
                                  <span className="text-emerald-700 font-semibold">None</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-gray">Revenue Impact:</span>
                                  <span className="text-emerald-700 font-semibold">None</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ROI Calculator Card */}
                        <div className="bg-charcoal/3 border border-light-cream rounded-xl p-4 flex flex-col gap-3">
                          <h4 className="text-xs font-semibold text-muted-gray uppercase tracking-wider flex items-center gap-1.5">
                            <Coins size={12} className="text-charcoal/83" />
                            Incident ROI Impact Metrics
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border border-light-cream rounded-md p-3 bg-cream">
                              <span className="text-[9px] uppercase tracking-wider text-muted-gray font-semibold block">Labor Cost Savings</span>
                              <span className="text-lg font-bold text-charcoal mt-1 block">
                                ${((dbStats?.hours_saved ? parseFloat(dbStats.hours_saved) / (incidents.filter(i => i.status === "resolved").length || 1) : 4.2) * 150).toFixed(0)}
                              </span>
                              <span className="text-[10px] text-muted-gray mt-1 block font-mono">Based on $150/hr SRE rate</span>
                            </div>

                            <div className="border border-light-cream rounded-md p-3 bg-cream">
                              <span className="text-[9px] uppercase tracking-wider text-muted-gray font-semibold block">Downtime Prevented</span>
                              <span className="text-lg font-bold text-emerald-700 mt-1 block">
                                {selectedIncident.service_name === "payments-api" || selectedIncident.service_name === "database-storm" ? "$12,500" : "$0"}
                              </span>
                              <span className="text-[10px] text-muted-gray mt-1 block font-mono">Assessing SLA correlation</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>

                </div>
              ) : (
                <div className="rounded-xl border border-light-cream bg-cream py-16 text-center text-xs text-muted-gray">
                  Loading incident Workspace...
                </div>
              )
            ) : (
              <div className="rounded-xl border border-dashed border-light-cream bg-cream py-24 text-center text-muted-gray flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 rounded-full border border-light-cream flex items-center justify-center text-muted-gray">
                  <Info size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal text-sm">No Incident Workspace Loaded</h3>
                  <p className="text-xs text-muted-gray mt-1 max-w-[280px]">Select an incident from the log list to inspect telemetry and approvals.</p>
                </div>
              </div>
            )}
          </div>

        </section>
      </div>

      {/* CLOUD SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cream border border-light-cream rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="border-b border-light-cream p-4 bg-charcoal/3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-charcoal" />
                <h3 className="font-semibold text-sm text-charcoal">Cloud Environment Settings</h3>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-muted-gray hover:text-charcoal transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-light-cream bg-charcoal/2 text-xs shrink-0 select-none">
              <button
                type="button"
                className={`flex-1 py-2.5 text-center font-semibold transition-all border-b-2 outline-none ${
                  settingsTab === "connections" ? "border-charcoal text-charcoal bg-cream font-bold" : "border-transparent text-muted-gray hover:text-charcoal"
                }`}
                onClick={() => setSettingsTab("connections")}
              >
                Connections
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 text-center font-semibold transition-all border-b-2 outline-none ${
                  settingsTab === "aws" ? "border-charcoal text-charcoal bg-cream font-bold" : "border-transparent text-muted-gray hover:text-charcoal"
                }`}
                onClick={() => setSettingsTab("aws")}
              >
                AWS
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 text-center font-semibold transition-all border-b-2 outline-none ${
                  settingsTab === "azure" ? "border-charcoal text-charcoal bg-cream font-bold" : "border-transparent text-muted-gray hover:text-charcoal"
                }`}
                onClick={() => setSettingsTab("azure")}
              >
                Azure
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 text-center font-semibold transition-all border-b-2 outline-none ${
                  settingsTab === "gcp" ? "border-charcoal text-charcoal bg-cream font-bold" : "border-transparent text-muted-gray hover:text-charcoal"
                }`}
                onClick={() => setSettingsTab("gcp")}
              >
                GCP
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 text-center font-semibold transition-all border-b-2 outline-none ${
                  settingsTab === "resources" ? "border-charcoal text-charcoal bg-cream font-bold" : "border-transparent text-muted-gray hover:text-charcoal"
                }`}
                onClick={() => setSettingsTab("resources")}
              >
                Resources Status
              </button>
            </div>

            <form onSubmit={settingsTab === "connections" ? (e) => e.preventDefault() : saveSettings} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-cream">
              {settingsTab === "connections" && (
                <div className="flex flex-col gap-4 text-xs">
                  <div className="text-muted-gray">
                    Manage multi-cloud account integrations, test connectivity, and synchronize active resource inventories.
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {connections.length === 0 ? (
                      <div className="py-6 text-center text-muted-gray border border-dashed border-light-cream rounded-lg bg-charcoal/2">
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
                            className={`border rounded-lg transition-all ${
                              isSelected ? "border-charcoal bg-off-white" : "border-light-cream bg-charcoal/2 hover:bg-charcoal/3"
                            }`}
                          >
                            <div 
                              onClick={() => setSelectedConnection(isSelected ? null : conn)}
                              className="p-3 flex items-center justify-between cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-1 bg-white border border-light-cream rounded text-charcoal font-bold uppercase tracking-wider text-[9px]">
                                  {conn.provider.slice(0, 3)}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-charcoal uppercase">{conn.provider}</h4>
                                  <p className="text-[10px] text-muted-gray mt-0.5">{conn.auth_method || "No Auth Configured"}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {/* Health Badge */}
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                                  conn.health === "connected" 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                    : conn.health === "error"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-charcoal/10 text-muted-gray border-charcoal/20"
                                }`}>
                                  {conn.health.toUpperCase()}
                                </span>
                                
                                {/* Monitoring Toggle */}
                                <button
                                  type="button"
                                  disabled={isToggling}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleConnection(conn.provider, conn.health);
                                  }}
                                  className={`px-2.5 py-1 rounded text-[9px] font-semibold transition-all border ${
                                    conn.health === "connected" || conn.health === "error"
                                      ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                  }`}
                                >
                                  {isToggling ? "..." : conn.health === "connected" || conn.health === "error" ? "Suspend" : "Activate"}
                                </button>
                              </div>
                            </div>

                            {/* Expansion Panel */}
                            {isSelected && (
                              <div className="px-4 pb-4 pt-2 border-t border-light-cream/40 bg-cream/30 flex flex-col gap-3 text-[11px] text-charcoal">
                                <div className="grid grid-cols-2 gap-2 text-muted-gray">
                                  <div>
                                    <span className="font-semibold text-charcoal">Scope:</span> {conn.account || "Not available"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-charcoal">Regions Monitored:</span> {conn.regions?.join(", ") || "None"}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-charcoal">Inventory Resources:</span> {conn.resource_count || 0}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-charcoal">Last Synchronized:</span> {conn.last_sync ? new Date(conn.last_sync).toLocaleTimeString() : "Never"}
                                  </div>
                                </div>
                                
                                {conn.error_message && (
                                  <div className="p-2 border border-red-200 bg-red-50 rounded text-red-800 text-[10px]">
                                    {conn.error_message}
                                  </div>
                                )}

                                <div className="flex gap-2 mt-1">
                                  <button
                                    type="button"
                                    disabled={isTesting}
                                    onClick={() => handleTestConnection(conn.provider)}
                                    className="flex-1 py-1 px-2 border border-light-cream bg-cream hover:bg-charcoal/5 rounded transition-all text-[10px] font-semibold text-charcoal"
                                  >
                                    {isTesting ? "Testing..." : "Test Connection"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSyncing || conn.health !== "connected"}
                                    onClick={() => handleSyncConnection(conn.provider)}
                                    className={`flex-1 py-1 px-2 border border-light-cream rounded transition-all text-[10px] font-semibold ${
                                      conn.health === "connected"
                                        ? "bg-cream hover:bg-charcoal/5 text-charcoal"
                                        : "bg-charcoal/5 text-muted-gray cursor-not-allowed border-light-cream/40"
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

              {settingsTab !== "connections" && (
                <div className="text-xs text-muted-gray shrink-0">
                  {settingsTab !== "resources" ? (
                    <span>Configure connection parameters for this environment. If parameters are left unchanged, connection falls back to the local cloud emulator defaults.</span>
                  ) : (
                    <span>Active cloud infrastructure components and resource status across all supported platforms.</span>
                  )}
                </div>
              )}

              {settingsTab !== "connections" && settingsError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2.5 shrink-0">
                  {settingsError}
                </div>
              )}

              {settingsTab !== "connections" && settingsSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2.5 shrink-0">
                  Settings saved successfully!
                </div>
              )}

              {/* AWS Tab */}
              {settingsTab === "aws" && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">AWS Endpoint URL</label>
                    <input
                      type="text"
                      value={cloudSettings.aws_endpoint_url}
                      onChange={(e) => setCloudSettings({ ...cloudSettings, aws_endpoint_url: e.target.value })}
                      placeholder="Default: http://localhost:4566"
                      className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
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
                        className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">S3 Bucket Name</label>
                      <input
                        type="text"
                        value={cloudSettings.aws_bucket_name}
                        onChange={(e) => setCloudSettings({ ...cloudSettings, aws_bucket_name: e.target.value })}
                        placeholder="Default: inframedic-artifacts"
                        className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
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
                      className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Secret Access Key</label>
                    <input
                      type="password"
                      value={cloudSettings.aws_secret_access_key}
                      onChange={(e) => setCloudSettings({ ...cloudSettings, aws_secret_access_key: e.target.value })}
                      placeholder="Default: floci"
                      className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Azure Tab */}
              {settingsTab === "azure" && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Azure Connection Endpoint</label>
                    <input
                      type="text"
                      value={cloudSettings.azure_endpoint_url}
                      onChange={(e) => setCloudSettings({ ...cloudSettings, azure_endpoint_url: e.target.value })}
                      placeholder="Default: http://localhost:10000"
                      className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
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
                        className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Blob Container Name</label>
                      <input
                        type="text"
                        value={cloudSettings.azure_container_name}
                        onChange={(e) => setCloudSettings({ ...cloudSettings, azure_container_name: e.target.value })}
                        placeholder="Default: inframedic-container"
                        className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
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
                      className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* GCP Tab */}
              {settingsTab === "gcp" && (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">GCP Emulator Endpoint</label>
                    <input
                      type="text"
                      value={cloudSettings.gcp_endpoint_url}
                      onChange={(e) => setCloudSettings({ ...cloudSettings, gcp_endpoint_url: e.target.value })}
                      placeholder="Default: http://localhost:4443"
                      className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
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
                        className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Storage Bucket Name</label>
                      <input
                        type="text"
                        value={cloudSettings.gcp_bucket_name}
                        onChange={(e) => setCloudSettings({ ...cloudSettings, gcp_bucket_name: e.target.value })}
                        placeholder="Default: inframedic-gcp-bucket"
                        className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal focus:border-charcoal outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-gray">Service Account JSON credentials</label>
                    <textarea
                      value={cloudSettings.gcp_credentials_json}
                      onChange={(e) => setCloudSettings({ ...cloudSettings, gcp_credentials_json: e.target.value })}
                      placeholder="{}"
                      rows={3}
                      className="rounded border border-charcoal/20 bg-white/50 px-3 py-1.5 text-xs text-charcoal font-mono focus:border-charcoal outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Resources Tab */}
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
                      <div key={idx} className="flex items-center justify-between border border-light-cream rounded-lg p-3 bg-white/70 shadow-sm text-xs gap-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase select-none ${
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

              <div className="border-t border-light-cream pt-4 mt-auto flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="rounded border border-charcoal/20 bg-transparent px-3.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-charcoal/4 transition-colors"
                >
                  Cancel
                </button>
                {settingsTab !== "resources" && (
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="rounded bg-charcoal text-off-white px-4 py-1.5 text-xs font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-50"
                  >
                    {savingSettings ? "Saving..." : "Save Settings"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
