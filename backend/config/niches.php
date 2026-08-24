<?php

// PHP mirror of client/src/config/features.ts + client/src/config/niches/registry.ts.
// Keep both in sync manually — there is no shared source between the two stacks.
// This file only carries the flag/capability layer; per-niche client-profile field
// configs (NicheFields.vue) are a client-only UI concern and stay in the TS registry.

return [

    // When false, EnsureBusinessFeature logs what it WOULD have blocked (gate.would_deny) and
    // lets every request through. Flip to true only after reviewing those logs for a while —
    // this is the single switch protecting the live businesses from an unexpected 403 caused
    // by a feature the middleware discovers is actually in use but not flagged on.
    'enforce' => (bool) env('FEATURE_GATE_ENFORCE', false),

    'default_features' => [
        'pos' => true,
        'inventario' => true,
        'productos' => true,
        'proveedores' => true,
        // Added for the `tienda` niche (retail-only businesses turn these off via feature_defaults).
        // Default true so the 8 live businesses — none of which have these keys in the DB — resolve
        // to exactly today's behaviour.
        'agenda' => true,
        'calendario' => true,
        'servicios' => true,
        'multi_branch' => false,
        'employees_create_clients' => true,
        'employees_see_clients' => true,
        'gift_cards' => true,
        'disable_manager_inventory_edit' => false,
        'encargados_change_exchange_rate' => false,
        'encargados_change_employee_rate' => false,
        'disable_employee_commission_edit' => false,
        'manual_reports' => false,
        'daily_report_autofill_from_pos' => false,
        'pos_direct_service_sale' => false,
        'enable_public_booking' => true,
        'hide_client_phone_from_employees' => false,
        'whatsapp_available' => false,
        'whatsapp_reminders_enabled' => true,
        'reminder_24h_enabled' => true,
        'payroll_locked_exchange_rate' => false,
        // Explicit opt-in for giving a non-tienda business full tienda-style retail treatment.
        // Deliberately separate from pos/productos — those default `true` for every niche purely
        // for nav visibility, so they can't signal that a business actually wants this experience.
        'retail_module_enabled' => false,
    ],

    'niches' => [
        'salon' => [
            'status' => 'creatable',
            'capabilities' => [],
            'feature_defaults' => [],
        ],
        'barberia' => [
            'status' => 'creatable',
            'capabilities' => [],
            'feature_defaults' => [],
        ],
        'spa' => [
            'status' => 'creatable',
            'capabilities' => [],
            'feature_defaults' => [],
        ],
        'mixto' => [
            'status' => 'creatable',
            'capabilities' => [],
            'feature_defaults' => [],
        ],
        'dog_spa' => [
            'status' => 'creatable',
            'capabilities' => ['clients.pets'],
            'feature_defaults' => [],
        ],
        // No client-profile fields existed for these three before the registry (getNicheConfig()
        // returned null for all of them) — preserved here with no capabilities beyond vet's pets.
        'vet' => [
            'status' => 'creatable',
            'capabilities' => ['clients.pets', 'clients.medical'],
            'feature_defaults' => [],
        ],
        'nail_bar' => [
            'status' => 'creatable',
            'capabilities' => [],
            'feature_defaults' => [],
        ],
        'centro_estetico' => [
            'status' => 'creatable',
            'capabilities' => [],
            'feature_defaults' => [],
        ],
        'tienda' => [
            'status' => 'creatable',
            'capabilities' => ['catalog.products', 'commerce.pos'],
            'feature_defaults' => [
                'agenda' => false,
                'calendario' => false,
                'servicios' => false,
                'gift_cards' => false,
                'pos' => true,
                'inventario' => true,
                'productos' => true,
                'proveedores' => true,
            ],
            'feature_locks' => [
                'agenda' => false,
                'calendario' => false,
                'servicios' => false,
            ],
        ],
        'staffing' => [
            'status' => 'creatable',
            'capabilities' => ['staffing.timesheets', 'staffing.billing', 'staffing.crm', 'staffing.reports'],
            'feature_defaults' => [
                'agenda' => false,
                'calendario' => false,
                'servicios' => false,
                'gift_cards' => false,
                'inventario' => false,
                'productos' => false,
                'proveedores' => false,
                'pos' => false,
            ],
            'feature_locks' => [
                'pos' => false,
            ],
            'locale' => 'en',
            'currency_mode' => 'single',
        ],
    ],

];
