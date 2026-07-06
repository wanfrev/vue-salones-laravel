-- =============================================================================
-- ELIMINA TODOS LOS DATOS DE LA BD (PERO MANTIENE TABLAS, FUNCIONES, RLS)
-- =============================================================================
-- EJECUTAR EN EL SQL EDITOR DE SUPABASE (una sola vez)
-- =============================================================================

-- Desactiva triggers y FK temporalmente para evitar conflictos de orden
SET session_replication_role = 'replica';

-- Truncate todas las tablas públicas (CASCADE limpia también tablas dependientes)
TRUNCATE TABLE public.inventory_movements CASCADE;
TRUNCATE TABLE public.inventory_stock CASCADE;
TRUNCATE TABLE public.product_variants CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.product_categories CASCADE;
TRUNCATE TABLE public.inventory_locations CASCADE;
TRUNCATE TABLE public.service_variants CASCADE;
TRUNCATE TABLE public.service_categories CASCADE;
TRUNCATE TABLE public.expenses CASCADE;
TRUNCATE TABLE public.employee_absences CASCADE;
TRUNCATE TABLE public.client_preferred_services CASCADE;
TRUNCATE TABLE public.transactions CASCADE;
TRUNCATE TABLE public.appointments CASCADE;
TRUNCATE TABLE public.employee_schedules CASCADE;
TRUNCATE TABLE public.employee_services CASCADE;
TRUNCATE TABLE public.services CASCADE;
TRUNCATE TABLE public.clients CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.businesses CASCADE;

-- Reactiva triggers y FKs
SET session_replication_role = 'origin';

-- =============================================================================
-- VERIFICACIÓN (opcional)
-- =============================================================================
-- SELECT 'businesses', count(*) FROM public.businesses
-- UNION ALL SELECT 'profiles', count(*) FROM public.profiles
-- UNION ALL SELECT 'services', count(*) FROM public.services
-- UNION ALL SELECT 'clients', count(*) FROM public.clients
-- UNION ALL SELECT 'appointments', count(*) FROM public.appointments
-- UNION ALL SELECT 'transactions', count(*) FROM public.transactions;
