#!/usr/bin/env bash
# Quick-start setup for XRA on a fresh Linux VPS.
#
# Installs Docker if missing, generates throwaway secrets into .env (replace
# them with real ones before you actually open this up to real users — see
# DEPLOY.md), and brings the whole stack up with docker compose.
#
# Usage:
#   ./setup.sh [host]
#
# [host] is the IP or domain the frontend will be reached at (used to set
# CORS_ORIGINS so the browser is allowed to talk to the API). Defaults to
# 185.182.9.183, this VPS's IP. Pass a domain instead once you have one:
#   ./setup.sh chat.yourdomain.com

set -euo pipefail

HOST="${1:-185.182.9.183}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

echo "==> XRA setup starting (host: $HOST)"

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
  echo "==> .env already exists, leaving it as-is (delete it first if you want fresh secrets)"
else
  echo "==> Generating .env with temporary secrets"
  cp .env.example .env
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  JWT_ACCESS_SECRET="$(openssl rand -hex 48)"
  JWT_REFRESH_SECRET="$(openssl rand -hex 48)"

  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" .env
  sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}|" .env
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" .env
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://${HOST}:8080|" .env

  echo "    Wrote .env — these are throwaway secrets, good enough for testing."
  echo "    Generate real ones before letting real users sign up (see DEPLOY.md)."
fi

# --- 3. Bring the stack up ---
echo "==> Building and starting containers (this takes a few minutes the first time)"
docker compose up -d --build

echo "==> Waiting for the backend to be ready"
for i in $(seq 1 30); do
  if docker compose exec -T backend node -e "require('http').get('http://localhost:4000/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))" &> /dev/null; then
    break
  fi
  sleep 2
done

# --- 4. Run database migrations ---
echo "==> Applying database migrations"
docker compose exec -T backend npx prisma migrate deploy

echo ""
echo "==> Done. Open: http://${HOST}:8080"
echo "    Logs:    docker compose logs -f"
echo "    Stop:    docker compose down"
echo "    This is plain HTTP with temp secrets — fine for testing, not for real users."
echo "    See DEPLOY.md for TLS + real secrets before going live."
