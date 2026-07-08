import { api as supabase, api as mutate } from '../lib/api'
import { handleDbError } from '../lib/errors'
import { citaFormSchema } from '../lib/validation'
import { mapAppointmentToCita, mapCitaFormToAppointmentInsert, mapServiceItemToAppointmentInsert } from '../mappers/agendaMapper'
import { findOrCreateClientByPhone } from './clientesService'
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
  const isOverlap = candidate.code === '23P01' ||
    message.includes('appointments_no_employee_overlap')
  if (isOverlap) {
    return new Error(`No se puede ${action} la cita: el empleado ya tiene otra cita en ese horario.`)
  }
  const mapped = (() => { try { handleDbError(error, ''); return null } catch (e) { return e as Error } })()
  if (mapped) return mapped
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
  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('business_id', businessId)

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  query = query.order('start_time')

  if (dateRange) {
    query = query
      .gte('start_time', dateRange.start.toISOString())
      .lte('start_time', dateRange.end.toISOString())
  }

  if (employeeId && employeeId !== 'all') {
    query = query.or(`employee_id.eq.${employeeId},assistant_employee_id.eq.${employeeId}`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data as AppointmentWithRelations[]).map(mapAppointmentToCita)
}

export const listCitaGroupMembers = async (groupId: string): Promise<AppointmentWithRelations[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('group_id', groupId)
    .order('start_time')

  if (error) throw error
  return data as AppointmentWithRelations[]
}

