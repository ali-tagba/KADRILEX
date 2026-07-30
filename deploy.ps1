$ErrorActionPreference = "Stop"

$VPS_HOST = "ubuntu@37.59.99.86"
$VPS_APP_DIR = "/home/ubuntu/app"
$TAR_FILE = "$env:TEMP\kadrilex-deploy.tar.gz"
$VPS_PASS = "Haoualizoosk260267 ."

Write-Host "==> Création du tarball via Windows (exclut node_modules, .next, .git, .env*)" -ForegroundColor Cyan
tar.exe -czf "$TAR_FILE" --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="*.log" --exclude="supabase" --exclude=".env.ovh.local" --exclude=".env" --exclude=".env.local" --exclude=".env.production" .

Write-Host "==> Upload vers $VPS_HOST via SCP" -ForegroundColor Cyan
& "C:\Program Files\Git\usr\bin\scp.exe" -o StrictHostKeyChecking=accept-new "$TAR_FILE" "$VPS_HOST`:/tmp/kadrilex-deploy.tar.gz"

Write-Host "==> Extraction sur le VPS" -ForegroundColor Cyan
& "C:\Program Files\Git\usr\bin\ssh.exe" -o StrictHostKeyChecking=accept-new $VPS_HOST "tar -xzf /tmp/kadrilex-deploy.tar.gz -C $VPS_APP_DIR"

Write-Host "==> Build + restart container" -ForegroundColor Cyan
& "C:\Program Files\Git\usr\bin\ssh.exe" -o StrictHostKeyChecking=accept-new $VPS_HOST "echo '$VPS_PASS' | sudo -S bash -c 'cd $VPS_APP_DIR && docker compose build && docker compose up -d --force-recreate && sleep 5 && docker exec kadrilex-app node fix-db.js && docker exec kadrilex-app npx prisma@5.22.0 db push --accept-data-loss'"

Write-Host "==> Nettoyage..." -ForegroundColor Cyan
Remove-Item -Path "$TAR_FILE" -Force -ErrorAction SilentlyContinue

Write-Host "✅ Déploiement terminé. URL : https://37.59.99.86.nip.io" -ForegroundColor Green
