# 🩺 InfraMedic AI: Hackathon Demo Video Script

**Format:** Multi-Agent SRE Platform Hackathon Pitch & Demo  
**Target Duration:** ~3 Minutes  
**Main Theme:** How InfraMedic AI acts as an autonomous digital SRE teammate, detecting, diagnosing, and remediating infrastructure incidents in under 60 seconds with strict safety guardrails.

---

## 📽️ Scene-by-Scene Script

| Timestamp | Visual on Screen | Voiceover (Audio Script) |
| :--- | :--- | :--- |
| **0:00 - 0:25** | **Intro & Architecture Overview**<br>- Show the host speaking or a sleek title screen: **InfraMedic AI**.<br>- Transition to the **InfraMedic SRE Dashboard** showing running microservices (`checkout-api`, `inventory-worker`, etc.) and system stats.<br>- Highlight the 8 swarming agents schema or runbooks view. | *"Hey everyone! Meet **InfraMedic AI**, an autonomous, swarming multi-agent platform designed to act as your digital SRE teammate. Unlike traditional alerts that leave you digging through logs, InfraMedic uses a cooperative 8-agent swarm built on LangGraph to detect, diagnose, and remediate cloud incidents in under 60 seconds. Let's see it in action on a live production environment."* |
| **0:25 - 1:20** | **Demo Part 1: High CPU Anomaly on EC2 via SSH**<br>- Show terminal. Host runs:<br>`ssh -i aws-key.pem ubuntu@<ec2-ip>`<br>`sudo apt-get install -y stress`<br>`stress --cpu 4 --timeout 60s`<br>- Switch to the InfraMedic Dashboard.<br>- Show CPU metric graph of `checkout-api` rising to 100%.<br>- Show the live agent trace timeline as it updates in real time: Monitoring ➔ Diagnostic ➔ Remediation ➔ Validation. | *"First, we'll simulate a real-world server crash. I'll SSH into a fresh EC2 host representing our `checkout-api` microservice and run `stress` to force the CPU to 100%.*<br><br>*Almost instantly, our telemetry daemon detects the threshold breach. The **Monitoring Agent** automatically spawns the SRE swarm. The **Diagnostic Agent** analyzes logs, while the **Remediation Agent** executes a remote SSH pkill command directly on the host to kill the rogue stress process. The **Validation Agent** confirms the CPU drops back to 25%, resolving the incident with zero human effort!"* |
| **1:20 - 2:30** | **Demo Part 2: Human-in-the-Loop Safety Gate**<br>- On the dashboard, click **"Simulate Deployment Failure"** on the `orders-api` or `payments-api`.<br>- Show the live swarm timeline stream reasoning logs.<br>- Highlight the **Safety Guardrails Agent** halting at 75% or 85% risk score.<br>- Show the yellow alert block: **"Human Verification Gate Halted"** and the proposed command `$ kubectl rollout undo deployment/...`.<br>- Click the dark button: **"Authorize & Rollout"**.<br>- Watch the timeline resume and complete with green checkmarks. | *"But what about risky actions like database rollbacks or deployment configuration reverts? InfraMedic has built-in safety guardrails. Let's trigger a 'Deployment Failure' simulation on our critical payments API.*<br><br>*The **Change Intelligence Agent** immediately correlates the failure with a bad Git commit deployment. However, because a rollback carries a high risk score, the **Safety Guardrails Agent** halts execution and waits for operator authorization.*<br><br>*As an operator, I can review the proposed command, and with one click of **'Authorize & Rollout'**, InfraMedic safely reverts the deployment, verifies recovery, and closes the loop."* |
| **2:30 - 2:50** | **Post-Mortem & Summaries**<br>- Select the resolved incident, click the **"Reports"** tab.<br>- Toggle through **Engineer**, **Manager**, and **Executive** summaries.<br>- Highlight metrics: MTTR under 10 seconds, hours saved, and financial ROI impact. | *"Once resolved, the **Communication Agent** drafts tailored post-mortems: a technical summary with diffs for engineers, a metrics summary for managers, and an ROI-focused impact summary for executives. This eliminates hours of manual write-ups."* |
| **2:50 - 3:00** | **Conclusion & Outro**<br>- Show GitHub repository link or a call to action.<br>- Fade to black. | *"InfraMedic AI gives you a 24/7 autonomous SRE team that keeps your systems healthy, follows your exact playbooks, and respects your safety guardrails. Thanks for watching, and let's build more reliable systems together!"* |

---

## 🛠️ Prep checklist for a Flawless Demo

1. **Terminal Setup:**
   - Keep a terminal window open with the SSH connection ready:
     ```bash
     ssh -i backend/aws-infra-ai-key.pem ubuntu@<INSTANCE_PUBLIC_IP>
     ```
   - Ensure the `stress` package is installed or run the setup command before recording.

2. **Dashboard Setup:**
   - Run `docker-compose up --build` or start the local FastAPI/React dev server.
   - Navigate to `http://localhost:5173`.
   - Click the **Clear Incidents** button (trash icon or endpoint) to ensure a clean state before starting the recording.

3. **Deployment Failure Simulator:**
   - Use the **Deployment Failure** simulation card directly on the home screen to trigger the payments-api or orders-api incident, showing the Human-In-The-Loop gate.
