# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Full-stack dev (frontend + backend concurrently)
npm run dev:all

# Frontend only (Vite, port 5173)
npm run dev

# Backend only (Node watch mode, loads backend/.env)
npm run dev:backend

# Production build (frontend → /dist)
npm run build
```

Backend runs on port 3001. Vite proxies `/api` and `/uploads` to it.

## Architecture

**Split-deploy monorepo:** React SPA on Vercel + Express/SQLite API on Railway.

- `src/` — React frontend (Vite)
- `backend/` — Express REST API
- `dist/` — Vite build output (served by Express in production, by Vercel in prod)

In production, `vercel.json` rewrites `/api/*` and `/uploads/*` to `https://alexoldal-production.up.railway.app`.

### Backend

Entry: `backend/server.js` → mounts routers under `/api/*`.

| Route prefix | File | Notes |
|---|---|---|
| `/api/auth` | `backend/src/routes/auth.js` | register, login, logout, refresh, /me |
| `/api/posts` | `backend/src/routes/posts.js` | list, create, delete, react, reorder |
| `/api/comments` | `backend/src/routes/comments.js` | list, add, reply, delete, react |
| `/api/superadmin` | `backend/src/routes/superadmin.js` | user management, audit log, stats |
| `/api/upload` | `backend/src/routes/upload.js` | multipart file upload |
| `/api/songs` | `backend/src/routes/songs.js` | background music management |
| `/api/visit` | `backend/src/routes/visits.js` | visitor counter |

Database: SQLite at `./data/f3xykee.db` via `better-sqlite3`. Schema initialized in `backend/src/db/index.js` on first run; column migrations (`ban_until`, `can_post`) run automatically on boot.

### Frontend

Single-page app — no React Router. Navigation is state-driven (active category, open modals).

Key files:
- `src/App.jsx` — root state: session, posts, activeCategory, modal flags
- `src/api.js` — all API calls; access token stored in memory, auto-refreshes on 401
- `src/data.js` — category definitions, date formatters
- `src/effects.js` — toast, cursor, particle, CRT boot effects
- `src/posts/PostCard.jsx` — post rendering with inline comments
- `src/posts/YouTubePlayer.jsx` / `AudioPlayer.jsx` — custom media players

## Auth System

JWT access tokens (15m) in memory only + refresh tokens (7d) in httpOnly cookies (`rf_token`, Path `/api/auth`).

Flow: `api.js` sends `Authorization: Bearer <token>` on every request. On 401, it auto-calls `/api/auth/refresh` once. If that fails, session is cleared and `_onUnauth` callback fires.

Roles: `user` → `admin` → `superadmin`. `can_post` is a separate boolean flag on users that allows non-admins to create posts.

Auth middleware in `backend/src/middleware/auth.js`:
- `optionalAuth` — attaches user if token present, continues regardless
- `requireAuth` — 401 if no valid token
- `requireAdmin` — 403 if role not admin/superadmin
- `requireCanPost` — 403 if not admin and `can_post` is false
- `requireSuperadmin` — 403 if role not superadmin

Account lockout: 5 failed logins → 5-minute lock. Superadmin account is seeded from env vars on boot.

## Environment

Backend requires `backend/.env` (see `backend/.env.example`):

```
PORT=3001
JWT_ACCESS_SECRET=   # 64-char random
JWT_REFRESH_SECRET=  # 64-char random
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
SUPERADMIN_USERNAME=
SUPERADMIN_PASSWORD=
ALLOWED_ORIGINS=http://localhost:5173
DB_PATH=./data/f3xykee.db
```

## Deployment

- **Railway** — backend only (`node backend/server.js`), health check at `/api/health`
- **Vercel** — frontend only (`npm run build` → `dist/`), API calls rewritten to Railway URL

Deployments are triggered automatically on push to `master`.

## UI Notes

All user-facing text is in Hungarian. Validation errors, toasts, and labels use Hungarian strings. The UI has a "cyberpunk terminal" aesthetic — accent colors, monospace fonts, CRT effects. Custom visual tweaks (accent color, font, background style) are persisted in `localStorage`.
