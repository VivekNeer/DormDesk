# 🎯 DormDesk — MVP Scope & Phase Split

> **Phase 1 (MVP):** Build it, deploy it, demo it. One Super Admin, everything works.  
> **Phase 2 (If time allows):** Category admin accounts, role scoping, email notifications, PDF work orders.

---

## The Core Principle

> Build the system so Phase 2 is an **extension**, not a rewrite.  
> Phase 1 uses the same DB schema and architecture — just with less of it active.

---

## 🟢 Phase 1 — MVP

### What Is In Scope

#### Users
- **Students** — Register, login (via Cognito), submit complaints, view own complaints + stage
- **1 Super Admin** — Single hardcoded Cognito account, manages EVERYTHING

#### Complaint Lifecycle
- All **4 stages** are implemented: Received → Acknowledged → In Progress → Resolved
- The **Super Admin** is the only one who can move stages
- Students can only view their own complaints' current stage

#### Auth
- AWS Cognito with **2 Cognito Groups**: `Students` and `SuperAdmin`
- No category groups in MVP

#### Admin Dashboard (MVP)
- Sees **all complaints** across all categories
- Can **filter by**: category, priority, stage
- Can **edit**: category, description, priority (Stage 1 or 2 only)
- Can **advance stage** on any complaint through all 4 stages
- Can see the **audit log** per complaint (who moved what stage, when)

#### Backend
- `auth.js` middleware — verifies Cognito JWT
- `requireStudent.js` — gates student routes
- `requireAdmin.js` — gates admin routes (single check: group = SuperAdmin)
- No `requireCategoryAdmin.js` in Phase 1

#### Database (MVP tables — subset of full schema)
- `users` — with `cognito_sub`, `role` (`student` | `admin`), **no `admin_category`**
- `complaints` — full schema WITH `stage` (1–4), `assigned_to`, `category`
- `complaint_logs` — audit trail (keep from day 1 — cheap to add, painful to retrofit)
- ~~`notifications`~~ — skipped in MVP
- ~~`admin_category_config`~~ — skipped in MVP

#### Notifications
- ❌ No email notifications in MVP
- ❌ No PDF generation in MVP
- ✅ Admin dashboard is the source of truth

#### Frontend Pages (MVP)
| Page                   | Route       | Who |
|------------------------|-------------|-----|
| `Login.jsx`            | `/login`    | All |
| `Register.jsx`         | `/register` | Students |
| `StudentDashboard.jsx` | `/student`  | Students |
| `AdminDashboard.jsx`   | `/admin`    | Super Admin |

---

### What Is Out of Scope (Phase 1)

| Feature                           | Deferred To |
|-----------------------------------|-------------|
| Category Admin accounts           | Phase 2     |
| Multiple admin Cognito groups     | Phase 2     |
| Category-scoped access control    | Phase 2     |
| SES email notifications           | Phase 2     |
| PDF work order generation         | Phase 2     |
| `admin_category_config` DB table  | Phase 2     |
| `notifications` DB table          | Phase 2     |
| `CategoryAdminDashboard.jsx`      | Phase 2     |
| `SuperAdminDashboard.jsx`         | Phase 2 (rename of AdminDashboard) |

---

### MVP Architecture (Simplified)

```
Client (Student or Admin)
  │
  ▼ Port 80
Nginx (EC2)
  │
  ├── / → React build (Login, Register, StudentDashboard, AdminDashboard)
  └── /api/ → Backend container (Port 5000)
                │
                ├── Verify Cognito JWT → is Student or SuperAdmin
                ├── /api/users/sync    → upsert user in DB
                ├── /api/complaints/   → full CRUD + stage transitions
                └── Database
                      │
                      ▼ MySQL RDS (Private)
                      ├── users
                      ├── complaints (with stage 1-4)
                      └── complaint_logs (audit trail)
```

---

### MVP Cognito Setup

