# Luma (Salones) — Script de arranque para Windows (PowerShell)
# Uso: .\start.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Luma - Sistema de Gestión de Salones  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Iniciar Redis via Docker
Write-Host "[1/4] Iniciando Redis..." -ForegroundColor Yellow
docker compose up -d redis 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Docker no está corriendo. Inicia Docker Desktop primero." -ForegroundColor Red
    exit 1
}
Write-Host "  Redis iniciado en localhost:6379" -ForegroundColor Green

# 2. Backend Laravel
Write-Host "[2/4] Iniciando Backend Laravel..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host 'Backend Laravel en http://localhost:8000' -ForegroundColor Cyan; php artisan serve --port=8000"

# 3. Reverb (WebSockets)
Write-Host "[3/4] Iniciando Reverb (WebSockets)..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host 'Reverb WebSocket en ws://localhost:8080' -ForegroundColor Magenta; php artisan reverb:start"

# 4. Frontend Vue
Write-Host "[4/4] Iniciando Frontend Vue..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd client; Write-Host 'Frontend Vue en http://localhost:5173' -ForegroundColor Blue; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Todo iniciado.                          " -ForegroundColor Green
Write-Host "  Backend:  http://localhost:8000          " -ForegroundColor Cyan
Write-Host "  Reverb:   ws://localhost:8080            " -ForegroundColor Magenta
Write-Host "  Frontend: http://localhost:5173          " -ForegroundColor Blue
Write-Host "  Redis:    localhost:6379                 " -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para procesar jobs async (opcional):" -ForegroundColor Gray
Write-Host "  cd backend && php artisan queue:work" -ForegroundColor Gray
