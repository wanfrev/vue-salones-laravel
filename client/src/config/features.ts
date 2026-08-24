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
  manual_reports: false,
  daily_report_autofill_from_pos: false,
  pos_direct_service_sale: false,
  enable_public_booking: true,
  hide_client_phone_from_employees: false,
  whatsapp_available: false,
  whatsapp_reminders_enabled: true,
  reminder_24h_enabled: true,
  payroll_locked_exchange_rate: false,
  // Explicit opt-in for giving a non-tienda business full tienda-style retail treatment (hold
  // sales, invoice-numbered receipts, dual pricing, etc). Deliberately separate from pos/productos
  // — those two default to `true` for every niche (see comment above) purely for nav visibility,
  // so they can't be used as a signal that a business actually wants the tienda experience.
  retail_module_enabled: false,
}

export type FeatureKey = keyof typeof DEFAULT_FEATURES
