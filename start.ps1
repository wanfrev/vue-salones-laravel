# Luma (Salones) — Script de arranque para Windows
# Uso: .\start.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Luma - Sistema de Gestión de Salones  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Docker
Write-Host "[1/5] Iniciando PostgreSQL + Redis..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Docker no está corriendo. Inicia Docker Desktop primero." -ForegroundColor Red
    exit 1
}
Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor Green
Write-Host "  Redis:      localhost:6379" -ForegroundColor Green

# 2. Cargar schema (solo si BD está vacía)
Write-Host "[2/5] Verificando schema de BD..." -ForegroundColor Yellow
$schemaExists = docker exec luma-postgres psql -U postgres -d salones -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'businesses');" 2>$null
if ($schemaExists -match "f") {
    Write-Host "  Cargando schema desde migraciones..." -ForegroundColor Yellow
    Get-ChildItem supabase\migrations\*.sql | Sort-Object Name | ForEach-Object {
        Get-Content $_.FullName | docker exec -i luma-postgres psql -U postgres -d salones 2>&1 | Out-Null
    }
    Write-Host "  Schema cargado." -ForegroundColor Green
} else {
    Write-Host "  Schema ya existe." -ForegroundColor Green
}

# 3. Seed
Write-Host "[3/5] Poblando BD con datos demo..." -ForegroundColor Yellow
Set-Location backend
php artisan db:seed
Set-Location ..
Write-Host "  Datos demo cargados." -ForegroundColor Green

# 4. Backend
Write-Host "[4/5] Iniciando Backend Laravel..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host 'Backend en http://localhost:8000' -ForegroundColor Cyan; php artisan serve --port=8000"

# 5. Frontend
Write-Host "[5/5] Iniciando Frontend Vue..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd client; Write-Host 'Frontend en http://localhost:5173' -ForegroundColor Blue; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Luma en: http://localhost:5173        " -ForegroundColor Green
Write-Host "  Admin:   admin@luma.app / password     " -ForegroundColor Cyan
Write-Host "  Superadmin: superadmin@luma.app / pass " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
