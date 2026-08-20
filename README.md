# Luma — Sistema de gestión para negocios de servicios

SaaS multi-tenant para negocios de servicios (salones, spas, barberías,
veterinarias, pet spas), staffing (nómina/empresas) y tiendas (POS sin
agenda). Un mismo código base sirve a todos los "nichos" — el
comportamiento se adapta por configuración, no por ramas de código
separadas. Ver [`agents.md`](./agents.md) para la arquitectura completa,
convenciones y dominio de negocio.

## Stack

- **Backend**: Laravel (PHP 8.4) + PostgreSQL, autohospedado en VPS
- **Frontend**: Vue 3 + Vite + TypeScript + Tailwind + Pinia + TanStack Query
- **Tiempo real**: Laravel Reverb (WebSockets)

## Estructura

```
.
├── backend/   # API Laravel
└── client/    # SPA Vue 3
```

## Quickstart (desarrollo local)

```bash
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate

# Frontend
cd client
npm install
cp .env.example .env
```

Levanta ambos con [`dev.bat`](./dev.bat) (Windows) o manualmente:

```bash
cd backend && php artisan serve --port=8000
cd client && npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).
