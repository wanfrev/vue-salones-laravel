import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getAttendance } from '../../services/clinical/reportService'

/** Asistencia del paciente en un rango. Solo consulta cuando `enabled` y el rango es válido. */
export function useAttendance(clientId: () => string | null, range: () => { from: string; to: string }, enabled: () => boolean) {
  const attendanceQuery = useQuery({
    queryKey: computed(() => ['clinical-attendance', clientId(), range().from, range().to]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      const { from, to } = range()
      return await getAttendance(id, from, to)
    },
    enabled: computed(() => !!clientId() && enabled() && !!range().from && !!range().to),
    staleTime: 0,
  })

  const sessions = computed(() => attendanceQuery.data.value ?? [])
  return { attendanceQuery, sessions, isLoading: attendanceQuery.isLoading }
}
