@echo off
chcp 65001 >nul
title Luma - Salones
set ROOT=%~dp0

echo.
echo   Luma - Salones
echo   Postgres 5434 ^| Redis 6379 ^| API 8000 ^| Front 5173
echo.

echo [1] Verificando Docker...
docker ps --filter name=luma-postgres --format "{{.Names}}" 2>nul | findstr "luma-postgres" >nul
if %errorlevel% neq 0 (
    echo     ERROR: luma-postgres no esta corriendo
    echo     Ejecuta: cd "%ROOT%" ^&^& docker compose up -d
    pause
    exit /b 1
)
echo     luma-postgres OK

docker ps --filter name=luma-redis --format "{{.Names}}" 2>nul | findstr "luma-redis" >nul
if %errorlevel% neq 0 (
    echo     ERROR: luma-redis no esta corriendo
    echo     Ejecuta: cd "%ROOT%" ^&^& docker compose up -d
    pause
    exit /b 1
)
echo     luma-redis OK
echo.

echo [2] Iniciando Backend :8000...
start "Luma-Backend" cmd /k "cd /d "%ROOT%backend" && php artisan serve --host=0.0.0.0 --port=8000"

echo [3] Iniciando Frontend :5173...
start "Luma-Frontend" cmd /k "cd /d "%ROOT%client" && npm run dev"

echo.
echo   Datos de prueba:
echo     admin@demo.com     / password  (Admin)
echo     super@demo.com     / password  (Superadmin)
echo     empleado@demo.com  / password  (Empleado)
echo.
echo   Abre http://localhost:5173
echo   F12 - Console para ver errores
echo.
pause
