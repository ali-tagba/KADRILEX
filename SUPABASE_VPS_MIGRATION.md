# Migration Supabase — VPS dev (Hostinger) → VPS client

**État actuel** : Supabase tourne sur le **VPS dev personnel** (Hostinger, IP `82.25.116.169`, Ubuntu 24.04, 4 cores / 16 GB).
**Cible future** : VPS du cabinet client (à provisionner le moment venu).
**Objectif final** : tout migrer chez le client, puis **supprimer la stack KadriLex** du VPS dev (paperclip et autres services y restent intacts).

---

## 0. Architecture actuelle (VPS dev)

```
                       Internet
                          │
                    Hostinger VPS 82.25.116.169 (Ubuntu 24.04)
                          │
                  ┌───────┴───────┐
                  │   Caddy 2     │   (TLS via Let's Encrypt → fallback ZeroSSL)
                  │   ports 80/443 │
                  └──┬───┬───┬─────┘
                     │   │   │
        ┌────────────┘   │   └──────────────────┐
        │                │                      │
chat.*.sslip.io   supabase.*.sslip.io     paperclip/hermes/fanaka
   (existant)     ↓ proxy 127.0.0.1:8000      (existant, intouché)
                  │
                  ▼
            ┌─────────────┐
            │   Kong API  │  (port 8000 interne au stack supabase)
            └──┬──┬──┬──┬─┘
               │  │  │  │
        ┌──────┘  │  │  └────────────┐
        ▼         ▼  ▼               ▼
     auth      rest  storage      realtime
        │         │    │             │
        └─────────┴────┴─────────────┤
                                     ▼
                              ┌────────────┐
                              │ supabase-db│  (Postgres 15.8)
                              │ port 5432  │  → exposé sur host:5433 pour migrations
                              └────────────┘

                       supavisor (pooler)  → host:5432 (high concurrency, prod)
```

**Services Docker** sous `/opt/kadrilex-supabase/docker/` :
db, auth, rest, realtime, storage, studio, kong, meta, analytics, vector, imgproxy, pooler, edge-functions

**Caddy** : `/etc/caddy/Caddyfile` — bloc `supabase.82.25.116.169.sslip.io { reverse_proxy 127.0.0.1:8000 }`

**Secrets** : `/root/kadrilex-supabase-secrets.txt` (chmod 600)

---

## 1. Pré-requis sur le VPS client

| Ressource | Minimum | Recommandé |
|---|---|---|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| RAM | 4 GB | 8 GB+ |
| CPU | 2 vCPU | 4 vCPU |
| Disque | 50 GB SSD | 100 GB SSD NVMe |
| Réseau | IPv4 publique | IPv4 + IPv6 |

**Setup initial** (en root) :
```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 git ufw fail2ban caddy python3-jwt
systemctl enable --now docker caddy
ufw allow 22/tcp 80/tcp 443/tcp
ufw enable

# User non-root pour l'app
adduser kadrilex
usermod -aG docker kadrilex
```

**DNS** : pointer un domaine (ex: `db.kadrilegal.net`) vers l'IP du VPS client. Caddy se chargera du TLS.

---

## 2. Transfert de la stack Supabase (VPS dev → VPS client)

### 2.1 Préparer la cible

Sur le VPS client :
```bash
mkdir -p /opt/kadrilex-supabase
cd /opt/kadrilex-supabase

# Cloner Supabase officiel (même version qu'en dev)
git clone --depth 1 https://github.com/supabase/supabase supabase-src
cp -rf supabase-src/docker .
rm -rf supabase-src
```

### 2.2 Copier la configuration depuis le VPS dev

Depuis ta machine locale :
```bash
# Copier docker-compose.override.yml + .env (avec les secrets)
scp root@82.25.116.169:/opt/kadrilex-supabase/docker/docker-compose.override.yml \
    root@VPS_CLIENT:/opt/kadrilex-supabase/docker/
scp root@82.25.116.169:/opt/kadrilex-supabase/docker/.env \
    root@VPS_CLIENT:/opt/kadrilex-supabase/docker/

# Régénérer DES NOUVEAUX secrets sur le VPS client (sécurité — les secrets du dev ne doivent PAS finir en prod)
# Soit refaire tourner le script Python du setup initial, soit éditer manuellement.
```

