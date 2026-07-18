import { db } from '../lib/api'
import { handleDbError } from '../lib/errors'
import { citaFormSchema } from '../lib/validation'
import { mapAppointmentToCita, mapCitaFormToAppointmentInsert, mapServiceItemToAppointmentInsert } from '../mappers/agendaMapper'
import { findOrCreateClientByPhone } from './clientesService'
import { toLocalISO } from '../lib/formatters'
import type { AppointmentWithRelations, Service } from '../types/database'
import type { Cita, CitaFormData } from '../types/cita'

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function mapAgendaWriteError(error: unknown, action: 'guardar' | 'reagendar'): Error {
  if (!error || typeof error !== 'object') {
    return new Error(`Error al ${action} la cita`)
  }
  const candidate = error as Record<string, unknown>
  const message = String(candidate.message ?? '')
  const isOverlap = message.includes('23P01') ||
    message.includes('El empleado ya tiene una cita en ese horario') ||
    message.includes('El asistente ya tiene una cita')
  if (isOverlap) {
    return new Error(`No se puede ${action} la cita: el empleado ya tiene otra cita en ese horario.`)
  }
  if (message.includes('23505') || message.includes('duplicad')) {
    return new Error(`No se puede ${action} la cita: registro duplicado.`)
  }
  const mapped = (() => { try { handleDbError(error, ''); return null } catch (e) { return e as Error } })()
  if (mapped) return mapped
  if (message) return new Error(message)
  return error instanceof Error ? error : new Error(`Error al ${action} la cita`)
}

export const agendaKeys = {
  appointments: (businessId?: string | null, branchId?: string | null) => ['appointments', businessId, branchId] as const,
}

export const APPOINTMENT_SELECT = '*, clients(id, full_name, phone, email), services(id, name, duration_minutes, price, color), profiles!appointments_employee_id_fkey(id, full_name, avatar_url), assistant_profile:profiles!appointments_assistant_employee_id_fkey(id, full_name, avatar_url)'

