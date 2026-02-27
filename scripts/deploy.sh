#!/bin/bash
# ─────────────────────────────────────────────────────────────
# DormDesk Deploy Script
# Run from: ~/DormDesk on EC2
# Usage:    ./scripts/deploy.sh
#
# NOTE: git pull is handled by the CI/CD workflow before this
#       script runs. Do NOT add git pull here.
# ─────────────────────────────────────────────────────────────

set -e  # stop immediately if any command fails

echo ""
echo "🚀 DormDesk Deployment Starting..."
echo "────────────────────────────────────"

# ── 1. Rebuild backend Docker image ─────────────────────────
echo "🐳 [1/4] Rebuilding backend Docker image..."
docker build -t dormdesk-backend:latest ./backend
echo "✅ Docker image built"

# ── 2. Restart backend container ────────────────────────────
echo ""
echo "🔄 [2/4] Restarting backend container..."
docker stop dormdesk-backend 2>/dev/null || true
docker rm   dormdesk-backend 2>/dev/null || true

docker run -d \
  --name dormdesk-backend \
  --restart=always \
  -p 5000:5000 \
  --env-file ./backend/.env \
  dormdesk-backend:latest

echo "✅ Backend container running"

# ── 3. Rebuild frontend ──────────────────────────────────────
echo ""
echo "⚛️  [3/4] Building React frontend..."
cd frontend
npm install --silent
npm run build
cd ..
echo "✅ Frontend built"

# ── 4. Deploy frontend to Nginx ──────────────────────────────
echo ""
echo "📂 [4/4] Deploying frontend to Nginx..."
sudo cp -r frontend/dist/* /var/www/html/dormdesk/
echo "✅ Frontend deployed"

# ── Health check ─────────────────────────────────────────────
echo ""
echo "────────────────────────────────────"
echo "🩺 Running health check..."
sleep 3

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
