# DormDesk — HostelOps Complaint Management System

> **Milestone Project:** Full Stack Deployment & DevOps Engineering  
> **Stack:** React · Node.js/Express · MySQL (AWS RDS) · Docker · Nginx · AWS EC2

---

## 📋 Project Overview

DormDesk is a production-deployed, containerized hostel complaint and maintenance management system. Students can submit and track maintenance complaints; admins can view, filter, and resolve them.

This project demonstrates production-grade DevOps practices:
- Docker containerization
- Nginx reverse proxy configuration
- AWS EC2 + RDS deployment
- Network isolation and security group management

---

## 🏗 Architecture

```
Client → EC2:80 → Nginx → Docker:5000 (Node.js) → RDS MySQL (private)
```

See [`docs/01_architecture.md`](docs/01_architecture.md) for the full architecture diagram and explanation.

---

## 📁 Project Structure

```
DormDesk/
├── backend/          # Node.js/Express REST API
├── frontend/         # React (Vite) SPA
├── database/         # MySQL schema
├── nginx/            # Nginx server block config
└── docs/             # All documentation and deliverables
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [01 — Architecture](docs/01_architecture.md) | Full system architecture |
| [02 — Construction Plan](docs/02_construction_plan.md) | Every component that needs to be built |
| [03 — Build Phases](docs/03_build_phases.md) | Phased build guide with team split |
| [04 — Deployment Runbook](docs/04_deployment_runbook.md) | Step-by-step deployment commands |
| [05 — Deliverables Checklist](docs/05_deliverables_checklist.md) | Final submission checklist |
| [06 — Nginx Explanation](docs/06_nginx_explanation.md) | Nginx config line-by-line |
| [07 — Docker Explanation](docs/07_docker_explanation.md) | Dockerfile + container run explained |
| [08 — Networking & Security](docs/08_networking_security.md) | Firewall and port strategy |
| [09 — Request Lifecycle](docs/09_request_lifecycle.md) | End-to-end request walkthrough |
| [10 — Serverful vs Serverless](docs/10_serverful_vs_serverless.md) | Conceptual comparison |

---

## 🚀 Quick Start (Local Development)

### Backend
```bash
cd backend
npm install
cp .env.example .env       # Fill in your local DB credentials
node server.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev                # Proxies /api to localhost:5000
```

---

## 🌐 Production Deployment

Follow [`docs/04_deployment_runbook.md`](docs/04_deployment_runbook.md) for the full deployment guide.

Short summary:
1. Launch EC2 + RDS on AWS
2. SSH into EC2, clone repo
3. Apply `database/schema.sql` to RDS
4. Create `.env` on EC2 with RDS credentials
5. `docker build -t dormdesk-backend . && docker run -d --restart=always -p 5000:5000 --env-file .env dormdesk-backend`
6. Copy React build (`npm run build`) to `/var/www/html/dormdesk/`
7. Configure and reload Nginx

---

## 🔐 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```
DB_HOST=<rds-endpoint>
DB_PORT=3306
DB_NAME=dormdesk
DB_USER=admin
DB_PASS=<password>
JWT_SECRET=<random-secret>
NODE_ENV=production
PORT=5000
```

> ⚠️ Never commit `.env` to version control.

---

## 👥 Team

This project is a 2-person team milestone.

- **Person A** — Backend, Docker, AWS infrastructure, Nginx
- **Person B** — Frontend, documentation, architecture diagrams

---

*Milestone Project | DevOps & Full Stack Deployment | 2026*
