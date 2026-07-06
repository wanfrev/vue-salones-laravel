-- =============================================================================
-- CREAR TU NEGOCIO Y ADMINISTRADOR
-- =============================================================================
-- PASO 1: Ve a Authentication > Users > "Add User" y crea tu usuario admin
--          (correo y contraseña que quieras usar).
--          Esto crea el registro en auth.users y te da el UUID.
-- PASO 2: Reemplaza los valores abajo con los tuyos y ejecuta.
-- =============================================================================

-- Crea tu negocio
insert into public.businesses (id, name, slug, phone, address, timezone, currency, niche_type, theme_config, terminology)
values (
  gen_random_uuid(),                                 -- id (se genera automático)
  'Mi Salón',                                        -- nombre de tu negocio
  'mi-salon',                                        -- slug único para URL pública
  '+1 809 555 0000',                                 -- teléfono
  'Mi dirección',                                    -- dirección
  'America/Santo_Domingo',                           -- zona horaria
  'USD',                                             -- moneda
  'salon',                                           -- 'salon' | 'barberia' | 'dog_spa'
  '{"primary":"#2F4156","secondary":"#567CB0"}'::jsonb,
  '{"client":"Cliente","employee":"Empleado","service":"Servicio","appointment":"Cita","staff":"Personal"}'::jsonb
)
returning id;
-- ↑ COPIA EL ID QUE DEVUELVE, LO NECESITAS ABAJO ↑

-- Crea el perfil admin (REEMPLAZA los UUIDs)
insert into public.profiles (id, business_id, full_name, role)
values (
  'EL_UUID_DEL_USUARIO_QUE_CREASTE_EN_AUTH',        -- UUID de auth.users
  'EL_UUID_DEL_BUSINESS_QUE_DEVOLVIÓ_ARRIBA',        -- UUID de businesses
  'Tu Nombre',                                       -- tu nombre
  'admin'                                            -- rol
);

-- (Opcional) Crea categorías de servicios
insert into public.service_categories (business_id, name, description)
values
  ('EL_UUID_DEL_BUSINESS', 'Cortes', 'Cortes de cabello'),
  ('EL_UUID_DEL_BUSINESS', 'Tintes', 'Colorimetría');

-- (Opcional) Crea algunos servicios
insert into public.services (business_id, service_category_id, name, description, duration_minutes, price, local_percentage, color, category)
select
  'EL_UUID_DEL_BUSINESS', sc.id, 'Corte de Cabello', 'Corte moderno', 45, 800, 50, '#e11d48', 'corte'
from public.service_categories sc
where sc.business_id = 'EL_UUID_DEL_BUSINESS' and sc.name = 'Cortes'
limit 1;

-- =============================================================================
-- USUARIO SUPERADMIN (opcional, para gestionar múltiples negocios)
-- =============================================================================
-- Crea otro usuario en Authentication > Users, luego:
-- insert into public.profiles (id, business_id, full_name, role)
-- values ('SU_UUID', null, 'Super Admin', 'superadmin');
