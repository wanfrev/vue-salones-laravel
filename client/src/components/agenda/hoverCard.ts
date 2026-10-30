import { dateToHHmm12, getStatusLabel } from '../../lib/formatters'

/** Lo que la tarjeta flotante necesita de una cita del calendario (una `DisplayAppointment` ya lo trae todo). */
export interface HoverSource {
  clientName: string
  petName?: string
  service: string
  status: string
  employeeName: string
  startMs: number
  endMs: number
  segments?: { name: string; minutes: number; price?: number }[]
  totalPrice?: number
  raw?: { internal_notes?: string | null }
}

export interface HoverSummary {
  clientName: string
  petName?: string
  /** «9:00 AM – 10:30 AM» */
  timeRange: string
  /** «1 h 30 min» */
  duration: string
  /** Un renglón por servicio; si la cita tiene uno solo, sin minutos ni precio (ya salen en la duración). */
  services: { name: string; detail?: string }[]
  employeeName: string
  status: string
  statusLabel: string
  total?: string
  notes?: string
}

export function durationLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r} min`
  return r ? `${h} h ${r} min` : `${h} h`
}

export function hoverSummary(a: HoverSource): HoverSummary {
  const segs = a.segments ?? []
  const multi = segs.length > 1
  return {
    clientName: a.clientName,
    petName: a.petName || undefined,
    timeRange: `${dateToHHmm12(new Date(a.startMs))} – ${dateToHHmm12(new Date(a.endMs))}`,
    duration: durationLabel((a.endMs - a.startMs) / 60000),
    services: multi
      ? segs.map(s => ({ name: s.name, detail: `${durationLabel(s.minutes)}${s.price != null ? ` · $${s.price.toFixed(2)}` : ''}` }))
      : [{ name: a.service }],
    employeeName: a.employeeName,
    status: a.status,
    statusLabel: getStatusLabel(a.status),
    total: multi && a.totalPrice != null ? `$${a.totalPrice.toFixed(2)}` : undefined,
    notes: a.raw?.internal_notes?.trim() || undefined,
  }
}

/** Una cita de la vista Mes (que solo trae la fila cruda y los textos ya resueltos) como fuente de la tarjeta flotante. */
export function monthApptSource(a: { clientName: string; service: string; status: string; employeeName: string; raw: { start_time: string; end_time: string; internal_notes?: string | null } }): HoverSource {
  return {
    clientName: a.clientName,
    service: a.service,
    status: a.status,
    employeeName: a.employeeName,
    startMs: new Date(a.raw.start_time).getTime(),
    endMs: new Date(a.raw.end_time).getTime(),
    raw: a.raw,
  }
}

interface Box { left: number; right: number; top: number; bottom: number }

/**
 * Dónde poner la tarjeta flotante respecto a la cita sobre la que está el cursor: a la derecha si cabe, si no a la
 * izquierda, alineada con el borde superior y siempre dentro de la pantalla.
 */
export function placeCard(anchor: Box, size: { width: number; height: number }, viewport: { width: number; height: number }, gap = 8, margin = 8): { x: number; y: number } {
  let x = anchor.right + gap
  if (x + size.width > viewport.width - margin) x = anchor.left - gap - size.width
  x = Math.max(margin, Math.min(x, viewport.width - size.width - margin))
  const y = Math.max(margin, Math.min(anchor.top - 6, viewport.height - size.height - margin))
  return { x, y }
}
