# Atlas Dashboard

A full-stack SRE/operations dashboard for monitoring and managing multi-region AWS
infrastructure from a single pane of glass. Built to replace scattered manual checks
across the AWS console, CLI, and spreadsheets with one real-time, role-based web app.

**🔗 [Live demo](https://ashankaushanka96.github.io/operations-dashboard/)** — a
static build running entirely on mock data (no backend/AWS account behind it), so
you can click through every section without any setup.

## Overview

Atlas Dashboard gives an SRE/ops team live visibility into EC2 fleets, managed AWS
services, DNS failover, and the internal "watcher" agents deployed on each host —
plus the ability to act on what they see (start/stop instances, run scheduled
lambdas, restart components) without leaving the browser.

**Highlights:**

- **Multi-service AWS visibility** — EC2, ECS, EKS, Lambda, MSK, ElastiCache, Load
  Balancers, and Route 53 failover/health status, aggregated across regions.
- **Host & component tracking** — a lightweight "watcher" model reports server
  inventory, compliance status (via SSM + Inspector findings), and per-host
  component/process state, visualized as an interactive component tree.
- **EC2 scheduling** — tag-driven start/stop schedules with a weekly calendar view,
  backed by EventBridge rules and a scheduler Lambda.
- **Real-time updates** — a WebSocket-driven aggregator service pushes live status
  and desktop-style notifications to connected clients instead of relying on polling.
- **Authentication & RBAC** — Microsoft Entra ID (Azure AD) SSO via OIDC/JWT, local
  username/password auth, and API-key auth for service-to-service calls, with
  role-based permissions (admin/feedops/developer/viewer).
- **Datadog metrics integration** for host-level charts alongside AWS data.

## Architecture

Three deployable services behind a single Nginx reverse proxy:

- **`backend/`** — FastAPI service for the primary REST API: AWS resource queries,
  authentication, scheduling, Route 53, and component/database CRUD.
- **`aggregator/`** — a separate FastAPI service dedicated to the WebSocket
  connection tree and higher-frequency component/server detail polling, kept apart
  from the main API so a noisy live-update loop can't affect it.
- **`frontend/`** — a React 19 + Vite single-page app (MUI, D3, framer-motion) with
  section-based navigation, saved table/column preferences, and runtime config
  injected via `config.json` so a single Docker image can be deployed to multiple
  environments.

Shared state lives in MySQL (component/server/user data) and Redis (caching,
pub/sub for the aggregator).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, MUI, D3, MSAL (Entra SSO), WebSockets |
| Backend | Python, FastAPI, Uvicorn/Gunicorn, boto3, python-jose, passlib |
| Data | MySQL (connection-pooled), Redis |
| Infra | Docker & Docker Compose, Nginx, Ansible, GitLab CI/CD |
| Cloud | AWS (EC2, ECS, EKS, Lambda, MSK, ElastiCache, ELB, Route 53, SSM, Inspector, Secrets Manager) |

## Local Setup

```bash
docker compose up -d
```

This brings up MySQL, Redis, the backend API, the aggregator, the frontend, and an
Nginx TLS terminator. See `docker-compose.dev.yml` for a hot-reload development
variant and `frontend/.env.example` / `backend/config/config.yaml` for the
configuration surface (all values below are placeholders — supply your own AWS
account, Entra tenant, and database credentials).

## MySQL DB Installation

```bash
docker run --name mysql-container -e MYSQL_ROOT_PASSWORD=password -d -p 3306:3306 mysql:latest
```
