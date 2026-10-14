/**
 * The switches a superadmin can flip on a business's page, grouped the way they are shown. Pure
 * data: which key belongs to which group, and how it is explained. How a switch is resolved and
 * saved (defaults → niche → stored → locks) lives in config/niches and is not touched here.
 */

export interface FlagInfo {
  key: string
  label: string
  description: string
}

export interface FlagGroup {
  id: string
  title: string
  description: string
  flags: FlagInfo[]
  /** Only shown for businesses of this niche. */
  onlyForNiche?: string
}

export const FLAG_GROUPS: FlagGroup[] = [
  {
    id: 'schedule',
    title: 'Agenda y catálogo',
    description: 'Cómo se agendan y se ofrecen los servicios.',
    flags: [
      { key: 'agenda', label: 'Agenda', description: 'Vista de agenda de citas del día' },
      { key: 'calendario', label: 'Calendario', description: 'Vista de calendario de citas' },
      { key: 'servicios', label: 'Servicios', description: 'Catálogo de servicios agendables' },
    ],
  },
  {
    id: 'core',
    title: 'Módulos',
    description: 'Cobro, inventario y compras.',
    flags: [
      { key: 'pos', label: 'Punto de Venta', description: 'Cobro de citas con productos y método de pago' },
      { key: 'inventario', label: 'Inventario', description: 'Control de stock, entradas y salidas' },
      { key: 'productos', label: 'Productos', description: 'Catálogo de productos vendibles' },
      { key: 'proveedores', label: 'Proveedores', description: 'Gestión de proveedores, deudas y pagos' },
      { key: 'retail_module_enabled', label: 'Módulo tienda (otro nicho)', description: 'Trato completo de tienda (ventas en espera, recibo numerado, doble precio) para un negocio que no es de nicho tienda — requiere Punto de Venta y Productos activos también' },
    ],
  },
  {
    id: 'management',
    title: 'Gestión y equipos',
    description: 'Qué puede hacer el equipo y cómo se organiza el negocio.',
    flags: [
      { key: 'employees_create_clients', label: 'Empleados crean clientes', description: 'Los empleados pueden agregar clientes desde la agenda' },
      { key: 'employees_see_clients', label: 'Empleados ven clientes', description: 'Acceso al módulo de Clientes en el menú lateral' },
      { key: 'gift_cards', label: 'Gift Cards', description: 'Sistema de tarjetas de regalo' },
      { key: 'manual_reports', label: 'Reporte Diario', description: 'Generación y control de reportes diarios' },
      { key: 'multi_branch', label: 'Múltiples sucursales', description: 'Gestionar varias ubicaciones físicas' },
    ],
  },
  {
    id: 'staffing',
    title: 'Staffing — extras opcionales',
    description: 'Funciones adicionales que se activan negocio por negocio. Todas vienen apagadas: mientras estén apagadas, el negocio trabaja exactamente igual que antes.',
    onlyForNiche: 'staffing',
    flags: [
      { key: 'staffing_receivables', label: 'Cuentas por cobrar con antigüedad', description: 'Agrega en Reportes la pestaña «Cuentas por cobrar» (deuda de cada empresa agrupada por días de vencimiento: al día, 1–30, 31–60, 61–90 y más de 90) y marca como «Vencida» las facturas atrasadas. Apagado: Nómina y facturas funcionan igual que hoy.' },
      { key: 'staffing_invoice_email', label: 'Enviar factura por correo (aún no disponible)', description: 'Reservado para una próxima versión: enviar la factura al cliente por correo con recordatorios de cobro. Por ahora activarlo no cambia nada.' },
      { key: 'staffing_pay_stubs', label: 'Talón de pago por empleado', description: 'Agrega en Nómina los botones «Talón de pago» e «Imprimir talones»: un comprobante imprimible con horas, bruto, retención, ajustes y pago neto. No muestra tarifas de factura ni margen.' },
      { key: 'staffing_doc_expiry', label: 'Vencimiento de documentos (aún no disponible)', description: 'Reservado para una próxima versión: fecha de vencimiento en los documentos de los empleados (permiso de trabajo, I-9, licencias) con alertas. Por ahora activarlo no cambia nada.' },
      { key: 'staffing_commissions', label: 'Comisiones de vendedoras (aún no disponible)', description: 'Reservado para una próxima versión: comisión por cliente cerrado o por horas facturadas. Por ahora activarlo no cambia nada.' },
      { key: 'staffing_profitability', label: 'Rentabilidad por empresa y rol', description: 'Agrega en Reportes la pestaña «Rentabilidad»: facturado, costo y margen de cada empresa y de cada rol en el período elegido (solo semanas aprobadas o pagadas).' },
      { key: 'staffing_approval_stamp', label: 'Firmantes y sello de aprobación de nómina', description: 'Registra a los jefes que aprueban (nombre y PIN) para saber quién aprobó cada semana aunque compartan la cuenta. Al aprobar se elige quién es y la nómina queda con su nombre, la fecha y un código verificable (en pantalla, nómina impresa, talones y XLSX). Requiere aplicar las migraciones primero.' },
      { key: 'staffing_assignment_history', label: 'Historial de asignaciones (aún no disponible)', description: 'Reservado para una próxima versión: fecha de inicio y fin de cada asignación empleado-empresa. Por ahora activarlo no cambia nada.' },
    ],
  },
  {
    id: 'comms',
    title: 'Comunicación y reservas',
    description: 'Cómo se comunica el negocio con sus clientes.',
    flags: [
      { key: 'enable_public_booking', label: 'Reservas públicas', description: 'Links de reserva e invitaciones para clientes' },
      { key: 'whatsapp_available', label: 'WhatsApp', description: 'Configurar WhatsApp via Evolution API con QR' },
      { key: 'hide_client_phone_from_employees', label: 'Ocultar datos a empleados', description: 'Empleados no ven teléfono ni email de clientes' },
    ],
  },
]

/** Groups that apply to a niche (the staffing extras only exist for staffing businesses). */
export const groupsForNiche = (niche: string | null | undefined): FlagGroup[] =>
  FLAG_GROUPS.filter(g => !g.onlyForNiche || g.onlyForNiche === niche)

export const ALL_FLAGS: FlagInfo[] = FLAG_GROUPS.flatMap(g => g.flags)

/** Case- and accent-insensitive match on a switch's name or explanation. */
export function flagMatches(flag: FlagInfo, term: string): boolean {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const t = fold(term.trim())
  return !t || fold(flag.label).includes(t) || fold(flag.description).includes(t) || fold(flag.key).includes(t)
}

export interface FlagStats {
  /** How many of the shown switches are on. */
  on: number
  total: number
  /** How many differ from what the niche brings by default. */
  changed: number
}

export function flagStats(groups: FlagGroup[], resolved: Record<string, unknown>, nicheDefaults: Record<string, unknown>): FlagStats {
  const keys = groups.flatMap(g => g.flags.map(f => f.key))
  return {
    on: keys.filter(k => !!resolved[k]).length,
    total: keys.length,
    changed: keys.filter(k => !!resolved[k] !== !!nicheDefaults[k]).length,
  }
}
