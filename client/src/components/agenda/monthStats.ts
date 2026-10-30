export type StatusKey = 'paid' | 'confirmed' | 'pending' | 'other'

export interface StatusCounts {
  total: number
  paid: number
  confirmed: number
  pending: number
  /** Canceladas y no-show: se cuentan para que el total sea lo que se ve, pero con color neutro. */
  other: number
}

/** Cuenta citas por estado en una sola pasada. */
export function countByStatus(items: readonly { status: string }[]): StatusCounts {
  const c: StatusCounts = { total: 0, paid: 0, confirmed: 0, pending: 0, other: 0 }
  for (const it of items) {
    c.total++
    const key: StatusKey = it.status === 'paid' || it.status === 'confirmed' || it.status === 'pending' ? it.status : 'other'
    c[key]++
  }
  return c
}

const ORDER: StatusKey[] = ['paid', 'confirmed', 'pending', 'other']

/** Segmentos de la barra apilada de un día: porcentaje de cada estado que tenga citas (suman 100). */
export function statusSegments(c: StatusCounts): { key: StatusKey; pct: number }[] {
  if (!c.total) return []
  return ORDER.filter(k => c[k] > 0).map(key => ({ key, pct: (c[key] / c.total) * 100 }))
}

/**
 * Intensidad 0–4 de un día respecto al día más cargado del período (para el mapa de calor del año).
 * 0 = sin citas; cualquier día con citas es al menos 1 aunque sea mucho menor que el máximo.
 */
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0
  const r = count / max
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1
}

/** «1 pendiente» / «3 pendientes»: citas aún sin confirmar (el estado rojo del calendario). */
export function pendingLabel(n: number): string {
  return `${n} ${n === 1 ? 'pendiente' : 'pendientes'}`
}
