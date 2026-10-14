/**
 * Every title, description and confirmation message of the business Configuración screen, in one
 * place so the wording stays consistent (and is easy to review) instead of living inside five
 * hundred lines of template. Pure: the only input is the niche's terminology, so "citas" becomes
 * "consultas" or "reservas" wherever the business uses a different word.
 */

export interface TermsInput {
  client?: string
  clientPlural?: string
  employee?: string
  employeePlural?: string
  appointment?: string
  appointmentPlural?: string
  service?: string
  servicePlural?: string
}

/** Lowercase, with a neutral fallback, ready to drop in the middle of a sentence. */
export interface Terms {
  client: string
  clients: string
  employee: string
  employees: string
  appointment: string
  appointments: string
  service: string
  services: string
}

export const termsFrom = (t: TermsInput | null | undefined): Terms => ({
  client: (t?.client || 'cliente').toLowerCase(),
  clients: (t?.clientPlural || 'clientes').toLowerCase(),
  employee: (t?.employee || 'empleado').toLowerCase(),
  employees: (t?.employeePlural || 'empleados').toLowerCase(),
  appointment: (t?.appointment || 'cita').toLowerCase(),
  appointments: (t?.appointmentPlural || 'citas').toLowerCase(),
  service: (t?.service || 'servicio').toLowerCase(),
  services: (t?.servicePlural || 'servicios').toLowerCase(),
})

/** A switch on the screen: what it is called, what it does, and what the toast says after flipping it. */
export interface ToggleCopy {
  label: string
  hint: string
  /** Shown after turning it on / off. */
  on: string
  off: string
}

export type SettingKey =
  | 'disable_manager_inventory_edit'
  | 'encargados_change_exchange_rate'
  | 'encargados_change_employee_rate'
  | 'disable_employee_commission_edit'
  | 'encargado_product_commission_enabled'
  | 'encargados_edit_clients'
  | 'encargados_view_financial_summary'
  | 'employees_see_clients'
  | 'hide_client_phone_from_employees'
  | 'employees_recibo_only'
  | 'payroll_locked_exchange_rate'
  | 'payroll_currency_breakdown_enabled'
  | 'payroll_day_average_rate_enabled'
  | 'pos_direct_service_sale'
  | 'daily_report_autofill_from_pos'
  | 'pos_backdate_enabled'
  | 'courtesy_charge_enabled'
  | 'reminder_24h_enabled'
  | 'whatsapp_reminders_enabled'
  | 'enable_public_booking'

