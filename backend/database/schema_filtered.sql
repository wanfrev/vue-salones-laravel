BEGIN;\n\n-- ============================================================================\n-- Luma Application Schema\n-- Auto-generated from working database\n-- ============================================================================\n\nCREATE TYPE public.app_role AS ENUM (
    'superadmin',
    'admin',
    'empleado'
);\n\nCREATE TYPE public.appointment_source AS ENUM (
    'internal',
    'public'
);\n\nCREATE TYPE public.appointment_status AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);\n\nCREATE TYPE public.employee_absence_type AS ENUM (
    'break',
    'vacation',
    'sick_leave',
    'personal',
    'blocked'
);\n\nCREATE TYPE public.inventory_movement_type AS ENUM (
    'purchase',
    'sale',
    'adjustment',
    'transfer_in',
    'transfer_out',
    'return',
    'consumption'
);\n\nCREATE TYPE public.payment_method AS ENUM (
    'cash',
    'card',
    'transfer',
    'other',
    'zelle',
    'pago_movil',
    'mixed',
    'cash_ves',
    'punto_venta'
);\n\nCREATE TYPE public.payment_status AS ENUM (
    'unpaid',
    'partial',
    'paid'
);\n\nCREATE TABLE public.businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    phone text,
    address text,
    timezone text DEFAULT 'America/Santo_Domingo'::text NOT NULL,
    currency text DEFAULT 'DOP'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    niche_type text DEFAULT 'salon'::text NOT NULL,
    theme_config jsonb DEFAULT '{"primary": "#2F4156", "secondary": "#567CB0"}'::jsonb NOT NULL,
    terminology jsonb DEFAULT '{"pet": "Mascota", "breed": "Raza", "owner": "Dueno", "staff": "Personal", "client": "Cliente", "weight": "Peso", "service": "Servicio", "employee": "Empleado", "vaccines": "Vacunas", "appointment": "Cita"}'::jsonb NOT NULL,
    ves_exchange_rate numeric(12,4) DEFAULT 36.5000 NOT NULL,
    deleted_at timestamp with time zone,
    job_titles jsonb DEFAULT '[]'::jsonb NOT NULL,
    service_categories jsonb DEFAULT '[]'::jsonb NOT NULL,
    multi_branch_enabled boolean DEFAULT false NOT NULL,
    features jsonb DEFAULT '{"pos": true, "productos": true, "inventario": true, "proveedores": true, "multi_branch": false}'::jsonb NOT NULL,
    employee_ves_rate numeric(12,4)
);\n\nCREATE TABLE public.appointment_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid NOT NULL,
    service_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    assistant_id uuid,
    assistant_percentage numeric(5,2) DEFAULT 0,
    price_applied numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);\n\nCREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    client_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    service_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status public.appointment_status DEFAULT 'pending'::public.appointment_status NOT NULL,
    payment_status public.payment_status DEFAULT 'unpaid'::public.payment_status NOT NULL,
    service_notes text,
    internal_notes text,
    reminder_sent_at timestamp with time zone,
    source public.appointment_source DEFAULT 'internal'::public.appointment_source NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    group_id uuid,
    price_override numeric(12,2),
    assistant_employee_id uuid,
    assistant_percentage numeric(5,2),
    branch_id uuid,
    employee_percentage_override numeric(5,2),
    duration_override numeric(6,2),
    CONSTRAINT appointments_check CHECK ((end_time > start_time))
);\n\nCREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    is_default boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ves_exchange_rate numeric(12,4)
);\n\nCREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration bigint NOT NULL
);\n\nCREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration bigint NOT NULL
);\n\nCREATE TABLE public.client_preferred_services (
    client_id uuid NOT NULL,
    service_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid
);\n\nCREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    birthday date,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    branch_id uuid
);\n\nCREATE TABLE public.employee_absences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    type public.employee_absence_type DEFAULT 'blocked'::public.employee_absence_type NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_absences_check CHECK ((ends_at > starts_at))
);\n\nCREATE TABLE public.employee_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text DEFAULT 'cash'::text NOT NULL,
    notes text,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'payment'::text NOT NULL,
    concept text,
    currency text DEFAULT 'USD'::text NOT NULL,
    original_amount numeric(12,2) DEFAULT 0 NOT NULL,
    exchange_rate_used numeric(12,4) DEFAULT 1.0000 NOT NULL,
    branch_id uuid,
    CONSTRAINT employee_payments_amount_check CHECK ((amount > (0)::numeric))
);\n\nCREATE TABLE public.employee_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    weekday smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT employee_schedules_check CHECK ((end_time > start_time)),
    CONSTRAINT employee_schedules_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6)))
);\n\nCREATE TABLE public.employee_services (
    employee_id uuid NOT NULL,
    service_id uuid NOT NULL
);\n\nCREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    amount numeric(12,2) NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    original_amount numeric(12,2) DEFAULT 0 NOT NULL,
    exchange_rate_used numeric(12,4) DEFAULT 1.0000 NOT NULL,
    branch_id uuid,
    CONSTRAINT expenses_amount_check CHECK ((amount >= (0)::numeric))
);\n\nCREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection character varying(255) NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);\n\nCREATE TABLE public.gift_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    branch_id uuid,
    recipient_name text NOT NULL,
    recipient_phone text,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    redeemed_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gift_cards_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT gift_cards_status_check CHECK ((status = ANY (ARRAY['active'::text, 'redeemed'::text, 'expired'::text])))
);\n\nCREATE TABLE public.inventory_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid
);\n\nCREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    location_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    movement_type public.inventory_movement_type NOT NULL,
    quantity numeric(12,4) NOT NULL,
    unit_cost numeric(12,4) DEFAULT 0 NOT NULL,
    reference_type text,
    reference_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    exchange_rate_used numeric(12,4) DEFAULT 1.0000 NOT NULL,
    branch_id uuid,
    client_id uuid,
    CONSTRAINT inventory_movements_quantity_check CHECK ((quantity <> (0)::numeric))
);\n\nCREATE TABLE public.inventory_stock (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    location_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    quantity numeric(12,4) DEFAULT 0 NOT NULL,
    reserved_qty numeric(12,4) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT inventory_stock_quantity_check CHECK ((quantity >= (0)::numeric)),
    CONSTRAINT inventory_stock_reserved_qty_check CHECK ((reserved_qty >= (0)::numeric))
);\n\nCREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);\n\nCREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);\n\nCREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);\n\nCREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    appointment_id uuid,
    client_name text,
    client_phone text,
    service_name text,
    appointment_time timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);\n\nCREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);\n\nCREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id uuid NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);\n\nCREATE TABLE public.product_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid
);\n\nCREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    name text NOT NULL,
    sku text,
    unit_cost numeric(12,4) DEFAULT 0 NOT NULL,
    unit_price numeric(12,4) DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT product_variants_unit_cost_check CHECK ((unit_cost >= (0)::numeric)),
    CONSTRAINT product_variants_unit_price_check CHECK ((unit_price >= (0)::numeric))
);\n\nCREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    sku text,
    barcode text,
    unit text DEFAULT 'unit'::text NOT NULL,
    unit_cost numeric(12,4) DEFAULT 0 NOT NULL,
    unit_price numeric(12,4) DEFAULT 0 NOT NULL,
    reorder_point numeric(12,4) DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_sellable boolean DEFAULT true NOT NULL,
    branch_id uuid,
    CONSTRAINT products_reorder_point_check CHECK ((reorder_point >= (0)::numeric)),
    CONSTRAINT products_unit_cost_check CHECK ((unit_cost >= (0)::numeric)),
    CONSTRAINT products_unit_price_check CHECK ((unit_price >= (0)::numeric))
);\n\nCREATE TABLE public.profiles (
    id uuid NOT NULL,
    business_id uuid,
    full_name text NOT NULL,
    role public.app_role DEFAULT 'empleado'::public.app_role NOT NULL,
    phone text,
    avatar_url text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    job_title text,
    pay_type text DEFAULT 'percentage'::text NOT NULL,
    pay_percentage numeric(5,2) DEFAULT 50 NOT NULL,
    base_salary numeric(12,2) DEFAULT 0 NOT NULL,
    email text,
    salary_frequency text DEFAULT 'monthly'::text NOT NULL,
    disable_agenda boolean DEFAULT false NOT NULL,
    can_create_appointments boolean DEFAULT true NOT NULL,
    can_create_clients boolean DEFAULT true NOT NULL,
    CONSTRAINT profiles_base_salary_check CHECK ((base_salary >= (0)::numeric)),
    CONSTRAINT profiles_pay_percentage_check CHECK (((pay_percentage >= (0)::numeric) AND (pay_percentage <= (100)::numeric))),
    CONSTRAINT profiles_salary_frequency_check CHECK ((salary_frequency = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text]))),
    CONSTRAINT profiles_tenant_required CHECK (((role = 'superadmin'::public.app_role) OR (business_id IS NOT NULL)))
);\n\nCREATE TABLE public.service_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);\n\nCREATE TABLE public.service_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    service_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer,
    price numeric(12,2),
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);\n\nCREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    price numeric(12,2) NOT NULL,
    local_percentage numeric(5,2) DEFAULT 50 NOT NULL,
    color text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'otros'::text NOT NULL,
    icon text,
    service_category_id uuid,
    branch_id uuid,
    CONSTRAINT services_duration_minutes_check CHECK ((duration_minutes > 0)),
    CONSTRAINT services_local_percentage_check CHECK (((local_percentage >= (0)::numeric) AND (local_percentage <= (100)::numeric))),
    CONSTRAINT services_price_check CHECK ((price >= (0)::numeric))
);\n\nCREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);\n\nCREATE TABLE public.supplier_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_method text DEFAULT 'cash'::text NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT supplier_payments_amount_check CHECK ((amount > (0)::numeric))
);\n\nCREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    company text,
    total_debt numeric(12,2) DEFAULT 0 NOT NULL,
    debt_currency text DEFAULT 'USD'::text NOT NULL,
    debt_original_amount numeric(12,2) DEFAULT 0 NOT NULL,
    debt_exchange_rate numeric(12,4) DEFAULT 1 NOT NULL,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT suppliers_debt_currency_check CHECK ((debt_currency = ANY (ARRAY['USD'::text, 'VES'::text]))),
    CONSTRAINT suppliers_debt_exchange_rate_check CHECK ((debt_exchange_rate > (0)::numeric)),
    CONSTRAINT suppliers_debt_original_amount_check CHECK ((debt_original_amount >= (0)::numeric)),
    CONSTRAINT suppliers_total_debt_check CHECK ((total_debt >= (0)::numeric))
);\n\nCREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    appointment_id uuid,
    total_amount numeric(12,2) NOT NULL,
    local_amount numeric(12,2) NOT NULL,
    employee_amount numeric(12,2) NOT NULL,
    local_percentage numeric(5,2) NOT NULL,
    employee_percentage numeric(5,2) NOT NULL,
    method public.payment_method DEFAULT 'cash'::public.payment_method NOT NULL,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    exchange_rate_used numeric(12,4) DEFAULT 1.0000 NOT NULL,
    payments_breakdown jsonb DEFAULT '[]'::jsonb NOT NULL,
    assistant_amount numeric(12,2) DEFAULT 0 NOT NULL,
    assistant_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    branch_id uuid,
    tip_amount numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT transactions_local_employee_assistant_equal_total CHECK ((round(((local_amount + employee_amount) + assistant_amount), 2) = round(total_amount, 2))),
    CONSTRAINT transactions_percentages_sum_100 CHECK ((round(((local_percentage + employee_percentage) + assistant_percentage), 2) = (100)::numeric))
);\n\nCREATE TABLE public.users (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);\n\nCREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;\n\nCREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;\n\nCREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;\n\nCREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;\n\nCREATE INDEX appointments_business_start_idx ON public.appointments USING btree (business_id, start_time);\n\nCREATE INDEX appointments_client_start_idx ON public.appointments USING btree (client_id, start_time DESC);\n\nCREATE INDEX appointments_employee_start_idx ON public.appointments USING btree (employee_id, start_time);\n\nCREATE INDEX appointments_group_id_idx ON public.appointments USING btree (group_id);\n\nCREATE INDEX appointments_reminder_idx ON public.appointments USING btree (start_time) WHERE ((reminder_sent_at IS NULL) AND (status = ANY (ARRAY['pending'::public.appointment_status, 'confirmed'::public.appointment_status])));\n\nCREATE INDEX appointments_status_idx ON public.appointments USING btree (business_id, status);\n\nCREATE INDEX appt_svc_appointment_idx ON public.appointment_services USING btree (appointment_id);\n\nCREATE INDEX appt_svc_employee_idx ON public.appointment_services USING btree (employee_id);\n\nCREATE INDEX branches_business_idx ON public.branches USING btree (business_id);\n\nCREATE INDEX businesses_slug_idx ON public.businesses USING btree (slug);\n\nCREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);\n\nCREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);\n\nCREATE INDEX client_preferred_services_branch_idx ON public.client_preferred_services USING btree (branch_id);\n\nCREATE INDEX client_preferred_services_service_idx ON public.client_preferred_services USING btree (service_id);\n\nCREATE INDEX clients_branch_idx ON public.clients USING btree (branch_id);\n\nCREATE INDEX clients_business_idx ON public.clients USING btree (business_id);\n\nCREATE INDEX clients_phone_idx ON public.clients USING btree (business_id, phone);\n\nCREATE INDEX employee_absences_business_idx ON public.employee_absences USING btree (business_id);\n\nCREATE INDEX employee_absences_employee_range_idx ON public.employee_absences USING btree (employee_id, starts_at, ends_at);\n\nCREATE INDEX employee_payments_branch_idx ON public.employee_payments USING btree (branch_id);\n\nCREATE INDEX employee_schedules_employee_idx ON public.employee_schedules USING btree (employee_id, weekday);\n\nCREATE INDEX employee_services_service_idx ON public.employee_services USING btree (service_id);\n\nCREATE INDEX expenses_business_date_idx ON public.expenses USING btree (business_id, expense_date DESC);\n\nCREATE INDEX failed_jobs_connection_queue_failed_at_index ON public.failed_jobs USING btree (connection, queue, failed_at);\n\nCREATE INDEX idx_businesses_active ON public.businesses USING btree (id) WHERE (deleted_at IS NULL);\n\nCREATE INDEX idx_employee_payments_business ON public.employee_payments USING btree (business_id);\n\nCREATE INDEX idx_employee_payments_date ON public.employee_payments USING btree (payment_date);\n\nCREATE INDEX idx_employee_payments_employee ON public.employee_payments USING btree (employee_id);\n\nCREATE INDEX idx_gift_cards_branch ON public.gift_cards USING btree (branch_id);\n\nCREATE INDEX idx_gift_cards_business ON public.gift_cards USING btree (business_id);\n\nCREATE INDEX idx_gift_cards_status ON public.gift_cards USING btree (status);\n\nCREATE INDEX idx_notifications_business ON public.notifications USING btree (business_id);\n\nCREATE INDEX idx_notifications_unread ON public.notifications USING btree (profile_id, is_read, created_at DESC) WHERE (is_read = false);\n\nCREATE INDEX idx_supplier_payments_business ON public.supplier_payments USING btree (business_id);\n\nCREATE INDEX idx_supplier_payments_date ON public.supplier_payments USING btree (payment_date);\n\nCREATE INDEX idx_supplier_payments_supplier ON public.supplier_payments USING btree (supplier_id);\n\nCREATE INDEX idx_suppliers_active ON public.suppliers USING btree (business_id, active);\n\nCREATE INDEX idx_suppliers_business ON public.suppliers USING btree (business_id);\n\nCREATE INDEX inventory_locations_branch_idx ON public.inventory_locations USING btree (branch_id);\n\nCREATE INDEX inventory_locations_business_idx ON public.inventory_locations USING btree (business_id);\n\nCREATE INDEX inventory_movements_business_idx ON public.inventory_movements USING btree (business_id, created_at DESC);\n\nCREATE INDEX inventory_movements_client_id_idx ON public.inventory_movements USING btree (client_id);\n\nCREATE INDEX inventory_movements_product_idx ON public.inventory_movements USING btree (product_id);\n\nCREATE INDEX inventory_stock_business_idx ON public.inventory_stock USING btree (business_id);\n\nCREATE UNIQUE INDEX inventory_stock_unique_idx ON public.inventory_stock USING btree (location_id, product_id, variant_id);\n\nCREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);\n\nCREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);\n\nCREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);\n\nCREATE INDEX product_categories_branch_idx ON public.product_categories USING btree (branch_id);\n\nCREATE INDEX product_categories_business_idx ON public.product_categories USING btree (business_id);\n\nCREATE INDEX product_categories_parent_idx ON public.product_categories USING btree (parent_id);\n\nCREATE INDEX product_variants_branch_idx ON public.product_variants USING btree (branch_id);\n\nCREATE INDEX product_variants_product_idx ON public.product_variants USING btree (product_id);\n\nCREATE INDEX products_active_idx ON public.products USING btree (business_id, active);\n\nCREATE INDEX products_branch_idx ON public.products USING btree (branch_id);\n\nCREATE INDEX products_business_idx ON public.products USING btree (business_id);\n\nCREATE INDEX products_category_idx ON public.products USING btree (category_id);\n\nCREATE INDEX products_sellable_idx ON public.products USING btree (business_id, is_sellable) WHERE (is_sellable = true);\n\nCREATE INDEX profiles_business_id_idx ON public.profiles USING btree (business_id);\n\nCREATE INDEX profiles_email_idx ON public.profiles USING btree (email);\n\nCREATE INDEX profiles_role_idx ON public.profiles USING btree (role);\n\nCREATE INDEX service_categories_business_idx ON public.service_categories USING btree (business_id);\n\nCREATE INDEX service_categories_parent_idx ON public.service_categories USING btree (parent_id);\n\nCREATE INDEX service_variants_business_idx ON public.service_variants USING btree (business_id);\n\nCREATE INDEX service_variants_service_idx ON public.service_variants USING btree (service_id);\n\nCREATE INDEX services_branch_idx ON public.services USING btree (branch_id);\n\nCREATE INDEX services_business_category_active_idx ON public.services USING btree (business_id, category, active);\n\nCREATE INDEX services_business_idx ON public.services USING btree (business_id);\n\nCREATE INDEX services_service_category_idx ON public.services USING btree (service_category_id);\n\nCREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);\n\nCREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);\n\nCREATE INDEX supplier_payments_branch_idx ON public.supplier_payments USING btree (branch_id);\n\nCREATE INDEX suppliers_branch_idx ON public.suppliers USING btree (branch_id);\n\nCREATE INDEX transactions_appointment_idx ON public.transactions USING btree (appointment_id);\n\nCREATE INDEX transactions_business_paid_idx ON public.transactions USING btree (business_id, paid_at DESC);\n\nALTER TABLE ONLY public.appointment_services
    ADD CONSTRAINT appointment_services_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);\n\nALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);\n\nALTER TABLE ONLY public.client_preferred_services
    ADD CONSTRAINT client_preferred_services_pkey PRIMARY KEY (client_id, service_id);\n\nALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.employee_absences
    ADD CONSTRAINT employee_absences_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.employee_schedules
    ADD CONSTRAINT employee_schedules_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.employee_services
    ADD CONSTRAINT employee_services_pkey PRIMARY KEY (employee_id, service_id);\n\nALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.inventory_locations
    ADD CONSTRAINT inventory_locations_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);\n\nALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.service_variants
    ADD CONSTRAINT service_variants_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);\n\nALTER TABLE ONLY public.appointment_services
    ADD CONSTRAINT appointment_services_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.appointment_services
    ADD CONSTRAINT appointment_services_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.profiles(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.appointment_services
    ADD CONSTRAINT appointment_services_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;\n\nALTER TABLE ONLY public.appointment_services
    ADD CONSTRAINT appointment_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;\n\nALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_assistant_employee_id_fkey FOREIGN KEY (assistant_employee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;\n\nALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;\n\nALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;\n\nALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.client_preferred_services
    ADD CONSTRAINT client_preferred_services_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.client_preferred_services
    ADD CONSTRAINT client_preferred_services_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.client_preferred_services
    ADD CONSTRAINT client_preferred_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.employee_absences
    ADD CONSTRAINT employee_absences_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.employee_absences
    ADD CONSTRAINT employee_absences_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.employee_absences
    ADD CONSTRAINT employee_absences_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);\n\nALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.employee_schedules
    ADD CONSTRAINT employee_schedules_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.employee_schedules
    ADD CONSTRAINT employee_schedules_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.employee_services
    ADD CONSTRAINT employee_services_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.employee_services
    ADD CONSTRAINT employee_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.inventory_locations
    ADD CONSTRAINT inventory_locations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.inventory_locations
    ADD CONSTRAINT inventory_locations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.inventory_locations(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.inventory_locations(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.products
    ADD CONSTRAINT products_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.products
    ADD CONSTRAINT products_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.service_categories(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.service_variants
    ADD CONSTRAINT service_variants_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.service_variants
    ADD CONSTRAINT service_variants_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.services
    ADD CONSTRAINT services_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.services
    ADD CONSTRAINT services_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.services
    ADD CONSTRAINT services_service_category_id_fkey FOREIGN KEY (service_category_id) REFERENCES public.service_categories(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);\n\nALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE RESTRICT;\n\nALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;\n\nALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;\n\nALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_business_id_name_key UNIQUE (business_id, name);\n\nALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_slug_key UNIQUE (slug);\n\nALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_business_id_phone_key UNIQUE (business_id, phone);\n\nALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);\n\nALTER TABLE ONLY public.inventory_locations
    ADD CONSTRAINT inventory_locations_business_id_name_key UNIQUE (business_id, name);\n\nALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);\n\nALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_business_id_branch_id_name_key UNIQUE (business_id, branch_id, name);\n\nALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_name_key UNIQUE (product_id, name);\n\nALTER TABLE ONLY public.products
    ADD CONSTRAINT products_business_id_name_key UNIQUE (business_id, name);\n\nALTER TABLE ONLY public.products
    ADD CONSTRAINT products_business_id_sku_key UNIQUE (business_id, sku);\n\nALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_business_id_name_key UNIQUE (business_id, name);\n\nALTER TABLE ONLY public.service_variants
    ADD CONSTRAINT service_variants_service_id_name_key UNIQUE (service_id, name);\n\nALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);\n\nALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);\n\nALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);\n\nALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);\n\nALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);\n\nCREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

