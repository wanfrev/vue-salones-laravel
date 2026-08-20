# Luma (Salones) — Makefile para desarrollo local
#
# Redis debe estar corriendo nativo (no vía Docker) tanto en local como
# en el servidor — verifica con `redis-cli ping`.

.PHONY: install dev backend frontend reverb worker all

# ─── Instalación ───────────────────────────────────────────────────

install:
	cd backend && composer install
	cd client && npm install
	cd backend && cp -n .env.example .env || true
	cd client && cp -n .env.example .env || true
	cd backend && php artisan key:generate

# ─── Desarrollo ────────────────────────────────────────────────────

backend:
	PHP_CLI_SERVER_WORKERS=8 php artisan serve --port=8000

reverb:
	cd backend && php artisan reverb:start

worker:
	cd backend && php artisan queue:work

frontend:
	cd client && npm run dev

# ─── Todo a la vez ─────────────────────────────────────────────────

dev:
	@echo "Iniciando Luma en 4 terminales (asegurate de que Redis esté corriendo)..."
	@echo "1. make backend"
	@echo "2. make reverb"
	@echo "3. make frontend"
	@echo "4. make worker (opcional)"
