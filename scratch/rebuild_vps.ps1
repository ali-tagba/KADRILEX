$ErrorActionPreference = "Stop"
$VPS_HOST = "ubuntu@37.59.99.86"
$VPS_APP_DIR = "/home/ubuntu/app"
$VPS_PASS = "Haoualizoosk260267 ."

Write-Host "==> Cleaning ghost files on VPS" -ForegroundColor Cyan
& "C:\Program Files\Git\usr\bin\ssh.exe" -o StrictHostKeyChecking=accept-new $VPS_HOST "rm -rf $VPS_APP_DIR/lib/demo"

Write-Host "==> Rebuilding and restarting container" -ForegroundColor Cyan
& "C:\Program Files\Git\usr\bin\ssh.exe" -o StrictHostKeyChecking=accept-new $VPS_HOST "echo '$VPS_PASS' | sudo -S bash -c 'cd $VPS_APP_DIR && docker compose build && docker compose up -d --force-recreate && sleep 5 && docker exec kadrilex-app node fix-db.js && docker exec kadrilex-app npx prisma@5.22.0 db push --accept-data-loss'"

Write-Host "✅ Re-build terminé." -ForegroundColor Green
