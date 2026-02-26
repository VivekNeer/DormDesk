# 🔐 Networking & Firewall Strategy

> Explains the full network security model for DormDesk's AWS deployment — for viva defense and submission.

---

## Network Topology

```
INTERNET
   │
   │ Port 80 ONLY
   ▼
┌─────────────────────────────────────────────┐
│        AWS VPC (Virtual Private Cloud)      │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │       Public Subnet                  │   │
│  │                                      │   │
│  │   EC2 Instance (Ubuntu)              │   │
│  │   ┌──────────────────────────────┐   │   │
│  │   │ Nginx (Port 80)              │   │   │
│  │   │ Backend Container (Port 5000)│   │   │
│  │   └──────────────────────────────┘   │   │
│  │                                      │   │
│  └───────────────────┬──────────────────┘   │
│                      │                      │
│            Port 3306 (internal only)        │
│                      │                      │
│  ┌───────────────────▼──────────────────┐   │
│  │       Private Subnet                 │   │
│  │   RDS MySQL (NOT internet-facing)    │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Security Group: EC2 Instance

Security Groups are **AWS's virtual firewalls** that control traffic in/out of instances.

### EC2 Inbound Rules

| Rule Type | Protocol | Port Range | Source       | Purpose                    |
|-----------|----------|------------|--------------|----------------------------|
| HTTP      | TCP      | 80         | 0.0.0.0/0   | Public web access via Nginx |
| SSH       | TCP      | 22         | Your IP /32  | Admin management only       |

**What is NOT open:**
- Port 5000 — backend container port (never publicly accessible)
- Port 3306 — database port (only accessible from RDS SG)
- All other ports — blocked by default

### EC2 Outbound Rules

| Rule Type | Protocol | Port Range | Destination  | Purpose            |
|-----------|----------|------------|--------------|--------------------|
| All       | All      | All        | 0.0.0.0/0   | Allow all outbound |

Outbound is fully open to allow the EC2 to:
- Pull Docker images
- Connect to RDS on port 3306
- Respond to client requests

---

## Security Group: RDS Instance

### RDS Inbound Rules

| Rule Type    | Protocol | Port Range | Source              | Purpose                          |
|--------------|----------|------------|---------------------|----------------------------------|
| MySQL/Aurora | TCP      | 3306       | EC2 Security Group  | Only EC2 can reach the database  |

> ⚠️ **Source is not an IP address — it is the EC2 Security Group ID.**  
> This is more robust than a static IP. Any EC2 instance with that security group can connect.

### RDS Outbound Rules

| Rule Type | Protocol | Port Range | Destination  |
|-----------|----------|------------|--------------|
| All       | All      | All        | 0.0.0.0/0   |

---

## Why Port 5000 is Hidden from the Internet

Even though Docker maps `-p 5000:5000`, port 5000 is **not in the EC2 Security Group's inbound rules**.

AWS Security Groups act as the outermost firewall — **before traffic even reaches the OS or Docker**. So even if port 5000 is listening on the EC2 host, AWS will drop all incoming packets on port 5000.

```
External Request → AWS Security Group → ✅ Port 80 allowed → Nginx
External Request → AWS Security Group → ❌ Port 5000 blocked → dropped
```

This is **defense in depth** — even if someone tries to bypass Nginx, the firewall prevents it.

---

## Internal vs External Service Exposure

| Service            | Port | Exposure Level     | Who Can Access             |
|--------------------|------|--------------------|----------------------------|
| Nginx              | 80   | Public (Internet)  | Anyone                     |
| Backend Container  | 5000 | Internal only      | Only Nginx (via localhost) |
| RDS MySQL          | 3306 | Private subnet only| Only EC2 (via SG rule)     |
| SSH                | 22   | Restricted         | Your IP only               |

**Key Principle:**  
Expose the minimum necessary. Each layer only communicates with the layer directly adjacent to it.

- Client ↔ Nginx (Port 80)
- Nginx ↔ Backend (localhost:5000, same host)
- Backend ↔ RDS (private endpoint:3306, private network)

---

## Port Binding Strategy in Docker

```bash
docker run -p 5000:5000 dormdesk-backend:latest
```

| Part          | Meaning                                              |
|---------------|------------------------------------------------------|
| Host `5000`   | EC2 host listens on port 5000                        |
| Container `5000` | Inside the container, Express is on port 5000    |

**But AWS Security Group has NO inbound rule for port 5000**.

So:
- Nginx (on same host) → can reach `localhost:5000` ✅
- External user trying `http://<EC2_IP>:5000` → blocked by AWS SG ✅

---

## SSH Strategy

```
Port 22 Inbound: Source = Your-IP/32
```

- `/32` means exactly one IP address (your home/office IP)
- No one else in the world can SSH into the EC2 instance
- If your IP changes, update the SG rule in the AWS Console

**Why not 0.0.0.0/0 for SSH?**
- Bots constantly scan the internet for open SSH ports
- Brute force attacks are common
- Even with strong passwords or key-based auth, restricting the source IP eliminates this attack vector entirely

---

## RDS Private Subnet Strategy

RDS is placed in a **private subnet** — a subnet with no route to the internet gateway.

This means:
- RDS has no public IP
- No internet traffic can reach it at all — even if the Security Group somehow allowed it
- The only path in is through the VPC's internal routing

**Why not just use a Security Group to protect it?**  
Defense in depth. Even if someone misconfigured the Security Group, the private subnet's routing table provides a second layer of isolation.

---

## Network Security Summary

| Threat                              | Defense                                       |
|-------------------------------------|-----------------------------------------------|
| Direct access to backend port 5000  | EC2 SG has no inbound rule for port 5000      |
| Direct access to database port 3306 | RDS in private subnet + SG allows only EC2 SG |
| SSH brute force attacks             | Port 22 restricted to your IP only            |
| MITM on backend traffic             | Backend reachable only via Nginx on same host |
| Secret exposure                      | `.env` never committed, injected at runtime   |

---

*Document version: 1.0 | Created: 2026-02-26*
