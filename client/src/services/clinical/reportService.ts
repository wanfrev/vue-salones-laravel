import { apiRequest } from '../../lib/api'
import type { AttendanceSession } from '../../types/database'

/** Sesiones a las que el paciente asistió entre dos fechas (YYYY-MM-DD, máximo un año) — respaldo de la constancia. */
export const getAttendance = async (clientId: string, from: string, to: string) =>
  apiRequest<AttendanceSession[]>('GET', `/clients/${clientId}/clinical-reports/attendance?from=${from}&to=${to}`)
