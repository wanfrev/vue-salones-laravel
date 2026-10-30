/**
 * Reparte las citas que se solapan una al lado de la otra (como Google Calendar) en lugar de apilarlas.
 * Agrupa las citas en grupos de rangos que se pisan entre sí y empaca cada grupo en el menor número de columnas,
 * dividiendo el ancho por igual entre las columnas que terminó usando.
 */
export function layoutOverlaps<T extends { startMs: number; endMs: number; left: number; width: number }>(appts: T[]): T[] {
  const sorted = [...appts].sort((a, b) => a.startMs - b.startMs)
  const clusters: T[][] = []
  let current: T[] = []
  let clusterEnd = -Infinity
  for (const appt of sorted) {
    if (current.length && appt.startMs >= clusterEnd) {
      clusters.push(current)
      current = []
      clusterEnd = -Infinity
    }
    current.push(appt)
    clusterEnd = Math.max(clusterEnd, appt.endMs)
  }
  if (current.length) clusters.push(current)

  const result: T[] = []
  for (const cluster of clusters) {
    const columnEnds: number[] = []
    const columnOf = new Map<T, number>()
    for (const appt of cluster) {
      let placed = false
      for (let c = 0; c < columnEnds.length; c++) {
        if (columnEnds[c] <= appt.startMs) {
          columnEnds[c] = appt.endMs
          columnOf.set(appt, c)
          placed = true
          break
        }
      }
      if (!placed) {
        columnEnds.push(appt.endMs)
        columnOf.set(appt, columnEnds.length - 1)
      }
    }
    const numCols = columnEnds.length
    for (const appt of cluster) {
      const col = columnOf.get(appt)!
      result.push({ ...appt, left: (col / numCols) * 100, width: (1 / numCols) * 100 })
    }
  }
  return result
}

/**
 * Una visita con varios servicios con la misma profesional se dibuja como un solo bloque: deja la primera fila de cada
 * (visita, profesional) y descarta las demás. Las citas sin visita pasan tal cual.
 */
export function buildDisplayAppointments<T extends { group_id?: string | null; employee_id?: string | null }>(appts: readonly T[]): T[] {
  const result: T[] = []
  const seen = new Set<string>()
  for (const a of appts) {
    if (!a.group_id) {
      result.push(a)
      continue
    }
    const key = `${a.group_id}:${a.employee_id}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(a)
  }
  return result
}

/** Todas las filas de cada visita (por `group_id`), para saber qué servicios lleva el bloque y cuánto dura. */
export function buildGroupMemberMap<T extends { group_id?: string | null }>(appts: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const a of appts) {
    if (!a.group_id) continue
    const existing = map.get(a.group_id)
    if (existing) existing.push(a)
    else map.set(a.group_id, [a])
  }
  return map
}
