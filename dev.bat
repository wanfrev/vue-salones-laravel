@echo off
chcp 65001 >nul
title Luma - Salones
set ROOT=%~dp0

echo.
echo   Luma - Salones
echo   PostgreSQL DBngin ^| PHP 8.4 ^| API 8000 (8 workers) ^| Front 5173
echo.

echo [1] Asegurate de que DBngin este corriendo (PostgreSQL en puerto 5432)
echo.

echo [2] Iniciando Backend :8000 (8 workers)...
start "Luma-Backend" cmd /k "cd /d "%ROOT%backend" && set PHP_CLI_SERVER_WORKERS=8 && php artisan serve --host=0.0.0.0 --port=8000"

echo [3] Iniciando Frontend :5173...
start "Luma-Frontend" cmd /k "cd /d "%ROOT%client" && npm run dev"

echo.
echo   Credenciales:
echo     superadmin@luma.app / password  (Superadmin)
echo     admin@luma.app     / password  (Admin)
echo     carlos@luma.app    / password  (Empleado)
echo.
echo   Abre http://localhost:5173
echo.
pause
