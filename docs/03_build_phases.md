# 🚀 DormDesk — Build Phases (MVP-First)

> The project is split into **2 phases**:
> - **Phase 1 (MVP):** Single Super Admin, full 4-stage lifecycle, Docker + Nginx on EC2 — covers 100% of the grading rubric.
> - **Phase 2 (if time allows):** Category admin accounts, role scoping, SES email notifications, PDF work orders.
>
> See [`docs/12_mvp_scope.md`](12_mvp_scope.md) for the full scope breakdown.

---

## 👥 Team Split Overview

| Person A (DevOps + Backend)                         | Person B (Frontend + Docs)                         |
|-----------------------------------------------------|----------------------------------------------------|
| AWS infrastructure setup (EC2, RDS, Cognito, SGs)  | React frontend (pages, components, routing)        |
| Docker — Dockerfile, image build, container run     | Amplify Auth integration + Axios + AuthContext      |
| Backend (Node.js/Express, Cognito verify, API)      | UI: forms, stage progress bar, admin filter panel  |
| Nginx configuration + EC2 deployment                | Architecture diagram (draw.io / Excalidraw)        |
| Database schema + RDS setup                         | Final documentation write-up & submission package  |

---

---

# ═══════════════════════════════════════
# PHASE 1 — MVP
# ═══════════════════════════════════════

---

## ✅ MVP Step 0 — Setup & Planning (Both Together, ~1 hour)

### Goals
- Agree on MVP scope, divide work
- Development environment ready

### Tasks
- [ ] Read `docs/12_mvp_scope.md` together — agree on exactly what's in/out
- [ ] Make sure both team members have:
  - Node.js 18+ installed locally
  - Git + GitHub access configured
  - AWS account (Free Tier) with console access
- [ ] Clone the repo locally: `git clone https://github.com/VivekNeer/DormDesk.git`
- [ ] Create a shared document (Notion/Google Doc) for RDS endpoint, Cognito IDs, EC2 IP

---

## ✅ MVP Step 1 — AWS Infrastructure (Person A, ~2 hours)

### Goals
- EC2 live, RDS live, Cognito User Pool ready, both reachable

### 1.1 — VPC & EC2

- [ ] Launch EC2: Ubuntu 22.04, t2.micro, public subnet
- [ ] Create EC2 Security Group:
  - Inbound TCP 80 → 0.0.0.0/0
  - Inbound TCP 22 → Your IP only
- [ ] Allocate + associate Elastic IP
- [ ] SSH in: `ssh -i dormdesk.pem ubuntu@<EC2_IP>`
- [ ] Run on EC2:
  ```bash
  sudo apt update && sudo apt upgrade -y
  sudo apt install -y docker.io nginx mysql-client git
  sudo systemctl enable docker nginx
  sudo usermod -aG docker ubuntu
  newgrp docker
  ```

### 1.2 — RDS MySQL

- [ ] Launch RDS MySQL 8: db.t3.micro, private subnet, NOT publicly accessible
- [ ] Create RDS Security Group — inbound TCP 3306 from EC2 SG only
- [ ] Note down **RDS endpoint URL** → share with team

### 1.3 — AWS Cognito (MVP — 2 groups only)

- [ ] Go to AWS Cognito → Create User Pool
  - Sign-in: email
  - Required attributes: `email`, `name`
- [ ] Create **2 groups** only (MVP):
  - `Students`
  - `SuperAdmin`
- [ ] Disable self-registration for admin accounts (use "admin creates user" flow or just create manually)
- [ ] Create App Client — note down:
  - **User Pool ID** (e.g. `us-east-1_XXXXXXX`)
  - **App Client ID**
- [ ] Manually create the Super Admin user in Cognito console → assign to `SuperAdmin` group
- [ ] Note the Super Admin's Cognito `sub` (UUID) — needed for DB seed

### 1.4 — Apply Database Schema

```bash
# On EC2 after cloning repo
mysql -h <RDS_ENDPOINT> -u admin -p < database/schema.sql
```

**Verify:**
```bash
mysql -h <RDS_ENDPOINT> -u admin -p dormdesk -e "SHOW TABLES;"
# Expected: users | complaints | complaint_logs
```

### Verification Checks
- [ ] Can SSH into EC2?
- [ ] `docker --version` works without sudo?
- [ ] Can reach RDS from EC2 via mysql client?
- [ ] Cognito User Pool visible in console?
- [ ] Super Admin Cognito account created + in `SuperAdmin` group?

