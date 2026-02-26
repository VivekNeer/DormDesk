# ✅ DormDesk — Deliverables & Grading Checklist

> Use this document as the **final submission checklist** before handing in.  
> Every item maps back to the grading rubric from the project guidelines.

---

## 🎯 Evaluation Weightage Breakdown

| Component                  | Weightage | Status |
|----------------------------|-----------|--------|
| Application Functionality  | 30%       | ⬜      |
| Docker Implementation      | 20%       | ⬜      |
| Nginx Reverse Proxy        | 20%       | ⬜      |
| Networking & Security      | 10%       | ⬜      |
| Architecture Documentation | 20%       | ⬜      |

---

## 📦 Required Deliverables (from Section 6 of Guidelines)

| #  | Deliverable                                            | File / Location                      | Done? |
|----|--------------------------------------------------------|--------------------------------------|-------|
| 1  | Running Deployed Application (Docker-based)            | Live at `http://<EC2_IP>/`           | ⬜    |
| 2  | Architecture Diagram (Container + Proxy + Port Flow)   | `docs/architecture_diagram.png`      | ⬜    |
| 3  | Nginx Configuration Explanation                        | `docs/06_nginx_explanation.md`       | ⬜    |
| 4  | Dockerfile and Container Explanation                   | `docs/07_docker_explanation.md`      | ⬜    |
| 5  | Networking & Firewall Strategy                         | `docs/08_networking_security.md`     | ⬜    |
| 6  | Request Lifecycle Explanation                          | `docs/09_request_lifecycle.md`       | ⬜    |
| 7  | Serverful vs Serverless Comparison                     | `docs/10_serverful_vs_serverless.md` | ⬜    |

---

## 🔧 Application Functionality (30%) — Checklist

### Student Module
- [ ] Student can **register** with name, email, password
- [ ] Student can **log in** and receive JWT
- [ ] Student can **submit** a complaint with category, description, and priority
- [ ] Student can **view** all of their own complaints with current status
- [ ] Student **cannot** access admin routes (403 returned)

### Admin Module
- [ ] Admin can **log in**
- [ ] Admin can **view all** complaints from all students
- [ ] Admin can **filter** complaints by category
- [ ] Admin can **filter** complaints by status
- [ ] Admin can **update** complaint status (open → in-progress → resolved)
- [ ] Admin **cannot** be registered via the normal public endpoint (role must be set in DB)

### Full Stack Integration
- [ ] Frontend correctly communicates through Nginx `/api/` proxy to backend
- [ ] JWT is persisted in `localStorage` and sent on every authenticated request
- [ ] Logout clears token and redirects to login
- [ ] Protected routes redirect unauthenticated users to `/login`

---

## 🐳 Docker Implementation (20%) — Checklist

- [ ] `backend/Dockerfile` exists and is valid
- [ ] Docker image builds successfully: `docker build -t dormdesk-backend .`
- [ ] Container runs successfully with `--env-file .env`
- [ ] Container exposes **only port 5000 internally** (no public port 5000 in AWS SG)
- [ ] Container has `--restart=always` policy
- [ ] `docker ps` shows container as **Up**
- [ ] `docker logs dormdesk-backend` shows clean output (no crash loops)
- [ ] `.dockerignore` excludes `node_modules` and `.env`
- [ ] `.env` is **never** committed to Git

### Can You Explain (Viva-Ready)?
- [ ] What does each line in the Dockerfile do?
- [ ] What is the difference between `EXPOSE` and port binding `-p`?
- [ ] Why use `--restart=always`?
- [ ] What would happen if you removed `--env-file`?

---

## 🌐 Nginx Reverse Proxy (20%) — Checklist

- [ ] Nginx installed and running on EC2 host
- [ ] `nginx/dormdesk.conf` server block is configured
- [ ] `listen 80;` — all public traffic goes through port 80
- [ ] `location /` — serves React static build with SPA fallback (`try_files`)
- [ ] `location /api/` — proxies to `http://localhost:5000/`
- [ ] `proxy_set_header` directives are in place
- [ ] `sudo nginx -t` passes (no syntax errors)
- [ ] Nginx is set to `systemctl enable` (survives reboots)
- [ ] Default Nginx site is removed from `sites-enabled`

