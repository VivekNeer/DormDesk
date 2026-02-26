# 🔄 Request Lifecycle — End to End

> A complete walkthrough of what happens when a user interacts with DormDesk — from the browser click to the database and back.

---

## Example Request: Student Submits a Complaint

We'll trace `POST /api/complaints/` — submitting a new complaint.

---

## Step-by-Step Lifecycle

### Step 1 — Browser Sends HTTP Request

The student is on `http://<EC2_IP>/student` and clicks "Submit Complaint".

React's `ComplaintForm.jsx` calls:
```js
api.post('/complaints', {
  category: 'plumbing',
  description: 'Pipe is leaking',
  priority: 'high'
});
```

The Axios instance has a `baseURL` of `/api`, so the actual request is:
```
POST http://<EC2_IP>/api/complaints
Authorization: Bearer <jwt-token>
Content-Type: application/json
Body: { "category": "plumbing", "description": "...", "priority": "high" }
```

This goes to **EC2's public IP on Port 80** (the only public-facing port).

---

### Step 2 — AWS Security Group Evaluates the Packet

The incoming TCP packet arrives at the EC2 instance.

AWS Security Group checks inbound rules:
- Port 80? ✅ Allowed (0.0.0.0/0)
- Packet passes through to the EC2 OS.

---

### Step 3 — Nginx Receives the Request (Port 80)

Nginx is listening on port 80.

It checks its configuration:
```nginx
location /api/ {
    proxy_pass http://localhost:5000/;
}
```

The path `/api/complaints` matches `/api/`. Nginx:
1. Strips the `/api` prefix
2. Forwards the request to `http://localhost:5000/complaints`
3. Adds headers: `Host`, `Upgrade`, `Connection`

---

### Step 4 — Request Reaches the Backend Container

The request arrives at the Node.js/Express app running in the Docker container on port 5000.

Express routing:
```
POST http://localhost:5000/complaints
```

Express middleware chain executes in order:
1. `cors()` — adds CORS headers to response
2. `express.json()` — parses JSON request body
3. `auth.js` middleware — checks `Authorization: Bearer <token>` header
   - Verifies JWT signature against `JWT_SECRET`
   - Decodes `{ id: 42, role: 'student' }` from the token
   - Injects `req.user = { id: 42, role: 'student' }`
4. Route handler for `POST /complaints` — executes

---

### Step 5 — Route Handler Processes the Request

```js
// routes/complaints.js
router.post('/', auth, async (req, res) => {
  const { category, description, priority } = req.body;
  const userId = req.user.id;

  await db.query(
    `INSERT INTO complaints (user_id, category, description, priority)
     VALUES (?, ?, ?, ?)`,
    [userId, category, description, priority]
  );

  res.status(201).json({ message: 'Complaint submitted' });
});
```

The handler:
1. Extracts `category`, `description`, `priority` from `req.body`
2. Gets `userId` from `req.user` (set by auth middleware)
3. Calls `db.query()` to insert into RDS

---

### Step 6 — Backend Connects to RDS

The MySQL connection pool (`config/db.js`) executes:
```sql
INSERT INTO complaints (user_id, category, description, priority) 
VALUES (42, 'plumbing', 'Pipe is leaking', 'high');
```

This goes over the **VPC's private network** to the RDS endpoint:
```
<EC2-Private-IP>:XXXXX → <RDS-Private-IP>:3306
```

Key points:
- This never touches the public internet
- Goes through the private subnet
- RDS Security Group allows this because EC2's SG is whitelisted on port 3306

RDS stores the row and returns the new record's insert ID.

---

### Step 7 — Response Travels Back

```
RDS → Backend Container (Port 5000)
Backend → Express sends JSON: { "message": "Complaint submitted" }
→ Nginx receives the response from localhost:5000
→ Nginx forwards response to client
→ Client (Browser) receives 201 Created + JSON body
→ React updates UI: shows new complaint in the list
```

---

## Full Visual Lifecycle

```
Browser (Student)
  │
  │ POST http://<EC2_IP>/api/complaints  [Port 80]
  ▼
AWS Security Group
  │ ✅ Port 80 allowed
  ▼
EC2 Host
  │
  ▼
Nginx (Port 80)
  │ Matches location /api/
  │ proxy_pass http://localhost:5000/complaints
  ▼
Docker Container (Port 5000)
  │
  ▼
Express Middleware Chain
  │ cors() → json() → auth.js (verifies JWT) → route handler
  ▼
MySQL Query
  │ INSERT INTO complaints ...
  ▼
RDS MySQL (Port 3306, Private Subnet)
  │ Row inserted
  ▼
Express Response: { "message": "Complaint submitted" } [201]
  │
  ▼
Nginx
  │ Forwards response
  ▼
Browser
  │ React updates component state → re-renders complaint list
  ▼
Student sees their complaint appear ✅
```

---

## Request Lifecycle for Page Load (GET /)

When the user first opens `http://<EC2_IP>/`:

```
Browser
  │ GET http://<EC2_IP>/
  ▼
AWS Security Group → ✅ Port 80
  ▼
Nginx (Port 80)
  │ Matches location /
  │ root /var/www/html/dormdesk; index index.html;
  │ try_files / → found? yes → serve index.html
  ▼
Browser receives index.html
  ▼
Browser fetches linked JS/CSS bundle assets (/assets/main.abc.js)
  │ Nginx serves from /var/www/html/dormdesk/assets/
  ▼
React app boots in browser
  │ Reads localStorage for JWT token
  │ If found → redirects to /student or /admin
  │ If not found → redirects to /login
  ▼
User sees the Login page ✅
```

---

## Why Each Layer Exists

| Layer          | Role                                     | What Would Break Without It                       |
|----------------|------------------------------------------|----------------------------------------------------|
| AWS SG         | Outer firewall                           | Attackers could reach port 5000 or 3306 directly  |
| Nginx          | Reverse proxy + static file server       | Backend would need to serve frontend + be public   |
| Auth Middleware | JWT verification on every API request   | Anyone could submit complaints as any user         |
| Docker         | Isolated runtime                         | Node.js must be installed manually, harder to manage|
| RDS Private SG | Inner database protection               | Database port reachable from anywhere in VPC      |

---

*Document version: 1.0 | Created: 2026-02-26*
