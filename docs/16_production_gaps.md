# DormDesk — Honest Production Gaps

> Things that work fine for a student project but would get you fired at a real company.

---

## CI/CD

| Issue | Why it matters |
|-------|---------------|
| Self-hosted runner **lives on the same EC2 that serves traffic** | EC2 goes down → CI/CD also dead |
| **No tests in the pipeline** | Broken code deploys to production without any checks |
| **No staging environment** | Every push goes straight to "prod" |
| **No rollback** | Bad deploy = manually SSH in and fix it under pressure |
| Docker images tagged `:latest` always | Can't identify what version is running or roll back to a previous image |
| No Slack/email notification on failure | You find out the deploy broke when users complain |
| No approval gate | A mistaken `git push` deploys immediately |

---

## Docker & Build on EC2

| Issue | Why it matters |
|-------|---------------|
| **Docker build happens on the same t2.micro that serves users** | During a build, the server's 1 vCPU and 1GB RAM are under load. Responses slow down. |
| **Downtime during deploy** | `docker stop` → `docker run` = gap where backend is unreachable (~5–10 seconds) |
| **Frontend npm build on EC2** | `npm install` + `npm run build` on a micro instance is slow (~2 min) and competes with serving traffic |
| No `docker image prune` | Old Docker images accumulate, disk fills up silently |
| Dockerfile has no `USER` directive | Container runs as **root** — a container escape would own the host |
| `npm install --silent` on every deploy | Slow. Production CI/CD caches `node_modules` between runs |

**What real companies do:** Build on a separate CI runner, push the image to ECR (container registry), EC2 just pulls and runs it. Zero build load on the server. Zero-downtime with blue-green swaps.

---

## Security

| Issue | Why it matters |
|-------|---------------|
| **No HTTPS** | Passwords transmitted in plaintext. Browser already warns users about this. |
| SSH port 22 open (even if restricted to one IP) | IP changes break access. Real solution: AWS Systems Manager Session Manager (no port 22 needed) |
| `.pem` key was copied to EC2 | Private keys should never leave the machine they were generated on |
| No rate limiting on API | `/api/complaints` can be hammered, DB overwhelmed |
| CORS using `cors()` with no config | Allows any origin — any website can make requests to your API |
| No WAF (Web Application Firewall) | No protection against SQLi, XSS probes, bot traffic |
| Secrets in `.env` file on disk | If someone reads the file → full DB access. Real approach: AWS Secrets Manager |
| Docker container runs as root | See above |
| No input sanitisation beyond basic checks | Description field could contain XSS if rendered unsafely |

---

## Database

| Issue | Why it matters |
|-------|---------------|
| **Automated backups disabled** (turned off during setup to save cost) | Data loss if RDS instance fails |
| Single RDS instance, no replica | Goes down → entire app is down |
| No database migration system | Schema changes = raw SQL run manually on prod |
| No connection pool size tuning | Default pool of 10 may not handle concurrent users |

---

## Architecture

| Issue | Why it matters |
|-------|---------------|
| Single EC2, no Auto Scaling | Traffic spike = slow/unresponsive app |
| No load balancer | Can't have multiple EC2s, no health check routing |
| No CDN for frontend | Users far from Mumbai get slow static file loads |
| No uptime monitoring | No alerts if the server crashes at 3am |
| Nginx serves static files with no cache headers | Browser re-downloads `index.js` on every page visit |

---

## Code Quality

| Issue | Why it matters |
|-------|---------------|
| **Zero automated tests** | Refactoring is terrifying. Bugs ship silently. |
| No API versioning (`/api/v1/`) | Any breaking change breaks all clients |
| No request logging (Morgan etc.) | Can't trace what happened when something goes wrong |
| No API documentation | Your partner has to read the source to understand endpoints |
| Error messages sometimes expose internals | Stack traces in `500` responses are a security leak |
| No request size limit | Someone can POST a 10MB description and choke the server |

---

## Cognito

| Issue | Why it matters |
|-------|---------------|
| No MFA | Admin account takeover = complete system compromise |
| Self-registered users not in `Students` group | Worked around in code — not deterministic |
| No email domain restriction | Anyone (not just hostel students) can register |
| No account deactivation flow | Can't easily block a specific student |

---

## What's Actually Fine For This Project

To be fair — none of the above matters for a graded student project. You have:
- ✅ Working auth (Cognito JWT)
- ✅ Role-based access control
- ✅ Dockerised backend
- ✅ Nginx reverse proxy
- ✅ Private RDS (not publicly accessible)
- ✅ Security groups isolating DB from internet
- ✅ CI/CD pipeline (even if basic)
- ✅ Audit trail

The gaps above are what you'd address when going from "project that works" to "project that runs in production with real users and an on-call rotation."
