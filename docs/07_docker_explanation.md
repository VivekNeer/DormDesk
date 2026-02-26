# 🐳 Docker — Dockerfile & Container Explained

> This document explains the Dockerfile, the Docker build process, and the container run command for viva defense and submission.

---

## The Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

---

## Line-by-Line Explanation

### `FROM node:18-alpine`
**Base image**: The container starts from the official Node.js 18 image, Alpine variant.

- **Alpine** is a lightweight Linux distribution (~5MB)
- Regular Node images are ~900MB; Alpine-based ones are ~120MB
- Smaller image = faster to build, push, pull, and run
- For production, always use Alpine or slim variants

---

### `WORKDIR /app`
Sets the **working directory** inside the container to `/app`.

All subsequent commands (`COPY`, `RUN`, `CMD`) operate from `/app`.
This is equivalent to `cd /app` inside the container.

---

### `COPY package*.json ./`
Copies **only `package.json` and `package-lock.json`** first, before the rest of the code.

**Why not copy everything at once?**

Docker **caches layers**. By copying package files first and running `npm install` before copying source code, the `npm install` layer is only re-run when package files change — not every time you edit `server.js`. This dramatically speeds up builds during development.

```
Change in server.js  → only re-runs COPY . . and after
Change in package.json → re-runs npm install and after
```

---

### `RUN npm install --omit=dev`
Installs **production dependencies only** (excludes `devDependencies`).

- `--omit=dev` skips packages only needed during development (e.g., testing tools, linters)
- Keeps the final image smaller
- Suitable for production deployment

---

### `COPY . .`
Copies **all remaining source code** from the local directory into `/app` in the container.

Note: The `.dockerignore` file prevents certain files from being copied:
```
# .dockerignore
node_modules
.env
.git
*.md
```

**Why exclude `node_modules`?**
- Already installed inside the container via `npm install`
- If local `node_modules` were copied in, they might be incompatible with the container's Linux environment

**Why exclude `.env`?**
- Secrets should never be baked into the image
- They should be injected at runtime via `--env-file`

---

### `EXPOSE 5000`
Documents that the container application listens on **port 5000**.

> ⚠️ `EXPOSE` is **documentation only** — it does NOT actually open the port. The actual port binding happens with `-p` in the `docker run` command.

---

### `CMD ["node", "server.js"]`
Defines the **default command** to run when the container starts.

- Uses exec form (`["node", "server.js"]`) instead of shell form (`node server.js`)
- Exec form runs the process directly (PID 1), which means signals (like SIGTERM) are handled correctly
- Shell form wraps in `/bin/sh -c`, which can cause issues with graceful shutdown

---

## Docker Build Command

```bash
docker build -t dormdesk-backend:latest .
```

| Part                     | Meaning                                          |
|--------------------------|--------------------------------------------------|
| `docker build`           | Build an image from a Dockerfile                 |
| `-t dormdesk-backend`    | Tag the image with the name `dormdesk-backend`   |
| `:latest`                | Tag version as "latest"                          |
| `.`                      | Build context is the current directory           |

---

## Docker Run Command (Full)

```bash
docker run -d \
  --name dormdesk-backend \
  --restart=always \
  -p 5000:5000 \
  --env-file ~/DormDesk/backend/.env \
  dormdesk-backend:latest
```

| Flag                 | Meaning                                                                 |
|----------------------|-------------------------------------------------------------------------|
| `-d`                 | Detached mode — runs in background, frees the terminal                  |
| `--name`             | Names the container `dormdesk-backend` for easy reference               |
| `--restart=always`   | Auto-restarts if container crashes OR if EC2 instance reboots           |
| `-p 5000:5000`       | Maps host port 5000 → container port 5000                               |
| `--env-file .env`    | Injects environment variables from file — secrets never in image        |
| `dormdesk-backend:latest` | The image to run                                                  |

---

## Port Binding Explained: `-p 5000:5000`

```
-p <HOST_PORT>:<CONTAINER_PORT>
```

- The container runs Express on port 5000 internally
- `-p 5000:5000` exposes container port 5000 on the EC2 host's port 5000
- But the AWS Security Group does **not** allow port 5000 inbound externally
- So Nginx (on the same host) can reach backend via `localhost:5000`, but external users cannot

This is **correct production behavior** — the backend is firewalled from direct public access.

---

## Container Lifecycle

```
docker build    → Creates the image
docker run -d   → Creates & starts the container from the image
docker ps       → Shows running containers
docker logs -f  → Streams container logs
docker restart  → Restarts a stopped/crashed container
docker stop     → Gracefully stops the container
docker rm       → Removes a stopped container
```

---

## Why Containerize? (Viva Answer)

| Without Docker                          | With Docker                                    |
|-----------------------------------------|------------------------------------------------|
| "Works on my machine" bugs              | Same environment everywhere                    |
| Manual dependency installation on server| Dependencies baked into image                  |
| Difficult to replicate exactly          | `docker build` recreates exact environment     |
| Harder to isolate processes             | Each service has its own isolated environment  |
| Manual process management               | `--restart=always` handles crash recovery      |

---

## Key Viva Questions

**Q: What's the difference between `EXPOSE` and `-p` in Docker?**  
A: `EXPOSE` is documentation only — it tells humans which port the app uses, but does not open it. `-p` in `docker run` actually binds the container port to the host port and makes it reachable.

**Q: Why do we copy `package.json` before the source code?**  
A: Docker layer caching. `npm install` only re-runs when `package.json` changes, not on every source code change. This speeds up rebuilds dramatically.

**Q: Why use `--env-file` instead of baking environment variables into the Dockerfile?**  
A: Security. The image is a build artifact that may be stored in a registry. Secrets (DB password, JWT key) must never be in the image — they should be injected at runtime only.

**Q: What does `--restart=always` do?**  
A: If the container crashes, Docker automatically restarts it. If the EC2 instance itself reboots, Docker will also start the container on reboot. This gives us crash resilience without needing systemd services.

---

*Document version: 1.0 | Created: 2026-02-26*
