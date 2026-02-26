# 🔨 DormDesk — Construction Plan (v2)
## Everything That Needs to Be Built, Configured & Verified

> This document details **every component** that must be created or configured, with file names, purpose, and ownership (Person A / Person B split).
> 
> **v2 changes:** AWS Cognito auth · Category Admin roles · 4-stage complaint lifecycle · SES email notifications · PDF work orders · Audit trail

---

## 📁 Final Project Directory Structure

```
DormDesk/
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   ├── package.json
│   ├── server.js                  ← Express app entry point
│   ├── config/
│   │   ├── db.js                  ← MySQL RDS connection pool
│   │   └── cognito.js             ← Cognito JWKS config + verifier
│   ├── middleware/
│   │   ├── auth.js                ← Verifies Cognito JWT, injects req.user
│   │   ├── requireStudent.js      ← Gate: Cognito group = Students
│   │   ├── requireCategoryAdmin.js← Gate: Cognito group = *Admin (not Super)
│   │   └── requireSuperAdmin.js   ← Gate: Cognito group = SuperAdmin
│   ├── routes/
│   │   ├── users.js               ← /api/users/* (sync Cognito user to DB)
│   │   ├── complaints.js          ← /api/complaints/* (CRUD + stage transitions)
│   │   └── notifications.js       ← /api/notifications/* (send SES / get log)
│   ├── services/
│   │   ├── emailService.js        ← AWS SES integration
│   │   └── pdfService.js          ← pdfkit PDF work order generation
│   └── models/
│       ├── user.js                ← User DB queries
│       ├── complaint.js           ← Complaint DB queries
│       ├── complaintLog.js        ← Audit trail queries
│       └── notification.js        ← Notification log queries
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js             ← build output to dist/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/
│       │   └── axios.js           ← Axios instance with /api base URL + Cognito token
│       ├── auth/
│       │   ├── cognito.js         ← AWS Amplify Auth / Cognito SDK setup
│       │   └── AuthContext.jsx    ← Global auth state (user, token, role, groups)
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── StudentDashboard.jsx
│       │   ├── CategoryAdminDashboard.jsx
│       │   └── SuperAdminDashboard.jsx
│       └── components/
│           ├── ComplaintForm.jsx      ← Submit form (student)
│           ├── ComplaintCard.jsx      ← Display complaint + stage badge
│           ├── StageProgressBar.jsx   ← Visual 4-stage progress indicator
│           ├── AdminComplaintList.jsx ← Admin view with filters + stage actions
│           └── ProtectedRoute.jsx     ← Guards routes by Cognito group
│
├── nginx/
│   └── dormdesk.conf           ← Production Nginx server block
│
├── database/
│   └── schema.sql              ← Initial DB schema (tables + seed)
│
├── docs/
│   ├── 01_architecture.md           ← Full system architecture
│   ├── 02_construction_plan.md      ← This file
│   ├── 03_build_phases.md           ← Phase-by-phase build guide
│   ├── 04_deployment_runbook.md     ← Step-by-step deployment commands
│   ├── 05_deliverables_checklist.md ← Final submission checklist
│   ├── 06_nginx_explanation.md      ← Nginx config explained
│   ├── 07_docker_explanation.md     ← Dockerfile explained
│   ├── 08_networking_security.md    ← Firewall strategy
│   ├── 09_request_lifecycle.md      ← End-to-end lifecycle
│   ├── 10_serverful_vs_serverless.md← Comparison
│   └── 11_user_flow_and_roles.md    ← User flow + admin roles
│
├── .gitignore
└── README.md
```

---

## 🧱 Component-by-Component Construction List

---

### SECTION 0 — AWS Cognito Setup (Before everything else)

#### C1: Create Cognito User Pool
- Go to AWS Cognito → Create User Pool
- Sign-in option: `Email`
- Password policy: at least 8 chars, uppercase + lowercase + number
- MFA: optional (off for project)
- Required attributes: `email`, `name`
- Note down: **User Pool ID** and **App Client ID**

#### C2: Create Cognito Groups
In the User Pool → Groups tab, create:
- `Students`
- `SuperAdmin`
- `FoodAdmin`
- `WaterAdmin`
- `RoomAdmin`
- `ElectricalAdmin`
- `CleaningAdmin`

