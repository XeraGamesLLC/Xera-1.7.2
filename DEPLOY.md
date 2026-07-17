# Deploying XRA on a single server

This covers taking `docker-compose.yml` from "runs on my machine" to "runs in production for ~100 concurrent chatting users on one box."

## 1. Server sizing

For 100 CCU actively chatting (not voice - voice isn't built yet, see CHECKLIST.md):

- **2 vCPU / 4GB RAM** is comfortably enough for Postgres + Redis + the Node backend + nginx together.
- Disk: mostly driven by uploads (avatars/attachments/emoji). Start with 20-40GB and monitor `/app/uploads` growth.
- Any recent Ubuntu/Debian VPS (Hetzner, DigitalOcean, Linode, etc.) with Docker installed works.

## 2. Secrets

```bash
cp .env.example .env
```

Generate strong values for `JWT_ACCESS_SECRET` and `POSTGRES_PASSWORD`:

```bash
openssl rand -hex 64
```

Never commit `.env`. It's already in `.gitignore`.

## 3. TLS (required)

`docker-compose.yml` serves plain HTTP on port 8080 (frontend) and 4000 (backend). **Do not expose either directly to the internet.** Both your VR game client and browsers require HTTPS/WSS for Socket.IO to work reliably (and browsers will refuse mixed content).

The simplest path is putting [Caddy](https://caddyserver.com/) in front, which gets you automatic Let's Encrypt certs for free:

```caddyfile
# /etc/caddy/Caddyfile
chat.yourdomain.com {
    reverse_proxy localhost:8080
}
```

Then set `CORS_ORIGINS=https://chat.yourdomain.com` in `.env` before bringing the stack up, and point your VR game / website at `https://chat.yourdomain.com`.

If you'd rather terminate TLS with nginx directly or use Cloudflare in front (orange-cloud proxy), that works too - the app doesn't care, as long as whatever's in front forwards `Upgrade`/`Connection` headers for the `/socket.io/` path (already handled if you reuse `frontend/nginx.conf` as a reference).

## 4. Bring it up

```bash
docker compose up -d --build
docker compose logs -f backend   # confirm it started cleanly
```

Prisma migrations run automatically as part of the backend image's... actually they don't - run them explicitly once, and on every future schema change:

```bash
docker compose exec backend npx prisma migrate deploy
```

## 5. Anti-VPN (currently a no-op)

`ANTI_VPN_ENABLED=false` by default - signups are never blocked. When you're ready to turn this on:

1. Pick a provider (IPQualityScore, ipdata, IPinfo all have pay-as-you-go tiers).
2. Implement the actual HTTP call in `backend/src/middleware/antiVpn.ts` - the function `checkIp()` is the one and only place this needs to change.
3. Set `ANTI_VPN_API_KEY` and `ANTI_VPN_ENABLED=true` in `.env`, redeploy.

## 6. Backups

Postgres data lives in the `pgdata` Docker volume. At minimum, cron a nightly dump:

```bash
docker compose exec -T postgres pg_dump -U xra xra | gzip > "backup-$(date +%F).sql.gz"
```

Copy backups off the box (S3, Backblaze, etc.) - a backup that lives on the same disk as the database doesn't protect you from disk failure.

The `uploads` volume (avatars/attachments/emoji) should be backed up the same way, or moved to object storage down the line (see CHECKLIST.md - currently local-disk only).

## 7. Monitoring / logs

`docker compose logs -f backend` for now. Winston logs JSON in production (`NODE_ENV=production`), so it's ready to ship to any log aggregator (Loki, CloudWatch, etc.) whenever you want one - none is wired up by default.

## 8. Updating

```bash
git pull
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
```

If `prisma migrate deploy` errors about a migration history mismatch (happens if the migration folder was ever rewritten upstream, not just extended), the database needs a full reset to pick it up:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
```

**`-v` deletes every named volume** - not just the Postgres data, but the `uploads` volume too (avatars, custom emoji, message attachments, cached embed images - everything under `UPLOAD_DIR`). Never run `docker compose down -v` as a routine step; only reach for it when you specifically intend to wipe all data, and use plain `docker compose down` (no `-v`) for everything else. There's no partial version of this - it's all or nothing.

## 9. Scaling past one server

The Socket.IO layer already uses the Redis adapter (`backend/src/sockets/index.ts`), so running multiple backend containers behind a load balancer with sticky-session-free WebSocket routing is a config change, not a rewrite - add a `backend` replica in `docker-compose.yml` (or move to a proper orchestrator) and put a load balancer in front. You'd want managed/clustered Postgres and Redis before pushing this hard, though - that's out of scope for the single-box setup here.
