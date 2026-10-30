interface BlockMember {
  employee_id?: string | null
  end_time: string | number | Date
  status?: string | null
}

const INACTIVE = new Set(['cancelled', 'no_show'])

/** Cuenta para la tarjeta de esa profesional: sus servicios, sin los cancelados ni los de otra profesional. */
const counts = (appt: BlockMember, m: BlockMember): boolean =>
  !(m.status && INACTIVE.has(m.status)) && (m.employee_id ?? null) === (appt.employee_id ?? null)

/**
 * Una visita con varios servicios son varias citas del mismo group_id, todas a la misma hora y cada una con su propia
 * duración. El calendario dibuja UNA tarjeta por visita y profesional: debe llegar hasta el final del servicio MÁS
 * LARGO de esa profesional, no solo hasta el final de la primera cita de la lista (si esa duraba 60 y otra 120, el
 * bloque medía 60 y la hora siguiente parecía libre). Si la visita la atienden profesionales distintas, cada una
 * tiene su propia tarjeta y no se mezclan. Devuelve el fin del bloque en ms.
 */
export function groupBlockEndMs(appt: BlockMember, members: ReadonlyArray<BlockMember>): number {
  let end = new Date(appt.end_time).getTime()
  for (const m of members) {
    if (!counts(appt, m)) continue
    end = Math.max(end, new Date(m.end_time).getTime())
  }
  return end
}

export interface BlockSegment {
  name: string
  minutes: number
  /** Fin del servicio en ms (para marcar en el bloque dónde termina el más corto). */
  end: number
  price?: number
}

/**
 * Los servicios que esa profesional hace en la visita, con su propia duración, para listarlos dentro de la tarjeta
 * del calendario (Pedicure · 60 min / Manicure · 120 min) y marcar dónde termina cada uno. Mismo criterio que
 * groupBlockEndMs. `extra` añade el precio de cada servicio (para el total de la tarjeta).
 */
export function groupBlockSegments(
  appt: BlockMember,
  members: ReadonlyArray<BlockMember & { start_time: string | number | Date }>,
  nameOf: (member: BlockMember) => string,
  opts: { extra?: (member: BlockMember) => { price?: number } } = {},
): BlockSegment[] {
  const segments: BlockSegment[] = []
  for (const m of members) {
    if (!counts(appt, m)) continue

    const start = new Date(m.start_time).getTime()
    const end = new Date(m.end_time).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue

    segments.push({ name: nameOf(m), minutes: Math.round((end - start) / 60_000), end, ...opts.extra?.(m) })
  }

  return segments
}
