#!/usr/bin/env bash
# ================================================================
# KadriLex — Script de déploiement vers le VPS dev (82.25.116.169)
#
# Usage:
#   ./deploy.sh              # tar + push + rebuild + restart
#   ./deploy.sh --no-build   # juste copier les fichiers (hot reload Node)
#
# Pré-requis :
#   - SSH key ~/.ssh/id_rsa accept sur le VPS
#   - Le tunnel SSH local n'est PAS requis (l'app prod parle à db:5432 via réseau Docker)
# ================================================================

set -euo pipefail

VPS_HOST="root@37.59.99.86"
VPS_APP_DIR="/opt/kadrilex-app"
TAR_FILE="/tmp/kadrilex-deploy.tar.gz"
NO_BUILD=0

for arg in "$@"; do
    case "$arg" in
        --no-build) NO_BUILD=1 ;;
        -h|--help)
            grep '^#' "$0" | head -20
            exit 0
            ;;
    esac
done

cd "$(dirname "$0")"

echo "==> Création du tarball (exclut node_modules, .next, .git, .env*)"
tar \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='supabase' \
    --exclude='.env.ovh.local' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.production' \
    -czf "$TAR_FILE" .
echo "    Taille: $(du -h "$TAR_FILE" | cut -f1)"

echo "==> Upload vers $VPS_HOST"
scp -q "$TAR_FILE" "$VPS_HOST:/tmp/"

echo "==> Extraction sur le VPS"
ssh "$VPS_HOST" "cd $VPS_APP_DIR && tar -xzf /tmp/$(basename $TAR_FILE)"

if [ "$NO_BUILD" -eq 0 ]; then
    echo "==> Build + restart container"
    ssh "$VPS_HOST" "cd $VPS_APP_DIR && docker compose build && docker compose up -d --force-recreate"
    echo "==> Attente healthcheck..."
    sleep 12
    ssh "$VPS_HOST" "cd $VPS_APP_DIR && docker compose ps && docker compose logs --tail=5 app"
else
    echo "==> Skip build (--no-build)"
fi

echo
echo "✅ Déploiement terminé. URL : https://kadrilex.82.25.116.169.sslip.io"