#### C3: Create Admin User Accounts Manually
- In Cognito → Users → Create user for each admin (super + each category)
- Assign each to the correct group
- Note the Cognito `sub` (UUID) for each user → needed to seed the DB

#### C4: Install Cognito SDK in Backend
```bash
npm install aws-jwt-verify      # AWS-recommended JWT verifier for Cognito
```

---

### SECTION 1 — Database Layer (RDS MySQL)

#### D1: AWS RDS Instance Setup
- **What:** Create a MySQL 8 RDS instance inside a private subnet
- **Configuration:**
  - DB name: `dormdesk`
  - Username: `admin`
  - Password: stored in `.env`
  - Publicly Accessible: **No**
  - VPC Security Group: only allow EC2 SG inbound on 3306
- **Output:** RDS endpoint URL

#### D2: Tables in `database/schema.sql`
Five tables (see full schema file for SQL):

| Table                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `users`                | All users, linked to Cognito by `cognito_sub`        |
| `complaints`           | Core complaint record with 4-stage field             |
| `complaint_logs`       | Audit trail of every stage change with actor + note  |
| `notifications`        | Log of every SES email sent (complaint_id, to, time) |
| `admin_category_config`| Maps complaint category → category admin's email     |

- **How to apply:** `mysql -h <rds-endpoint> -u admin -p dormdesk < database/schema.sql`

---

### SECTION 2 — Backend (Node.js + Express)

#### B1: `backend/package.json`
Dependencies needed:
```json
{
  "dependencies": {
    "express": "^4.x",
    "mysql2": "^3.x",
    "aws-jwt-verify": "^4.x",
    "@aws-sdk/client-ses": "^3.x",
    "pdfkit": "^0.15.x",
    "cors": "^2.x",
    "dotenv": "^16.x"
  }
}
```
> Note: `bcryptjs` and `jsonwebtoken` are **removed** — Cognito handles all password hashing and JWT issuance.

#### B2: `backend/server.js` — Express App Entry Point
- Express app initialization
- CORS configuration
- Mount routers: `/api/users`, `/api/complaints`, `/api/notifications`
- Health check route: `GET /api/health → 200 OK`
- Listen on `process.env.PORT` (default 5000)

#### B3: `backend/config/db.js` — MySQL Connection Pool
- Use `mysql2` with a connection pool
- Read `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` from `.env`
- Export `pool.promise()` for async/await query support

#### B4: `backend/config/cognito.js` — Cognito JWT Verifier
```js
import { CognitoJwtVerifier } from 'aws-jwt-verify';
export const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID,
});
```
This verifier fetches and caches Cognito's public JWKS keys.

#### B5: `backend/middleware/auth.js` — Cognito JWT Middleware
- Reads `Authorization: Bearer <cognito-id-token>`
- Verifies using `aws-jwt-verify` against Cognito User Pool
- Extracts: `sub`, `email`, `name`, `cognito:groups`
- Injects `req.user = { sub, email, name, groups }` on success
- Returns 401 if token missing, expired, or invalid

#### B6: Role Guard Middlewares
- `requireStudent.js` → checks `req.user.groups.includes('Students')`
- `requireCategoryAdmin.js` → checks groups for any `*Admin` (non-Super)
  - Also extracts which category the admin owns
  - Ensures they can only touch their category's complaints
- `requireSuperAdmin.js` → checks `req.user.groups.includes('SuperAdmin')`

#### B7: `backend/routes/users.js` — User Sync Route
| Method | Path            | Action                                | Auth |
|--------|-----------------|---------------------------------------|------|
| POST   | /api/users/sync | Sync Cognito user to DB on first login | Any  |

Cognito doesn't auto-create DB records. On first login, the frontend calls `/api/users/sync` to create/update the user in MySQL using the Cognito `sub`.

