# SmartExam AI — Frontend

Vite + React app. The backend (Express) runs separately and is reached over a
Cloudflare quick tunnel.

## Local development

```bash
npm install
npm run dev        # http://localhost:3000 (proxies /api -> localhost:5000)
```

## Deploying to Vercel

1. Push the repo to GitHub (this folder lives at `frontend/` in the repo).
2. In Vercel: **New Project → Import** the repo, then set
   **Root Directory = `frontend`** (Settings → General → Root Directory).
   Vercel auto-detects Vite:
   - Build command: `vite build` (default)
   - Output directory: `dist` (default)
3. Backend URL — pick ONE of:
   - **Option A (env var, recommended):** in Vercel → Project → Settings →
     Environment Variables add
     `VITE_API_BASE = https://<your-tunnel>.trycloudflare.com/api`
     then redeploy.
   - **Option B (runtime):** edit `window.__API_BASE__` in `index.html`,
     commit and push.

## ⚠️ Quick-tunnel URL churn

`*.trycloudflare.com` quick-tunnel URLs change every time cloudflared
restarts on the backend PC. When that happens, update `VITE_API_BASE` in
Vercel (or `index.html`) and redeploy. For a permanent URL use a Cloudflare
**named tunnel** with your own domain.

## Backend

Lives in `../backend` (not deployed to Vercel). Start it on the host PC:

```bash
cd ../backend && npm start                     # port 5000
cloudflared tunnel --protocol http2 --url http://localhost:5000
```
