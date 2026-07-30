$ErrorActionPreference = "Stop"
$VPS_HOST = "ubuntu@37.59.99.86"
$VPS_PASS = "Haoualizoosk260267 ."

Write-Host "==> Pushing Prisma schema on VPS..." -ForegroundColor Cyan
ssh.exe -o StrictHostKeyChecking=accept-new $VPS_HOST "echo '$VPS_PASS' | sudo -S bash -c 'docker exec kadrilex-app npx prisma@5.22.0 db push --accept-data-loss'"
Write-Host "✅ Terminé." -ForegroundColor Green
