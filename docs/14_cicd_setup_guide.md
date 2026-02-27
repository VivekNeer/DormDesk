# ⚙️ DormDesk — CI/CD Setup Guide

> **One-time setup** on EC2. After this, every `git push origin main` auto-deploys.

---

## How It Works

```
git push origin main
  ↓ GitHub triggers workflow
  ↓ Self-hosted runner on EC2 receives the job
  ↓ Runs: git pull + ./scripts/deploy.sh
  ↓ App live with new code ✅
```

The runner lives **on your EC2** and calls out to GitHub (port 443). No security group changes needed.

---

## Step 1 — Get the Runner Token from GitHub

1. Go to: `https://github.com/VivekNeer/DormDesk`
2. **Settings** → **Actions** → **Runners** → **New self-hosted runner**
3. Select: **Linux** → **x64**
4. GitHub shows you a `config.sh` command with a `--token`. **Copy just the token** (looks like `ABCDEF1234...`) — it expires in 1 hour.

token : BBGPQYD5WOZSHARO4RBTRYDJUFWYQ

---

## Step 2 — Install the Runner on EC2

SSH into EC2, then run:

```bash
# Create runner directory
mkdir ~/actions-runner && cd ~/actions-runner

# Download runner (v2.323.0 — update version if GitHub shows a newer one)
curl -o actions-runner-linux-x64.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.323.0/actions-runner-linux-x64-2.323.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64.tar.gz
```

---

## Step 3 — Register with Your Repo

```bash
cd ~/actions-runner

./config.sh \
  --url https://github.com/VivekNeer/DormDesk \
  --token <PASTE_TOKEN_FROM_STEP_1>
```

When prompted:
- **Runner group**: press Enter (default)
- **Runner name**: `dormdesk-ec2` (or any name)
- **Labels**: press Enter (default: `self-hosted`)
- **Work folder**: press Enter (default: `_work`)

---

## Step 4 — Install as a System Service (auto-starts on reboot)

```bash
cd ~/actions-runner
sudo ./svc.sh install
sudo ./svc.sh start

# Verify it's running
sudo ./svc.sh status
```

You should see: `● actions.runner.VivekNeer-DormDesk.dormdesk-ec2.service` → **active (running)**

---

## Step 5 — Allow Runner to Use sudo (for Nginx deploy)

The deploy script uses `sudo cp` to update the Nginx web root. Add a sudoers exception:

```bash
sudo visudo
```

Add this line at the bottom:
```
ubuntu ALL=(ALL) NOPASSWD: /bin/cp
```

Save: `Ctrl+X` → `Y` → `Enter`

---

## Step 6 — Verify in GitHub

1. Go to: **GitHub → Settings → Actions → Runners**
2. You should see `dormdesk-ec2` with status **Idle** (green dot) ✅

---

## Step 7 — Test the Pipeline

Make any small change locally:

```bash
# Windows terminal
echo "# CI/CD test" >> README.md
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

Then go to: **GitHub → Actions tab**

You should see a new workflow run → click it → watch the steps execute live:
```
✅ Pull latest code
✅ Run deploy script
   🐳 [1/4] Rebuilding backend Docker image...
   🔄 [2/4] Restarting backend container...
   ⚛️  [3/4] Building React frontend...
   📂 [4/4] Deploying frontend to Nginx...
   🩺 API health check passed
   🎉 Deployment complete!
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Runner shows "Offline" in GitHub | Run `sudo ./svc.sh start` on EC2 |
| `sudo: cp: command not found` | Check sudoers entry (Step 5) |
| `docker: permission denied` | Run `sudo usermod -aG docker ubuntu && newgrp docker` |
| Workflow stuck / not triggering | Check runner is `Idle` in GitHub Settings → Runners |
| Token expired | Generate a new token from GitHub Settings → Runners |

---

## Your New Workflow (Post-Setup)

```
1. Make code changes locally
2. git add . && git commit -m "..." && git push origin main
3. GitHub Actions auto-deploys on EC2
4. Check GitHub → Actions tab to monitor
```

**No SSH needed. No manual commands. Every push = auto-deploy.** ✅

---

*Document version: 1.0 | Created: 2026-02-27*
