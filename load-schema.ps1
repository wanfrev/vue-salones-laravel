# Luma (Salones) — Carga el schema limpio y semilla la BD
# Uso: .\load-schema.ps1

Write-Host "Destruyendo BD anterior..." -ForegroundColor Yellow
docker compose down -v 2>&1 | Out-Null
docker compose up -d
Write-Host "Esperando 5s a que PostgreSQL esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Cargando schema..." -ForegroundColor Yellow
Get-Content supabase\schema_ddl.sql | docker exec -i luma-postgres psql -U postgres -d salones 2>&1 | Select-String "ERROR" | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }

Write-Host "Verificando tablas..." -ForegroundColor Yellow
docker exec luma-postgres psql -U postgres -d salones -c "SELECT count(*) as tablas FROM information_schema.tables WHERE table_schema = 'public';"

Write-Host "Poblando BD con datos demo..." -ForegroundColor Yellow
Set-Location backend
php artisan db:seed
Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Schema cargado y BD poblada.          " -ForegroundColor Green
Write-Host "  Admin:      admin@luma.app / password  " -ForegroundColor Cyan
Write-Host "  Superadmin: superadmin@luma.app / pass " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
