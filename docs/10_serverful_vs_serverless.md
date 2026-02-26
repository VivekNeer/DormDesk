# ☁️ Serverful vs Serverless — A Conceptual Comparison

> Required deliverable: Short conceptual comparison. Explains why DormDesk uses serverful (EC2 + RDS) instead of serverless (AWS Amplify / Lambda).

---

## Definitions

### Serverful (Traditional / Server-Based)
You **provision, configure, and manage** the servers yourself.

Examples: **AWS EC2 + RDS**, DigitalOcean Droplet, bare metal servers.

The "server" always exists, always runs, and you are responsible for everything that happens on it.

---

### Serverless
The cloud provider **manages the infrastructure for you**. You only deploy code or artifacts.

Examples: **AWS Lambda**, AWS Amplify, Vercel, Netlify, Google Cloud Run.

You don't provision servers — you just upload functions or builds. The platform scales automatically.

> ⚠️ "Serverless" doesn't mean there are no servers — it means you don't manage them.

---

## Side-by-Side Comparison

| Aspect                         | Serverful (EC2 + RDS)                          | Serverless (Amplify / Lambda)                     |
|--------------------------------|------------------------------------------------|---------------------------------------------------|
| **Infrastructure Control**     | Full control over OS, ports, packages          | Abstracted — managed by provider                  |
| **Reverse Proxy**              | Manually configure Nginx on the server         | Handled automatically by the platform             |
| **Port Management**            | Explicit port binding and firewall rules        | No port concept — URL routing managed by platform |
| **Container Lifecycle**        | You manage Docker: run, stop, restart          | Platform manages execution environment            |
| **Scalability**                | Manual (scale by upgrading EC2 type)           | Auto-scales on demand                             |
| **Cost Model**                 | Pay per hour (even when idle)                  | Pay per invocation (zero cost when idle)          |
| **Cold Start**                 | None — server is always running                | Possible delay on first request after inactivity  |
| **Persistent Connections**     | Yes — standard DB connections via pool         | Difficult — connection pooling is complex         |
| **Deployment Complexity**      | High — SSH, Docker, Nginx to manage             | Low — push to deploy via CLI or Git               |
| **Logging/Debugging**          | `docker logs`, SSH access, full visibility     | Platform logs (CloudWatch) — less granular control|
| **Security Responsibility**    | You manage SGs, firewall, OS patches           | Provider manages underlying infrastructure        |
| **Learning Value (for DevOps)**| ✅ Very high — exposes real infrastructure     | ❌ Low — hides all the important concepts         |

---

## Architecture Comparison

### Serverful — DormDesk on EC2 + RDS

```
[Client]
   ↓ Port 80
[EC2 — Nginx (configured by us)]
   ↓ proxy_pass localhost:5000
[Docker Container — Node.js (managed by us)]
   ↓ Port 3306 (private VPC)
[RDS MySQL (private subnet)]
```

Every arrow is **manually configured** by the engineering team.

---

### Serverless — DormDesk on Amplify + Lambda

```
[Client]
   ↓ HTTPS (managed by Amplify)
[Amplify CDN — serves React build (automatic)]
   ↓ API calls via Amplify's managed API endpoint
[Lambda Function — Node.js (managed execution)]
   ↓ (connection via managed VPC connector)
[Aurora Serverless MySQL (managed)]
```

None of the arrows are configured manually — the platform handles all routing, scaling, and networking.

---

## Why DormDesk Uses Serverful (EC2 + RDS)

The project evaluation criteria explicitly requires:

1. **Containerization (Docker)** — Serverless doesn't run Docker containers
2. **Reverse Proxy (Nginx)** — Amplify/Lambda handle routing automatically; no Nginx to configure
3. **Port management** — No concept of ports in serverless
4. **Security Group configuration** — Serverless abstracts networking entirely
5. **Request lifecycle explanation** — With EC2, every layer is visible and explainable

**Summary:** Serverless is better for production scalability, but EC2 + RDS is better for **demonstrating DevOps engineering knowledge** — which is exactly what this milestone project evaluates.

---

## When Would You Choose Each in Real Life?

### Choose Serverful (EC2) When:
- You need persistent processes or background workers
- You need fine-grained control over networking and firewall rules
- You're running stateful applications or custom software
- You need specific OS-level configurations
- Cost predictability matters (fixed hourly vs variable per-request)
- Database connections need to be persistent and pooled efficiently

### Choose Serverless When:
- You want zero infrastructure management
- Your workload is highly variable (traffic spikes + quiet periods)
- You want automatic scaling without provisioning
- You're building event-driven architectures (S3 triggers, API Gateway)
- Startup speed and developer productivity matter more than infrastructure control
- Cost optimization for low-traffic or sporadic workloads

---

## One-Paragraph Project Justification

> DormDesk is deployed using EC2 + RDS (serverful architecture) to satisfy the project's mandatory evaluation criteria, which requires demonstrating explicit infrastructure management skills: configuring Docker containers, setting up Nginx as a reverse proxy, managing AWS Security Groups, and implementing a production networking strategy with internal/external port isolation. These skills are invisible in a serverless deployment, where the platform abstracts all infrastructure decisions. Although serverless solutions like AWS Amplify would be simpler to deploy and auto-scale, they would not allow us to demonstrate understanding of container lifecycle management, port binding strategy, or reverse proxy configuration — all of which are explicitly graded components of this milestone.

---

*Document version: 1.0 | Created: 2026-02-26*