begin

  new.updated_at = now();

  return new;

end;

$$;\n\nCREATE FUNCTION public.check_employee_overlap() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$

begin

  if new.status not in ('pending', 'confirmed', 'completed') then

    return new;

  end if;



  -- Skip overlap validation when only payment_status or other non-temporal

  -- columns are being updated (e.g., when record_payment marks an appointment as paid).

  if old.start_time is not distinct from new.start_time

     and old.end_time is not distinct from new.end_time

     and old.employee_id is not distinct from new.employee_id

     and old.assistant_employee_id is not distinct from new.assistant_employee_id

     and old.status is not distinct from new.status then

    return new;

  end if;



  -- Check main employee

  if exists (

    select 1 from public.appointments a

    where a.id != new.id

      and a.employee_id = new.employee_id

      and a.status in ('pending', 'confirmed', 'completed')

      and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(new.start_time, new.end_time, '[)')

      and (a.group_id is null or new.group_id is null or a.group_id != new.group_id)

  ) then

    raise exception 'El empleado ya tiene una cita en ese horario.' using errcode = '23P01';

  end if;



  -- Check assistant employee (if assigned)

  if new.assistant_employee_id is not null then

    if exists (

      select 1 from public.appointments a

      where a.id != new.id

        and a.employee_id = new.assistant_employee_id

        and a.status in ('pending', 'confirmed', 'completed')

        and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(new.start_time, new.end_time, '[)')

        and (a.group_id is null or new.group_id is null or a.group_id != new.group_id)

    ) then

      raise exception 'El asistente ya tiene una cita como empleado en ese horario.' using errcode = '23P01';

    end if;



    if exists (

      select 1 from public.appointments a

      where a.id != new.id

        and a.assistant_employee_id = new.assistant_employee_id

        and a.status in ('pending', 'confirmed', 'completed')

        and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(new.start_time, new.end_time, '[)')

        and (a.group_id is null or new.group_id is null or a.group_id != new.group_id)

    ) then

      raise exception 'El asistente ya tiene una cita en ese horario.' using errcode = '23P01';

    end if;

  end if;



  return new;

end;

$$;\n\nCREATE FUNCTION public.create_default_branch() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$

begin

  insert into public.branches (business_id, name, is_default)

  values (new.id, new.name || ' ù Principal', true)

  on conflict (business_id, name) do nothing;

  return new;

end;

$$;\n\nCREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER businesses_set_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER employee_absences_set_updated_at BEFORE UPDATE ON public.employee_absences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER inventory_locations_set_updated_at BEFORE UPDATE ON public.inventory_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER inventory_stock_set_updated_at BEFORE UPDATE ON public.inventory_stock FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER product_categories_set_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER service_categories_set_updated_at BEFORE UPDATE ON public.service_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER service_variants_set_updated_at BEFORE UPDATE ON public.service_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER services_set_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n\nCREATE TRIGGER check_employee_overlap_trigger BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.check_employee_overlap();\n\nCREATE TRIGGER trg_create_default_branch AFTER INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.create_default_branch();\n\nCOMMIT;\n
