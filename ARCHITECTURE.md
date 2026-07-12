# InfraMedic System Architecture Overview

InfraMedic is an autonomous Site Reliability Engineering (SRE) platform built to automatically discover infrastructure resources, monitor health indicators, diagnose incidents, and execute remediations.

---

## 🏗️ System Components

The InfraMedic stack is modular, combining an agentic engine with a modern SRE dashboard.

```
                  ┌────────────────────────────────────────┐
                  │            React Frontend              │
                  │   (Vite, TypeScript, Tailwind CSS)     │
                  └───────────────────▲────────────────────┘
                                      │ (WebSockets & REST)
                                      ▼
                  ┌────────────────────────────────────────┐
                  │            FastAPI Backend             │
                  │        (Uvicorn, Python Runtime)       │
                  └──────▲────────────────────────▲────────┘
                         │                        │
        ┌────────────────▼───────────┐  ┌─────────▼─────────────────┐
        │  Relational Database Cache │  │  Multi-Agent orchestrator │
        │     (PostgreSQL/SQLite)    │  │        (LangGraph)        │
        └────────────────────────────┘  └───────────────────────────┘
                                                      │ (SSM/SSH/API APIs)
                                                      ▼
                  ┌────────────────────────────────────────┐
                  │           Cloud Infrastructure         │
                  │  (Local Dev via Floci OR Real AWS/etc) │
                  └────────────────────────────────────────┘
```

### 1. Frontend
*   **React (Vite, TypeScript)**: Single-page application rendering the real-time SRE telemetry dashboard, incident timeline traces, S3 storage browser, EC2 computing registry, and connections page.
*   **Vanilla CSS + Tailwind**: Provides high-performance, polished dark/light themes and custom transition animations.

### 2. Backend API
*   **FastAPI**: Serves endpoints for telemetry retrieval, settings management, cloud resource discovery syncs, and WebSocket event streams.
*   **Uvicorn**: Lightweight ASGI web server.

### 3. Database Layer
*   **SQLAlchemy ORM**: Interfaces with the persistent data engine.
*   **PostgreSQL**: Default production database.
*   **SQLite**: Seamless local developer fallback database (`inframedic.db`).

### 4. Local Cloud Simulator (Floci)
Instead of relying on heavy cloud accounts during local development and demos, InfraMedic integrates with **Floci** for mock AWS services:
*   **EC2 Compute**: Mock virtual machines (checkout-api, orders-api, payments-api, etc.).
*   **S3 Storage**: Bucket simulation (`inframedic-artifacts`).
*   **RDS Databases**: PostgreSQL instance mock (`inframedic-postgres`).
*   **Secrets Manager**: Secure credential storage simulation.

---

## 🛠️ Local Developer Setup

To set up and run the local simulated developer environment:

### 1. Start the Local Cloud (Floci)
```powershell
# Install Floci
irm https://floci.io/install.ps1 | iex

# Start the services
floci start

# Configure environment variables
floci env | Invoke-Expression
```

### 2. Launch Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Launch Frontend
```bash
cd frontend
npm install
npm run dev
```
The console will be accessible at [http://localhost:5173](http://localhost:5173).