#### B8: `backend/routes/complaints.js` — Complaint Routes
| Method | Path                          | Action                                  | Auth                    |
|--------|-------------------------------|-----------------------------------------|-------------------------|
| POST   | /api/complaints/              | Submit new complaint (Stage 1)          | Student                 |
| GET    | /api/complaints/mine          | Get own complaints + their stage        | Student                 |
| GET    | /api/complaints/              | Get complaints (filtered by category)   | Category Admin          |
| GET    | /api/complaints/              | Get ALL complaints                      | Super Admin             |
| PATCH  | /api/complaints/:id           | Edit category/description/priority      | Admin (Stage 1 or 2 only)|
| PATCH  | /api/complaints/:id/stage     | Advance to next stage (with note)       | Admin (rules enforced)  |
| GET    | /api/complaints/:id/logs      | View audit trail for a complaint        | Admin                   |

**Stage transition rules (enforced in backend):**
- Stage 1 → 2: Any admin can acknowledge
- Stage 2 → 3: Super Admin assigns; triggers SES email to category admin
- Stage 3 → 4: Category Admin (own category) or Super Admin can close
- Category Admin **cannot** jump stages (must go 2→3→4 in order)

#### B9: Backend Service Files

**`backend/services/emailService.js`** — AWS SES integration
```js
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
const ses = new SESClient({ region: process.env.AWS_REGION });

export async function sendAssignmentEmail({ toEmail, complaint, assignedByName }) {
  await ses.send(new SendEmailCommand({
    Source: process.env.SES_FROM_EMAIL,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: `[DormDesk] Complaint #${complaint.id} assigned to you` },
      Body: { Text: { Data: buildEmailBody(complaint, assignedByName) } }
    }
  }));
}
```

**`backend/services/pdfService.js`** — pdfkit work order generation
```js
import PDFDocument from 'pdfkit';
export function generateWorkOrderPDF(complaint) {
  const doc = new PDFDocument();
  // write: Complaint ID, category, description, priority, student, date
  return doc; // streamed to buffer, attached to SES email
}
```

#### B10: `backend/Dockerfile`
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

#### B11: `backend/.env.example`
```
# Database
DB_HOST=<rds-endpoint>
DB_PORT=3306
DB_NAME=dormdesk
DB_USER=admin
DB_PASS=changeme

# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXX

# AWS SES
AWS_REGION=us-east-1
SES_FROM_EMAIL=noreply@dormdesk.com

# App
NODE_ENV=production
PORT=5000
```

---

### SECTION 3 — Frontend (React + Vite)

#### F1: React App Initialization
```bash
npm create vite@latest frontend -- --template react
cd frontend && npm install axios react-router-dom aws-amplify @aws-amplify/ui-react
```

#### F2: `frontend/src/auth/cognito.js` — Amplify Cognito Config
```js
import { Amplify } from 'aws-amplify';
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    }
  }
});
```

Auth operations via `aws-amplify`:
```js
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
// fetchAuthSession() returns the Cognito ID token for API calls
```

#### F3: `frontend/src/api/axios.js` — Axios Instance
```js
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const api = axios.create({ baseURL: '/api' });

