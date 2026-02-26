# 🚀 DormDesk — Build Phases
## Phased Construction Plan with Team Split

> This document breaks the project into **5 phases** with a clear **Person A / Person B** split so work can happen in parallel.  
> Estimated total time: ~10–14 hours across both people.

---

## 👥 Team Split Overview

| Person A (DevOps + Backend)                         | Person B (Frontend + Docs)                         |
|-----------------------------------------------------|----------------------------------------------------|
| AWS infrastructure setup (EC2, RDS, VPC, SGs)      | React frontend (pages, components, routing)        |
| Docker — Dockerfile, image build, container run     | Axios integration with backend API                 |
| Backend (Node.js/Express, routes, auth, DB)         | UI polish (forms, status badges, filters)          |
| Nginx configuration + deployment                    | Architecture diagrams (draw.io or Excalidraw)      |
| `.env` management & secrets handling                | Final documentation write-up & submission package  |

---

## ✅ Phase 0 — Setup & Planning (Both Together, ~1 hour)

### Goals
- Agree on final architecture
- Set up shared repository
- Divide responsibilities

### Tasks
- [ ] Create GitHub/GitLab private repo named `DormDesk`
- [ ] Initialize folder structure (`backend/`, `frontend/`, `docs/`, `nginx/`, `database/`)
- [ ] Add `.gitignore` (exclude `node_modules`, `.env`, `dist/`)
- [ ] Create `README.md` with project title, team, and description
- [ ] Open AWS Free Tier account if not already done (or use existing)
- [ ] Read and understand full project guidelines together

### Deliverables
- Shared repo with skeleton structure
- Both members have SSH keys added

---

## ✅ Phase 1 — AWS Infrastructure Setup (Person A, ~2 hours)

### Goals
- Have EC2 and RDS live and reachable

### Tasks

#### 1.1 — VPC & Networking
- [ ] Use default VPC or create a new VPC with:
  - Public subnet (for EC2)
  - Private subnet (for RDS)
- [ ] Create an Internet Gateway attached to VPC

#### 1.2 — EC2 Launch
- [ ] Launch Ubuntu 22.04 LTS t2.micro
- [ ] Choose public subnet
- [ ] Create EC2 Security Group:
  - Inbound: TCP 80 → 0.0.0.0/0
  - Inbound: TCP 22 → Your IP only
  - Outbound: All → 0.0.0.0/0
- [ ] Allocate and associate an Elastic IP
- [ ] Download `.pem` key pair, restrict permissions:
  ```bash
  chmod 400 dormdesk.pem
  ssh -i dormdesk.pem ubuntu@<EC2-PUBLIC-IP>
  ```

#### 1.3 — RDS MySQL Launch
- [ ] Create RDS MySQL 8.x db.t3.micro
- [ ] Put it in private subnet
- [ ] Set publicly accessible = **No**
- [ ] Create RDS Security Group:
  - Inbound: TCP 3306 → EC2 Security Group (not IP, use SG ID)
- [ ] Note down the RDS **endpoint URL**

#### 1.4 — Install Docker on EC2
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
newgrp docker
```

#### 1.5 — Install MySQL Client on EC2 (for schema import)
```bash
sudo apt install -y mysql-client
```

### Verification Checks
- [ ] Can SSH into EC2?
- [ ] Can `docker run hello-world` on EC2 without sudo?
- [ ] Can reach RDS from EC2: `mysql -h <rds-endpoint> -u admin -p`?

---

## ✅ Phase 2 — Backend Development (Person A, ~3 hours)

### Goals
- Fully working REST API with auth and complaint management

### Tasks

#### 2.1 — Initialize Backend
```bash
mkdir backend && cd backend
npm init -y
npm install express mysql2 bcryptjs jsonwebtoken cors dotenv
```

#### 2.2 — Build Files (in order)
- [ ] `backend/config/db.js` — MySQL connection pool
- [ ] `backend/middleware/auth.js` — JWT verification middleware
- [ ] `backend/models/user.js` — DB functions: `createUser`, `findByEmail`
- [ ] `backend/models/complaint.js` — DB functions: `create`, `findByUser`, `findAll`, `updateStatus`
- [ ] `backend/routes/auth.js` — Register + Login endpoints
- [ ] `backend/routes/complaints.js` — All complaint endpoints
- [ ] `backend/server.js` — Mount everything, start Express
- [ ] `backend/.env.example` — Template for env vars
- [ ] `backend/Dockerfile` — Node.js Alpine image

#### 2.3 — Apply Schema to RDS
```bash
mysql -h <rds-endpoint> -u admin -p dormdesk < database/schema.sql
```

#### 2.4 — Build Docker Image
```bash
cd backend
docker build -t dormdesk-backend:latest .
```

#### 2.5 — Run Container
```bash
docker run -d \
  --name dormdesk-backend \
  --restart=always \
  -p 5000:5000 \
  --env-file .env \
  dormdesk-backend:latest
```

### API Endpoints Summary
```
POST   /api/auth/register
POST   /api/auth/login

POST   /api/complaints/           (student only)
GET    /api/complaints/mine       (student only)
GET    /api/complaints/           (admin only)
PATCH  /api/complaints/:id/status (admin only)
GET    /api/health                (public - health check)
```

### Verification Checks
- [ ] `curl http://localhost:5000/api/health` returns `{ "status": "ok" }`?
- [ ] Register a test user via curl/Postman?
- [ ] Login and get a JWT token?
- [ ] Submit a complaint with token?
- [ ] `docker ps` shows container as running?
- [ ] `docker logs dormdesk-backend` shows no errors?

