# 📋 DormDesk — Deployment Runbook
## Step-by-Step Commands from Zero to Live

> This is the **exact command sequence** to deploy DormDesk from a fresh EC2 instance.  
> Follow each section in order. Every command must succeed before moving to the next.

---

## 0. Prerequisites

Before starting, ensure you have:
- AWS account with EC2 and RDS instances already launched (see Phase 1 in `03_build_phases.md`)
- EC2 public IP noted (let's call it `EC2_IP`)
- RDS endpoint noted (let's call it `RDS_ENDPOINT`)
- Your `.pem` key file (e.g., `dormdesk.pem`)
- The project codebase on your local machine

---

## Step 1 — SSH into EC2

```bash
chmod 400 dormdesk.pem
ssh -i dormdesk.pem ubuntu@<EC2_IP>
```

---

## Step 2 — Update System & Install Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io nginx mysql-client git curl
sudo systemctl enable docker nginx
sudo systemctl start docker nginx
sudo usermod -aG docker ubuntu
newgrp docker
```

**Verify:**
```bash
docker --version         # Should print Docker version
nginx -v                 # Should print nginx version
mysql --version          # Should print mysql client version
```

---

## Step 3 — Upload Project to EC2

### Option A: From GitHub (Recommended)
```bash
cd ~
git clone https://github.com/<your-org>/DormDesk.git
cd DormDesk
```

### Option B: Using SCP (from your local machine)
```bash
# Run this on your LOCAL machine, not EC2
scp -i dormdesk.pem -r ./DormDesk ubuntu@<EC2_IP>:~/DormDesk
```

---

## Step 4 — Apply Database Schema to RDS

```bash
cd ~/DormDesk
mysql -h <RDS_ENDPOINT> -u admin -p < database/schema.sql
```

Enter the RDS password when prompted.

**Verify:**
```bash
mysql -h <RDS_ENDPOINT> -u admin -p dormdesk -e "SHOW TABLES;"
# Should show: users | complaints
```

---

## Step 5 — Create the .env File on EC2

> ⚠️ Never commit `.env` to Git. Create it directly on the EC2 instance.

```bash
cd ~/DormDesk/backend
nano .env
```

Paste the following (replace all `<...>` values):
```
DB_HOST=<RDS_ENDPOINT>
DB_PORT=3306
DB_NAME=dormdesk
DB_USER=admin
DB_PASS=<your-rds-password>
JWT_SECRET=<generate-a-random-long-string>
NODE_ENV=production
PORT=5000
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Step 6 — Build the Backend Docker Image

```bash
cd ~/DormDesk/backend
docker build -t dormdesk-backend:latest .
```

**Verify:**
```bash
docker images | grep dormdesk-backend
# Should show the image with a recent timestamp
```

---

## Step 7 — Run the Backend Container

```bash
docker run -d \
  --name dormdesk-backend \
  --restart=always \
  -p 5000:5000 \
  --env-file ~/DormDesk/backend/.env \
  dormdesk-backend:latest
```

**Verify:**
```bash
docker ps
# dormdesk-backend should be listed as Up

docker logs dormdesk-backend
# Should show: "Server running on port 5000" or similar

curl http://localhost:5000/api/health
# Should return: {"status":"ok"}
```

---

## Step 8 — Build the React Frontend (Done Locally)

> Run this on your **LOCAL machine** before uploading to EC2.

```bash
cd DormDesk/frontend
npm install
npm run build
# Creates: frontend/dist/
```

Upload the build to EC2:
```bash
# Run on LOCAL machine
scp -i dormdesk.pem -r ./frontend/dist ubuntu@<EC2_IP>:/tmp/frontend_dist
```

---

## Step 9 — Deploy Frontend Files on EC2

```bash
# Run on EC2
sudo mkdir -p /var/www/html/dormdesk
sudo cp -r /tmp/frontend_dist/* /var/www/html/dormdesk/
sudo chown -R www-data:www-data /var/www/html/dormdesk
```

**Verify:**
```bash
ls /var/www/html/dormdesk
# Should show: index.html, assets/ folder
```

---

## Step 10 — Configure Nginx

```bash
sudo cp ~/DormDesk/nginx/dormdesk.conf /etc/nginx/sites-available/dormdesk
sudo ln -s /etc/nginx/sites-available/dormdesk /etc/nginx/sites-enabled/dormdesk

# Remove the default nginx site to avoid conflict
sudo rm -f /etc/nginx/sites-enabled/default

# Test the config
sudo nginx -t
# Should show: syntax is ok + test is successful

# Reload nginx
sudo systemctl reload nginx
```

**Verify:**
```bash
sudo systemctl status nginx
# Should show: active (running)

curl http://localhost/api/health
# Should return: {"status":"ok"}
```

---

## Step 11 — Full End-to-End Test

From **your local machine's browser**:

1. Open `http://<EC2_IP>/`
   - ✅ React app should load
2. Register a student account
   - ✅ Should redirect to student dashboard
3. Submit a complaint
   - ✅ Should appear in complaint list
4. Log out, log in as admin (need to manually set role in DB first — see below)
5. View all complaints, filter, update status
   - ✅ Admin actions should work

### Creating an Admin User
```bash
mysql -h <RDS_ENDPOINT> -u admin -p dormdesk
```
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@dormdesk.com';
```

---

## Step 12 — Production Hardening Checks

```bash
# Container auto-restarts
docker inspect dormdesk-backend | grep RestartPolicy
# Should show: "always"

# View live logs
docker logs -f dormdesk-backend

# Check Nginx is serving port 80 only
sudo ufw status       # or check AWS Security Group from console

# Confirm port 5000 is NOT accessible externally
# From your laptop:
curl http://<EC2_IP>:5000/api/health
# This should TIME OUT or be refused (port not exposed publicly)

# Confirm port 80 IS accessible
curl http://<EC2_IP>/api/health
# Should return: {"status":"ok"}
```

---

## Step 13 — Common Issues & Fixes

| Issue                              | Likely Cause                          | Fix                                              |
|------------------------------------|---------------------------------------|--------------------------------------------------|
| Backend container crashes          | Wrong `.env` values / DB unreachable  | `docker logs dormdesk-backend` to diagnose       |
| Can't connect to RDS               | Wrong SG / endpoint / credentials     | Verify SG rule: EC2 SG → RDS port 3306           |
| Nginx shows 502 Bad Gateway        | Backend not running                   | `docker ps` and restart container                |
| React 404 on page refresh          | Missing `try_files` in Nginx config   | Check `/` location block in dormdesk.conf         |
| CORS error in browser              | Backend missing CORS header           | Ensure `cors()` middleware is before routes      |
| Port 5000 accessible from outside  | AWS SG wrongly allows port 5000       | Remove that SG inbound rule immediately          |

---

## Useful Management Commands

```bash
# Restart backend container
docker restart dormdesk-backend

# Stop and remove container
docker stop dormdesk-backend && docker rm dormdesk-backend

# Re-run container after rebuild
docker run -d --name dormdesk-backend --restart=always -p 5000:5000 --env-file ~/DormDesk/backend/.env dormdesk-backend:latest

# Reload Nginx after config change
sudo nginx -t && sudo systemctl reload nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log

# View nginx access logs
sudo tail -f /var/log/nginx/access.log
```

---

*Document version: 1.0 | Created: 2026-02-26*
