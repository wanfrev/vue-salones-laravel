import type { SettingKey, Terms, ToggleCopy } from './featureCopy'

/**
 * English version of featureCopy.ts, with the same shape and keys. The Spanish file stays the source of
 * truth: the settings screens pick one or the other by language. English uses plain words
 * (client, employee…) instead of each business's customised terminology.
 */
export const termsEn: Terms = {
  client: 'client',
  clients: 'clients',
  employee: 'employee',
  employees: 'employees',
  appointment: 'appointment',
  appointments: 'appointments',
  service: 'service',
  services: 'services',
}

export const toggleCopyEn = (t: Terms = termsEn): Record<SettingKey, ToggleCopy> => ({
  // ── Managers ───────────────────────────────────────────────────────────
  disable_manager_inventory_edit: {
    label: 'Prevent them from editing inventory',
    hint: 'Managers will be able to see inventory and sell in the POS, but not adjust quantities or costs.',
    on: 'Managers can no longer edit inventory',
    off: 'Managers can edit inventory again',
  },
  encargados_change_exchange_rate: {
    label: 'Allow changing the daily rate',
    hint: 'Managers will be able to change the main exchange rate (Bs/$).',
    on: 'Managers can now change the daily rate',
    off: 'Managers can no longer change the daily rate',
  },
  encargados_change_employee_rate: {
    label: `Allow changing each ${t.employee}'s rate`,
    hint: `Managers will be able to change the Bs rate assigned to each ${t.employee}.`,
    on: `Managers can now change the ${t.employees}' rate`,
    off: `Managers can no longer change the ${t.employees}' rate`,
  },
  disable_employee_commission_edit: {
    label: 'Lock commission editing',
    hint: `Neither managers nor ${t.employees} will be able to change the profit percentages on ${t.appointments}.`,
    on: `Commissions can no longer be edited on ${t.appointments}`,
    off: `Managers and ${t.employees} can edit commissions again`,
  },
  encargado_product_commission_enabled: {
    label: 'Pay commission on product sales',
    hint: 'Managers will earn the percentage you assign on direct product sales they process themselves in the POS.',
    on: 'Managers will earn commission on their product sales',
    off: 'Managers no longer earn commission on product sales',
  },
  encargados_edit_clients: {
    label: `Allow editing ${t.clients}`,
    hint: `Managers will be able to change the details of existing ${t.clients}. If you turn it off, they can only view them and create new ones.`,
    on: `Managers can now edit ${t.clients}`,
    off: `Managers can only view and create ${t.clients}`,
  },
  encargados_view_financial_summary: {
    label: 'Show the financial summary',
    hint: 'Managers will see the totals (income, expenses and net profit) in the Summary tab of Finance. If you turn it off, they only see the detail of payments and expenses, without totals.',
    on: 'Managers can now see the financial summary totals',
    off: 'Managers can no longer see the financial summary totals',
  },

  // ── Employees ──────────────────────────────────────────────────────────
  employees_see_clients: {
    label: `Give access to the ${t.clients} module`,
    hint: `${cap(t.employees)} will see the ${t.clients} module in their side menu.`,
    on: `${cap(t.employees)} now have the ${t.clients} module`,
    off: `${cap(t.employees)} no longer have the ${t.clients} module (they will still see names in their ${t.appointments})`,
  },
  hide_client_phone_from_employees: {
    label: `Hide ${t.clients}' phone and email`,
    hint: `${cap(t.employees)} will not see ${t.clients}' contact details. They can still create ${t.appointments}.`,
    on: `${cap(t.clients)}' phone and email hidden from ${t.employees}`,
    off: `${cap(t.clients)}' phone and email visible to ${t.employees}`,
  },
  employees_recibo_only: {
    label: `${cap(t.employees)} only see their pay stub`,
    hint: `Hides Schedule, History, Commissions, ${cap(t.clients)} and the rest of the ${t.employee}'s menu: only Pay stub remains. It does not affect managers.`,
    on: `${cap(t.employees)} now only see their pay stub`,
    off: `${cap(t.employees)} see their full menu again`,
  },

  // ── Payroll ────────────────────────────────────────────────────────────
  payroll_locked_exchange_rate: {
    label: 'Pay using the rate of the day of each service',
    hint: 'The Bs amounts of commissions and tips use the exchange rate of the day each service was done, not the current rate.',
    on: 'Payroll updated: the rate of the day of each service will be used',
    off: 'Payroll updated: the current rate will be used',
  },
  payroll_currency_breakdown_enabled: {
    label: 'Break commission down by charge currency',
    hint: `When paying payroll, shows how much the ${t.employee} generated in dollars and how much in bolivars, depending on how each ${t.client} was charged.`,
    on: 'Payroll now shows the currency breakdown',
    off: 'Payroll no longer shows the currency breakdown',
  },
  payroll_day_average_rate_enabled: {
    label: 'Record daily payments with an average rate',
    hint: `When paying payroll, asks how many dollars are given to the ${t.employee} and at what rate, to work out how much is deducted from their pending balance in bolivars.`,
    on: 'Payroll payments now ask for dollars delivered and rate',
    off: 'Payroll payments go back to the previous method',
  },

  // ── POS and sales ──────────────────────────────────────────────────────
  pos_direct_service_sale: {
    label: `Charge ${t.services} directly in the POS`,
    hint: `Lets you charge a ${t.service} instantly, without scheduling an ${t.appointment} first.`,
    on: `${cap(t.services)} can now be charged directly in the POS`,
    off: `Direct ${t.service} charging in the POS was turned off`,
  },
  daily_report_autofill_from_pos: {
    label: 'Fill the Daily Report with what was charged in the POS',
    hint: 'Adds a button that fills the Daily Report amounts by payment method with what was charged that day in the POS.',
    on: 'The Daily Report can now bring in the POS amounts',
    off: 'The "Bring from POS" button was turned off',
  },
  pos_backdate_enabled: {
    label: 'Allow charging with another date',
    hint: 'Adds a date field to the POS and to the payment record of Credits (administrators and managers only) so a payment can be recorded on a previous day. Useful to correct a wrong charge or enter old payments: it counts in the reports of that date, not today\'s.',
    on: 'The POS and payments now let you choose the payment date',
    off: 'The POS and payments no longer allow recording payments with another date',
  },
  courtesy_charge_enabled: {
    label: 'Allow complimentary charges',
    hint: `Adds "Complimentary" as a payment method in the POS: the ${t.employee} earns their normal commission, but the amount does not count as business income.`,
    on: 'Complimentary is now available as a payment method',
    off: 'Complimentary is no longer available as a payment method',
  },

  // ── Notifications ──────────────────────────────────────────────────────
  reminder_24h_enabled: {
    label: `Internal ${t.appointment} reminders`,
    hint: `Notifies in the bell, as far in advance as you choose, before each ${t.appointment}. It does not require WhatsApp.`,
    on: `Internal ${t.appointment} reminders turned on`,
    off: `Internal ${t.appointment} reminders turned off`,
  },
  whatsapp_reminders_enabled: {
    label: 'WhatsApp reminders',
    hint: 'Turns on sending through WhatsApp. The lead times (24 h, 1 h, etc.) are set separately, as templates in the WhatsApp section.',
    on: 'WhatsApp reminders turned on',
    off: 'WhatsApp reminders turned off',
  },
  enable_public_booking: {
    label: 'Bookings through a public link',
    hint: `Lets ${t.clients} book ${t.appointments} from a shareable link. ${cap(t.employees)} will be able to send invitations from their schedule.`,
    on: 'Bookings through a public link turned on',
    off: 'Bookings through a public link turned off',
  },
})

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const sectionCopyEn = (t: Terms = termsEn) => ({
  general: {
    title: 'Account & appearance',
    description: 'How the system looks on this device and your account security. These settings are yours only: they change nothing for the rest of the team.',
  },
  whatsapp: {
    title: 'WhatsApp',
    description: `Connect the business's WhatsApp and manage the automatic messages your ${t.clients} receive.`,
  },
  permisos: {
    title: 'Team permissions and operating rules',
    description: `Define what managers and ${t.employees} can see and change, and how payments and charges are calculated. Every change is saved instantly and applies to the whole team.`,
  },
  notificaciones: {
    title: 'Notifications and reminders',
    description: `How and when the team and your ${t.clients} are notified: ${t.appointment} reminders, link bookings and alerts on this device.`,
  },
  sucursales: {
    title: 'Branches',
    description: 'Manage your business\'s physical locations: name, address and phone. The main branch cannot be deleted.',
  },
})

export const groupCopyEn = (t: Terms = termsEn) => ({
  encargados: {
    title: 'Managers',
    description: 'Limits for people who run the day-to-day without owning the business.',
  },
  employees: {
    title: cap(t.employees),
    description: `What ${t.employees} can see and do in the system.`,
  },
  payroll: {
    title: 'Payroll',
    description: `How payments to ${t.employees} are calculated and recorded.`,
  },
  pos: {
    title: 'Charges and register (POS)',
    description: 'Extra options for charging and for closing the day\'s register.',
  },
})