export const toggleCopy = (t: Terms): Record<SettingKey, ToggleCopy> => ({
  // ── Encargados ─────────────────────────────────────────────────────────
  disable_manager_inventory_edit: {
    label: 'Impedir que editen el inventario',
    hint: 'Los encargados podrán ver el inventario y vender en el POS, pero no ajustar cantidades ni costos.',
    on: 'Los encargados ya no pueden editar el inventario',
    off: 'Los encargados vuelven a poder editar el inventario',
  },
  encargados_change_exchange_rate: {
    label: 'Permitir cambiar la tasa del día',
    hint: 'Los encargados podrán modificar la tasa de cambio principal (Bs/$).',
    on: 'Los encargados ya pueden cambiar la tasa del día',
    off: 'Los encargados ya no pueden cambiar la tasa del día',
  },
  encargados_change_employee_rate: {
    label: `Permitir cambiar la tasa de cada ${t.employee}`,
    hint: `Los encargados podrán modificar la tasa en Bs asignada a cada ${t.employee}.`,
    on: `Los encargados ya pueden cambiar la tasa de los ${t.employees}`,
    off: `Los encargados ya no pueden cambiar la tasa de los ${t.employees}`,
  },
  disable_employee_commission_edit: {
    label: 'Bloquear la edición de comisiones',
    hint: `Ni los encargados ni los ${t.employees} podrán modificar los porcentajes de ganancia en las ${t.appointments}.`,
    on: 'Las comisiones ya no se pueden editar en las ' + t.appointments,
    off: 'Encargados y ' + t.employees + ' vuelven a poder editar las comisiones',
  },
  encargado_product_commission_enabled: {
    label: 'Pagar comisión por venta de productos',
    hint: 'Los encargados ganarán el porcentaje que les asignes sobre las ventas directas de productos que procesen ellos mismos en el POS.',
    on: 'Los encargados ganarán comisión por sus ventas de productos',
    off: 'Los encargados ya no ganan comisión por ventas de productos',
  },
  encargados_edit_clients: {
    label: `Permitir editar ${t.clients}`,
    hint: `Los encargados podrán modificar los datos de los ${t.clients} existentes. Si lo desactivas, solo podrán consultarlos y crear nuevos.`,
    on: `Los encargados ya pueden editar los ${t.clients}`,
    off: `Los encargados solo pueden consultar y crear ${t.clients}`,
  },
  encargados_view_financial_summary: {
    label: 'Mostrar el resumen financiero',
    hint: 'Los encargados verán los totales (ingresos, gastos y ganancia neta) en la pestaña Resumen de Finanzas. Si lo desactivas, solo ven el detalle de cobros y gastos, sin totales.',
    on: 'Los encargados ya ven los totales del resumen financiero',
    off: 'Los encargados ya no ven los totales del resumen financiero',
  },

  // ── Empleados ──────────────────────────────────────────────────────────
  employees_see_clients: {
    label: `Dar acceso al módulo de ${t.clients}`,
    hint: `Los ${t.employees} verán el módulo de ${t.clients} en su menú lateral.`,
    on: `Los ${t.employees} ya tienen el módulo de ${t.clients}`,
    off: `Los ${t.employees} ya no tienen el módulo de ${t.clients} (seguirán viendo los nombres en sus ${t.appointments})`,
  },
  hide_client_phone_from_employees: {
    label: `Ocultar teléfono y email de los ${t.clients}`,
    hint: `Los ${t.employees} no verán los datos de contacto de los ${t.clients}. Igual podrán crear ${t.appointments}.`,
    on: `Teléfono y email de los ${t.clients} ocultos para los ${t.employees}`,
    off: `Teléfono y email de los ${t.clients} visibles para los ${t.employees}`,
  },
  employees_recibo_only: {
    label: `Los ${t.employees} solo ven su recibo`,
    hint: `Oculta Agenda, Historial, Comisiones, ${t.clients} y el resto del menú del ${t.employee}: solo queda Recibo. No afecta a los encargados.`,
    on: `Los ${t.employees} ahora solo ven su recibo`,
    off: `Los ${t.employees} vuelven a ver su menú completo`,
  },

  // ── Pago de nómina ─────────────────────────────────────────────────────
  payroll_locked_exchange_rate: {
    label: 'Pagar con la tasa del día de cada servicio',
    hint: 'Los montos en Bs de comisiones y propinas usan la tasa de cambio del día en que se hizo cada servicio, no la tasa actual.',
    on: 'Nómina actualizada: se usará la tasa del día de cada servicio',
    off: 'Nómina actualizada: se usará la tasa actual',
  },
  payroll_currency_breakdown_enabled: {
    label: 'Desglosar la comisión por moneda de cobro',
    hint: `Al pagar nómina, muestra cuánto generó el ${t.employee} en dólares y cuánto en bolívares, según cómo se cobró a cada ${t.client}.`,
    on: 'La nómina ahora muestra el desglose por moneda',
    off: 'La nómina ya no muestra el desglose por moneda',
  },
  payroll_day_average_rate_enabled: {
    label: 'Registrar pagos por día con tasa promedio',
    hint: `Al pagar nómina, pide cuántos dólares se entregan al ${t.employee} y a qué tasa, para calcular cuánto se descuenta de su saldo pendiente en bolívares.`,
    on: 'Los pagos de nómina piden dólares entregados y tasa',
    off: 'Los pagos de nómina vuelven al método anterior',
  },

  // ── POS y ventas ───────────────────────────────────────────────────────
  pos_direct_service_sale: {
    label: `Cobrar ${t.services} directo en el POS`,
    hint: `Permite cobrar un ${t.service} al instante, sin agendar antes una ${t.appointment}.`,
    on: `Ya se pueden cobrar ${t.services} directo en el POS`,
    off: `El cobro directo de ${t.services} en el POS quedó desactivado`,
  },
  daily_report_autofill_from_pos: {
    label: 'Llenar el Reporte Diario con lo cobrado en el POS',
    hint: 'Agrega un botón que llena los montos por método de pago del Reporte Diario con lo cobrado ese día en el POS.',
    on: 'El Reporte Diario ya puede traer los montos del POS',
    off: 'El botón «Traer del POS» quedó desactivado',
  },
  pos_backdate_enabled: {
    label: 'Permitir cobrar con otra fecha',
    hint: 'Agrega el campo «Fecha del cobro» al POS (solo administradores y encargados) para registrar una venta en un día anterior. Sirve para corregir un cobro mal hecho: se elimina y se vuelve a cobrar con la fecha original, y cuenta en los reportes de ese día.',
    on: 'El POS ya permite elegir la fecha del cobro',
    off: 'El POS ya no permite cobrar con otra fecha',
  },
  courtesy_charge_enabled: {
    label: 'Permitir cobro por cortesía',
    hint: `Agrega «Cortesía» como método de pago en el POS: el ${t.employee} gana su comisión normal, pero el monto no cuenta como ingreso del negocio.`,
    on: 'La cortesía ya está disponible como método de pago',
    off: 'La cortesía dejó de estar disponible como método de pago',
  },

  // ── Notificaciones ─────────────────────────────────────────────────────
  reminder_24h_enabled: {
    label: `Recordatorios internos de ${t.appointments}`,
    hint: `Avisa en la campanita, con la anticipación que elijas, antes de cada ${t.appointment}. No requiere WhatsApp.`,
    on: `Recordatorios internos de ${t.appointments} activados`,
    off: `Recordatorios internos de ${t.appointments} desactivados`,
  },
  whatsapp_reminders_enabled: {
    label: 'Recordatorios por WhatsApp',
    hint: 'Activa el envío por WhatsApp. Las anticipaciones (24 h, 1 h, etc.) se definen aparte, como plantillas en la sección WhatsApp.',
    on: 'Recordatorios por WhatsApp activados',
    off: 'Recordatorios por WhatsApp desactivados',
  },
  enable_public_booking: {
    label: 'Reservas por link público',
    hint: `Permite que los ${t.clients} agenden ${t.appointments} desde un link compartible. Los ${t.employees} podrán enviar invitaciones desde su agenda.`,
    on: 'Reservas por link público activadas',
    off: 'Reservas por link público desactivadas',
  },
})

