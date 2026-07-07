# Luma (Salones) — Script de arranque para macOS/Linux
# Uso: bash start.sh

echo "========================================"
echo "  Luma - Sistema de Gestión de Salones  "
echo "========================================"

# 1. Redis
echo "[1/4] Iniciando Redis..."
docker compose up -d redis
echo "  Redis iniciado en localhost:6379"

# 2. Backend
echo "[2/4] Iniciando Backend Laravel..."
cd backend && php artisan serve --port=8000 &
cd ..

# 3. Reverb
echo "[3/4] Iniciando Reverb..."
cd backend && php artisan reverb:start &
cd ..

# 4. Frontend
echo "[4/4] Iniciando Frontend Vue..."
cd client && npm run dev &
cd ..

echo ""
echo "========================================"
echo "  Todo iniciado."
echo "  Backend:  http://localhost:8000"
echo "  Reverb:   ws://localhost:8080"
echo "  Frontend: http://localhost:5173"
echo "  Redis:    localhost:6379"
echo "========================================"
wait
