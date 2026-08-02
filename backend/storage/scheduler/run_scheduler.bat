@echo off
REM ============================================================
REM Luma Scheduler — Ejecuta artisan schedule:run cada 60 segundos
REM Debe configurarse en Windows Task Scheduler o ejecutarse
REM desde un terminal como proceso persistente.
REM
REM Alternativa para producción: configurar Task Scheduler:
REM 1. Abrir Task Scheduler (taskschd.msc)
REM 2. Create Basic Task
REM 3. Trigger: Daily, Repeat every 1 minute, Duration: Indefinitely
REM 4. Action: Start a program
REM    Program: php
REM    Arguments: artisan schedule:run
REM    Start in: C:\ruta\a\vue-salones-laravel\backend
REM ============================================================

cd /d "%~dp0..\..\"

:loop
echo [%date% %time%] Running Laravel scheduler...
php artisan schedule:run --no-interaction 2>&1
echo [%date% %time%] Scheduler iteration complete. Waiting 60s...
timeout /t 60 /nobreak >nul
goto loop
