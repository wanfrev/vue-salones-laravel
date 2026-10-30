import { sanitizePhone } from '../../lib/formatters'

export interface QuickActionInput {
  status: string
  isGroup: boolean
  phone?: string | null
  isDental: boolean
  checkedIn: boolean
  clientId?: string | null
}

export interface QuickActions {
  confirm: boolean
  pay: boolean
  checkIn: 'in' | 'out' | null
  reschedule: boolean
  whatsappUrl: string | null
}

/**
 * Enlace de WhatsApp para escribirle a la clienta. Los teléfonos suelen estar guardados con el formato local
 * («0414 1234567») o internacional («+58 414 1234567»): wa.me necesita el código de país, así que el formato local
 * venezolano se convierte. Devuelve null si no hay un número usable (o si el teléfono está oculto para el rol).
 */
export function whatsappUrl(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null
  let digits = sanitizePhone(phone)
  if (digits.startsWith('0') && digits.length === 11) digits = `58${digits.slice(1)}`
  if (digits.length < 8) return null

  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/**
 * Qué acciones rápidas ofrece la tarjeta. Reprogramar excluye las visitas con varios servicios: mover una sola cita
 * del grupo la separaría del resto (el arrastre tampoco está permitido ahí).
 */
export function quickActions(input: QuickActionInput): QuickActions {
  const open = input.status !== 'paid' && input.status !== 'cancelled' && input.status !== 'no_show'

  return {
    confirm: input.status === 'pending',
    pay: open,
    checkIn: input.isDental && !!input.clientId ? (input.checkedIn ? 'out' : 'in') : null,
    reschedule: open && !input.isGroup,
    whatsappUrl: whatsappUrl(input.phone),
  }
}

/** Nuevo inicio y fin (ISO) al mover una cita a otro día/hora conservando su duración. Null si la fecha no es válida. */
export function rescheduledRange(startIso: string, endIso: string, date: string, time: string): { start: string; end: string } | null {
  const duration = new Date(endIso).getTime() - new Date(startIso).getTime()
  const start = new Date(`${date}T${time}:00`).getTime()
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(start)) return null

  return { start: new Date(start).toISOString(), end: new Date(start + duration).toISOString() }
}
