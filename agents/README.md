# Agents

The production agent implementations live in `backend/app/agents` so they can share the FastAPI runtime, database session, Redis client, and service layer.

Phase 1 implements the Monitoring Agent. The remaining agents are represented in the backend orchestration types and will be expanded in later phases according to `AGENTS.md`.
