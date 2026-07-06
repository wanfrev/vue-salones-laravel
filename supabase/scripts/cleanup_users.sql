-- =============================================================
-- LIMPIEZA COMPLETA DE USUARIOS DE PRUEBA
-- =============================================================
-- Elimina los 6 usuarios creados en seed.sql, sus perfiles y
-- todos los datos dependientes (citas, horarios, transacciones,
-- gastos, ausencias).
-- Los negocios, servicios, clientes, productos e inventario
-- se mantienen intactos.
-- =============================================================

-- 1. Datos que dependen de profiles (FK restrict)
delete from public.employee_absences;
delete from public.expenses;
delete from public.transactions;
delete from public.appointments;
delete from public.employee_services;
delete from public.employee_schedules;

-- 2. Profiles (cascade desde auth.users)
delete from public.profiles;

-- 3. Auth users de prueba
delete from auth.users
where email in (
  'admin@elegancia.com',
  'valentina@elegancia.com',
  'carlos@elegancia.com',
  'admin@barberking.com',
  'jorge@barberking.com',
  'pedro@barberking.com',
  'admin@salon.com',
  'admin@spa.com',
  'juan@spa.com',
  'maria@salon.com'
);
