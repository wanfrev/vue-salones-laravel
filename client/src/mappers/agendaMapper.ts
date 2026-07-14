import { normalizeAppointmentStatus, getStatusLabel, getStatusColor } from '../lib/formatters'
import type { AppointmentWithRelations, Service } from '../types/database'
import type { Cita, CitaFormData, CitaFormServiceItem } from '../types/cita'

const toDateInput = (iso: string) => {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const toTimeInput = (iso: string) => {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export const mapAppointmentToCita = (appointment: AppointmentWithRelations): Cita => {
  const service = appointment.services ?? (appointment as any).service
  const employee = appointment.profiles ?? (appointment as any).employee_profile
  const assistant = appointment.assistant_profile
  const client = appointment.clients ?? (appointment as any).client
  const normalizedStatus = normalizeAppointmentStatus(appointment) as 'confirmed' | 'pending' | 'cancelled' | 'paid'

  return {
    id: appointment.id,
    clientId: appointment.client_id,
    clientName: client?.full_name ?? 'Cliente',
    clientPhone: client?.phone ?? '',
    serviceId: appointment.service_id,
    service: service?.name ?? 'Servicio',
    employeeId: appointment.employee_id,
    employee: employee?.full_name ?? 'Empleado',
    assistantId: appointment.assistant_employee_id ?? undefined,
    assistantName: assistant?.full_name ?? undefined,
    assistantPercentage: appointment.assistant_percentage != null ? Number(appointment.assistant_percentage) : undefined,
    employeePercentageOverride: appointment.employee_percentage_override != null ? Number(appointment.employee_percentage_override) : undefined,
    groupId: appointment.group_id ?? undefined,
    date: toDateInput(appointment.start_time),
    time: toTimeInput(appointment.start_time),
    duration: appointment.duration_override != null
      ? Number(appointment.duration_override)
      : Math.round((new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000) || (service?.duration_minutes ?? 30),
    price: appointment.price_override != null ? Number(appointment.price_override) : Number(service?.price ?? 0),
    status: normalizedStatus,
    paymentStatus: appointment.payment_status,
    statusLabel: getStatusLabel(normalizedStatus),
    statusColor: getStatusColor(normalizedStatus),
    notes: appointment.internal_notes ?? '',
  }
}

export const mapCitaFormToAppointmentInsert = (
  businessId: string,
  data: CitaFormData,
  service: Service,
  clientId: string,
  createdBy?: string | null,
  branchId?: string | null
) => {
  const effectiveDuration = data.duration || service.duration_minutes
  const startTime = new Date(`${data.date}T${data.time}:00`)
  const endTime = new Date(startTime.getTime() + effectiveDuration * 60 * 1000)

  const isPaidStatus = data.status === 'paid'
  const appointmentStatus = isPaidStatus ? 'completed' : data.status
  const catalogPrice = Number(service.price ?? 0)
  const hasOverride = data.price != null && data.price !== catalogPrice
  const catalogDuration = Number(service.duration_minutes ?? 0)
  const hasDurationOverride = data.duration != null && data.duration !== catalogDuration

  return {
    business_id: businessId,
    branch_id: branchId || null,
    client_id: clientId,
    employee_id: data.employee,
    assistant_employee_id: data.assistantEmployee || null,
    assistant_percentage: data.assistantPercentage || 0,
    employee_percentage_override: data.employeePercentageOverride ?? null,
    service_id: data.service,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: appointmentStatus,
    payment_status: isPaidStatus ? 'paid' as const : 'unpaid' as const,
    price_override: hasOverride ? data.price : null,
    duration_override: hasDurationOverride ? data.duration : null,
    internal_notes: data.notes.trim() || null,
    source: 'internal' as const,
    created_by: createdBy ?? null,
  }
}

export const mapServiceItemToAppointmentInsert = (
  businessId: string,
  item: CitaFormServiceItem,
  clientId: string,
  date: string,
  time: string,
  status: CitaFormData['status'],
  notes: string,
  groupId: string,
  createdBy?: string | null,
  service?: Service,
  branchId?: string | null
) => {
  const startTime = new Date(`${date}T${time}:00`)
  const effectiveDuration = item.duration || service?.duration_minutes || 30
  const endTime = new Date(startTime.getTime() + effectiveDuration * 60 * 1000)

  const isPaidStatus = status === 'paid'
  const appointmentStatus = isPaidStatus ? 'completed' : status
  const catalogPrice = Number(service?.price ?? 0)
  const hasOverride = item.price != null && item.price !== catalogPrice
  const catalogDuration = Number(service?.duration_minutes ?? 0)
  const hasDurationOverride = item.duration != null && item.duration !== catalogDuration

  return {
    business_id: businessId,
    branch_id: branchId || null,
    client_id: clientId,
    employee_id: item.employeeId,
    assistant_employee_id: item.assistantEmployeeId || null,
    assistant_percentage: item.assistantPercentage || 0,
    employee_percentage_override: item.employeePercentageOverride ?? null,
    service_id: item.serviceId,
    group_id: groupId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: appointmentStatus,
    payment_status: isPaidStatus ? 'paid' as const : 'unpaid' as const,
    price_override: hasOverride ? item.price : null,
    duration_override: hasDurationOverride ? item.duration : null,
    internal_notes: notes.trim() || null,
    source: 'internal' as const,
    created_by: createdBy ?? null,
  }
}
