# Luma (Salones) — Makefile para desarrollo local

.PHONY: up down install dev backend frontend reverb worker all

# ─── Docker ────────────────────────────────────────────────────────

up:
	docker compose up -d redis

down:
	docker compose down

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
	@echo "Iniciando Luma en 4 terminales..."
	@echo "1. docker compose up -d redis"
	@echo "2. php artisan serve --port=8000"
	@echo "3. php artisan reverb:start"
	@echo "4. npm run dev"
	@echo "5. php artisan queue:work (opcional)"

all: up
	@echo "Redis iniciado. Ahora abrí 4 terminales y ejecutá:"
	@echo "  make backend"
	@echo "  make reverb"
	@echo "  make frontend"
	@echo "  make worker"
