@echo off
chcp 65001 >nul
title Luma - Salones

set ROOT=%~dp0

echo.
echo   Luma - Salones
echo   ---------------
echo.

echo [*] Verificando Docker...
docker ps --filter name=luma-postgres --format "{{.Names}}" 2>nul | findstr "luma-postgres" >nul
if %errorlevel% neq 0 (
    echo     Error: luma-postgres no esta corriendo
    echo     Ejecuta: cd "%ROOT%" ^&^& docker compose up -d
    pause
    exit /b 1
)
echo     luma-postgres OK
docker ps --filter name=luma-redis --format "{{.Names}}" 2>nul | findstr "luma-redis" >nul
if %errorlevel% neq 0 (
    echo     luma-redis no esta corriendo
    echo     Ejecuta: cd "%ROOT%" ^&^& docker compose up -d
    pause
    exit /b 1
)
echo     luma-redis OK
echo.

echo [*] Iniciando Backend :8000...
start "Luma-Backend" cmd /k "cd /d "%ROOT%backend" && php artisan serve --host=0.0.0.0 --port=8000"

echo [*] Iniciando Reverb :8080...
start "Luma-Reverb" cmd /k "cd /d "%ROOT%backend" && php artisan reverb:start"

echo [*] Iniciando Horizon...
start "Luma-Horizon" cmd /k "cd /d "%ROOT%backend" && php artisan horizon"

echo [*] Iniciando Frontend :5173...
start "Luma-Frontend" cmd /k "cd /d "%ROOT%client" && npm run dev"

echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   Postgres: localhost:5432 / salones
echo.
echo   Cierra las ventanas para detener todo.
echo.
pause