---

## ✅ MVP Step 2 — Backend (Person A, ~3–4 hours)

### Goals
- REST API working: complaints CRUD, 4 stage transitions, Cognito auth

### 2.1 — Initialize Backend

```bash
mkdir backend && cd backend
npm init -y
npm install express mysql2 aws-jwt-verify cors dotenv
npm install --save-dev nodemon
```

### 2.2 — Files to Build (in order)

- [ ] `backend/.env` (on EC2 only, use `.env.example` as template)
- [ ] `backend/config/db.js` — MySQL connection pool
- [ ] `backend/config/cognito.js` — Cognito JWT verifier setup
- [ ] `backend/middleware/auth.js` — verify Cognito ID token, inject `req.user`
- [ ] `backend/middleware/requireStudent.js` — check `req.user.groups.includes('Students')`
- [ ] `backend/middleware/requireAdmin.js` — check `req.user.groups.includes('SuperAdmin')`
- [ ] `backend/models/user.js` — `findBySub()`, `upsertUser()`
- [ ] `backend/models/complaint.js` — `create()`, `findByStudent()`, `findAll()`, `updateStage()`, `updateDetails()`
- [ ] `backend/models/complaintLog.js` — `addLog()`, `getLogsForComplaint()`
- [ ] `backend/routes/users.js` — `POST /api/users/sync`
- [ ] `backend/routes/complaints.js` — all complaint endpoints
- [ ] `backend/server.js` — wire everything up

### 2.3 — API Endpoints (MVP)

```
GET  /api/health                             → 200 OK (no auth)
POST /api/users/sync                         → upsert Cognito user in DB (any auth)

POST /api/complaints/                        → student: submit complaint → Stage 1
GET  /api/complaints/mine                    → student: get own complaints
GET  /api/complaints/                        → admin: get ALL complaints (+ filter ?stage=&category=&priority=)
PATCH /api/complaints/:id                    → admin: edit category/description/priority (Stage 1 or 2 only)
PATCH /api/complaints/:id/stage              → admin: advance stage (body: { toStage, note })
GET  /api/complaints/:id/logs                → admin: get audit trail
```

### 2.4 — Stage Transition Logic (in route handler)

```js
// PATCH /api/complaints/:id/stage
// Body: { toStage: 2, note: "Acknowledged" }

const allowed = currentStage + 1 === toStage;  // must go in order
if (!allowed) return res.status(400).json({ error: 'Invalid stage transition' });

// Update complaints table
// Insert row into complaint_logs
// Phase 2: if toStage === 3, trigger SES email (skip in MVP)
```

### 2.5 — Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

### Verification Checks (local + EC2)

- [ ] `docker build -t dormdesk-backend .` succeeds?
- [ ] `docker run --env-file .env -p 5000:5000 dormdesk-backend` starts?
- [ ] `curl http://localhost:5000/api/health` → `{ "status": "ok" }`?
- [ ] Can register a student via Cognito and call `/api/users/sync`?
- [ ] Submit a complaint → appears in DB?
- [ ] Admin can advance stage 1→2→3→4?
- [ ] Invalid stage jump (1→3) gets rejected?

---

## ✅ MVP Step 3 — Frontend (Person B, ~3–4 hours)

### Goals
- Working React app with Cognito auth and all 4 pages

### 3.1 — Initialize Frontend

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install axios react-router-dom aws-amplify @aws-amplify/ui-react
```

### 3.2 — Files to Build (in order)

- [ ] `frontend/.env` (Vite env file, with `VITE_` prefix):
  ```
  VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXX
  VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXX
  ```
- [ ] `frontend/src/auth/cognito.js` — Amplify.configure() call
- [ ] `frontend/src/auth/AuthContext.jsx` — global auth state + `useAuth()` hook
- [ ] `frontend/src/api/axios.js` — Axios with Cognito token interceptor
- [ ] `frontend/src/components/ProtectedRoute.jsx` — group-based guard
- [ ] `frontend/src/components/ComplaintForm.jsx` — student submit form
- [ ] `frontend/src/components/ComplaintCard.jsx` — single complaint display
- [ ] `frontend/src/components/StageProgressBar.jsx` — 4-step visual progress
- [ ] `frontend/src/components/AdminComplaintList.jsx` — admin filter + action panel
- [ ] `frontend/src/pages/Login.jsx`
- [ ] `frontend/src/pages/Register.jsx`
- [ ] `frontend/src/pages/StudentDashboard.jsx`
- [ ] `frontend/src/pages/AdminDashboard.jsx`
- [ ] `frontend/src/App.jsx` — Router + routes + ProtectedRoute wrappers

### 3.3 — App.jsx Route Structure

```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  <Route path="/student" element={
    <ProtectedRoute allowedGroups={['Students']}>
      <StudentDashboard />
    </ProtectedRoute>
  } />

  <Route path="/admin" element={
    <ProtectedRoute allowedGroups={['SuperAdmin']}>
      <AdminDashboard />
    </ProtectedRoute>
  } />

  {/* Redirect root based on group */}
  <Route path="/" element={<Navigate to="/login" />} />