/** Heading and one-line explanation of each Configuración page (also used for the sidebar tooltips). */
export const sectionCopy = (t: Terms) => ({
  general: {
    title: 'Cuenta y apariencia',
    description: 'Cómo se ve el sistema en este dispositivo y la seguridad de tu cuenta. Estos ajustes son solo tuyos: no cambian nada para el resto del equipo.',
  },
  whatsapp: {
    title: 'WhatsApp',
    description: `Conecta el WhatsApp del negocio y administra los mensajes automáticos que reciben tus ${t.clients}.`,
  },
  permisos: {
    title: 'Permisos del equipo y reglas de operación',
    description: `Define qué pueden ver y modificar los encargados y los ${t.employees}, y cómo se calculan los pagos y los cobros. Cada cambio se guarda al instante y aplica a todo el equipo.`,
  },
  notificaciones: {
    title: 'Notificaciones y recordatorios',
    description: `Cómo y cuándo se avisa al equipo y a tus ${t.clients}: recordatorios de ${t.appointments}, reservas por link y alertas en este dispositivo.`,
  },
  sucursales: {
    title: 'Sucursales',
    description: 'Administra las ubicaciones físicas de tu negocio: nombre, dirección y teléfono. La sucursal principal no se puede eliminar.',
  },
})

export const groupCopy = (t: Terms) => ({
  encargados: {
    title: 'Encargados',
    description: 'Límites para quienes administran el día a día sin ser dueños del negocio.',
  },
  employees: {
    title: t.employees.charAt(0).toUpperCase() + t.employees.slice(1),
    description: `Qué ven y qué pueden hacer los ${t.employees} dentro del sistema.`,
  },
  payroll: {
    title: 'Pago de nómina',
    description: `Cómo se calculan y se registran los pagos a los ${t.employees}.`,
  },
  pos: {
    title: 'Cobros y caja (POS)',
    description: 'Opciones adicionales para cobrar y para cerrar la caja del día.',
  },
})
