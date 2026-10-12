import { onUnmounted, ref, watch } from 'vue'
import { toUtcIso, type ScheduleRow } from '../../components/clinical/programs'
import { checkEnrollmentConflicts } from '../../services/clinical/programService'

/**
 * Mientras se arman las fechas, pregunta al servidor qué sesiones chocan con la agenda de su especialista
 * (índice de fila → motivo). Espera a que la persona deje de teclear, descarta respuestas viejas y, si la
 * consulta falla, no marca nada (el servidor vuelve a comprobar al inscribir).
 */
export function useEnrollmentConflicts(rows: () => ScheduleRow[]) {
  const conflicts = ref<Map<number, string>>(new Map())
  let timer: ReturnType<typeof setTimeout> | null = null
  let seq = 0

  watch(
    () => JSON.stringify(rows().map(r => [r.start, r.serviceId, r.employeeId])),
    () => {
      if (timer) clearTimeout(timer)
      const current = rows()
      const complete = current.length > 0 && current.every(r => r.start && !Number.isNaN(new Date(r.start).getTime()) && r.serviceId && r.employeeId)
      if (!complete) {
        conflicts.value = new Map()
        return
      }
      const mine = ++seq
      timer = setTimeout(async () => {
        try {
          const found = await checkEnrollmentConflicts(current.map(r => ({ service_id: r.serviceId, employee_id: r.employeeId, start_time: toUtcIso(r.start) })))
          if (mine === seq) conflicts.value = new Map(found.map(c => [c.index, c.message]))
        } catch {
          if (mine === seq) conflicts.value = new Map()
        }
      }, 400)
    },
    { immediate: true },
  )

  onUnmounted(() => { if (timer) clearTimeout(timer) })

  return { conflicts }
}
