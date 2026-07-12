# InfraMedic Platform Demonstration Guide

This guide describes how to run an end-to-end demo of the **InfraMedic Autonomous SRE Platform**, demonstrating how the multi-agent swarm detects, diagnoses, and automatically resolves a high-CPU incident in under 60 seconds.

---

## 💻 Demo Scenario

We will simulate a high CPU load anomaly on `checkout-api` (an EC2/ECS microservice). InfraMedic will:
1.  Detect the CPU spike via the telemetry daemon.
2.  Correlate it with recent configuration changes (Git commits).
3.  Diagnose a thread pool bottleneck from log files.
4.  Perform semantic lookup to identify standard playbooks (`SOP-023: High CPU in API Gateway`).
5.  Search historical incident databases to evaluate the best remediation (horizontal scaling).
6.  Scale the deployment replicas or issue host-level `pkill` commands (depending on provider settings).
7.  Validate metric recovery.
8.  Draft executive and engineering post-mortems.

---

## 🏃 Walkthrough Steps

### Step 1: Provision Demo Infrastructure
1.  Navigate to the **EC2 Compute** view on the sidebar console.
2.  Click **Provision Demo Infrastructure**.
3.  InfraMedic will call local Floci APIs using `boto3` to provision:
    *   4 simulated microservices as EC2 instances (`checkout-api`, `inventory-worker`, `payments-api`, `orders-api`).
    *   An S3 artifacts bucket (`inframedic-artifacts`).
    *   A RDS Postgres instance (`inframedic-postgres`).
    *   A Secrets Manager secret (`inframedic-secret`).
4.  Wait for the resources registry to populate with green "Running" statuses.

### Step 2: Trigger An Anomaly Simulation
1.  On the **Console Home** dashboard, locate the **Incident Simulator** card.
2.  Click **Simulate High CPU Anomaly (checkout-api)**.
3.  The simulator will spike the CPU metric of the `checkout-api` instance to over 95%.

### Step 3: Observe the Autonomous Agent Trace
1.  Within 3 seconds, the telemetry daemon will detect the threshold breach (>92% CPU) and raise a critical incident ticket.
2.  The dashboard will automatically switch to the **Incidents & Trace** panel for the active ticket.
3.  Observe the live-updating agent timeline:
    *   **Monitoring Agent**: Identifies the threshold breach.
    *   **Change Intelligence Agent**: Discovers a recent Git commit modifying TTL cache configurations.
    *   **Diagnostic Agent**: Streams container logs and isolates a connection thread bottleneck.
    *   **Knowledge Agent**: Locates `SOP-023` playbooks suggesting horizontal scaling.
    *   **Incident Time Machine Agent**: Analyzes history and scores horizontal scaling with an 88% recovery rate.
    *   **Remediation Agent**: Deploys `kubectl scale deployment checkout-api --replicas=4` (or host pkill commands if targeting real AWS credentials).
    *   **Validation Agent**: Confirms CPU metrics drop back to 20-35%.
    *   **Communication Agent**: Resolves the ticket and outputs post-mortems.

### Step 4: Review Post-Mortem Outputs
Scroll to the bottom of the active incident pane to review the AI-generated summaries:
*   **Engineer Summary**: Full stack trace details and CLI commands executed.
*   **Manager Summary**: SLO impact figures and recovery times (MTTR under 10s).
*   **Executive Summary**: Hours saved and ROI financial summaries.