// Attach Cognito ID Token to every request
api.interceptors.request.use(async cfg => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
export default api;
```

#### F4: `frontend/src/auth/AuthContext.jsx`
- Wraps entire app
- On mount: calls `getCurrentUser()` to check if logged in
- Stores: `{ user, groups, isLoading }`
- `groups` is extracted from the Cognito ID token's `cognito:groups` claim
- Provides `login()`, `logout()` methods

#### F5: Pages to Build
| Page                          | Route           | Who Sees It        |
|-------------------------------|-----------------|--------------------|
| `Login.jsx`                   | `/login`        | All                |
| `Register.jsx`                | `/register`     | Students only      |
| `StudentDashboard.jsx`        | `/student`      | Students           |
| `CategoryAdminDashboard.jsx`  | `/admin`        | Category Admins    |
| `SuperAdminDashboard.jsx`     | `/superadmin`   | Super Admin        |

#### F6: Components to Build
| Component                 | Purpose                                                       |
|---------------------------|---------------------------------------------------------------|
| `ComplaintForm.jsx`       | Student form: category, description, priority                 |
| `ComplaintCard.jsx`       | Single complaint with colour-coded stage badge                |
| `StageProgressBar.jsx`    | Visual 4-step progress bar (Received→Acknowledged→In Progress→Done) |
| `AdminComplaintList.jsx`  | Admin view with filter bar + action buttons per stage          |
| `StageActionButton.jsx`   | Context-aware button: advances stage, triggers confirmation    |
| `ProtectedRoute.jsx`      | Checks auth + group; redirects if unauthorized               |

#### F7: `ProtectedRoute.jsx` — Group-Based Guards
```jsx
<ProtectedRoute allowedGroups={['Students']}>
  <StudentDashboard />
</ProtectedRoute>

<ProtectedRoute allowedGroups={['SuperAdmin']}>
  <SuperAdminDashboard />
</ProtectedRoute>

<ProtectedRoute allowedGroups={['FoodAdmin','WaterAdmin','RoomAdmin','ElectricalAdmin','CleaningAdmin']}>
  <CategoryAdminDashboard />
</ProtectedRoute>
```

#### F5: Frontend Build Command
```bash
cd frontend && npm run build
# Output: frontend/dist/
```
This `/dist` folder is copied to EC2 and served by Nginx.

---

### SECTION 4 — Nginx Configuration

#### N1: `nginx/dormdesk.conf`
```nginx
server {
    listen 80;
    server_name _;

    # Serve React SPA build files
    root /var/www/html/dormdesk;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy REST API
    location /api/ {
        proxy_pass         http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### N2: Install & Enable on EC2
```bash
sudo apt install -y nginx
sudo cp nginx/dormdesk.conf /etc/nginx/sites-available/dormdesk
sudo ln -s /etc/nginx/sites-available/dormdesk /etc/nginx/sites-enabled/
sudo nginx -t                 # Test config syntax
sudo systemctl reload nginx
```

---

### SECTION 5 — AWS Infrastructure Setup

#### A1: VPC & Subnets
- Use default VPC or create a new one with public + private subnets

#### A2: EC2 Instance
- Launch Ubuntu 22.04 t2.micro
- Assign to public subnet
- Attach Elastic IP
- Configure EC2 Security Group (Port 80 open, Port 22 restricted to your IP)
- **IAM Role on EC2:** Attach an IAM role with permissions for `ses:SendEmail` and `ses:SendRawEmail` so the backend container can call SES without hardcoded AWS credentials

#### A3: RDS MySQL Instance
- Launch in private subnet
- Do NOT enable public access
- Note the endpoint URL
- Configure RDS Security Group (only EC2 SG can reach port 3306)

#### A4: Docker on EC2
```bash
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

#### A5: AWS Cognito User Pool
- Create User Pool (see Section 0 above)
- Note User Pool ID + App Client ID → go in `.env`

#### A6: AWS SES Setup
- Verify sender email address (e.g. `noreply@dormdesk.com`) in SES console
- For dev: add all recipient emails as verified identities (SES Sandbox mode)
- For production: request SES production access to send to any email
- Note: SES is free up to 62,000 emails/month when sent from EC2

---

### SECTION 6 — Documentation Deliverables

| Document                             | Description                                    |
|--------------------------------------|------------------------------------------------|
| `docs/01_architecture.md`            | Full system architecture with diagrams (v2)    |
| `docs/02_construction_plan.md`       | This file — everything that must be built (v2) |
| `docs/03_build_phases.md`            | Phase-by-phase construction guide              |
| `docs/04_deployment_runbook.md`      | Exact commands to deploy from scratch          |
| `docs/05_deliverables_checklist.md`  | Final checklist against grading rubric         |
| `docs/06_nginx_explanation.md`       | Nginx config line-by-line                      |
| `docs/07_docker_explanation.md`      | Dockerfile explained                           |
| `docs/08_networking_security.md`     | Firewall & port strategy                       |
| `docs/09_request_lifecycle.md`       | End-to-end request walkthrough                 |
| `docs/10_serverful_vs_serverless.md` | Conceptual comparison                          |
| `docs/11_user_flow_and_roles.md`     | User flow + admin role hierarchy               |

---

*Document version: 2.0 | Updated: 2026-02-26 — Cognito auth, category admin roles, 4-stage lifecycle, SES notifications*
