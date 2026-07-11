import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Cpu,
  Database,
  Terminal,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Info,
  ShieldAlert,
  Search,
  Check,
  Copy,
  ChevronRight,
  ChevronDown,
  Play,
  FileText,
  Clock,
  Coins,
  History,
  Activity,
  X,
  Lock
} from "lucide-react";

// Reusable Copyable Code Block
function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-md border border-gray-800 bg-gray-950 my-3 font-mono text-[11px] overflow-hidden select-text">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-850/80 text-[10px] text-gray-400 select-none">
        <span>{language.toUpperCase()}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-gray-200 transition-colors"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-gray-300 leading-relaxed">{code}</pre>
    </div>
  );
}

// Reusable Callout/Alert Box
function Callout({
  type = "info",
  title,
  children
}: {
  type?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: React.ReactNode;
}) {
  let borderClass = "border-sky-900 bg-sky-950/10 text-sky-300";
  let Icon = Info;

  if (type === "warning") {
    borderClass = "border-amber-900 bg-amber-950/10 text-amber-300";
    Icon = AlertTriangle;
  } else if (type === "danger") {
    borderClass = "border-red-900 bg-red-950/10 text-red-300";
    Icon = ShieldAlert;
  } else if (type === "success") {
    borderClass = "border-emerald-900 bg-emerald-950/10 text-emerald-300";
    Icon = ShieldCheck;
  }

  return (
    <div className={`border rounded-lg p-4 my-4 flex gap-3 text-xs leading-relaxed ${borderClass}`}>
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div>
        {title && <span className="font-bold font-mono block mb-1 uppercase tracking-wider text-[10px]">{title}</span>}
        <div className="text-gray-300 font-sans">{children}</div>
      </div>
    </div>
  );
}

