# 🏗 DormDesk — System Architecture (v2)

> **Project:** HostelOps — Production Deployment of a Containerized Complaint Management System  
> **Stack:** React (Frontend) · Node.js/Express (Backend) · MySQL (RDS) · Docker · Nginx · AWS EC2 + RDS + Cognito + SES

---

## 1. High-Level Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          INTERNET / CLIENT                               │
│              (Student Browser / Admin Browser)                           │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                          Port 80 (HTTP)
                                │
┌───────────────────────────────▼──────────────────────────────────────────┐
│                          AWS EC2 INSTANCE                                │
│                          (Public Subnet)                                 │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │                    NGINX (Reverse Proxy, Port 80)                │   │
│   │                                                                  │   │
│   │  /          → serve static React build                          │   │
│   │  /api/      → proxy_pass → localhost:5000                       │   │
│   └──────────────────────────┬───────────────────────────────────────┘  │
│                              │                                           │
│                   ┌──────────▼────────────┐                             │
│                   │   Backend Container   │                             │
│                   │   Node.js / Express   │                             │
│                   │   Port 5000           │                             │
│                   │                       │                             │
│                   │  • Verifies Cognito   │                             │
│                   │    JWT tokens         │                             │
│                   │  • Role-based access  │                             │
│                   │  • Stage transitions  │                             │
│                   │  • Triggers SES email │                             │
│                   │  • PDF generation     │                             │
│                   └──────────┬────────────┘                             │
│                              │                                          │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
              ┌────────────────┼──────────────────┐
              │                │                  │
    ┌─────────▼──────────┐    │         ┌────────▼────────────┐
    │  AWS RDS MySQL     │    │         │  AWS Cognito        │
    │  (Private Subnet)  │    │         │  User Pool          │
    │  complaints        │    │         │                     │
    │  users             │    │         │  Groups:            │
    │  complaint_logs    │    │         │  - Students         │
    └────────────────────┘    │         │  - SuperAdmin       │
                              │         │  - FoodAdmin        │
                    ┌─────────▼──────┐  │  - WaterAdmin       │
                    │  AWS SES       │  │  - RoomAdmin        │
                    │  (Email)       │  │  - ElectricalAdmin  │
                    │  Notifications │  │  - CleaningAdmin    │
                    │  PDF via email │  └─────────────────────┘
                    └────────────────┘
```

---

## 2. Request Lifecycle (Mandatory Flow)

```
Client
  ↓  HTTP Request to EC2 Public IP (Port 80)