⚠️ **Important** : régénérer **TOUS** les secrets pour la prod (POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, DASHBOARD_PASSWORD, etc.). Ne pas réutiliser les secrets de dev.

### 2.3 Adapter les URLs publiques dans `.env`

```bash
# Sur VPS client
sed -i 's|supabase.82.25.116.169.sslip.io|db.kadrilegal.net|g' /opt/kadrilex-supabase/docker/.env
```

### 2.4 Caddyfile sur VPS client

```caddy
db.kadrilegal.net {
    encode gzip zstd
    reverse_proxy 127.0.0.1:8000
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }
}
```

Puis : `systemctl reload caddy`

### 2.5 Démarrer la stack

```bash
cd /opt/kadrilex-supabase/docker
docker compose pull
docker compose up -d
docker compose ps    # vérifier que tout est healthy (~30s)
```

---

## 3. Migration des données

### 3.1 Dump depuis le VPS dev

Depuis ta machine locale (tunnel SSH déjà actif vers VPS dev) :
```bash
# Dump complet via Docker exec (plus simple que via tunnel)
ssh root@82.25.116.169 'docker exec supabase-db pg_dump \
    --no-owner --no-acl --clean --if-exists \
    -U postgres postgres' > kadrilex_dump.sql

# Vérifier taille
ls -lh kadrilex_dump.sql
```

### 3.2 Restore sur VPS client

```bash
# Upload du dump
scp kadrilex_dump.sql root@VPS_CLIENT:/tmp/

# Restore
ssh root@VPS_CLIENT 'docker exec -i supabase-db psql -U postgres -d postgres < /tmp/kadrilex_dump.sql'

# Vérifier
ssh root@VPS_CLIENT 'docker exec supabase-db psql -U postgres -d postgres -c "\dt"'
```

### 3.3 Migration Storage (fichiers buckets)

Si des fichiers ont été uploadés en dev :
```bash
# Dump des buckets
ssh root@82.25.116.169 'tar -czf - -C /opt/kadrilex-supabase/docker/volumes/storage .' \
    | ssh root@VPS_CLIENT 'tar -xzf - -C /opt/kadrilex-supabase/docker/volumes/storage'

ssh root@VPS_CLIENT 'docker compose -f /opt/kadrilex-supabase/docker/docker-compose.yml restart storage'
```

---

## 4. Bascule de l'application (Vercel ou autre hébergeur frontend)

### 4.1 Variables d'environnement Vercel

Sur https://vercel.com/<account>/kadrilex/settings/environment-variables, en **Production** :

```
DATABASE_URL=postgresql://postgres:<NEW_POSTGRES_PASSWORD>@db.kadrilegal.net:5432/postgres?sslmode=require
NEXT_PUBLIC_SUPABASE_URL=https://db.kadrilegal.net
NEXT_PUBLIC_SUPABASE_ANON_KEY=<NEW_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY>
```

⚠️ Le port Postgres direct (5432) ne doit PAS être ouvert public — soit utiliser un tunnel/VPN privé, soit utiliser uniquement l'API REST/Storage de Supabase (via Kong sur 443).

### 4.2 Redéploiement

```bash
vercel --prod
```

Surveiller les logs : Vercel doit pouvoir atteindre Supabase. Si timeout → problème firewall ou DNS.

---

## 5. Nettoyage du VPS dev (Hostinger, 82.25.116.169)

**Une fois la prod stable** (compter ~1 semaine de stabilité observée) :

### 5.1 Backup final du dev

```bash
ssh root@82.25.116.169 'docker exec supabase-db pg_dump --no-owner --no-acl -U postgres postgres' \
    | gzip > kadrilex_dev_final_$(date +%Y%m%d).sql.gz
# Archiver hors-VPS (clé USB, R2, B2…)
```

### 5.2 Arrêt et suppression de la stack

