# Architecture

## Frontend
- React
- TypeScript
- Vite
- Tailwind
- shadcn/ui

## Backend
- FastAPI
- Python

## Database
- PostgreSQL

## Cache
- Redis

## Storage
- Floci S3

## Local Cloud
Use Floci instead of LocalStack.

Install:

```powershell
irm https://floci.io/install.ps1 | iex
floci start
floci env | Invoke-Expression
Project Structure

infraMedic/
├── frontend/
├── backend/
├── agents/
├── services/
├── simulator/
├── database/
├── infrastructure/
├── docs/
├── scripts/
└── docker/