</Routes>
```

### 3.4 — Vite Proxy (local dev only)

In `frontend/vite.config.js`:
```js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
}
```

### 3.5 — Cognito Flow in React

```js
import { signIn, signUp, signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

// Login
await signIn({ username: email, password });

// Get ID token for API calls
const { tokens } = await fetchAuthSession();
const idToken = tokens.idToken.toString();
// This token is attached by the Axios interceptor automatically

// Get role/group
const groups = tokens.idToken.payload['cognito:groups']; // ['Students'] or ['SuperAdmin']
```

### Verification Checks (local)

- [ ] `npm run dev` starts dev server?
- [ ] Student can register via Cognito?
- [ ] Student logs in → sees StudentDashboard?
- [ ] Student submits a complaint → appears in list?
- [ ] Student can see 4-stage progress bar for their complaint?
- [ ] Admin logs in → sees AdminDashboard (all complaints)?
- [ ] Admin can filter by category, priority, stage?
- [ ] Admin can edit complaint details (Stage 1/2)?
- [ ] Admin can advance each stage in order?
- [ ] Student trying to access `/admin` is redirected?
- [ ] Admin trying to access `/student` is redirected?

---

## ✅ MVP Step 4 — Nginx + EC2 Integration (Both, ~2 hours)

### Goals
- Full deployment live on EC2

### 4.1 — Build Frontend (Person B — locally)

```bash
cd frontend && npm run build
# Creates frontend/dist/
```

Upload to EC2:
```bash
# From local machine:
scp -i dormdesk.pem -r ./frontend/dist ubuntu@<EC2_IP>:/tmp/frontend_dist
```

### 4.2 — Deploy Frontend on EC2 (Person A)

```bash
sudo mkdir -p /var/www/html/dormdesk
sudo cp -r /tmp/frontend_dist/* /var/www/html/dormdesk/
```

### 4.3 — Configure Nginx (Person A)

```bash
sudo cp ~/DormDesk/nginx/dormdesk.conf /etc/nginx/sites-available/dormdesk
sudo ln -s /etc/nginx/sites-available/dormdesk /etc/nginx/sites-enabled/dormdesk
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 4.4 — Run Backend Container (Person A)

```bash
cd ~/DormDesk/backend
docker build -t dormdesk-backend:latest .
docker run -d \
  --name dormdesk-backend \
  --restart=always \
  -p 5000:5000 \
  --env-file .env \
  dormdesk-backend:latest
```

### Integration Checks

- [ ] `http://<EC2_IP>/` loads React app?
- [ ] `http://<EC2_IP>/api/health` returns `{ "status": "ok" }`?
- [ ] Student register + login works on live site?
- [ ] Student submits complaint → visible in Admin dashboard?
- [ ] Admin stages complaint through 1→2→3→4 on live site?
- [ ] Port 5000 NOT reachable externally?
- [ ] `docker logs dormdesk-backend` shows no errors?

---

## ✅ MVP Step 5 — Documentation (Person B, ~2–3 hours)

### Goals
- All submission deliverables complete

### Tasks

- [ ] Draw architecture diagram (Excalidraw / draw.io) → save as `docs/architecture_diagram.png`
  - Show: VPC, EC2 (Nginx + Docker), RDS, Cognito, student/admin flows
- [ ] Fill in any placeholders in `docs/04_deployment_runbook.md` with real IPs/endpoints
- [ ] Final review of all docs against `docs/05_deliverables_checklist.md`
- [ ] Update `README.md` with actual EC2 IP for demo

---

## MVP Phase Timeline

```
Day 1 (Both)
├── Step 0: Setup & planning                        [1 hour]
├── Step 1: AWS infra — EC2, RDS, Cognito (Person A)[2 hours]
└── Step 2: Backend dev (Person A)                  [3-4 hours]
     Person B: Step 3 Frontend (parallel)           [3-4 hours]

Day 2 (Both)
├── Step 4: Nginx + EC2 integration (both)          [2 hours]
└── Step 5: Documentation (Person B)                [2-3 hours]
     Person A: Debugging / hardening (parallel)
```

---

---

# ═══════════════════════════════════════
# PHASE 2 — FULL SYSTEM (If Time Allows)
# ═══════════════════════════════════════

> Start Phase 2 only after MVP is **fully working and deployed**.

---

## Phase 2 Overview

Phase 2 is **purely additive** — nothing in Phase 1 breaks or needs to be replaced.

```
What to ADD in Phase 2:
├── AWS Cognito: 5 new groups (FoodAdmin, WaterAdmin, RoomAdmin, ElectricalAdmin, CleaningAdmin)
├── Cognito: Create 1 user per group (category admin accounts)
├── DB: Populate admin_category for category admin users
├── DB: Create notifications table + admin_category_config table
├── Backend: requireCategoryAdmin.js middleware
├── Backend: Category-scoped complaint queries
├── Backend: emailService.js (AWS SES)
├── Backend: pdfService.js (pdfkit)
├── Backend: Notification trigger on Stage 2→3 (Super Admin assigns)
├── Frontend: CategoryAdminDashboard.jsx (filters to own category, limited actions)
├── Frontend: SuperAdminDashboard.jsx (full view + assign button)
├── Frontend: ProtectedRoute — new group routing rules
└── AWS: SES setup (verify sender, request production access)
```

## Phase 2 Step-by-Step

### P2.1 — Add Cognito Groups & Accounts
```
Cognito Console → Your User Pool → Groups → Create:
  FoodAdmin | WaterAdmin | RoomAdmin | ElectricalAdmin | CleaningAdmin

Create 1 user per group → assign to matching group
Note each user's Cognito `sub`
```

### P2.2 — Seed DB with Category Admin Users
```sql
-- Add admin_category to existing admin users
UPDATE users SET admin_category = 'water' WHERE cognito_sub = '<water_admin_sub>';
-- Repeat for each category admin
```

### P2.3 — Backend: Category Admin Middleware
```js
// requireCategoryAdmin.js
export function requireCategoryAdmin(req, res, next) {
  const adminGroups = ['FoodAdmin','WaterAdmin','RoomAdmin','ElectricalAdmin','CleaningAdmin'];
  const userGroups = req.user.groups || [];
  const matchingGroup = adminGroups.find(g => userGroups.includes(g));
  if (!matchingGroup) return res.status(403).json({ error: 'Forbidden' });
  req.adminCategory = matchingGroup.replace('Admin','').toLowerCase();
  next();
}
```

### P2.4 — Backend: Category-Scoped Complaint Queries
```js
// In complaint routes — category admin filtering
if (req.adminCategory) {
  query += ' WHERE category = ?';
  params.push(req.adminCategory);
}
```

### P2.5 — Backend: SES Notification on Stage 2→3
```js
// In PATCH /api/complaints/:id/stage, when toStage === 3 and triggered by SuperAdmin:
const { adminEmail } = await getCategoryAdminEmail(complaint.category);
await sendAssignmentEmail({ toEmail: adminEmail, complaint, assignedByName: req.user.name });
```

### P2.6 — Frontend: Split Admin Dashboard
- Rename `AdminDashboard.jsx` → `SuperAdminDashboard.jsx`
- Create `CategoryAdminDashboard.jsx` — filtered to `req.adminCategory`, Stage 2→3→4 only
- Update `App.jsx` routes to send each admin group to the right page

### P2.7 — AWS SES Setup
```
SES Console → Verified identities → Add noreply@dormdesk.com
Add each category admin email as a verified identity (Sandbox mode)
OR: Request SES production access (takes 24h, allows sending to any email)
```

---

## Phase 2 Test Checklist

- [ ] Category admin (water) sees ONLY water complaints
- [ ] Category admin CANNOT access electrical complaints
- [ ] Category admin CANNOT do Stage 1→2 (Super Admin must acknowledge first)
- [ ] Category admin CAN do Stage 2→3 and Stage 3→4 for their category
- [ ] Super Admin can still see and action ALL complaints
- [ ] Email is sent to water_admin when Super Admin moves water complaint to Stage 3
- [ ] Email contains complaint details

---

*Document version: 2.0 | Updated: 2026-02-27 — MVP-first approach with Phase 2 as additive extension*