### Can You Explain (Viva-Ready)?
- [ ] What is a reverse proxy and why do we use one?
- [ ] Why does the user never see port 5000?
- [ ] What does `try_files $uri $uri/ /index.html` do and why is it needed for a React SPA?
- [ ] What does `proxy_pass http://localhost:5000/;` do?
- [ ] What is the difference between `root` and `proxy_pass` in Nginx?

---

## 🔐 Networking & Security (10%) — Checklist

### AWS Security Groups
- [ ] EC2 Security Group only allows **port 80** inbound from `0.0.0.0/0`
- [ ] EC2 Security Group allows **port 22** inbound from **your IP only**
- [ ] **Port 5000 is NOT in EC2 inbound rules** (publicly inaccessible)
- [ ] RDS Security Group allows **port 3306** inbound only from **EC2 Security Group ID**
- [ ] RDS is **not publicly accessible** (checkbox in RDS settings = disabled)

### Verification Tests
- [ ] `curl http://<EC2_IP>:5000` → times out or connection refused from external network
- [ ] `curl http://<EC2_IP>/api/health` → returns 200 OK (Nginx proxies to backend)
- [ ] RDS endpoint cannot be reached from your laptop (only from EC2)

### Can You Explain (Viva-Ready)?
- [ ] What is a Security Group in AWS?
- [ ] Why is port 5000 hidden from the internet even though Docker exposes it?
- [ ] What is the difference between internal and external service exposure?
- [ ] Why is RDS in a private subnet?
- [ ] Why is SSH restricted to your IP?

---

## 📐 Architecture Documentation (20%) — Checklist

- [ ] `docs/01_architecture.md` — Full architecture breakdown with text diagrams
- [ ] `docs/architecture_diagram.png` — Visual diagram with VPC, subnets, ports labeled
- [ ] `docs/06_nginx_explanation.md` — Explain every line of nginx config
- [ ] `docs/07_docker_explanation.md` — Explain Dockerfile + container run command
- [ ] `docs/08_networking_security.md` — Explain SG rules and port strategy
- [ ] `docs/09_request_lifecycle.md` — Walk through a full request from client to DB and back
- [ ] `docs/10_serverful_vs_serverless.md` — Conceptual comparison table + recommendation

---

## 🗂 File Submission Checklist

#### Code & Config Files
- [ ] `backend/Dockerfile`
- [ ] `backend/.env.example` (NOT the actual `.env`)
- [ ] `backend/server.js`
- [ ] `backend/routes/auth.js` + `backend/routes/complaints.js`
- [ ] `backend/config/db.js`
- [ ] `backend/middleware/auth.js`
- [ ] `frontend/src/` (all pages and components)
- [ ] `database/schema.sql`
- [ ] `nginx/dormdesk.conf`
- [ ] `.gitignore`
- [ ] `README.md`

#### Documentation Files
- [ ] `docs/01_architecture.md`
- [ ] `docs/02_construction_plan.md`
- [ ] `docs/03_build_phases.md`
- [ ] `docs/04_deployment_runbook.md`
- [ ] `docs/05_deliverables_checklist.md` (this file)
- [ ] `docs/06_nginx_explanation.md`
- [ ] `docs/07_docker_explanation.md`
- [ ] `docs/08_networking_security.md`
- [ ] `docs/09_request_lifecycle.md`
- [ ] `docs/10_serverful_vs_serverless.md`
- [ ] `docs/architecture_diagram.png`

---

## 🔥 Pre-Submission Final Verification

Run these from your laptop:

```bash
# 1. App is live
curl http://<EC2_IP>/api/health
# Expected: {"status":"ok"}

# 2. Frontend loads
curl -I http://<EC2_IP>/
# Expected: 200 OK with Content-Type: text/html

# 3. Port 5000 is blocked externally
curl --connect-timeout 5 http://<EC2_IP>:5000/api/health
# Expected: Connection timed out (good!)

# 4. Git repo is clean
git status
# Expected: No .env, no node_modules, no dist/ if gitignored
```

---

*Document version: 1.0 | Created: 2026-02-26*
