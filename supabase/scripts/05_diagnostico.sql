-- =============================================================================
-- DIAGNÓSTICO — Verificar que los datos y RLS funcionan
-- =============================================================================
-- EJECUTAR EN EL SQL EDITOR DE SUPABASE
-- =============================================================================

-- 1. ¿Existen los profiles?
SELECT '1. Profiles en DB:', count(*) FROM public.profiles;
SELECT * FROM public.profiles;

-- 2. ¿Existe el usuario en auth.users?
SELECT '2. Auth users:', id, email FROM auth.users WHERE email LIKE '%elegancia%' OR email LIKE '%barberking%';

-- 3. ¿Las identidades existen?
SELECT '3. Identities:', user_id, provider, provider_id FROM auth.identities WHERE provider_id LIKE '%elegancia%' OR provider_id LIKE '%barberking%';

-- 4. Probar función auth_role() (simulando el usuario)
-- NOTA: Esto funciona si ejecutas desde el Dashboard (usa service_role)
SELECT '4. auth_role test:', public.auth_role();

-- 5. Probar la consulta exacta que hace la app
-- (Esto usa service_role = ve todo)
SELECT '5. Profile query test:', id, full_name, role FROM public.profiles WHERE id = '00000001-0000-0000-0000-000000000001';
