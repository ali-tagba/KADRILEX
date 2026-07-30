#!/usr/bin/env bash
# ================================================================
# trigger-cron.sh — Génère un JWT signé HS256 puis frappe l'endpoint
# cron `/api/cron/generate-month`.
#
# Usage (à mettre dans systemd timer ou crontab) :
#   CRON_JWT_SECRET=xxx ./trigger-cron.sh
#
# Le JWT est généré localement avec :
#   - iss : "kadrilex-cron"
#   - iat : now
#   - exp : now + 5 min
# Validité courte → un JWT intercepté est inutile passé 5 min.
# ================================================================

set -euo pipefail

CRON_URL="${CRON_URL:-https://kadrilex.82.25.116.169.sslip.io/api/cron/generate-month}"

if [ -z "${CRON_JWT_SECRET:-}" ]; then
    echo "❌ CRON_JWT_SECRET non défini. Exemple : export CRON_JWT_SECRET='...'" >&2
    exit 1
fi

# ----------- Génération du JWT ------------------
now=$(date +%s)
exp=$((now + 300))  # 5 minutes

# Header HS256 base64url
header=$(printf '{"alg":"HS256","typ":"JWT"}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')

# Payload base64url
payload=$(printf '{"iss":"kadrilex-cron","iat":%d,"exp":%d}' "$now" "$exp" | openssl base64 -A | tr '+/' '-_' | tr -d '=')

# Signature HMAC-SHA256 base64url
signature=$(printf '%s.%s' "$header" "$payload" \
    | openssl dgst -sha256 -hmac "$CRON_JWT_SECRET" -binary \
    | openssl base64 -A | tr '+/' '-_' | tr -d '=')

jwt="${header}.${payload}.${signature}"

# ----------- Appel HTTP ------------------
echo "→ POST $CRON_URL"
response=$(curl -s -w '\n%{http_code}' -X POST "$CRON_URL" \
    -H "Authorization: Bearer ${jwt}" \
    -H "Content-Type: application/json")

http_code=$(printf '%s' "$response" | tail -n1)
body=$(printf '%s' "$response" | sed '$d')

echo "HTTP $http_code"
echo "$body"

if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "✅ Cron OK"
    exit 0
else
    echo "❌ Cron échoué" >&2
    exit 1
fi