export const saveCita = async (
  businessId: string,
  data: CitaFormData & { id?: string; clientPhone?: string },
  createdBy?: string | null,
  branchId?: string | null,
  allowCreateClient?: boolean
): Promise<Cita> => {
  const parsed = citaFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  const serviceId = parsed.data.service
  let svcQuery = supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)

  if (branchId) {
    svcQuery = svcQuery.eq('branch_id', branchId)
  }

  const { data: service, error: serviceError } = await svcQuery.single()

  if (serviceError) throw serviceError

  let clientId: string
  if (data.clientId) {
    clientId = data.clientId
  } else if (allowCreateClient === false) {
    throw new Error('No tienes permiso para crear clientes. Selecciona un cliente existente.')
  } else {
    const client = await findOrCreateClientByPhone(businessId, {
      fullName: data.clientName,
      phone: data.clientPhone || data.clientName,
      notes: data.notes,
    }, branchId)
    clientId = client.id
  }

  // Single service (no extras) — backward compatible path
  if (!data.extraServices || data.extraServices.length === 0) {
    if (data.id) {
      const { data: existing } = await supabase
        .from('appointments')
        .select('group_id')
        .eq('id', data.id)
        .maybeSingle()
      const oldGroupId = (existing as any)?.group_id
      if (oldGroupId) {
        const { data: orphans } = await supabase
          .from('appointments')
          .select('id')
          .eq('group_id', oldGroupId)
          .neq('id', data.id)
        const orphanIds = (orphans ?? []).map((o: any) => o.id)
        if (orphanIds.length > 0) {
          const { data: orphanTxs, error: orphanTxError } = await supabase
            .from('transactions')
            .select('id')
            .in('appointment_id', orphanIds)
          if (orphanTxError) throw orphanTxError

          for (const tx of (orphanTxs ?? []) as Array<{ id: string }>) {
            const { error: txDeleteError } = await mutate
              .from('transactions')
              .delete()
              .eq('id', tx.id)
            if (txDeleteError) throw txDeleteError
          }

          const { data: deletedOrphans, error: delError } = await mutate
            .from('appointments')
            .delete()
            .in('id', orphanIds)
            .select('id')
          if (delError) throw delError
          if ((deletedOrphans ?? []).length !== orphanIds.length) {
            throw new Error('No se pudieron actualizar todos los servicios de la cita. Intenta nuevamente.')
          }
        }
      }
    }

    const payload = mapCitaFormToAppointmentInsert(
      businessId,
      data,
      service as Service,
      clientId,
      createdBy,
      branchId
    )

    ;(payload as any).group_id = null

    const query = data.id
      ? mutate.from('appointments').update(payload).eq('id', data.id).select(APPOINTMENT_SELECT).single()
      : mutate.from('appointments').insert(payload).select(APPOINTMENT_SELECT).single()

    const { data: saved, error } = await query
    if (error) throw mapAgendaWriteError(error, 'guardar')

    return mapAppointmentToCita(saved as AppointmentWithRelations)
  }

  // Multi-service (grouped) path
  const groupId = data.id
    ? (await (async () => {
        const { data: existing } = await supabase
          .from('appointments')
          .select('group_id')
          .eq('id', data.id)
          .maybeSingle()
        return (existing as any)?.group_id || generateId()
      })())
    : generateId()

  // Fetch all services for extra rows
  const extraServiceIds = data.extraServices.map(e => e.serviceId)
  let allSvcsQuery = supabase
    .from('services')
    .select('*')
    .in('id', [serviceId, ...extraServiceIds])

  if (branchId) {
    allSvcsQuery = allSvcsQuery.eq('branch_id', branchId)
  }

  const { data: servicesData, error: servicesError } = await allSvcsQuery

  if (servicesError) throw servicesError
  const servicesMap = new Map((servicesData as Service[]).map(s => [s.id, s]))

  // Primary service — always use form's price; the mapper decides override vs catalog
  const primaryService = servicesMap.get(data.service) as Service | undefined
  const primaryPrice = data.price

  const desiredPayloads = [mapServiceItemToAppointmentInsert(
    businessId,
    {
      serviceId: data.service,
      employeeId: data.employee,
      assistantEmployeeId: data.assistantEmployee,
      assistantPercentage: data.assistantPercentage,
      employeePercentageOverride: data.employeePercentageOverride,
      duration: data.duration,
      price: primaryPrice,
    },
    clientId,
    data.date,
    data.time,
    data.status,
    data.notes,
    groupId,
    createdBy,
    primaryService,
    branchId
  )]

  // Extra services
  for (const extra of data.extraServices) {
    desiredPayloads.push(mapServiceItemToAppointmentInsert(
      businessId,
      extra,
      clientId,
      data.date,
      data.time,
      data.status,
      data.notes,
      groupId,
      createdBy,
      servicesMap.get(extra.serviceId) as Service,
      branchId
    ))
  }

  if (data.id) {
    const { data: existing } = await supabase
      .from('appointments')
      .select('group_id')
      .eq('id', data.id)
      .maybeSingle()

    const targetGroupId = (existing as any)?.group_id

    if (!targetGroupId) {
      const [primaryPayload, ...extraPayloads] = desiredPayloads
      const { error: updatePrimaryError } = await mutate
        .from('appointments')
        .update(primaryPayload)
        .eq('id', data.id)

      if (updatePrimaryError) throw mapAgendaWriteError(updatePrimaryError, 'guardar')

      if (extraPayloads.length > 0) {
        const { error: insertExtraError } = await mutate
          .from('appointments')
          .insert(extraPayloads)

        if (insertExtraError) throw mapAgendaWriteError(insertExtraError, 'guardar')
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from('appointments')
        .select(APPOINTMENT_SELECT)
        .eq('id', data.id)
        .single()

      if (refreshError) throw refreshError
      return mapAppointmentToCita(refreshed as AppointmentWithRelations)
    }

    const { data: members, error: membersError } = await supabase
      .from('appointments')
      .select('id')
      .eq('group_id', targetGroupId)
      .order('created_at', { ascending: true })

    if (membersError) throw membersError

    const orderedIds = [
      data.id,
      ...((members ?? []) as Array<{ id: string }>)
        .map(m => m.id)
        .filter(id => id !== data.id),
    ]

    const overlap = Math.min(orderedIds.length, desiredPayloads.length)

    for (let i = 0; i < overlap; i++) {
      const { error: updateError } = await mutate
        .from('appointments')
        .update(desiredPayloads[i])
        .eq('id', orderedIds[i])
      if (updateError) throw mapAgendaWriteError(updateError, 'guardar')
    }

    if (desiredPayloads.length > orderedIds.length) {
      const { error: insertError } = await mutate
        .from('appointments')
        .insert(desiredPayloads.slice(orderedIds.length))
      if (insertError) throw mapAgendaWriteError(insertError, 'guardar')
    }

    if (orderedIds.length > desiredPayloads.length) {
      const idsToDelete = orderedIds.slice(desiredPayloads.length)

      const { data: txsToDelete, error: txsToDeleteError } = await supabase
        .from('transactions')
        .select('id')
        .in('appointment_id', idsToDelete)

      if (txsToDeleteError) throw txsToDeleteError

      for (const tx of (txsToDelete ?? []) as Array<{ id: string }>) {
        const { error: txDeleteError } = await mutate
          .from('transactions')
          .delete()
          .eq('id', tx.id)
        if (txDeleteError) throw txDeleteError
      }

      const { data: deletedRows, error: deleteError } = await mutate
        .from('appointments')
        .delete()
        .in('id', idsToDelete)
        .select('id')

      if (deleteError) throw mapAgendaWriteError(deleteError, 'guardar')
      if ((deletedRows ?? []).length !== idsToDelete.length) {
        throw new Error('No se pudieron eliminar algunos servicios del grupo. Revisa permisos e intenta nuevamente.')
      }
    }

    const { data: refreshed, error: refreshError } = await supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .eq('id', data.id)
      .single()

    if (refreshError) throw refreshError
    return mapAppointmentToCita(refreshed as AppointmentWithRelations)
  }

  const { data: saved, error: insertError } = await mutate
    .from('appointments')
    .insert(desiredPayloads)
    .select(APPOINTMENT_SELECT)

  if (insertError) throw mapAgendaWriteError(insertError, 'guardar')

  const results = saved as AppointmentWithRelations[]
  const primary = results.find(r => r.service_id === serviceId && r.employee_id === data.employee) ?? results[0]
  return mapAppointmentToCita(primary)
}

