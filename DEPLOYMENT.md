# Deployment Guide — GitHub Auto-Edit + Vercel

## Why you see "Restored build cache" + "allow-scripts" warning

That log is **normal**, not an error:

```
Restored build cache from previous deployment (9T4VMc7...)
Running "vercel build"
Vercel CLI 59.3.0
Installing dependencies...
npm warn allow-scripts 2 packages have install scripts...
```

- **Restored build cache**: Vercel caches `node_modules` to speed up builds. Good.
- **allow-scripts warning**: npm v11+ security warning about `esbuild` postinstall. Not fatal, just warning. Build continues after it.

If build **fails after** that, it's usually because of wrong **Root Directory** or **Build Command** for this monorepo.

---

## Project Structure (Monorepo)

```
root/
├── client/  (Vite React frontend)
├── server/  (Express TS backend, serves client/dist)
├── public/data/knowledge.json (seed)
├── package.json (workspaces: client, server)
└── vercel.json (frontend config)
```

Vercel is best for **frontend only**. Backend should go to Render/Railway/Fly.io.

---

## Option A: Recommended — Split Deployment

### Frontend on Vercel

1. **Vercel Dashboard → Add New Project → Import from GitHub**
   - Repo: `Koustav-Source/Voice-Enabled-RAG-Modeled`
   - **Branch**: `main` (or your arena branch `arena/01a04e8d-...` for testing)

2. **Configure Project:**
   - Framework Preset: `Vite`
   - Root Directory: `client`  ← IMPORTANT! Click "Edit" and set to `client`
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto)
   - Install Command: `npm install`

3. **Environment Variables (Vercel → Settings → Environment Variables):**
   - `VITE_API_URL` = `https://your-backend.onrender.com` (your Render URL)
   - Or leave empty to use relative `/api` if you proxy

4. **Clear Build Cache (if previous build was wrong):**
   - Deployments → Latest → ... → Redeploy → **Uncheck** "Use existing Build Cache"
   - Or: Settings → General → Build Cache → Purge

5. **Fix allow-scripts warning (optional):**
   - Settings → Environment Variables → Add:
     - `NPM_CONFIG_FUND` = `false`
     - `NPM_CONFIG_AUDIT` = `false`
   - Or add to `client/package.json`:
     ```json
     "allowScripts": { "esbuild": true }
     ```

6. Deploy → You get `https://your-project.vercel.app`

### Backend on Render (or Railway)

1. **Render → New Web Service → Connect GitHub repo**
2. **Settings:**
   - Root Directory: `server` or `.` (if you want unified)
   - Build Command: `npm install --workspace=server && npm run build --workspace=server`
   - Start Command: `npm start --workspace=server`
   - Environment: `Node`
3. **Env Vars:**
   ```
   PORT=10000
   NODE_ENV=production
   GEMINI_API_KEY=your_key_here
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```
4. Deploy → Get backend URL → Put in Vercel's `VITE_API_URL` or in `vercel.json` rewrites

---

## Option B: Unified on Vercel (Full-Stack Serverless)

If you want **both frontend + backend on Vercel**:

1. **Root Directory:** `.` (leave empty, meaning root)
2. **Build Command:** `npm run build` (builds client + server via workspaces)
3. **Output Directory:** `client/dist`
4. **Install Command:** `npm install`

We already added `api/index.ts` that exports Express app as serverless function.

**vercel.json at root (already created):**
```json
{
  "version": 2,
  "buildCommand": "npm run build --workspace=client",
  "outputDirectory": "client/dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

For full-stack, change to:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "functions": {
    "api/index.ts": { "includeFiles": "server/dist/**" }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Limitation:** Vercel serverless has 10s timeout, in-memory store will reset each cold start (28 chunks re-seeded each time). Works for demo, but for production use Render + Postgres.

---

## How to Auto-Edit Code in GitHub

### Current Setup (Arena)

You are on branch `arena/01a04e8d-voice-enabled-rag-modeled`:
```bash
git status
# On branch arena/01a04e8d-...

git add -A
git commit -m "feat: my changes"
git push origin arena/01a04e8d-voice-enabled-rag-modeled
```

This pushes to GitHub but **Vercel by default deploys `main`**, not arena.

### To Auto-Deploy Arena Branch to Vercel:

1. Vercel → Project → Settings → Git
2. **Production Branch:** Set to `arena/01a04e8d-voice-enabled-rag-modeled` for testing
3. Or: Settings → Git → Enable "Deploy all branches" → Every push to any branch gets preview deployment

### To Merge to Main (Production):

```bash
# On GitHub website:
# Pull Requests → New PR → base: main ← compare: arena/01a04e8d-...
# Merge

# Or locally:
git checkout main
git pull origin main
git merge arena/01a04e8d-voice-enabled-rag-modeled
git push origin main
# Vercel auto-deploys main
```

### Auto-Edit Workflow (GitHub → Vercel):

```
Local Edit → git push → GitHub → Vercel Webhook → Build → Deploy → Live URL
```

- Every `git push` to tracked branch triggers Vercel build
- Vercel shows "Restored build cache" (fast) then "Building"
- Check Deployments tab for logs
- If build fails, check "Build Logs" for actual error after the allow-scripts warning

---

## Fixing Vercel Build Cache Issue

If you changed Root Directory or Build Command but Vercel still uses old cache:

**Method 1: Dashboard**
- Vercel → Deployments → Click failed deployment → Redeploy → **Uncheck** "Use existing Build Cache"

**Method 2: Add env var to force clean:**
- Settings → Environment Variables → `VERCEL_FORCE_NO_BUILD_CACHE` = `1`

**Method 3: CLI:**
```bash
npm i -g vercel
vercel --force
```

**Method 4: Delete and re-import project** (nuclear option)

---

## Common Vercel Errors & Fixes

| Error | Fix |
|-------|-----|
| `Cannot find module` | Set Root Directory to `client`, not `.` |
| `vite: not found` | Install Command should be `npm install` in `client/` |
| `Output Directory not found` | Should be `dist` if Root is `client`, or `client/dist` if Root is `.` |
| `allow-scripts` warning | Ignore, or set `NPM_CONFIG_ALLOW_SCRIPTS=true` env var |
| `404` on refresh | Add `vercel.json` with rewrite to `/index.html` (already added) |
| API 404 | Backend not deployed, or rewrites point to wrong URL. Deploy backend to Render |

---

## Quick Deploy Commands

```bash
# Frontend only (Vercel)
cd client
npm run build
npx vercel --prod

# Backend only (Render via git)
git push origin main
# Render auto-deploys

# Full-stack local test
npm run build
npm start
# http://localhost:3000
```

---

## Current Live Preview (Arena Sandbox)

We run server on port 3000 with 28 docs. For local:

```bash
rm -rf server/data
npm run build
PORT=3000 npm start --workspace=server
```

You should see:
```
✅ Server running at http://localhost:3000
Health: /api/health → 28 docs
Frontend: client/dist
```

Test greeting fix:
```bash
curl -X POST http://localhost:3000/api/chat -d '{"message":"Hii"}'
→ Friendly welcome, not "insufficient info"
```

---

## Need Help?

If Vercel build still fails, paste **full build log** after the allow-scripts line — the actual error is after that warning.