```bash
ssh root@82.25.116.169 << 'EOF'
set -e

# Stop et remove tous les conteneurs + volumes Supabase
cd /opt/kadrilex-supabase/docker
docker compose down --volumes --remove-orphans

# Suppression des images Docker (libère ~3 GB)
docker images | grep -E "supabase/|kong" | awk '{print $3}' | xargs -r docker rmi -f

# Suppression du dossier
rm -rf /opt/kadrilex-supabase

# Nettoyage Caddy : retirer le bloc KadriLex
sed -i '/# >>> KADRILEX-SUPABASE BEGIN/,/# <<< KADRILEX-SUPABASE END/d' /etc/caddy/Caddyfile
systemctl reload caddy

# Suppression des logs Caddy spécifiques
rm -f /var/log/caddy/supabase-access.log*

# Suppression du fichier secrets
rm -f /root/kadrilex-supabase-secrets.txt

# Vérification : paperclip, hermes, chat, fanaka tournent toujours ?
docker ps -a
systemctl is-active caddy
ss -tlnp | grep -E ":54329|:7860|:9119|:3100"
EOF
```

### 5.3 Vérifier que paperclip est intact

```bash
ssh root@82.25.116.169 'curl -sI https://paperclip.82.25.116.169.sslip.io/ | head -3'
# Doit retourner HTTP/2 200 ou 401 (selon auth)
```

---

## 6. Sécurité — checklist VPS client avant ouverture au public

- [ ] **TOUS** les secrets régénérés (pas réutilisés du dev)
- [ ] `chmod 600` sur `.env` et fichier de secrets
- [ ] Port Postgres direct (5432) **fermé public** — UFW ou tunnel SSH only
- [ ] Studio dashboard derrière basic auth Caddy
- [ ] HTTPS obligatoire + HSTS
- [ ] Backups Postgres testés : faire un `pg_restore` dans un VPS test
- [ ] Fail2ban actif (`apt install fail2ban`)
- [ ] SSH key only (`PasswordAuthentication no` dans `/etc/ssh/sshd_config`)
- [ ] Root login disabled (`PermitRootLogin no`)
- [ ] UFW restreint : `ufw default deny incoming`, allow seulement 22/80/443
- [ ] Logs Caddy + audit Postgres activés pour les ops sensibles

---

## 7. Backups automatiques (VPS client en prod)

`/etc/cron.daily/kadrilex-backup` :
```bash
#!/bin/bash
set -euo pipefail
BACKUP_DIR=/var/backups/kadrilex
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

docker exec supabase-db pg_dump --no-owner --no-acl -U postgres postgres \
    | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Rotation : garder 30 derniers jours
find "$BACKUP_DIR" -name "db-*.sql.gz" -mtime +30 -delete

# Upload offsite (R2, B2, S3…)
rclone copy "$BACKUP_DIR/db-$DATE.sql.gz" remote:kadrilex-backups/
```

```bash
chmod +x /etc/cron.daily/kadrilex-backup
```

---

## 8. Estimation effort migration

| Étape | Temps |
|---|---|
| Provisionnement VPS client + setup base (1.x) | 1h |
| Installation Supabase + .env régénéré (2.x) | 1h |
| DNS + Caddy + TLS (1.4) | 30 min |
| Migration data (3.x) | 30 min (avec données dev) |
| Bascule Vercel + tests (4.x) | 1h |
| Backups + monitoring (7) | 1h |
| Nettoyage VPS dev (5.x) | 30 min |
| **Total** | **~5-6h** sur une journée |

---

## 9. Plan B — Supabase Cloud managé

Si à un moment la maintenance VPS devient pesante, bascule sur **Supabase Cloud Pro** (~25 €/mois) :
- `pg_dump` du VPS → restore via Supabase Cloud Dashboard
- Update DATABASE_URL Vercel
- Migration en ~1h

L'avantage du self-hosted est la **maîtrise totale des données** (important pour un cabinet juridique avec données clients confidentielles). L'inverse est aussi simple si la maîtrise devient trop coûteuse.