Create only **2 groups**:
1. `Students` — all student accounts go here
2. `SuperAdmin` — the single admin account goes here

Admin registrations are **disabled** via Cognito — students can self-register; the admin account is created manually in the Cognito console.

---

### Deliverables Met by MVP

| Rubric Component         | Weightage | Covered in MVP? |
|--------------------------|-----------|-----------------|
| Application Functionality| 30%       | ✅ Yes — all core flows work |
| Docker Implementation    | 20%       | ✅ Yes |
| Nginx Reverse Proxy      | 20%       | ✅ Yes |
| Networking & Security    | 10%       | ✅ Yes |
| Architecture Documentation| 20%      | ✅ Yes |

**MVP covers 100% of the grading rubric.** Phase 2 is extra credit.

---

## 🔵 Phase 2 — Full System (If Time Allows)

### What Gets Added

#### Multiple Admin Accounts
- Create additional Cognito groups: `FoodAdmin`, `WaterAdmin`, `RoomAdmin`, `ElectricalAdmin`, `CleaningAdmin`
- Create a Cognito account per category, assign to matching group
- Seed DB `users` table with each admin, fill `admin_category` field

#### Backend Changes
- `requireCategoryAdmin.js` middleware — gates by `*Admin` group (not SuperAdmin)
- Complaint routes: add category-scope filter so category admins only see their category
- Stage rules: Category Admin can only do Stage 2→3 and Stage 3→4
- Stage 2→3 transition by SuperAdmin triggers email notification

#### New DB Tables to Activate
```sql
-- Add notifications table
-- Fill admin_category_config table
-- Add admin_category column to users (already in schema, just not used in MVP)
```

#### Frontend Changes
- Replace single `AdminDashboard.jsx` with:
  - `CategoryAdminDashboard.jsx` — filtered view, limited actions
  - `SuperAdminDashboard.jsx` — full view, all actions, assign button
- `ProtectedRoute.jsx` gets group-aware routing:
  - `SuperAdmin` → `/superadmin`
  - `*Admin` groups → `/admin`

#### Notification System
- `backend/services/emailService.js` — AWS SES
- `backend/services/pdfService.js` — pdfkit work order
- Trigger on Super Admin's Stage 2→3 action

---

## ✅ Build Order — How Phase 1 Becomes Phase 2

This is important: the transition requires **minimal refactoring**.

| What already exists from Phase 1        | What changes in Phase 2                          |
|-----------------------------------------|--------------------------------------------------|
| `users` table (has `admin_category` col)| Just populate `admin_category` for new admins    |
| `complaints` table (has `stage`, `assigned_to`) | No change needed                         |
| `complaint_logs` table                  | No change needed                                 |
| Single `requireAdmin.js` middleware     | Keep it + **add** `requireCategoryAdmin.js`      |
| `AdminDashboard.jsx`                    | Rename to `SuperAdminDashboard.jsx`, add `CategoryAdminDashboard.jsx` |
| Cognito User Pool                       | Just **add** more groups (non-destructive)       |

> No breaking changes. Phase 2 is purely additive.

---

## 📊 Phase Timeline (Revised)

```
Phase 1 — MVP (Primary Goal)
├── Day 1 Morning:   AWS setup (EC2, RDS, Cognito with 2 groups)
├── Day 1 Afternoon: Backend (Node.js, Cognito verify, complaints API, stages)
├── Day 1 Afternoon: Frontend (Login, Register, StudentDashboard, AdminDashboard)
├── Day 2 Morning:   Docker + Nginx + Deploy to EC2
└── Day 2 Afternoon: Testing + Documentation

Phase 2 — If time remains after MVP is working
├── Cognito: Add 5 category groups
├── Backend: Add requireCategoryAdmin, category scoping, emailService, pdfService
├── Frontend: Split AdminDashboard into Category + Super pages
└── AWS SES setup + test email notifications
```

---

*Document version: 1.0 | Created: 2026-02-27*
