export const DEFAULT_FEATURES = {
  pos: true,
  inventario: true,
  productos: true,
  proveedores: true,
  // Added for the `tienda` niche (retail-only businesses turn these off via featureDefaults).
  // Default true so the 8 live businesses — none of which have these keys in the DB — resolve
  // to exactly today's behaviour.
  agenda: true,
  calendario: true,
  servicios: true,
  multi_branch: false,
  employees_create_clients: true,
  employees_see_clients: true,
  gift_cards: true,
  disable_manager_inventory_edit: false,
  encargados_change_exchange_rate: false,
  encargados_change_employee_rate: false,
  disable_employee_commission_edit: false,
  encargado_product_commission_enabled: false,
  // Default true — encargados have always been able to edit clients with no gate at all (they're
  // an admin-panel role); this flag exists purely so a business can opt OUT per-tenant, not to
  // grant a new capability. See ClientController::canEncargadoEditClients().
  encargados_edit_clients: true,
  // Default false -- preserva el comportamiento actual (los KPIs de Resumen en Finanzas están
  // ocultos para encargados). Ver Finanzas.vue::hideFinancialDashboard.
  encargados_view_financial_summary: false,
  manual_reports: false,
  daily_report_autofill_from_pos: false,
  pos_direct_service_sale: false,
  enable_public_booking: true,
  hide_client_phone_from_employees: false,
  employees_recibo_only: false,
  whatsapp_available: false,
  whatsapp_reminders_enabled: true,
  reminder_24h_enabled: true,
  payroll_locked_exchange_rate: false,
  payroll_currency_breakdown_enabled: false,
  payroll_day_average_rate_enabled: false,
  // Explicit opt-in for giving a non-tienda business full tienda-style retail treatment (hold
  // sales, invoice-numbered receipts, dual pricing, etc). Deliberately separate from pos/productos
  // — those two default to `true` for every niche (see comment above) purely for nav visibility,
  // so they can't be used as a signal that a business actually wants the tienda experience.
  retail_module_enabled: false,
  // Real product variants (structured attributes like Talla/Color) instead of the old
  // free-text-only product_variants.name. Default true — additive, no existing behaviour
  // depends on this being off.
  product_variants_v2: true,
}

export type FeatureKey = keyof typeof DEFAULT_FEATURES
