# Sistema de Salones

App de gestión para salones de belleza: agenda, clientes con historial,
finanzas (% local + % empleada) y auto-agendamiento público por link.

Pensada multi-tenant: un superadmin puede manejar varios salones; cada
salón tiene su admin y sus empleadas.

## Stack

- **Frontend**: Vue 3 + Vite + Tailwind v4 + Pinia + Vue Router + Tanstack Query
- **Backend**: Supabase (Postgres + Auth + RLS + Edge Functions)
- **PWA**: vite-plugin-pwa

## Estructura

```
.
├── client/      # SPA Vue 3
└── supabase/    # esquema, RLS y funciones (ver supabase/README.md)
```

## Quickstart

### 1. Provisiona Supabase

Sigue [`supabase/README.md`](./supabase/README.md) para:

- Aplicar las migraciones (CLI o dashboard).
- Cargar el seed demo (opcional).
- Crear el primer superadmin.

### 2. Levanta el client

```bash
cd client
cp .env.example .env       # edita con tu URL y anon key de Supabase
npm install --legacy-peer-deps
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) e inicia sesión con el
correo del usuario que creaste en Supabase Auth.

## Estado del proyecto

| Pieza | Estado |
|---|---|
| Esquema multi-tenant + RLS | Listo |
| Funciones de booking público | Listas (RPC, sin UI todavía) |
| Auth Supabase + guards | Listo (login con email/password) |
| Vistas Admin / Dashboard | Placeholder — falta agenda, clientes, finanzas |
| Recordatorios WhatsApp 24h | Esquema preparado, proveedor sin decidir |

## Roadmap inmediato

1. UI de agenda (calendario semanal con estados por color).
2. CRUD de servicios, empleadas y horarios.
3. Booking público en `/book/:slug` usando las RPC ya creadas.
4. Vista de clientes con historial.
5. Finanzas: cuadre diario/semanal/mensual.
6. Edge Function programada para recordatorios WhatsApp.
# vue-salones-laravel
# vue-salones-laravel
