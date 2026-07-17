# XRA

XRA is a self-hosted, Discord-inspired group chat app: servers (guilds), channels, roles/permissions, DMs, group DMs, friends, reactions, mentions, moderation — styled after 2019-era Discord's dark UI. Built to run comfortably on a single server at ~100 concurrent users, and to sit behind a VR game and a companion website.

See [`CHECKLIST.md`](./CHECKLIST.md) for exactly what's implemented, what's stubbed, and what's intentionally deferred (voice/video, anti-VPN, etc.), and [`DEPLOY.md`](./DEPLOY.md) for putting this on a real server.

## Stack

- **Backend:** Node.js + TypeScript + Express + Socket.IO, PostgreSQL (via Prisma), Redis (rate limiting, presence, Socket.IO scaling adapter)
- **Frontend:** React + TypeScript + Vite, no CSS framework — hand-styled to match old Discord's layout, mobile-first (tested down to 375px / iPhone 12 mini)
- **Auth:** JWT access tokens (in memory) + httpOnly-cookie refresh tokens with rotation and reuse detection, argon2id password hashing

## Local development

Requires Node 22+, PostgreSQL, and Redis (or just use Docker for the datastores).

```bash
# 1. Start Postgres + Redis only
docker compose up -d postgres redis

# 2. Backend
cd backend
cp .env.example .env        # then edit JWT secrets, DATABASE_URL, REDIS_URL
npm install
npm run prisma:migrate      # creates the schema
npm run dev                 # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173, proxies /api and /socket.io to :4000
```

Register an account, verify email link is printed to the backend console (no real email provider is wired up yet — see CHECKLIST.md), log in, create a server.

## Production

```bash
cp .env.example .env   # fill in real secrets — see comments in the file
docker compose up -d --build
```

This brings up Postgres, Redis, the backend API/socket server, and an nginx-served frontend build, all on one machine. Read `DEPLOY.md` before exposing this to the internet — at minimum you need TLS in front of it.

## Repo layout

```
backend/    Express + Socket.IO API, Prisma schema, all business logic
frontend/   React app (Vite)
docker-compose.yml
CHECKLIST.md   feature-by-feature status
DEPLOY.md      single-server production deployment guide
```