export function DocsConsole() {
  // Navigation tabs within documentation site
  const [docPage, setDocPage] = useState<
    "overview" | "architecture" | "agents" | "tools" | "workflow" | "api" | "demo" | "provider_layer" | "monitoring_alerts"
  >("overview");

  // Selected agent subpage
  const [activeAgentPage, setActiveAgentPage] = useState<string>("Monitoring Agent");
  const [toolSearch, setToolSearch] = useState("");

  // Docs internal search state
  const [docsSearch, setDocsSearch] = useState("");
  const [docsSearchOpen, setDocsSearchOpen] = useState(false);

  // Tools specification array
  const toolsData = useMemo(() => {
    return [
      {
        name: "kubectl_scale",
        desc: "Scales Kubernetes deployments in target namespaces to meet resource requirements.",
        params: `{"deployment": "checkout-api", "replicas": 4, "namespace": "default"}`,
        returns: `{"status": "Success", "scaled": true, "replicas_current": 4}`,
        safety: "Moderated",
        example: "kubectl scale deployment checkout-api --replicas=4"
      },
      {
        name: "kubectl_rollout_restart",
        desc: "Triggers sequential rolling restarts on pod templates to clear GC buffers.",
        params: `{"deployment": "inventory-worker", "namespace": "default"}`,
        returns: `{"status": "Success", "restarted": true}`,
        safety: "Moderated",
        example: "kubectl rollout restart deployment/inventory-worker"
      },
      {
        name: "kubectl_rollout_undo",
        desc: "Rolls back deployment manifests to the previously stable revision history.",
        params: `{"deployment": "payments-api", "revision": 12, "namespace": "default"}`,
        returns: `{"status": "Success", "rolled_back": true, "target_revision": 12}`,
        safety: "Critical",
        example: "kubectl rollout undo deployment/payments-api --to-revision=12"
      },
      {
        name: "helm_rollback",
        desc: "Executes Helm chart rollback vectors to restore networking configuration structures.",
        params: `{"release": "orders-api", "revision": 3}`,
        returns: `{"status": "Success", "rolled_back": true, "revision_target": 3}`,
        safety: "Critical",
        example: "helm rollback orders-api 3"
      },
      {
        name: "systemctl_restart",
        desc: "Restarts target host systemd service daemons locally or on mapped remote VMs.",
        params: `{"service": "inventory-worker"}`,
        returns: `{"status": "Success", "restarted": true}`,
        safety: "Moderated",
        example: "systemctl restart inventory-worker"
      },
      {
        name: "query_runbook",
        desc: "Performs semantic lookup on localized SOP databases matching the error message.",
        params: `{"query": "checkout-api cpu spike", "limit": 2}`,
        returns: `[{"sop_id": "SOP-023", "relevance": 0.96, "content": "..."}]`,
        safety: "Safe",
        example: "Querying semantic Vector Database index"
      },
      {
        name: "query_incident_history",
        desc: "Queries the incident tracking database to match current failure profile fingerprints.",
        params: `{"fingerprint": "checkout-api_cpu_percent", "limit": 3}`,
        returns: `[{"id": 12, "title": "cpu_percent spiked", "recovery_action": "Scale"}]`,
        safety: "Safe",
        example: "Querying incidents database"
      },
      {
        name: "search_git_commits",
        desc: "Scans Git branch history logs to correlate recent commits with failure timestamps.",
        params: `{"repo_path": "/app/orders-api", "limit": 5}`,
        returns: `[{"sha": "a12d90", "author": "Alice", "message": "...", "date": "..."}]`,
        safety: "Safe",
        example: "git log -n 5 --oneline"
      },
      {
        name: "get_metrics",
        desc: "Pulls recent time-series telemetry snapshots for CPUs, memory, latencies, and errors.",
        params: `{"service_name": "payments-api", "metric_name": "error_rate_percent"}`,
        returns: `{"metric": "error_rate_percent", "values": [0.4, 0.8, 8.4]}`,
        safety: "Safe",
        example: "Pulls Prometheus Metrics"
      },
      {
        name: "validate_recovery",
        desc: "Triggers active SRE validation vectors post-remediation, querying endpoints.",
        params: `{"service_name": "checkout-api", "metric": "cpu", "threshold": 92}`,
        returns: `{"recovered": true, "current_value": 42.5}`,
        safety: "Safe",
        example: "Polled cart endpoint. CPU: 42.5%"
      },
      {
        name: "archive_report",
        desc: "Compiles incident timeline logs and ROI labor reports, saving them to S3 buckets.",
        params: `{"incident_id": 382, "bucket": "inframedic-artifacts"}`,
        returns: `{"archived": true, "path": "s3://inframedic-artifacts/incident_382.pdf"}`,
        safety: "Safe",
        example: "Export S3 Document report"
      }
    ];
  }, []);

  const filteredTools = useMemo(() => {
    return toolsData.filter(
      (t) =>
        t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
        t.desc.toLowerCase().includes(toolSearch.toLowerCase())
    );
  }, [toolSearch, toolsData]);

  // Documentation Search Heuristics
  const searchResults = useMemo(() => {
    if (!docsSearch.trim()) return [];
    const query = docsSearch.toLowerCase();
    const matches: Array<{ page: typeof docPage; sub?: string; title: string; desc: string }> = [];

    // Overview Match
    if ("overview getting started. What is InfraMedic?".toLowerCase().includes(query)) {
      matches.push({ page: "overview", title: "Documentation Overview", desc: "Intro to the InfraMedic platform, problem statement, and AI agency." });
    }
    // Architecture Match
    if ("architecture diagram flow langgraph".toLowerCase().includes(query)) {
      matches.push({ page: "architecture", title: "System Architecture", desc: "Pipeline flow architecture diagram and agent sequence." });
    }
    // Agents Match
    const agents = ["Monitoring Agent", "Change Intelligence Agent", "Diagnostic Agent", "Knowledge Agent", "Incident Time Machine", "Remediation Agent", "Validation Agent", "Communication Agent"];
    agents.forEach((a) => {
      if (a.toLowerCase().includes(query)) {
        matches.push({ page: "agents", sub: a, title: `SRE Agent Profile: ${a}`, desc: `Responsibilities, decision making schema, prompts, and tools for the ${a}.` });
      }
    });
    // Tools Match
    toolsData.forEach((t) => {
      if (t.name.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query)) {
        matches.push({ page: "tools", title: `Tool Directory: ${t.name}`, desc: t.desc });
      }
    });
    // Demo Match
    if ("demo setup docker simulator docker-compose swagger".toLowerCase().includes(query)) {
      matches.push({ page: "demo", title: "Demo Run Guide", desc: "How to launch local Docker clusters, mock environments, and run simulator APIs." });
    }

    return matches;
  }, [docsSearch, toolsData]);

  return (
    <div className="h-full flex flex-col md:flex-row min-w-0 bg-[#080d16] font-mono text-gray-200">
      
      {/* INTERNAL DOCS LEFT NAV */}
      <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-gray-800/80 bg-[#0b101d] flex flex-col p-4 select-none">
        
        {/* Search bar inside docs */}
        <div className="relative mb-4">
          <input
            type="text"
            value={docsSearch}
            onChange={(e) => {
              setDocsSearch(e.target.value);
              setDocsSearchOpen(true);
            }}
            placeholder="Search docs..."
            className="w-full rounded border border-gray-850 bg-gray-950 px-2.5 py-1.5 text-xs text-gray-200 focus:border-amber-500 outline-none pr-7"
          />
          {docsSearch ? (
            <button
              onClick={() => {
                setDocsSearch("");
                setDocsSearchOpen(false);
              }}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-300"
            >
              <X size={12} />
            </button>
          ) : (
            <Search size={12} className="absolute right-2.5 top-2.5 text-gray-600" />
          )}

          {/* Search suggestions dropdown */}
          {docsSearchOpen && docsSearch.trim() && (
            <div className="absolute left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-md shadow-2xl py-1.5 z-40 max-h-48 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="text-[10px] text-gray-500 px-3 py-1">No results found</div>
              ) : (
                searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setDocPage(res.page);
                      if (res.sub) setActiveAgentPage(res.sub);
                      setDocsSearch("");
                      setDocsSearchOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-800 text-[10px] text-gray-300 border-b border-gray-950/40 last:border-0 block"
                  >
                    <span className="font-bold text-gray-100 block">{res.title}</span>
                    <span className="text-[9px] text-gray-500 truncate block mt-0.5">{res.desc}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Links section */}
        <div className="space-y-4 text-xs">
          <div>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Getting Started</span>
            <div className="space-y-1">
              <button
                onClick={() => setDocPage("overview")}
                className={`w-full text-left px-2 py-1 rounded transition-colors ${
                  docPage === "overview" ? "bg-amber-500/10 text-amber-400 font-bold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setDocPage("provider_layer")}
                className={`w-full text-left px-2 py-1 rounded transition-colors ${
                  docPage === "provider_layer" ? "bg-amber-500/10 text-amber-400 font-bold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Cloud Provider Layer
              </button>
              <button
                onClick={() => setDocPage("monitoring_alerts")}
                className={`w-full text-left px-2 py-1 rounded transition-colors ${
                  docPage === "monitoring_alerts" ? "bg-amber-500/10 text-amber-400 font-bold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Monitoring & Alerts
              </button>
            </div>
          </div>

          <div>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Core Architecture</span>
            <div className="space-y-1">
              <button
                onClick={() => setDocPage("architecture")}
                className={`w-full text-left px-2 py-1 rounded transition-colors ${
                  docPage === "architecture" ? "bg-amber-500/10 text-amber-400 font-bold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Orchestrator Flow
              </button>
              <button
                onClick={() => setDocPage("workflow")}
                className={`w-full text-left px-2 py-1 rounded transition-colors ${
                  docPage === "workflow" ? "bg-amber-500/10 text-amber-400 font-bold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Interactive Timeline
              </button>
            </div>
          </div>

          <div>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Agent Specifications</span>
            <div className="space-y-1 pl-1 border-l border-gray-800">
              {[
                "Monitoring Agent",
                "Change Intelligence Agent",
                "Diagnostic Agent",
                "Knowledge Agent",
                "Incident Time Machine",
                "Remediation Agent",
                "Validation Agent",
                "Communication Agent"
              ].map((agent) => (
                <button
                  key={agent}
                  onClick={() => {
                    setDocPage("agents");
                    setActiveAgentPage(agent);
                  }}
                  className={`w-full text-left px-2 py-0.5 rounded transition-colors block truncate text-[11px] ${
                    docPage === "agents" && activeAgentPage === agent
                      ? "text-amber-400 font-bold"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {agent}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Reference</span>
            <div className="space-y-1">
              <button
                onClick={() => setDocPage("tools")}
                className={`w-full text-left px-2 py-1 rounded transition-colors ${
                  docPage === "tools" ? "bg-amber-500/10 text-amber-400 font-bold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Tool Directory
              </button>
              <button
                onClick={() => setDocPage("api")}
                className={`w-full text-left px-2 py-1 rounded transition-colors ${
                  docPage === "api" ? "bg-amber-500/10 text-amber-400 font-bold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                FastAPI Reference
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* DOCUMENTATION CONTENT BODY */}
      <main className="flex-grow p-4 sm:p-6 md:p-8 overflow-y-auto select-text scrollbar-thin">
        
        {/* Breadcrumb nav inside docs */}
        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-5 font-mono select-none">
          <span>Docs</span>
          <ChevronRight size={10} />
          <span className="text-gray-400 uppercase">{docPage}</span>
          {docPage === "agents" && (
            <>
              <ChevronRight size={10} />
              <span className="text-amber-500 font-semibold">{activeAgentPage}</span>
            </>
          )}
        </div>

        {/* PAGES */}

        {/* 1. OVERVIEW PAGE */}
        {docPage === "overview" && (
          <div className="space-y-6 max-w-3xl font-sans text-xs">
            <div className="border-b border-gray-800 pb-3">
              <h1 className="text-xl font-bold font-mono text-gray-100">Overview</h1>
              <p className="text-gray-500 mt-1 font-mono">Real-time SRE Incident Response Console.</p>
            </div>

            <section className="space-y-3">
              <h2 className="text-sm font-bold font-mono text-gray-200 border-l-2 border-amber-500 pl-2.5">
                What is InfraMedic?
              </h2>
              <p className="text-gray-300 leading-relaxed">
                InfraMedic is an autonomous agentic Site Reliability Engineering (SRE) platform that continuously monitors cloud resources, discovers configuration drifts, detects operational failures, and deploys fixes in under 60 seconds. By deploying a swarm of specialized subagents running on a LangGraph state machine, InfraMedic handles diagnostic logs correlation, SOP searches, and remediation validation.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold font-mono text-gray-200 border-l-2 border-amber-500 pl-2.5">
                Problem Statement
              </h2>
              <p className="text-gray-300 leading-relaxed">
                As containerized workloads scale, human operators encounter critical bottlenecks:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-400">
                <li>
                  <strong className="text-gray-300">Alert Fatigue:</strong> Engineers receive thousands of alerts daily across complex cloud services, making it difficult to distinguish false alarms from structural crashes.
                </li>
                <li>
                  <strong className="text-gray-300">Correlations Delay (High MTTR):</strong> Manually cross-referencing metrics spikes with Git commits, Kubernetes logs, and configuration changes takes hours of debugging.
                </li>
                <li>
                  <strong className="text-gray-300">Static Runbook Failure:</strong> Automated recovery scripts are static and fail when network conditions or parameters drift.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold font-mono text-gray-200 border-l-2 border-amber-500 pl-2.5">
                Why Agentic AI?
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Traditional automations lack adaptability. InfraMedic uses agentic AI to bridge this gap:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-400">
                <li>
                  <strong className="text-gray-300">Stochastic Reasoning:</strong> Agents inspect stack traces and configs like a senior engineer, extracting semantic issues.
                </li>
                <li>
                  <strong className="text-gray-300">Multi-Agent LangGraph Orchestration:</strong> Agents communicate asynchronously, passing state tokens (Drifts, Commits, SOP runs) down the pipeline.
                </li>
                <li>
                  <strong className="text-gray-300">Human-in-the-loop Guardrails:</strong> High-risk remediation scripts (e.g. database rollback, node scaling) halt automatically to request operator verification before execution.
                </li>
              </ul>
            </section>
          </div>
        )}

        {/* 2. CLOUD PROVIDER LAYER */}
        {docPage === "provider_layer" && (
          <div className="space-y-6 max-w-3xl font-sans text-xs">
            <div className="border-b border-gray-850 pb-3">
              <h1 className="text-xl font-bold font-mono text-gray-100">Cloud Provider Abstraction</h1>
              <p className="text-gray-500 mt-1 font-mono">The provider abstraction layer keeps the frontend cloud-agnostic.</p>
            </div>

            <section className="space-y-3">
              <h2 className="text-sm font-bold font-mono text-gray-200">The CloudProvider Interface</h2>
              <p className="text-gray-300 leading-relaxed">
                All cloud integrations inherit from a unified Python interface <code className="text-amber-400 font-mono">CloudProvider</code>. The system discovers resources and queries metrics using read-only APIs:
              </p>
              <CodeBlock
                code={`class CloudProvider(ABC):
    @abstractmethod
    def discover_compute(self, config: dict) -> list[dict]: ...
    @abstractmethod
    def discover_storage(self, config: dict) -> list[dict]: ...
    @abstractmethod
    def discover_databases(self, config: dict) -> list[dict]: ...
    @abstractmethod
    def discover_networks(self, config: dict) -> list[dict]: ...
    @abstractmethod
    def discover_functions(self, config: dict) -> list[dict]: ...
    @abstractmethod
    def discover_secrets(self, config: dict) -> list[dict]: ...
    @abstractmethod
    def discover_clusters(self, config: dict) -> list[dict]: ...
    @abstractmethod
    def discover_load_balancers(self, config: dict) -> list[dict]: ...`}
                language="python"
              />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 font-mono text-[11px]">
              <div className="border border-gray-800 rounded p-3 bg-gray-900/30">
                <span className="text-amber-400 font-bold block mb-1">Floci (Local Dev Cloud)</span>
                <p className="text-gray-400 font-sans">
                  LocalStack emulates AWS services. S3 buckets, EC2 virtual machines, and RDS databases are provisioned using sandbox boto3 calls. If Floci contains no resources, the platform renders a beautiful empty state.
                </p>
              </div>
              <div className="border border-gray-800 rounded p-3 bg-gray-900/30">
                <span className="text-sky-400 font-bold block mb-1">Production AWS Integration</span>
                <p className="text-gray-400 font-sans">
                  Queries active EKS, ECS, EC2 instances, RDS databases, Secrets Manager, and ELBs using boto3. Leverages least-privilege IAM policies to guarantee read-only monitoring.
                </p>
              </div>
              <div className="border border-gray-800 rounded p-3 bg-gray-900/30">
                <span className="text-indigo-400 font-bold block mb-1">Production Azure Integration</span>
                <p className="text-gray-400 font-sans">
                  Utilizes the Azure SDK to discover Virtual Machines, Azure Kubernetes Service (AKS), Blob Storage containers, Key Vaults, and Azure Monitor data.
                </p>
              </div>
              <div className="border border-gray-800 rounded p-3 bg-gray-900/30">
                <span className="text-emerald-400 font-bold block mb-1">Production GCP Integration</span>
                <p className="text-gray-400 font-sans">
                  Uses google-cloud client libraries to discover Compute Engine instances, GKE, Cloud Storage buckets, Cloud SQL, and Secret Manager values.
                </p>
              </div>
            </section>
          </div>
        )}

        {/* 2b. MONITORING & ALERTS */}
        {docPage === "monitoring_alerts" && (
          <div className="space-y-6 max-w-3xl font-sans text-xs">
            <div className="border-b border-gray-800 pb-3">
              <h1 className="text-xl font-bold font-mono text-gray-100">Monitoring & Incident Detection</h1>
              <p className="text-gray-500 mt-1 font-mono">Continuous metrics polling, logs anomaly discovery, and alerting thresholds.</p>
            </div>

            <section className="space-y-3">
              <h2 className="text-sm font-bold font-mono text-gray-200">Continuous Ingestion Loop</h2>
              <p className="text-gray-300 leading-relaxed">
                The InfraMedic backend runs a background daemon thread that polls performance counters every 3 seconds from discovered compute resources:
              </p>
              <ul className="list-disc pl-5 text-gray-400 space-y-1">
                <li><strong className="text-gray-300">CPU Usage:</strong> Percentage utilization of virtual cores (threshold: 92%).</li>
                <li><strong className="text-gray-300">Memory Working Set:</strong> RAM utilization (threshold: 94%).</li>
                <li><strong className="text-gray-300">Errors Rate:</strong> HTTP 5xx responses or container exception loop frequency (threshold: 8%).</li>
                <li><strong className="text-gray-300">Response Latency:</strong> Client roundtrip duration in ms (threshold: 1000ms).</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold font-mono text-gray-200">Incident Trigger Pipeline</h2>
              <Callout type="success" title="Telemetry Anomaly Detection">
                When a telemetry metric breaches the threshold limits on any active compute instance, the platform instantiates a real database incident ticket and immediately invokes the multi-agent diagnostic LangGraph.
              </Callout>
              <p className="text-gray-300 leading-relaxed">
                If the cloud environment contains no active resources, monitoring is paused, and the platform remains in a clean standby state. No mock incidents are generated unless the user triggers the sandbox provisioning.
              </p>
            </section>
          </div>
        )}

        {/* 3. CORE ARCHITECTURE */}
        {docPage === "architecture" && (
          <div className="space-y-6 max-w-3xl font-sans text-xs">
            <div className="border-b border-gray-800 pb-3">
              <h1 className="text-xl font-bold font-mono text-gray-100">Core Architecture</h1>
              <p className="text-gray-500 mt-1 font-mono"> LangGraph-driven multi-agent orchestration pipeline.</p>
            </div>

            <section className="space-y-3">
              <h2 className="text-sm font-bold font-mono text-gray-200 border-l-2 border-amber-500 pl-2.5">
                The Incident Response Pipeline
              </h2>
              <p className="text-gray-300 leading-relaxed">
                When an anomaly is ingested, the system initializes an execution graph where each node represents an autonomous SRE agent. State metadata (incident ID, current symptoms, traces) is passed sequentially from node to node:
              </p>

              {/* Responsive SVG flowchart representing Mermaid diagram */}
              <div className="bg-gray-950/60 border border-gray-850/80 rounded-lg p-5 flex items-center justify-center overflow-x-auto select-none my-5">
                <svg width="680" height="280" viewBox="0 0 680 280" className="w-full h-auto text-gray-300">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
                    </marker>
                  </defs>

                  {/* Nodes row 1 */}
                  <g className="nodes">
                    <rect x="20" y="20" width="120" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                    <text x="80" y="44" textAnchor="middle" className="fill-gray-200 text-[10px] font-mono font-bold">1. Monitoring</text>

                    <rect x="200" y="20" width="120" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                    <text x="260" y="44" textAnchor="middle" className="fill-gray-200 text-[10px] font-mono font-bold">2. Change Intel</text>

                    <rect x="380" y="20" width="120" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                    <text x="440" y="44" textAnchor="middle" className="fill-gray-200 text-[10px] font-mono font-bold">3. Diagnostics</text>

                    <rect x="540" y="20" width="120" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                    <text x="600" y="44" textAnchor="middle" className="fill-gray-200 text-[10px] font-mono font-bold">4. SOP Search</text>
                  </g>

                  {/* Connectors Row 1 */}
                  <path d="M 140,40 L 200,40" fill="none" stroke="#4b5563" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <path d="M 320,40 L 380,40" fill="none" stroke="#4b5563" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <path d="M 500,40 L 540,40" fill="none" stroke="#4b5563" strokeWidth="1.5" markerEnd="url(#arrow)" />

                  {/* Connectors wrapping down */}
                  <path d="M 600,60 L 600,120 L 540,120" fill="none" stroke="#4b5563" strokeWidth="1.5" markerEnd="url(#arrow)" />

                  {/* Nodes Row 2 */}
                  <g className="nodes">
                    <rect x="380" y="100" width="120" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                    <text x="440" y="124" textAnchor="middle" className="fill-gray-200 text-[10px] font-mono font-bold">5. Time Machine</text>

                    {/* Safety Gate logic box */}
                    <polygon points="200,120 260,100 320,120 260,140" fill="#1e293b" stroke="#b45309" strokeWidth="2" />
                    <text x="260" y="123" textAnchor="middle" className="fill-amber-400 text-[9px] font-mono font-bold">6. Safety</text>
                    <text x="260" y="132" textAnchor="middle" className="fill-amber-400 text-[8px] font-mono">Gate?</text>

                    <rect x="20" y="100" width="120" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                    <text x="80" y="124" textAnchor="middle" className="fill-gray-200 text-[10px] font-mono font-bold">7. Remediation</text>
                  </g>

                  {/* Connectors Row 2 */}
                  <path d="M 380,120 L 320,120" fill="none" stroke="#4b5563" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <path d="M 200,120 L 140,120" fill="none" stroke="#4b5563" strokeWidth="1.5" markerEnd="url(#arrow)" />

                  {/* Connector wrapping down */}
                  <path d="M 80,140 L 80,200 L 140,200" fill="none" stroke="#4b5563" strokeWidth="1.5" markerEnd="url(#arrow)" />

                  {/* Nodes Row 3 */}
                  <g className="nodes">
                    <rect x="140" y="180" width="120" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                    <text x="200" y="204" textAnchor="middle" className="fill-gray-200 text-[10px] font-mono font-bold">8. Validation</text>

                    <rect x="320" y="180" width="120" height="40" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                    <text x="380" y="204" textAnchor="middle" className="fill-gray-200 text-[10px] font-mono font-bold">9. Stakeholders</text>
                  </g>

                  {/* Connector Row 3 */}
                  <path d="M 260,200 L 320,200" fill="none" stroke="#4b5563" strokeWidth="1.5" markerEnd="url(#arrow)" />

                  {/* Legends */}
                  <circle cx="500" cy="220" r="5" fill="#b45309" />
                  <text x="515" y="223" className="fill-gray-400 text-[10px]">Manual Operator Approval Gate</text>
                </svg>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold font-mono text-gray-200">The State Ledger</h2>
              <p className="text-gray-300 leading-relaxed font-sans">
                As the pipeline runs, the SRE platform commits metadata to the PostgreSQL schema. Subagents fetch and update fields such as:
              </p>
              <CodeBlock
                code={`{
  "id": 382,
  "service_name": "checkout-api",
  "status": "resolving",
  "risk_score": 75.0,
  "requires_approval": true,
  "approval_status": "pending",
  "change_intelligence_json": "...",
  "time_machine_json": "..."
}`}
                language="json"
              />
            </section>
          </div>
        )}

        {/* 4. SRE AGENTS PAGES */}
        {docPage === "agents" && (
          <div className="space-y-6 max-w-3xl font-sans text-xs animate-fade-in">
            <div className="border-b border-gray-800 pb-3 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold font-mono text-gray-100">{activeAgentPage}</h1>
                <p className="text-gray-500 mt-1 font-mono">Agent Specification and prompt parameters.</p>
              </div>
              <span className="text-[10px] font-mono bg-sky-950/20 border border-sky-900 text-sky-400 px-2 py-0.5 rounded">
                Accuracy Level: {activeAgentPage.includes("Validation") || activeAgentPage.includes("Guardrails") ? "99%" : "95%"}
              </span>
            </div>

            {/* MONITORING AGENT PROFILE */}
            {activeAgentPage === "Monitoring Agent" && (
              <div className="space-y-5">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Purpose</span>
                  <p className="text-gray-300 leading-relaxed">
                    Evaluates incoming telemetry metrics data logs from monitored Kubernetes clusters and systemd hosts. Triggers alert signals when metrics cross statistical limits.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-800 py-3 font-mono text-[10px]">
                  <div>
                    <span className="text-gray-500 block uppercase">Inputs</span>
                    <span className="text-gray-300 font-semibold">MetricSnapshot (JSON)</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase">Outputs</span>
                    <span className="text-gray-300 font-semibold">Incident Ticket instantiation</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Decision Making Schema</span>
                  <p className="text-gray-300 leading-relaxed">
                    Analyzes CPU percentages, heap memory working sets, API error rates, and response latency. Creates incidents tickets for any metrics breaching limits (e.g. CPU &gt; 92%).
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">System Prompt Used</span>
                  <CodeBlock
                    code="You are the InfraMedic Monitoring Agent. Analyze streaming metrics from Prometheus. If a metric breaches threshold limits, generate an incident ticket containing target service, breach value, and severity."
                    language="text"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Tools Available</span>
                  <div className="flex gap-2 font-mono">
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">get_metrics</span>
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">create_incident</span>
                  </div>
                </div>
              </div>
            )}

            {/* CHANGE INTEL AGENT PROFILE */}
            {activeAgentPage === "Change Intelligence Agent" && (
              <div className="space-y-5">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Purpose</span>
                  <p className="text-gray-300 leading-relaxed">
                    Scans Git commits history, CI/CD releases, and environment config maps to find config drift or files changed that match the anomaly timestamp.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-800 py-3 font-mono text-[10px]">
                  <div>
                    <span className="text-gray-500 block uppercase">Inputs</span>
                    <span className="text-gray-300 font-semibold">Incident details, Git log history</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase">Outputs</span>
                    <span className="text-gray-300 font-semibold">Drift correlations list (JSON)</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Decision Making Schema</span>
                  <p className="text-gray-300 leading-relaxed">
                    Compares configuration timestamps. If an environment variable key (e.g. `CACHE_TTL_SECONDS`) was modified recently, marks it as high probability correlation.
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">System Prompt Used</span>
                  <CodeBlock
                    code="You are the Change Intelligence Agent. Analyze Git branches and environment configuration variables. Identify configurations changed in the last 24h that correlate with the incident service."
                    language="text"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Tools Available</span>
                  <div className="flex gap-2 font-mono">
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">search_git_commits</span>
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">inspect_config_drift</span>
                  </div>
                </div>
              </div>
            )}

            {/* DIAGNOSTIC AGENT PROFILE */}
            {activeAgentPage === "Diagnostic Agent" && (
              <div className="space-y-5">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Purpose</span>
                  <p className="text-gray-300 leading-relaxed">
                    Performs automated root cause analysis (RCA) by parsing stack traces, stdout logs, and thread locks.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-800 py-3 font-mono text-[10px]">
                  <div>
                    <span className="text-gray-500 block uppercase">Inputs</span>
                    <span className="text-gray-300 font-semibold">Service log buffer lines</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase">Outputs</span>
                    <span className="text-gray-300 font-semibold">RCA isolation diagnostic text</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Decision Making Schema</span>
                  <p className="text-gray-300 leading-relaxed">
                    Executes regex scans on container logs. Isolates stack traces containing database timeouts, JVM memory heap leakage errors, or thread locks.
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">System Prompt Used</span>
                  <CodeBlock
                    code="You are the Diagnostic Agent. Inspect service container logs and isolate trace exceptions. Identify the exact root cause, stacktrace, and file where the deadlock or leakage exists."
                    language="text"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Tools Available</span>
                  <div className="flex gap-2 font-mono">
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">fetch_container_logs</span>
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">query_database_status</span>
                  </div>
                </div>
              </div>
            )}

            {/* KNOWLEDGE AGENT PROFILE */}
            {activeAgentPage === "Knowledge Agent" && (
              <div className="space-y-5">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Purpose</span>
                  <p className="text-gray-300 leading-relaxed">
                    Retrieves relevant SOP (Standard Operating Procedure) runbooks matching the isolated diagnostic RCA.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-800 py-3 font-mono text-[10px]">
                  <div>
                    <span className="text-gray-500 block uppercase">Inputs</span>
                    <span className="text-gray-300 font-semibold">RCA diagnostics text</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase">Outputs</span>
                    <span className="text-gray-300 font-semibold">Matching SOP runbook details</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Decision Making Schema</span>
                  <p className="text-gray-300 leading-relaxed">
                    Queries local Vector index databases using semantic similarity embeddings. Matches the error symptoms with SOP titles.
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">System Prompt Used</span>
                  <CodeBlock
                    code="You are the Knowledge Agent. Perform semantic search queries on SRE SOP documents index. Retrieve the recovery runbook details that match the diagnostic RCA report."
                    language="text"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Tools Available</span>
                  <div className="flex gap-2 font-mono">
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">query_runbook</span>
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">fetch_sop_document</span>
                  </div>
                </div>
              </div>
            )}

            {/* INCIDENT TIME MACHINE */}
            {activeAgentPage === "Incident Time Machine" && (
              <div className="space-y-5">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Purpose</span>
                  <p className="text-gray-300 leading-relaxed">
                    Matches current alert profiles against historical SRE incident tables and ranks successful remediation actions.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-800 py-3 font-mono text-[10px]">
                  <div>
                    <span className="text-gray-500 block uppercase">Inputs</span>
                    <span className="text-gray-300 font-semibold">RCA, service details</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase">Outputs</span>
                    <span className="text-gray-300 font-semibold">Remediation ranking lists (JSON)</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Decision Making Schema</span>
                  <p className="text-gray-300 leading-relaxed">
                    Calculates similarity scores with past tickets. Ranks resolution commands based on historical recovery success records.
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">System Prompt Used</span>
                  <CodeBlock
                    code="You are the SRE Incident Time Machine. Query previous tickets matching the failure fingerprint. Rank the resolution actions by success rate percentage and MTTR speed."
                    language="text"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Tools Available</span>
                  <div className="flex gap-2 font-mono">
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">query_incident_history</span>
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">calculate_remediation_risk</span>
                  </div>
                </div>
              </div>
            )}

            {/* REMEDIATION AGENT PROFILE */}
            {activeAgentPage === "Remediation Agent" && (
              <div className="space-y-5">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Purpose</span>
                  <p className="text-gray-300 leading-relaxed">
                    Dispatches recovery commands (restarts, scalings, rollbacks) to the cluster via secure API tokens.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-800 py-3 font-mono text-[10px]">
                  <div>
                    <span className="text-gray-500 block uppercase">Inputs</span>
                    <span className="text-gray-300 font-semibold">Approved SRE command string</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase">Outputs</span>
                    <span className="text-gray-300 font-semibold">CLI process logs, status codes</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Decision Making Schema</span>
                  <p className="text-gray-300 leading-relaxed">
                    Selects target CLI executable (kubectl, helm, systemctl) and generates options matching the environment specifications.
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">System Prompt Used</span>
                  <CodeBlock
                    code="You are the Remediation Agent. Construct and run SRE commands to mitigate the incident. Verify exit codes. Halt and report errors if a command fails."
                    language="text"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Tools Available</span>
                  <div className="flex gap-2 font-mono flex-wrap">
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">kubectl_scale</span>
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">kubectl_rollout_undo</span>
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">helm_rollback</span>
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">systemctl_restart</span>
                  </div>
                </div>
              </div>
            )}

            {/* VALIDATION AGENT PROFILE */}
            {activeAgentPage === "Validation Agent" && (
              <div className="space-y-5">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Purpose</span>
                  <p className="text-gray-300 leading-relaxed">
                    Asserts service recovery. Polls telemetry endpoints for 60 seconds post-remediation to verify values stabilize below thresholds.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-800 py-3 font-mono text-[10px]">
                  <div>
                    <span className="text-gray-500 block uppercase">Inputs</span>
                    <span className="text-gray-300 font-semibold">Service endpoint, threshold configuration</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase">Outputs</span>
                    <span className="text-gray-300 font-semibold">Validation status (bool, value)</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Decision Making Schema</span>
                  <p className="text-gray-300 leading-relaxed">
                    Checks health status codes. If metrics remain high (e.g. CPU remains at 96%), marks validation as failed and raises alerts.
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">System Prompt Used</span>
                  <CodeBlock
                    code="You are the Validation Agent. Verify service recovery. Poll health endpoints and metric timelines. Confirm the anomaly has cleared and system has normalized."
                    language="text"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Tools Available</span>
                  <div className="flex gap-2 font-mono">
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">validate_recovery</span>
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">poll_healthcheck_status</span>
                  </div>
                </div>
              </div>
            )}

            {/* COMMUNICATION AGENT PROFILE */}
            {activeAgentPage === "Communication Agent" && (
              <div className="space-y-5">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Purpose</span>
                  <p className="text-gray-300 leading-relaxed">
                    Compiles summaries customized for SRE Engineers (technical traces), IT Managers (general timeline), and Executives (ROI savings).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-800 py-3 font-mono text-[10px]">
                  <div>
                    <span className="text-gray-500 block uppercase">Inputs</span>
                    <span className="text-gray-300 font-semibold">Incident transaction timeline logs</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase">Outputs</span>
                    <span className="text-gray-300 font-semibold">Stakeholders reports document text</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Decision Making Schema</span>
                  <p className="text-gray-300 leading-relaxed">
                    Aggregates telemetry, git diffs, CLI executions, and verification results into three distinct structured text segments.
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">System Prompt Used</span>
                  <CodeBlock
                    code="You are the Communication Agent. Review incident traces. Generate three summaries: 1. ENGINEER (CLI details) 2. MANAGER (Mitigation details) 3. EXECUTIVE (labor and revenue ROI saved)."
                    language="text"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1 font-mono">Tools Available</span>
                  <div className="flex gap-2 font-mono">
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">archive_report</span>
                    <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">calculate_roi_impact</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. API REFERENCE */}
        {docPage === "api" && (
          <div className="space-y-6 max-w-3xl font-sans text-xs">
            <div className="border-b border-gray-800 pb-3">
              <h1 className="text-xl font-bold font-mono text-gray-100">API Reference</h1>
              <p className="text-gray-500 mt-1 font-mono">InfraMedic FastAPI backend endpoint documentation.</p>
            </div>

            <section className="space-y-4">
              <p className="text-gray-300 leading-relaxed font-sans">
                Below are the OpenAPI endpoint routes served by the FastAPI web service:
              </p>

              {/* API 1: GET /api/incidents */}
              <div className="border border-gray-850 rounded-lg p-4 bg-gray-950/40 space-y-3 font-mono">
                <div className="flex items-center gap-3">
                  <span className="bg-sky-950 text-sky-400 font-bold px-2 py-0.5 rounded text-[10px] border border-sky-900">GET</span>
                  <span className="text-xs font-bold text-gray-200">/api/incidents</span>
                </div>
                <p className="text-gray-400 font-sans">Get list of active/resolved incident tickets.</p>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 block">Response (200 OK)</span>
                  <CodeBlock
                    code={`[
  {
    "id": 12,
    "title": "High cpu percent detected on checkout-api",
    "status": "resolving",
    "service_name": "checkout-api",
    "metric_name": "cpu_percent",
    "metric_value": 95.4
  }
]`}
                    language="json"
                  />
                </div>
              </div>

              {/* API 2: GET /api/incidents/{id} */}
              <div className="border border-gray-850 rounded-lg p-4 bg-gray-950/40 space-y-3 font-mono">
                <div className="flex items-center gap-3">
                  <span className="bg-sky-950 text-sky-400 font-bold px-2 py-0.5 rounded text-[10px] border border-sky-900">GET</span>
                  <span className="text-xs font-bold text-gray-200">/api/incidents/&#123;id&#125;</span>
                </div>
                <p className="text-gray-400 font-sans">Get detailed steps, logs and state of a specific incident.</p>
              </div>

              {/* API 3: POST /api/incidents/{id}/approve */}
              <div className="border border-gray-850 rounded-lg p-4 bg-gray-950/40 space-y-3 font-mono">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-950 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-900">POST</span>
                  <span className="text-xs font-bold text-gray-200">/api/incidents/&#123;id&#125;/approve</span>
                </div>
                <p className="text-gray-400 font-sans">Approve high-risk remediation actions (Human-in-the-loop Gate).</p>
              </div>

              {/* API 4: GET /api/monitoring/telemetry */}
              <div className="border border-gray-850 rounded-lg p-4 bg-gray-950/40 space-y-3 font-mono">
                <div className="flex items-center gap-3">
                  <span className="bg-sky-950 text-sky-400 font-bold px-2 py-0.5 rounded text-[10px] border border-sky-900">GET</span>
                  <span className="text-xs font-bold text-gray-200">/api/monitoring/telemetry</span>
                </div>
                <p className="text-gray-400 font-sans">Retrieve dynamic, real-time historical metrics for dashboard telemetry charts.</p>
              </div>

              {/* API 5: GET /api/resources */}
              <div className="border border-gray-850 rounded-lg p-4 bg-gray-950/40 space-y-3 font-mono">
                <div className="flex items-center gap-3">
                  <span className="bg-sky-950 text-sky-400 font-bold px-2 py-0.5 rounded text-[10px] border border-sky-900">GET</span>
                  <span className="text-xs font-bold text-gray-200">/api/resources</span>
                </div>
                <p className="text-gray-400 font-sans">Scan and return discovered compute instances, S3 storage, databases, networks, and secrets from active provider.</p>
              </div>

              {/* API 6: POST /api/resources/provision */}
              <div className="border border-gray-850 rounded-lg p-4 bg-gray-950/40 space-y-3 font-mono">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-950 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-900">POST</span>
                  <span className="text-xs font-bold text-gray-200">/api/resources/provision</span>
                </div>
                <p className="text-gray-400 font-sans">Provision actual test sandbox clusters directly in LocalStack/Floci (Demo Mode).</p>
              </div>

              {/* API 7: POST /api/resources/teardown */}
              <div className="border border-gray-850 rounded-lg p-4 bg-gray-950/40 space-y-3 font-mono">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-950 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-900">POST</span>
                  <span className="text-xs font-bold text-gray-200">/api/resources/teardown</span>
                </div>
                <p className="text-gray-400 font-sans">Tear down provisioned resources and purge discovery DB cache.</p>
              </div>

              {/* API 8: WS /ws/incidents/{id} */}
              <div className="border border-gray-850 rounded-lg p-4 bg-gray-950/40 space-y-3 font-mono">
                <div className="flex items-center gap-3">
                  <span className="bg-purple-950 text-purple-400 font-bold px-2 py-0.5 rounded text-[10px] border border-purple-900">WS</span>
                  <span className="text-xs font-bold text-gray-200">/ws/incidents/&#123;id&#125;</span>
                </div>
                <p className="text-gray-400 font-sans">WebSocket endpoint streaming live multi-agent workflow nodes execution traces.</p>
              </div>
            </section>

          </div>
        )}

      </main>

    </div>
  );
}
