import { normalizeAppointmentStatus, getStatusLabel, getStatusColor } from '../lib/formatters'
import type { AppointmentWithRelations, Service } from '../types/database'
import type { Cita, CitaFormData, CitaFormServiceItem } from '../types/cita'
import { useBusinessStore } from '../store/business'

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

const parseAssociatedProducts = (raw: any) => {
  if (!raw) return undefined
  if (Array.isArray(raw)) return raw.filter((p: any) => !!(p.productId || p.product_id))
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((p: any) => !!(p.productId || p.product_id)) : undefined
    } catch {
      return undefined
    }
  }
  return undefined
}

export const mapAppointmentToCita = (appointment: AppointmentWithRelations): Cita => {
  const service = appointment.services ?? (appointment as any).service
  const employee = appointment.profiles ?? (appointment as any).employee_profile
  const assistant = appointment.assistant_profile
  const client = appointment.clients ?? (appointment as any).client
  const normalizedStatus = normalizeAppointmentStatus(appointment) as 'confirmed' | 'pending' | 'cancelled' | 'paid'

  let defaultClientLabel = 'Cliente'
  try {
    const businessStore = useBusinessStore()
    defaultClientLabel = businessStore.terminology.client || 'Cliente'
  } catch {
    // Pinia not active (e.g. unit tests)
  }

  const clientName = client?.full_name ?? (appointment as any).clientName ?? defaultClientLabel
  const clientPhone = client?.phone ?? (appointment as any).clientPhone ?? ''

  let associatedProducts = parseAssociatedProducts(appointment.associated_products ?? (appointment as any).associatedProducts)
  if ((!associatedProducts || associatedProducts.length === 0) && (appointment as any).isGroup && Array.isArray((appointment as any).members)) {
    const gathered: any[] = []
    for (const m of (appointment as any).members) {
      const p = parseAssociatedProducts(m.associated_products ?? m.associatedProducts)
      if (p) gathered.push(...p)
    }
    if (gathered.length > 0) associatedProducts = gathered
  }

  return {
    id: appointment.id,
    clientId: appointment.client_id,
    clientName,
    clientPhone,
    petId: appointment.pet_id ?? (appointment as any).petId ?? undefined,
    petName: appointment.pets?.name ?? (appointment as any).petName ?? undefined,
    serviceId: appointment.service_id,
    service: service?.name ?? (appointment as any).service ?? 'Servicio',
    employeeId: appointment.employee_id,
    employee: employee?.full_name ?? (appointment as any).employee ?? 'Empleado',
    assistantId: appointment.assistant_employee_id ?? (appointment as any).assistantId ?? undefined,
    assistantName: assistant?.full_name ?? (appointment as any).assistantName ?? undefined,
    assistantPercentage: appointment.assistant_percentage != null ? Number(appointment.assistant_percentage) : undefined,
    employeePercentageOverride: appointment.employee_percentage_override != null ? Number(appointment.employee_percentage_override) : undefined,
    isFixedCommissionOverride: appointment.is_fixed_commission_override ?? false,
    employeeAmountOverride: appointment.employee_amount_override != null ? Number(appointment.employee_amount_override) : undefined,
    assistantAmountOverride: appointment.assistant_amount_override != null ? Number(appointment.assistant_amount_override) : undefined,
    groupId: appointment.group_id ?? (appointment as any).groupId ?? (appointment as any).group_id ?? undefined,
    date: appointment.start_time ? toDateInput(appointment.start_time) : ((appointment as any).date || toDateInput(new Date().toISOString())),
    time: appointment.start_time ? toTimeInput(appointment.start_time) : ((appointment as any).time || '09:00'),
    duration: appointment.duration_override != null
      ? Number(appointment.duration_override)
      : (appointment.end_time && appointment.start_time ? (Math.round((new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000) || (service?.duration_minutes ?? 30)) : ((appointment as any).duration || 30)),
    price: appointment.price_override != null ? Number(appointment.price_override) : Number(service?.price ?? (appointment as any).price ?? 0),
    status: normalizedStatus,
    paymentStatus: appointment.payment_status,
    source: appointment.source ?? (appointment as any).source ?? undefined,
    statusLabel: getStatusLabel(normalizedStatus),
    statusColor: getStatusColor(normalizedStatus),
    notes: appointment.internal_notes ?? (appointment as any).notes ?? '',
    diagnosis: appointment.diagnosis ?? (appointment as any).diagnosis ?? undefined,
    treatment: appointment.treatment ?? (appointment as any).treatment ?? undefined,
    associatedProducts,
    clinicalHistory: appointment.clinical_history ?? (appointment as any).clinical_history ?? undefined,
  }
}

function parseSafeDate(dateStr: string, timeStr: string): Date {
  if (!dateStr) dateStr = toDateInput(new Date().toISOString())
  if (!timeStr) timeStr = '12:00'
  const cleanTime = timeStr.trim()
  const formattedTime = cleanTime.split(':').length === 3 ? cleanTime : `${cleanTime}:00`
  const d = new Date(`${dateStr}T${formattedTime}`)
  if (isNaN(d.getTime())) {
    return new Date()
  }
  return d
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
  const startTime = parseSafeDate(data.date, data.time)
  const endTime = new Date(startTime.getTime() + (effectiveDuration || 30) * 60 * 1000)

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
    pet_id: data.petId || null,
    employee_id: data.employee,
    assistant_employee_id: data.assistantEmployee || null,
    assistant_percentage: data.assistantPercentage || 0,
    employee_percentage_override: data.employeePercentageOverride ?? null,
    is_fixed_commission_override: data.isFixedCommissionOverride ?? null,
    employee_amount_override: data.employeeAmountOverride ?? null,
    assistant_amount_override: data.assistantAmountOverride ?? null,
    service_id: data.service,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: appointmentStatus,
    payment_status: isPaidStatus ? 'paid' as const : 'unpaid' as const,
    price_override: hasOverride ? data.price : null,
    duration_override: hasDurationOverride ? data.duration : null,
    internal_notes: data.notes.trim() || null,
    diagnosis: data.diagnosis?.trim() || null,
    treatment: data.treatment?.trim() || null,
    clinical_history: (data.clinicalHistory && Object.keys(data.clinicalHistory).length > 0) ? data.clinicalHistory : null,
    associated_products: (() => {
      const valid = (data.associatedProducts || []).filter(p => !!(p && p.productId))
      return valid.length > 0 ? valid : null
    })(),
    source: (data as any).source || 'internal',
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
  branchId?: string | null,
  petId?: string,
  diagnosis?: string,
  treatment?: string,
  associatedProducts?: any[],
  clinicalHistory?: Record<string, string>,
) => {
  const startTime = parseSafeDate(date, time)
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
    pet_id: petId || null,
    employee_id: item.employeeId,
    assistant_employee_id: item.assistantEmployeeId || null,
    assistant_percentage: item.assistantPercentage || 0,
    employee_percentage_override: item.employeePercentageOverride ?? null,
    is_fixed_commission_override: item.isFixedCommissionOverride ?? null,
    employee_amount_override: item.employeeAmountOverride ?? null,
    assistant_amount_override: item.assistantAmountOverride ?? null,
    service_id: item.serviceId,
    group_id: groupId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: appointmentStatus,
    payment_status: isPaidStatus ? 'paid' as const : 'unpaid' as const,
    price_override: hasOverride ? item.price : null,
    duration_override: hasDurationOverride ? item.duration : null,
    internal_notes: notes.trim() || null,
    diagnosis: diagnosis?.trim() || null,
    treatment: treatment?.trim() || null,
    clinical_history: (clinicalHistory && Object.keys(clinicalHistory).length > 0) ? clinicalHistory : null,
    associated_products: (() => {
      const valid = (associatedProducts || []).filter(p => !!(p && (p.productId || p.product_id)))
      return valid.length > 0 ? valid : null
    })(),
    source: (item as any).source || 'internal',
    created_by: createdBy ?? null,
  }
}