Nginx (Reverse Proxy)
  ↓  Routes /api/* → Backend container (localhost:5000)
  ↓  Routes /      → Serves static React build files
Backend Container (Node.js Express on Port 5000)
  ↓  Verifies Cognito JWT → Identifies user + role (Cognito Group)
  ↓  Role-based middleware gates the request
  ↓  Queries / mutates database using private RDS endpoint
RDS MySQL (Private Subnet)
  ↑  Returns data
Backend Container
  ↑  [If stage transition triggers notification] → Calls AWS SES API
  ↑  JSON Response
Nginx
  ↑  Response forwarded to Client
Client
  ↑  React updates UI
```

---

## 3. AWS Infrastructure Layer

### 3.1 VPC Layout

```
VPC (e.g., 10.0.0.0/16)
├── Public Subnet (10.0.1.0/24)
│   └── EC2 Instance (t2.micro)
│       ├── Docker Engine
│       ├── Nginx (host, Port 80)
│       └── Backend Docker Container (Port 5000, internal)
│
└── Private Subnet (10.0.2.0/24)
    └── RDS MySQL (Port 3306, internal only)

AWS Managed Services (outside VPC, accessed via Internet/SDK):
├── AWS Cognito User Pool  — user auth & role groups
└── AWS SES               — email notifications
```

### 3.2 EC2 Instance

| Property         | Value                        |
|------------------|------------------------------|
| Type             | t2.micro (free tier)         |
| OS               | Ubuntu 22.04 LTS             |
| Role             | Runs Docker + Nginx          |
| Public IP        | Elastic IP                   |

### 3.3 RDS Instance

| Property           | Value                     |
|--------------------|---------------------------|
| Engine             | MySQL 8.x                 |
| Type               | db.t3.micro (free tier)   |
| Subnet             | Private (no public access)|
| Port               | 3306                      |

### 3.4 AWS Cognito

| Property           | Value                               |
|--------------------|-------------------------------------|
| Type               | User Pool                           |
| Auth               | Username + Password (or email/pass) |
| Groups             | Students, SuperAdmin, FoodAdmin, WaterAdmin, RoomAdmin, ElectricalAdmin, CleaningAdmin |
| Token Type         | JWT (ID Token + Access Token)       |
| Integration        | Backend verifies tokens using Cognito JWKS endpoint |

### 3.5 AWS SES (Simple Email Service)

| Property           | Value                               |
|--------------------|-------------------------------------|
| Purpose            | Email notifications to category admins on assignment |
| Trigger            | Stage 2 → 3 transition (Super Admin assigns) |
| From address       | `noreply@dormdesk.com` (verified in SES) |
| Mode               | Sandbox (for dev) / Production (after AWS approval) |

---

## 4. Security Group Definitions

### EC2 Security Group

| Rule    | Protocol | Port | Source       | Reason              |
|---------|----------|------|--------------|---------------------|
| Inbound | TCP      | 80   | 0.0.0.0/0    | Public HTTP access  |
| Inbound | TCP      | 22   | Your IP only | SSH management      |
| Outbound| All      | All  | 0.0.0.0/0    | Responses + AWS API calls (Cognito/SES/RDS) |

### RDS Security Group

| Rule    | Protocol | Port | Source           | Reason                    |
|---------|----------|------|------------------|---------------------------|
| Inbound | TCP      | 3306 | EC2 Security Group | Only EC2 reaches DB    |

---

## 5. Authentication Flow (AWS Cognito)

```
User (Student or Admin)
  ↓ Enters username + password in React form
Frontend
  ↓ Calls Cognito (AWS SDK / Amplify Auth) with credentials
AWS Cognito User Pool
  ↓ Validates credentials
  ↓ Returns: ID Token + Access Token (JWTs)
Frontend
  ↓ Stores token in localStorage (or memory)
  ↓ Attaches to every API call: Authorization: Bearer <id_token>
Backend (Node.js)
  ↓ Receives request with Cognito JWT
  ↓ Fetches public keys from Cognito JWKS endpoint (cached)
  ↓ Verifies JWT signature and expiry
  ↓ Extracts: sub (user ID), email, cognito:groups (role list)
  ↓ Injects req.user = { sub, email, groups } into request context
  ↓ Role middleware checks groups → gates access
```

### Why Cognito over Custom JWT?

| Aspect                  | Custom bcrypt + JWT        | AWS Cognito                            |
|-------------------------|----------------------------|-----------------------------------------|
| Token management        | Manual (issue/revoke)      | Managed (auto refresh, revocation)      |
| MFA support             | Must build yourself        | Built-in (TOTP/SMS)                     |
| Password policy         | Must build yourself        | Configurable in Cognito console         |
| Group/role management   | Must manage in DB          | Cognito Groups (synced to JWT claims)   |
| Scalability             | Limited by your JWT secret | AWS-managed at scale                    |
| Compliance              | DIY                        | SOC2/ISO certified                      |
| Production-readiness    | Medium effort              | High — industry standard                |

---

## 6. Admin Role Architecture

### Cognito Groups → Backend Middleware Mapping

```
Cognito Group "SuperAdmin"
  → req.user.groups.includes('SuperAdmin')
  → superAdminMiddleware()
  → Full access: all categories, all stages, delete, edit, send notifications

Cognito Group "WaterAdmin"
  → req.user.groups.includes('WaterAdmin')
  → categoryAdminMiddleware('water')
  → Restricted: only water complaints, only Stage 2→3→4 transitions

Cognito Group "Students"
  → req.user.groups.includes('Students')
  → studentMiddleware()
  → Can only submit and view own complaints
```

### Category → Cognito Group → Email Mapping

| Complaint Category | Cognito Group      | Admin Email (in SES)           |
|--------------------|--------------------|-------------------------------|
| `water`            | `WaterAdmin`       | `water_admin@hostel.edu`       |
| `food`             | `FoodAdmin`        | `food_admin@hostel.edu`        |
| `room`             | `RoomAdmin`        | `room_admin@hostel.edu`        |
| `electrical`       | `ElectricalAdmin`  | `electrical_admin@hostel.edu`  |
| `cleaning`         | `CleaningAdmin`    | `cleaning_admin@hostel.edu`    |

---

## 7. Complaint Stage State Machine

```
             [Student Submits]
                    │
             ┌──────▼──────┐
             │   STAGE 1   │  status: "received"
             │  🟡 Open    │  Visible to: Student, Category Admin, Super Admin
             └──────┬──────┘
                    │ Action: Acknowledge (Super Admin OR Category Admin)
             ┌──────▼──────┐
             │   STAGE 2   │  status: "acknowledged"
             │  🔵 Read    │  Email/PDF sent to Category Admin (if Super Admin assigns)
             └──────┬──────┘
                    │ Action: Start Work (Category Admin OR Super Admin)
             ┌──────▼──────┐
             │   STAGE 3   │  status: "in-progress"
             │  🟠 Working │
             └──────┬──────┘
                    │ Action: Close (Category Admin OR Super Admin)
             ┌──────▼──────┐
             │   STAGE 4   │  status: "resolved"
             │  🟢 Done    │
             └─────────────┘
```

---

## 8. Notification System

### Trigger: Super Admin assigns complaint (Stage 2 transition or Stage 2→3)
### Method: AWS SES email + optional PDF attachment

```
Backend receives PATCH /api/complaints/:id/stage
  ↓ currentStage = 2, newStage = 3, assignedCategory = 'water'
  ↓ Look up WaterAdmin email from category→email config table
  ↓ Generate PDF work order (pdfkit)
  ↓ Call AWS SES API:
      From: noreply@dormdesk.com
      To: water_admin@hostel.edu
      Subject: [DormDesk] Complaint #42 assigned to you
      Body: Complaint details
      Attachment: complaint_42_workorder.pdf
  ↓ Log notification in DB
  ↓ Return 200 to Super Admin frontend
```

---

## 9. Technology Stack Summary

| Layer               | Technology                  | Where it runs             |
|---------------------|-----------------------------|---------------------------|
| Frontend            | React.js (Vite, production build) | Nginx on EC2 host    |
| Backend             | Node.js + Express.js        | Docker container on EC2   |
| Database            | MySQL 8                     | AWS RDS (private subnet)  |
| Reverse Proxy       | Nginx                       | EC2 host (port 80)        |
| Containerization    | Docker                      | EC2 host                  |
| Authentication      | AWS Cognito User Pool       | AWS managed               |
| Role Management     | Cognito Groups              | AWS managed               |
| Email Notifications | AWS SES                     | AWS managed               |
| PDF Generation      | pdfkit (npm)                | Inside backend container  |
| Cloud Provider      | AWS (EC2 + RDS + Cognito + SES) | AWS Region            |

---

## 10. Serverful vs Serverless — Why EC2 + RDS

> See `docs/10_serverful_vs_serverless.md` for the full breakdown.

EC2 + RDS is chosen because the evaluation criteria explicitly requires:
- Manual Docker container management
- Manual Nginx reverse proxy configuration
- Manual Security Group & port management

These are invisible/absent in a serverless Amplify/Lambda deployment.

---

*Document version: 2.0 | Updated: 2026-02-26 — Added Cognito auth, category admin roles, complaint stages, SES notifications*
