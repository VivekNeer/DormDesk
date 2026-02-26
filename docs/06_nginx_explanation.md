# 🌐 Nginx Configuration — Explained Line by Line

> This document explains every part of `nginx/dormdesk.conf` for viva defense and submission.

---

## The Complete Configuration

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/html/dormdesk;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass         http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Line-by-Line Explanation

### `server { ... }`
Defines a **virtual server block** — Nginx's way of handling requests for a particular server or domain. You can have multiple server blocks for multiple sites on one machine.

---

### `listen 80;`
Tells Nginx to **listen on port 80** (standard HTTP).

**Why this matters for our project:**
- The AWS Security Group only opens port 80 externally
- All public traffic enters through port 80 only
- The backend (port 5000) is never reached directly from outside

---

### `server_name _;`
`_` is a **catch-all** that matches any server name or IP address. This means Nginx will respond to any request regardless of the hostname used (IP address or domain name).

In production with a real domain, this would be:
```nginx
server_name dormdesk.yourdomain.com;
```

---

### `root /var/www/html/dormdesk;`
Sets the **root directory** for serving static files. When someone requests `/`, `/about`, or any page route, Nginx will look here for files.

This is where we copy the React production build (`dist/` contents).

---

### `index index.html;`
Defines the **default file** to serve when a directory is requested. When someone visits `/`, Nginx serves `/var/www/html/dormdesk/index.html` — the React app entry point.

---

### `location / { ... }` — Frontend Static File Serving

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

`try_files` is **critical for Single Page Applications (SPAs)**.

It works like this:
1. **`$uri`** — Try to serve the file as-is (e.g., `/assets/main.js` → serves that file)
2. **`$uri/`** — Try to serve it as a directory
3. **`/index.html`** — If neither exists, serve `index.html` (fallback)

**Why the fallback is essential:**
- React Router handles frontend navigation (e.g., `/student`, `/admin`)
- These are **not real files** on disk — they're virtual routes handled by JavaScript
- Without `try_files`, Nginx would return **404** for any `/student` or `/admin` URL
- With `try_files`, Nginx always returns `index.html`, and React Router handles the route

---

### `location /api/ { ... }` — API Reverse Proxy

```nginx
location /api/ {
    proxy_pass         http://localhost:5000/;
    ...
}
```

Any request starting with `/api/` is **forwarded to the backend container** running on `localhost:5000`.

| Browser sends                  | Nginx forwards to          |
|-------------------------------|----------------------------|
| `GET /api/complaints/`         | `GET http://localhost:5000/complaints/` |
| `POST /api/auth/login`         | `POST http://localhost:5000/auth/login` |

> Notice: the `/api` prefix is stripped before forwarding because `proxy_pass` ends with `/`.

---

### `proxy_pass http://localhost:5000/;`
The actual forwarding directive. Requests matching `/api/` are proxied to the backend container.

**Why `localhost`?** Because Docker maps port 5000 to the EC2 host's port 5000 with `-p 5000:5000`. Nginx (running on the EC2 host) can reach the container via `localhost:5000`.

---

### `proxy_http_version 1.1;`
Use HTTP/1.1 for the proxy connection (required for WebSocket support and keep-alive connections).

---

### `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection 'upgrade';`
Required for **WebSocket proxying**. Even if we don't use WebSockets now, this is standard boilerplate for production proxy setups.

---

### `proxy_set_header Host $host;`
Passes the original `Host` header to the backend. The backend can then know which domain the request came from.

---

### `proxy_cache_bypass $http_upgrade;`
Ensures cached responses are bypassed for WebSocket upgrade requests.

---

## Why Nginx Instead of Directly Exposing Port 5000?

| Aspect                  | Direct Port 5000               | With Nginx on Port 80          |
|-------------------------|--------------------------------|--------------------------------|
| Security                | Everything exposed             | Only port 80 exposed           |
| Frontend serving        | Need a separate server         | Nginx serves static files too  |
| URL structure           | e.g., `:5000/complaints`       | Clean `/api/complaints`        |
| SSL (future)            | Complex per-service            | One place: Nginx               |
| Production standard     | ❌ Never done in production    | ✅ Industry standard           |

---

## Request Flow Summary

```
User → http://<EC2_IP>/                     → Nginx → serves index.html (React app)
User → http://<EC2_IP>/student              → Nginx → try_files fallback → index.html
User → http://<EC2_IP>/api/complaints/      → Nginx → proxy → localhost:5000/complaints/
User → http://<EC2_IP>/assets/main.abc.js   → Nginx → serves file directly from /var/www/html/dormdesk/assets/
```

---

*Document version: 1.0 | Created: 2026-02-26*
