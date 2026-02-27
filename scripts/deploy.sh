#!/bin/bash
# ─────────────────────────────────────────────────────────────
# DormDesk Deploy Script
# Run from: ~/DormDesk on EC2
# Usage:    ./scripts/deploy.sh
# ─────────────────────────────────────────────────────────────

set -e  # stop immediately if any command fails

echo ""
echo "🚀 DormDesk Deployment Starting..."
echo "────────────────────────────────────"

# ── 1. Pull latest code ──────────────────────────────────────
echo "📥 [1/5] Pulling latest code from GitHub..."
git pull origin main
echo "✅ Code updated"

# ── 2. Rebuild backend Docker image ─────────────────────────
echo ""
echo "🐳 [2/5] Rebuilding backend Docker image..."
docker build -t dormdesk-backend:latest ./backend
echo "✅ Docker image built"

# ── 3. Restart backend container ────────────────────────────
echo ""
echo "🔄 [3/5] Restarting backend container..."
docker stop dormdesk-backend 2>/dev/null || true
docker rm   dormdesk-backend 2>/dev/null || true

docker run -d \
  --name dormdesk-backend \
  --restart=always \
  -p 5000:5000 \
  --env-file ./backend/.env \
  dormdesk-backend:latest

echo "✅ Backend container running"

# ── 4. Rebuild frontend ──────────────────────────────────────
echo ""
echo "⚛️  [4/5] Building React frontend..."
cd frontend
npm install --silent
npm run build
cd ..
echo "✅ Frontend built"

# ── 5. Deploy frontend to Nginx ──────────────────────────────
echo ""
echo "📂 [5/5] Deploying frontend to Nginx..."
sudo cp -r frontend/dist/* /var/www/html/dormdesk/
echo "✅ Frontend deployed"

# ── Health check ─────────────────────────────────────────────
echo ""
echo "────────────────────────────────────"
echo "🩺 Running health check..."
sleep 3  # give container a moment to start

HEALTH=$(curl -s http://localhost:5000/api/health | grep -o '"status":"ok"' || echo "FAILED")

if [ "$HEALTH" = '"status":"ok"' ]; then
  echo "✅ API health check passed"
else
  echo "❌ API health check FAILED — check: docker logs dormdesk-backend"
fi

echo ""
echo "────────────────────────────────────"
echo "🎉 Deployment complete!"
echo "   Frontend: http://$(curl -s ifconfig.me)/"
echo "   API:      http://$(curl -s ifconfig.me)/api/health"
echo "────────────────────────────────────"
echo ""