export const updateCitaStatus = async (
  id: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'paid'
): Promise<void> => {
  const statusPayload = status === 'paid'
    ? { status: 'completed' as const, payment_status: 'paid' as const }
    : { status, payment_status: 'unpaid' as const }

  const { data: appt } = await supabase
    .from('appointments')
    .select('group_id')
    .eq('id', id)
    .maybeSingle()

  const groupId = (appt as any)?.group_id

  if (groupId) {
    const { error } = await mutate
      .from('appointments')
      .update(statusPayload)
      .eq('group_id', groupId)

    if (error) throw error
    return
  }

  const { error } = await mutate
    .from('appointments')
    .update(statusPayload)
    .eq('id', id)

  if (error) throw error
}

export const updateAppointmentTime = async (
  id: string,
  startTime: string,
  endTime: string
): Promise<void> => {
  const { data: appt } = await supabase
    .from('appointments')
    .select('group_id')
    .eq('id', id)
    .maybeSingle()

  const groupId = (appt as any)?.group_id

  if (groupId) {
    const { error } = await mutate
      .from('appointments')
      .update({ start_time: startTime, end_time: endTime })
      .eq('group_id', groupId)

    if (error) throw mapAgendaWriteError(error, 'reagendar')
    return
  }

  const { error } = await mutate
    .from('appointments')
    .update({ start_time: startTime, end_time: endTime })
    .eq('id', id)

  if (error) throw mapAgendaWriteError(error, 'reagendar')
}

export const deleteCita = async (id: string): Promise<void> => {
  const { data: appt, error: findError } = await supabase
    .from('appointments')
    .select('group_id')
    .eq('id', id)
    .maybeSingle()

  if (findError) {
    throw new Error(findError.message || 'No se pudo buscar la cita')
  }

  const groupId = (appt as any)?.group_id

  if (groupId) {
    const { data: groupMembers } = await supabase
      .from('appointments')
      .select('id')
      .eq('group_id', groupId)

    const allIds = (groupMembers ?? []).map((m: any) => m.id)

    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .in('appointment_id', allIds)

    for (const tx of (transactions ?? []) as Array<{ id: string }>) {
      const { error: txError } = await mutate
        .from('transactions')
        .delete()
        .eq('id', tx.id)
      if (txError) {
        throw new Error(txError.message || 'Error al eliminar pagos asociados')
      }
    }

    const { error } = await mutate
      .from('appointments')
      .delete()
      .eq('group_id', groupId)

    if (error) {
      throw new Error(error.message || error.details || 'Error al eliminar la cita grupal')
    }
    return
  }

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id')
    .eq('appointment_id', id)

  for (const tx of (transactions ?? []) as Array<{ id: string }>) {
    const { error: txError } = await mutate
      .from('transactions')
      .delete()
      .eq('id', tx.id)
    if (txError) {
      throw new Error(txError.message || 'Error al eliminar pagos asociados')
    }
  }

  const { error } = await mutate
    .from('appointments')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message || error.details || 'Error al eliminar la cita')
  }
}
