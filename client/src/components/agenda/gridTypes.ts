/** Cita ya preparada para dibujarse en la grilla del calendario (posición, estado, profesional y servicios). */
export interface DisplayAppointment {
  id: string
  clientName: string
  petName?: string
  service: string
  time: string
  top: number
  height: number
  startMs: number
  endMs: number
  left: number
  width: number
  status: string
  employeeInitials: string
  employeeName: string
  employeeColor: string
  raw: any
  isGroup?: boolean
  groupServices?: string[]
  segments: { name: string; minutes: number; endMs: number; endLabel: string; price?: number }[]
  segKey: string
  totalPrice?: number
  totalMinutes?: number
}

/** Una columna de la grilla de día (una profesional) o de semana (un día). */
export interface GridColumn {
  key: string
  label: string
  avatar?: string
  number?: number
  isToday?: boolean
  widthPercent: number
  appointments: DisplayAppointment[]
}
