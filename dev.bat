@echo off
chcp 65001 >nul
title Luma - Salones (Laravel)

echo.
echo  ╔══════════════════════════════════════╗
echo  ║   🟢 Backend Laravel  :8000          ║
echo  ║   🟢 Frontend Vue     :5173          ║
echo  ║   🟡 Reverb WebSocket :8080          ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: ── Docker ──────────────────────────────────────────────
echo [1/3] Verificando Docker...
docker ps --filter name=luma-postgres --format "{{.Names}}" | findstr "luma-postgres" >nul
if %errorlevel% neq 0 (
    echo   Levantando luma-postgres y luma-redis...
    docker compose up -d
    timeout /t 3 >nul
) else (
    echo   luma-postgres OK
)
echo   luma-redis OK
echo.

:: ── Backend ─────────────────────────────────────────────
echo [2/3] Iniciando Backend Laravel...
start "Luma - Backend :8000" cmd /c "cd /d backend && php artisan serve --host=0.0.0.0 --port=8000"

echo   Iniciando Reverb (WebSocket)...
start "Luma - Reverb :8080" cmd /c "cd /d backend && php artisan reverb:start"

echo   Iniciando Horizon (Colas)...
start "Luma - Horizon" cmd /c "cd /d backend && php artisan horizon"

echo.

:: ── Frontend ────────────────────────────────────────────
echo [3/3] Iniciando Frontend Vue...
timeout /t 2 >nul
start "Luma - Frontend :5173" cmd /c "cd /d client && npm run dev"

echo.
echo  ┌─────────────────────────────────────┐
echo  │  🚀 Sistema listo                   │
echo  │                                     │
echo  │  Backend:  http://localhost:8000    │
echo  │  Frontend: http://localhost:5173    │
echo  │  Reverb:   http://localhost:8080    │
echo  │  Redis:    localhost:6379           │
echo  │  Postgres: localhost:5432/salones   │
echo  └─────────────────────────────────────┘
echo.
pause