---

## ✅ Phase 3 — Frontend Development (Person B, ~3 hours)

### Goals
- Working React app that talks to `/api/*` and covers all student + admin flows

### Tasks

#### 3.1 — Initialize Frontend
```bash
npm create vite@latest frontend -- --template react
cd frontend && npm install axios react-router-dom
```

#### 3.2 — Build Files (in order)
- [ ] `frontend/src/api/axios.js` — Axios instance with `/api` base URL + JWT interceptor
- [ ] `frontend/src/context/AuthContext.jsx` — Global auth state (user, token, role)
- [ ] `frontend/src/components/ProtectedRoute.jsx` — Auth guard
- [ ] `frontend/src/pages/Login.jsx` — Login form
- [ ] `frontend/src/pages/Register.jsx` — Register form
- [ ] `frontend/src/pages/StudentDashboard.jsx` — Submit complaint + view own complaints
- [ ] `frontend/src/pages/AdminDashboard.jsx` — View all, filter, update status
- [ ] `frontend/src/components/ComplaintForm.jsx` — Reusable form component
- [ ] `frontend/src/components/ComplaintCard.jsx` — Display single complaint
- [ ] `frontend/src/App.jsx` — Router setup with ProtectedRoute
- [ ] `frontend/src/main.jsx` — App mount + AuthContext provider

#### 3.3 — Important: Vite Proxy (for local dev only)

In `frontend/vite.config.js`, add a proxy so `/api` calls go to local backend during development:
```js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
}
```

> ⚠️ This proxy is **local dev only**. In production on EC2, Nginx handles the `/api` proxying. The code doesn't change — this is transparent.

#### 3.4 — Build for Production
```bash
cd frontend && npm run build
# Creates frontend/dist/ folder
```

### Verification Checks (locally)
- [ ] `npm run dev` starts the dev server?
- [ ] Can register a new student?
- [ ] Can log in and see the student dashboard?
- [ ] Can submit a complaint?
- [ ] Can log in as admin and see all complaints?
- [ ] Can admin filter by category or status?
- [ ] Can admin update complaint status?

---

## ✅ Phase 4 — Nginx Setup & Full Integration (Both, ~2 hours)

### Goals
- Everything live on EC2, accessible via port 80

### Tasks (Person A — on EC2)

#### 4.1 — Install & Configure Nginx
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/dormdesk
# Paste dormdesk.conf content from nginx/dormdesk.conf
sudo ln -s /etc/nginx/sites-available/dormdesk /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default    # Remove default site
sudo nginx -t
sudo systemctl reload nginx
```

#### 4.2 — Deploy Frontend Build (Person B hands off dist/ folder)
```bash
sudo mkdir -p /var/www/html/dormdesk
# Copy from local to EC2 using scp:
scp -i dormdesk.pem -r frontend/dist/* ubuntu@<EC2-IP>:/tmp/dormdesk_dist/
# On EC2:
sudo cp -r /tmp/dormdesk_dist/* /var/www/html/dormdesk/
```

#### 4.3 — Verify Backend Container is Running
```bash
docker ps
curl http://localhost:5000/api/health
```

### Integration Verification Checks
- [ ] `http://<EC2-PUBLIC-IP>/` loads React app?
- [ ] `http://<EC2-PUBLIC-IP>/api/health` returns `{ "status": "ok" }`?
- [ ] Register a new user via the live site?
- [ ] Submit a complaint via the live site?
- [ ] Admin dashboard loads all complaints?
- [ ] No CORS errors in browser console?
- [ ] `curl http://<EC2-PUBLIC-IP>/api/health` from your laptop works?

---

## ✅ Phase 5 — Documentation & Deliverables (Person B, ~2–3 hours)

### Goals
- All required deliverables complete and polished

### Tasks

#### 5.1 — Create Architecture Diagram
- Use **draw.io** (diagrams.net) or **Excalidraw** to produce a visual of:
  - VPC with public/private subnets
  - EC2 → Nginx → Backend → RDS flow
  - Security group labels
  - Port labels (80, 5000, 3306, 22)
- Export as PNG, add to `docs/` folder

#### 5.2 — Write Up Required Documents (see `05_deliverables_checklist.md`)
- [ ] Nginx configuration explanation
- [ ] Dockerfile and container explanation
- [ ] Networking & firewall strategy
- [ ] Request lifecycle walkthrough
- [ ] Serverful vs Serverless comparison

#### 5.3 — Final Review (Both Together)
- [ ] All API routes working on live EC2?
- [ ] All checklist items in `05_deliverables_checklist.md` ticked?
- [ ] Repo is clean (no `.env`, no `node_modules`, no secrets)?
- [ ] README is complete with setup instructions?

---

## 📊 Phase Timeline

```
Day 1
├── Phase 0: Setup & planning (both)           ← 1 hour
├── Phase 1: AWS infra (Person A)              ← 2 hours
└── Phase 2: Backend dev (Person A)            ← 3 hours
     Person B: Phase 3 Frontend (parallel)     ← 3 hours

Day 2
├── Phase 4: Nginx + integration (both)        ← 2 hours
└── Phase 5: Documentation + polish (Person B) ← 2–3 hours
     Person A: Debugging / hardening (parallel)
```

---

*Document version: 1.0 | Created: 2026-02-26*
