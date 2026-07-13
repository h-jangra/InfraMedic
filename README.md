# InfraMedic AI

> **Autonomous Enterprise Reliability & SRE Platform**

InfraMedic is an autonomous, swarming multi-agent platform designed to monitor, diagnose, and remediate cloud infrastructure incidents in under 60 seconds. By combining a **LangGraph** orchestrator with real-time telemetry analysis, Standard Operating Procedure (SOP) playbooks search, and SSH/SSM execution hooks, InfraMedic acts as a digital SRE teammate for your cloud platforms.

---
## Demo Video
[![Watch the demo](https://img.youtube.com/vi/z2gQHruJPGM/maxresdefault.jpg)](https://youtu.be/z2gQHruJ)

---

## 🚀 Key Features

*   **Swarming Multi-Agent System**: Utilizes 8 cooperative agents (Monitoring, Change Intelligence, Diagnostic, Knowledge, Incident Time Machine, Remediation, Validation, and Communication) to resolve incidents.
*   **AWS EC2 & Kubernetes Support**: Automatically discovers instances, RDS databases, S3 buckets, and Lambda functions. Features active remediation via AWS SSM Run Command and SSH remote execution.
*   **Local Developer Cloud (Floci)**: Out-of-the-box local cloud integration using Floci to simulate EC2 instances, RDS Postgres databases, S3 storage, and Secrets Manager.
*   **Human-In-The-Loop Safety Gate**: Automatically halts high-risk remediations (risk > 60%) to request operator approvals before executing infrastructure rollouts.
*   **Stakeholder Post-Mortems**: Automatically generates tailored summaries for Engineers, Managers, and Executives upon incident resolution.
*   **Real-time Event Streaming**: Pushes detailed agent reasoning logs and execution metrics to the UI console using WebSockets.

---

## 📂 Project Structure

```
infraMedic/
├── frontend/         # React SPA (TypeScript, Vite, Tailwind CSS)
├── backend/          # FastAPI REST & WebSocket Server (Python, LangGraph)
├── database/         # Database initialization and mock migrations
├── docs/             # Cloud platform deployment credentials guides
├── simulator/        # Anomaly and workload simulator scripts
├── docker/           # Devops deployment files
└── docker-compose.yml
```

---

## 🤖 Swarming Agents Workflow

```
Monitoring Agent ➔ Change Intelligence ➔ Diagnostic Agent ➔ Knowledge Agent ➔ Incident Time Machine ➔ Remediation Agent ➔ Validation Agent ➔ Communication Agent
```

1.  **Monitoring**: Detects telemetry threshold breaches (CPU, Memory, Latency, Error rates).
2.  **Change Intelligence**: Scans Git repository commits and deployment logs to find configuration changes.
3.  **Diagnostic**: Analyzes stdout/stderr container logs to isolate failure traces.
4.  **Knowledge**: Fetches SRE SOP playbooks using semantic similarity search.
5.  **Incident Time Machine**: Finds similar past incidents and rates remediation success factors.
6.  **Remediation**: Executes recovery scripts (rebooting VM, scaling replicas, rolling back Git commits, or SSM pkill commands).
7.  **Validation**: Monitors metrics to confirm the services recover.
8.  **Communication**: Publishes post-mortem summaries for engineers, managers, and executives.

---

## 🛠️ Quick Start

To launch the full stack locally:

### 1. Pre-requisites (Floci Local Cloud)
```powershell
# Install Floci
irm https://floci.io/install.ps1 | iex
floci start
floci env | Invoke-Expression
```

### 2. Startup Stack (Docker Compose)
Launch the Postgres, Redis, backend, and frontend containers:
```bash
docker-compose up --build
```
Open [http://localhost:5173](http://localhost:5173) in your browser to access the console.

---

## 📖 Technical Documentation

*   [System Architecture Overview](ARCHITECTURE.md)
*   [Technical & Database Specifications](ARCHITECT.md)
*   [Incident Simulation & Demo Guide](DEMO.md)
*   [Development Tasks Registry](TASKS.md)
*   [Agent Profiles & Prompts Specification](AGENTS.md)