export const listCitas = async (
  businessId: string,
  dateRange?: { start: Date; end: Date },
  employeeId?: string | 'all',
  branchId?: string | null
): Promise<Cita[]> => {
  let query = db
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('business_id', businessId)

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  query = query.order('start_time')

  if (dateRange) {
    query = query
      .gte('start_date', toLocalISO(dateRange.start))
      .lte('end_date', toLocalISO(dateRange.end))
  }

  if (employeeId && employeeId !== 'all') {
    query = query.or(`employee_id.eq.${employeeId},assistant_employee_id.eq.${employeeId}`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data as AppointmentWithRelations[]).map(mapAppointmentToCita)
}

export const listCitaGroupMembers = async (groupId: string): Promise<AppointmentWithRelations[]> => {
  const { data, error } = await db
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('group_id', groupId)
    .order('start_time')

  if (error) throw error
  return data as AppointmentWithRelations[]
}

// ── Private helpers for saveCita ──────────────────────────────────────────────

interface SaveDeps {
  service: Service
  clientId: string
}

async function resolveSaveDeps(
  businessId: string,
  data: { service: string; clientId?: string; clientName: string; clientPhone?: string; notes: string },
  branchId: string | null | undefined,
  allowCreateClient: boolean,
): Promise<SaveDeps> {
  let svcQuery = db
    .from('services')
    .select('*')
    .eq('id', data.service)

  if (branchId) {
    svcQuery = svcQuery.eq('branch_id', branchId)
  }

  const { data: service, error: serviceError } = await svcQuery.single()
  if (serviceError) throw new Error(serviceError.message || 'Servicio no encontrado')

  let clientId: string
  if (data.clientId) {
    clientId = data.clientId
  } else if (!allowCreateClient) {
    throw new Error('No tienes permiso para crear clientes. Selecciona un cliente existente.')
  } else {
    const client = await findOrCreateClientByPhone(businessId, {
      fullName: data.clientName,
      phone: data.clientPhone || data.clientName,
      notes: data.notes,
    }, branchId)
    clientId = client.id
  }

  return { service: service as Service, clientId }
}

async function deleteOrphanGroupMembers(
  appointmentId: string,
): Promise<void> {
  const { data: existing } = await db
    .from('appointments')
    .select('group_id')
    .eq('id', appointmentId)
    .maybeSingle()
  const oldGroupId = (existing as any)?.group_id
  if (!oldGroupId) return

  const { data: orphans } = await db
    .from('appointments')
    .select('id')
    .eq('group_id', oldGroupId)
    .neq('id', appointmentId)
  const orphanIds = (orphans ?? []).map((o: any) => o.id).filter((id: string) => id !== appointmentId)
  if (orphanIds.length === 0) return

  for (const orphanId of orphanIds) {
    const { data: orphanTxs } = await db
      .from('transactions')
      .select('id')
      .eq('appointment_id', orphanId)

    for (const tx of (orphanTxs ?? []) as Array<{ id: string }>) {
      const { error: txDeleteError } = await db
        .from('transactions')
        .delete()
        .eq('id', tx.id)
      if (txDeleteError) throw txDeleteError
    }

    const { error: delError } = await db
      .from('appointments')
      .delete()
      .eq('id', orphanId)

    if (delError) throw delError
  }

  return
}

async function saveSingleServiceAppointment(
  businessId: string,
  data: CitaFormData & { id?: string },
  service: Service,
  clientId: string,
  createdBy: string | null | undefined,
  branchId: string | null | undefined,
): Promise<Cita> {
  if (data.id) {
    await deleteOrphanGroupMembers(data.id)
  }

  const payload = mapCitaFormToAppointmentInsert(businessId, data, service, clientId, createdBy, branchId)
  ;(payload as any).group_id = null

  const query = data.id
    ? db.from('appointments').update(payload).eq('id', data.id).select(APPOINTMENT_SELECT).single()
    : db.from('appointments').insert(payload).select(APPOINTMENT_SELECT).single()

  const { data: saved, error } = await query
  if (error) throw mapAgendaWriteError(error, 'guardar')

  return mapAppointmentToCita(saved as AppointmentWithRelations)
}

async function buildServicePayloads(
  businessId: string,
  data: CitaFormData,
  clientId: string,
  groupId: string,
  primaryService: Service | undefined,
  createdBy: string | null | undefined,
  branchId: string | null | undefined,
  servicesMap: Map<string, Service>,
): Promise<Record<string, any>[]> {
  const payloads = [mapServiceItemToAppointmentInsert(
    businessId,
    {
      serviceId: data.service,
      employeeId: data.employee,
      assistantEmployeeId: data.assistantEmployee,
      assistantPercentage: data.assistantPercentage,
      employeePercentageOverride: data.employeePercentageOverride,
      duration: data.duration,
      price: data.price,
    },
    clientId, data.date, data.time, data.status, data.notes,
    groupId, createdBy, primaryService, branchId,
  )]

  for (const extra of data.extraServices) {
    payloads.push(mapServiceItemToAppointmentInsert(
      businessId,
      extra,
      clientId, data.date, data.time, data.status, data.notes,
      groupId, createdBy,
      servicesMap.get(extra.serviceId) as Service,
      branchId,
    ))
  }

  return payloads
}

async function saveNewGroup(
  desiredPayloads: Record<string, any>[],
  serviceId: string,
  employeeId: string,
): Promise<Cita> {
  const results: AppointmentWithRelations[] = []
  let primaryIdx = -1

  for (let i = 0; i < desiredPayloads.length; i++) {
    const payload = desiredPayloads[i]
    const { data: saved, error } = await db
      .from('appointments')
      .insert(payload)
      .select(APPOINTMENT_SELECT)
      .single()

    if (error) throw mapAgendaWriteError(error, 'guardar')
    const row = saved as AppointmentWithRelations
    results.push(row)
    if (primaryIdx === -1 && row.service_id === serviceId && row.employee_id === employeeId) {
      primaryIdx = i
    }
  }

  const primary = primaryIdx >= 0 ? results[primaryIdx] : results[0]
  return mapAppointmentToCita(primary)
}

async function updateExistingGroup(
  data: CitaFormData & { id: string },
  desiredPayloads: Record<string, any>[],
): Promise<Cita> {
  const { data: existing } = await db
    .from('appointments')
    .select('group_id')
    .eq('id', data.id)
    .maybeSingle()

  const targetGroupId = (existing as any)?.group_id

  // Single → multi (no prior group)
  if (!targetGroupId) {
    const [primaryPayload, ...extraPayloads] = desiredPayloads
    const { error: updatePrimaryError } = await db
      .from('appointments')
      .update(primaryPayload)
      .eq('id', data.id)
    if (updatePrimaryError) throw mapAgendaWriteError(updatePrimaryError, 'guardar')

    if (extraPayloads.length > 0) {
      for (const payload of extraPayloads) {
        const { error: insertExtraError } = await db
          .from('appointments')
          .insert(payload)
        if (insertExtraError) throw mapAgendaWriteError(insertExtraError, 'guardar')
      }
    }
  } else {
    // Multi → multi (update group)
    const orderedIds = [data.id]
    const { data: members, error: membersError } = await db
      .from('appointments')
      .select('id')
      .eq('group_id', targetGroupId)
      .order('created_at', { ascending: true })
    if (membersError) throw membersError

    orderedIds.push(...((members ?? []) as Array<{ id: string }>)
      .map(m => m.id)
      .filter(id => id !== data.id))

    const overlap = Math.min(orderedIds.length, desiredPayloads.length)

    for (let i = 0; i < overlap; i++) {
      const { error: updateError } = await db
        .from('appointments')
        .update(desiredPayloads[i])
        .eq('id', orderedIds[i])
      if (updateError) throw mapAgendaWriteError(updateError, 'guardar')
    }

    if (desiredPayloads.length > orderedIds.length) {
      for (const payload of desiredPayloads.slice(orderedIds.length)) {
        const { error: insertError } = await db
          .from('appointments')
          .insert(payload)
        if (insertError) throw mapAgendaWriteError(insertError, 'guardar')
      }
    }

    if (orderedIds.length > desiredPayloads.length) {
      const idsToDelete = orderedIds.slice(desiredPayloads.length)

      for (const memberId of idsToDelete) {
        const { data: memberTxs } = await db
          .from('transactions')
          .select('id')
          .eq('appointment_id', memberId)

        for (const tx of (memberTxs ?? []) as Array<{ id: string }>) {
          const { error: txDeleteError } = await db
            .from('transactions')
            .delete()
            .eq('id', tx.id)
          if (txDeleteError) throw txDeleteError
        }

        const { error: delError } = await db
          .from('appointments')
          .delete()
          .eq('id', memberId)

        if (delError) throw mapAgendaWriteError(delError, 'guardar')
      }
    }
  }

  const { data: refreshed, error: refreshError } = await db
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', data.id)
    .single()

  if (refreshError) throw refreshError
  return mapAppointmentToCita(refreshed as AppointmentWithRelations)
}

async function fetchServicesMap(
  serviceIds: string[],
  branchId: string | null | undefined,
): Promise<Map<string, Service>> {
  let query = db.from('services').select('*').in('id', serviceIds)
  if (branchId) query = query.eq('branch_id', branchId)
  const { data, error } = await query
  if (error) throw error
  return new Map((data as Service[]).map(s => [s.id, s]))
}

async function resolveGroupId(appointmentId?: string): Promise<string> {
  if (!appointmentId) return generateId()

  const { data: existing } = await db
    .from('appointments')
    .select('group_id')
    .eq('id', appointmentId)
    .maybeSingle()

  return (existing as any)?.group_id || generateId()
}

// ── Main save function ────────────────────────────────────────────────────────

export const saveCita = async (
  businessId: string,
  data: CitaFormData & { id?: string; clientPhone?: string },
  createdBy?: string | null,
  branchId?: string | null,
  allowCreateClient?: boolean,
): Promise<Cita> => {
  const parsed = citaFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  const { service, clientId } = await resolveSaveDeps(
    businessId, data, branchId, allowCreateClient ?? true,
  )

  if (!data.extraServices || data.extraServices.length === 0) {
    return saveSingleServiceAppointment(businessId, data, service, clientId, createdBy, branchId)
  }

  // Multi-service (grouped) path
  const groupId = await resolveGroupId(data.id)
  const allServiceIds = [parsed.data.service, ...data.extraServices.map(e => e.serviceId)]
  const servicesMap = await fetchServicesMap(allServiceIds, branchId)

  const desiredPayloads = await buildServicePayloads(
    businessId, parsed.data, clientId, groupId,
    servicesMap.get(parsed.data.service) as Service | undefined,
    createdBy, branchId, servicesMap,
  )

  if (data.id) {
    return updateExistingGroup({ ...parsed.data, id: data.id }, desiredPayloads)
  }

  return saveNewGroup(desiredPayloads, parsed.data.service, parsed.data.employee)
}

export const updateCitaStatus = async (
  id: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'paid'
): Promise<void> => {
  const statusPayload = status === 'paid'
    ? { status: 'completed' as const, payment_status: 'paid' as const }
    : { status, payment_status: 'unpaid' as const }

  const { data: appt } = await db
    .from('appointments')
    .select('group_id')
    .eq('id', id)
    .maybeSingle()

  const groupId = (appt as any)?.group_id

  if (groupId) {
    const { data: members, error: membersError } = await db
      .from('appointments')
      .select('id')
      .eq('group_id', groupId)

    if (membersError) throw membersError

    for (const member of (members ?? []) as Array<{ id: string }>) {
      const { error } = await db
        .from('appointments')
        .update(statusPayload)
        .eq('id', member.id)

      if (error) throw error
    }
    return
  }

  const { error } = await db
    .from('appointments')
    .update(statusPayload)
    .eq('id', id)

  if (error) throw error
}

export const updateAppointmentTime = async (
  id: string,
  startTime: string,
  endTime: string,
  employeeId?: string
): Promise<void> => {
  const { data: appt, error: findError } = await db
    .from('appointments')
    .select('group_id')
    .eq('id', id)
    .maybeSingle()

  if (findError) throw findError

  const groupId = (appt as any)?.group_id

  if (groupId) {
    const { data: members } = await db
      .from('appointments')
      .select('id')
      .eq('group_id', groupId)

    const ids = (members ?? []).map((m: any) => m.id)
    for (const memberId of ids) {
      const payload: Record<string, string> = { start_time: startTime, end_time: endTime }
      if (employeeId && memberId === id) payload.employee_id = employeeId
      const { error } = await db
        .from('appointments')
        .update(payload)
        .eq('id', memberId)
      if (error) throw mapAgendaWriteError(error, 'reagendar')
    }
    return
  }

  const payload: Record<string, string> = { start_time: startTime, end_time: endTime }
  if (employeeId) payload.employee_id = employeeId

  const { error } = await db
    .from('appointments')
    .update(payload)
    .eq('id', id)

  if (error) throw mapAgendaWriteError(error, 'reagendar')
}

export const deleteCita = async (id: string): Promise<void> => {
  const { data: appt, error: findError } = await db
    .from('appointments')
    .select('group_id')
    .eq('id', id)
    .maybeSingle()

  if (findError) {
    throw new Error(findError.message || 'No se pudo buscar la cita')
  }

  const groupId = (appt as any)?.group_id

  if (groupId) {
    const { data: groupMembers } = await db
      .from('appointments')
      .select('id')
      .eq('group_id', groupId)

    for (const member of (groupMembers ?? []) as Array<{ id: string }>) {
      const { data: transactions } = await db
        .from('transactions')
        .select('id')
        .eq('appointment_id', member.id)

      for (const tx of (transactions ?? []) as Array<{ id: string }>) {
        const { error: txError } = await db
          .from('transactions')
          .delete()
          .eq('id', tx.id)
        if (txError) {
          throw new Error(txError.message || 'Error al eliminar pagos asociados')
        }
      }

      const { error } = await db
        .from('appointments')
        .delete()
        .eq('id', member.id)

      if (error) {
        throw new Error(error.message || error.details || 'Error al eliminar la cita grupal')
      }
    }
    return
  }

  const { data: transactions } = await db
    .from('transactions')
    .select('id')
    .eq('appointment_id', id)

  for (const tx of (transactions ?? []) as Array<{ id: string }>) {
    const { error: txError } = await db
      .from('transactions')
      .delete()
      .eq('id', tx.id)
    if (txError) {
      throw new Error(txError.message || 'Error al eliminar pagos asociados')
    }
  }

  const { error } = await db
    .from('appointments')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message || error.details || 'Error al eliminar la cita')
  }
}
