# 👤 DormDesk — User Flow & Role Design

> This document defines the complete user journey, complaint lifecycle, and admin role hierarchy for DormDesk.

---

## 1. User Types & Roles

```
DormDesk Users
├── Student
│   └── Regular hostel resident
│
└── Admin (3 tiers)
    ├── Category Admin (food / water / room / electrical / cleaning / other)
    │   └── One dedicated account per category → assigned to a real person
    └── Super Admin
        └── Unrestricted access across all categories and all stages
```

---

## 2. Complete User Flow

### 2.1 Student Flow

```
[Student lands on DormDesk]
        ↓
[Login / Create Account]  ← via AWS Cognito hosted UI or custom form
        ↓
[Student Dashboard]
        ↓ Clicks "New Complaint"
[Fill Complaint Form]
  - Category (food / water / room / electrical / cleaning / other)
  - Description (free text)
  - Priority (low / medium / high)
        ↓ Submit
[Complaint Created — Stage 1: Received]
        ↓
[Student can view their complaints + current stage on dashboard]
        ↓ (later, as admin updates stages)
[Student sees status update in real-time]
```

### 2.2 Super Admin Flow

```
[Super Admin logs in via Cognito]
        ↓
[Super Admin Dashboard]
  - Sees ALL complaints across ALL categories
  - Full filtering: by category, priority, stage, date
        ↓ Selects a complaint
[Can perform ANY stage action]
  - Stage 1 → 2: Mark as "Read" (acknowledge receipt)
  - Stage 2 → 3: Mark as "In Progress" (assign to category admin)
        ↓ On assignment to Stage 3:
  - System sends email notification to the responsible category admin
  OR generates a PDF work order and sends it via email
  - Stage 3 → 4: Close complaint as "Done"
        ↓
[Complaint closed, student can see it resolved]
```

### 2.3 Category Admin Flow

```
[Category Admin logs in] — e.g., "water_admin" account
        ↓
[Category Admin Dashboard]
  - Sees ONLY complaints in their assigned category (e.g., Water)
  - Can see all stages for visibility
        ↓ On a complaint in Stage 2 (assigned to them)
[ALLOWED ACTIONS:]
  - Stage 2 → 3: Mark as "In Progress" (they've started working)
  - Stage 3 → 4: Mark as "Done" (work is complete)
[BLOCKED ACTIONS:]
  - Cannot delete complaints
  - Cannot reassign complaints to other categories
  - Cannot access other category's complaints
  - Cannot access Super Admin tools
```

---

## 3. Complaint Lifecycle — 4 Stages

```
┌──────────────────────────────────────────────────────────────┐
│                    COMPLAINT LIFECYCLE                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Student Submits]                                           │
│         ↓                                                    │
│  ┌─────────────────┐                                         │
│  │   STAGE 1       │  "Received"                             │
│  │   🟡 Open       │  Complaint created, no one has read it  │
│  └────────┬────────┘                                         │
│           │ Super Admin or Category Admin reads it           │
│           ↓                                                  │
│  ┌─────────────────┐                                         │
│  │   STAGE 2       │  "Acknowledged"                         │
│  │   🔵 Read       │  Responsible person has seen it         │
│  └────────┬────────┘                                         │
│           │ Super Admin assigns / Category Admin picks up    │
│           │ → Email/PDF sent to responsible person           │
│           ↓                                                  │
│  ┌─────────────────┐                                         │
│  │   STAGE 3       │  "In Progress"                          │
│  │   🟠 Working    │  Person is actively fixing the issue    │
│  └────────┬────────┘                                         │
│           │ Work completed                                   │
│           ↓                                                  │
│  ┌─────────────────┐                                         │
│  │   STAGE 4       │  "Resolved"                             │
│  │   🟢 Done       │  Complaint closed                       │
│  └─────────────────┘                                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Admin Role Hierarchy & Permissions

### Roles

| Role             | Cognito Group      | Assigned To                     |
|------------------|--------------------|---------------------------------|
| `super_admin`    | `SuperAdmin`       | Project lead / hostel director  |
| `food_admin`     | `FoodAdmin`        | Mess/canteen manager            |
| `water_admin`    | `WaterAdmin`       | Plumbing maintenance team       |
| `room_admin`     | `RoomAdmin`        | Room allocation officer         |
| `electrical_admin` | `ElectricalAdmin` | Electrical dept head           |
| `cleaning_admin` | `CleaningAdmin`    | Housekeeping supervisor         |
| `student`        | `Students`         | Hostel residents                |

### Permission Matrix

| Action                     | Student | Category Admin | Super Admin |
|----------------------------|---------|----------------|-------------|
| Submit complaint           | ✅      | ❌             | ❌           |
| View own complaints        | ✅      | ❌             | ❌           |
| View own category complaints | ❌   | ✅             | ✅           |
| View ALL complaints        | ❌      | ❌             | ✅           |
| Stage 1 → 2 (Acknowledge)  | ❌      | ✅ (own cat)   | ✅ (any)    |
| Stage 2 → 3 (Start work)   | ❌      | ✅ (own cat)   | ✅ (any)    |
| Stage 3 → 4 (Close)        | ❌      | ✅ (own cat)   | ✅ (any)    |
| Send email/PDF notification| ❌      | ❌             | ✅           |
| Edit complaint details     | ❌      | ✅ (own cat)   | ✅ (any)    |
| Delete complaint           | ❌      | ❌             | ✅           |
| Filter by any field        | ❌      | ✅ (within category) | ✅    |

---

## 5. Notification / Assignment System

### When Super Admin moves a complaint to Stage 3 (In Progress):

**Option A — Email Notification (via AWS SES)**
```
From: noreply@dormdesk.com
To: water_admin@hostel.edu
Subject: [DormDesk] New complaint assigned — #42 (Water / High Priority)

A new complaint has been assigned to you for action.

Complaint #42
Category: Water
Priority: High
Description: "Pipe leaking in Room 204 bathroom since 2 days"
Submitted by: Student (Room 204)
Assigned at: 2026-02-26 23:30

Please log in to update progress:
http://<EC2_IP>/admin
```

**Option B — PDF Work Order (via pdfkit)**
- System generates a PDF with complaint details
- PDF is attached to the email or downloadable from the admin panel
- PDF contains: Complaint ID, description, submitted by, date, assigned to, priority

### Notification trigger:
```
Super Admin clicks "Assign & Move to Stage 3"
→ Backend creates notification record
→ Backend calls AWS SES API (send email)
OR
→ Backend generates PDF using pdfkit
→ Backend emails PDF attachment via SES
→ Category admin sees Stage 3 complaint in their dashboard
```

---

## 6. Complaint Edit Permissions

When a complaint is in **Stage 1 or 2**, the admin can modify:
- Category (in case student miscategorized)
- Description (clarification)
- Priority (upgrade/downgrade based on assessment)

Once **Stage 3 or 4**, complaint details are **locked** — only stage progression is allowed.

---

## 7. Audit Trail

Every stage change should be recorded:

```sql
complaint_logs:
  id, complaint_id, changed_by_user_id, from_stage, to_stage, note, changed_at
```

This gives a full history:
```
Complaint #42 History:
  Stage 1 → 2 | Read by water_admin | 2026-02-26 23:40
  Stage 2 → 3 | Assigned by super_admin | 2026-02-26 23:45 | "Please fix urgently"
  Stage 3 → 4 | Closed by water_admin | 2026-02-27 10:00 | "Pipe replaced"
```

---

*Document version: 1.0 | Created: 2026-02-26*
