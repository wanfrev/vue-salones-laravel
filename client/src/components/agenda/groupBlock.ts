interface BlockMember {
  employee_id?: string | null
  end_time: string | number | Date
  status?: string | null
}

const INACTIVE = new Set(['cancelled', 'no_show'])

/**
 * Una visita con varios servicios son varias citas del mismo group_id, todas a la misma hora y cada una con su propia
 * duración. El calendario dibuja UN bloque por (visita, profesional): debe llegar hasta el final del servicio MÁS LARGO,
 * no solo hasta el final de la primera cita de la lista (si esa duraba 60 y otra 120, el bloque medía 60 y la hora
 * siguiente parecía libre). Devuelve el fin del bloque en ms; las citas canceladas o de otra profesional no cuentan.
 */
export function groupBlockEndMs(
  appt: BlockMember,
  members: ReadonlyArray<BlockMember>,
): number {
  let end = new Date(appt.end_time).getTime()
  for (const m of members) {
    if ((m.employee_id ?? null) !== (appt.employee_id ?? null)) continue
    if (m.status && INACTIVE.has(m.status)) continue
    end = Math.max(end, new Date(m.end_time).getTime())
  }
  return end
}
