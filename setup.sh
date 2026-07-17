#!/usr/bin/env bash
# Quick-start setup for XRA on a fresh Linux VPS, with real TLS out of the box.
#
# Installs Docker if missing, generates throwaway secrets into .env (replace
# them with real ones before you actually open this up to real users — see
# DEPLOY.md), and brings the whole stack up with docker compose — including
# Caddy, which gets a genuine Let's Encrypt certificate automatically.
#
# Usage:
#   ./setup.sh [host]
#
# [host] is either:
#   - an IP (default: 185.182.9.183, this VPS) — a free sslip.io hostname
#     that resolves back to that IP is used so Let's Encrypt has something
#     to issue a real cert for (it can't issue one for a bare IP), or
#   - a real domain/subdomain you already own and have pointed at this VPS,
#     e.g. ./setup.sh chat.yourdomain.com

set -euo pipefail

HOST="${1:-185.182.9.183}"

# A bare IPv4 gets turned into a free sslip.io hostname; anything else
# (assumed to already be a domain) is used as-is.
if [[ "$HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  XRA_DOMAIN="${HOST//./-}.sslip.io"
else
  XRA_DOMAIN="$HOST"
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

echo "==> XRA setup starting (domain: $XRA_DOMAIN)"

# --- 1. Docker ---
if ! command -v docker &> /dev/null; then
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  if [ -n "${SUDO_USER:-}" ]; then
    usermod -aG docker "$SUDO_USER" || true
  elif [ "$(id -u)" -ne 0 ]; then
    sudo usermod -aG docker "$USER" || true
    echo "    Added $USER to the docker group — log out and back in (or run"
    echo "    'newgrp docker') if the next docker command below fails with a"
    echo "    permission error."
  fi
else
  echo "==> Docker already installed, skipping"
fi

if ! docker compose version &> /dev/null; then
  echo "ERROR: 'docker compose' (v2, the plugin) isn't available even after install." >&2
  echo "Install it manually (https://docs.docker.com/compose/install/) and re-run." >&2
  exit 1
fi

# --- 2. .env with generated (temporary!) secrets ---
if [ -f .env ]; then
  echo "!! .env already exists. If it's from before this script started setting up"
  echo "   TLS/Caddy, it won't have XRA_DOMAIN or an https:// CORS_ORIGINS in it,"
  echo "   and Caddy will fail. Run 'rm .env' and re-run this script to regenerate it."
else
  echo "==> Generating .env with temporary secrets"
  cp .env.example .env
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  JWT_ACCESS_SECRET="$(openssl rand -hex 48)"
  JWT_REFRESH_SECRET="$(openssl rand -hex 48)"

  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" .env
  sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}|" .env
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" .env
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=https://${XRA_DOMAIN}|" .env
  echo "XRA_DOMAIN=${XRA_DOMAIN}" >> .env

  echo "    Wrote .env — these are throwaway secrets, good enough for testing."
  echo "    Generate real ones before letting real users sign up (see DEPLOY.md)."
fi

# --- 3. Bring the stack up ---
# --wait blocks here until every service with a healthcheck (postgres, redis,
# backend) actually reports healthy — not just "started" — and fails loudly
# instead of racing ahead into a container that's still crash-looping.
echo "==> Building and starting containers (this takes a few minutes the first time)"
if ! docker compose up -d --build --wait --wait-timeout 180; then
  echo ""
  echo "!! A service didn't become healthy. Recent backend logs:" >&2
  echo "-----------------------------------------------------------" >&2
  docker compose logs backend --tail 100 >&2
  echo "-----------------------------------------------------------" >&2
  echo "Common causes: .env wasn't found next to docker-compose.yml (run this" >&2
  echo "script from the repo root), or a secret got mangled by a previous" >&2
  echo "partial run — try 'rm .env' and re-running this script." >&2
  exit 1
fi

# --- 4. Run database migrations ---
echo "==> Applying database migrations"
docker compose exec -T backend npx prisma migrate deploy

echo ""
echo "==> Done. Open: https://${XRA_DOMAIN}"
echo "    (Caddy is fetching a Let's Encrypt cert on first request — if you see a"
echo "    cert warning, wait ~15s and reload once.)"
echo "    Logs:    docker compose logs -f"
echo "    Stop:    docker compose down"
echo ""
echo "    Firewall: make sure ports 80 and 443 are open (not 8080/4000 — those"
echo "    aren't exposed anymore, Caddy is the only entry point now):"
echo "      ufw allow 80 && ufw allow 443"
echo ""
echo "    Secrets are still temporary/generated — see DEPLOY.md before real users sign up."
