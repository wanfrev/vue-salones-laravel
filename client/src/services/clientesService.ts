import { api as supabase, api as mutate, apiRequest } from '../lib/api'
import { clienteFormSchema } from '../lib/validation'
import { computeClientStats } from '../business/clientStats'
import { mapClienteFormToClientInsert, mapClientToCliente } from '../mappers/clientesMapper'
import type { Client, Appointment, Service } from '../types/database'
import type { Cliente, ClienteFormData } from '../types/cliente'

export const clientesKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['clientes', businessId, branchId] as const,
}

export const listClientes = async (businessId: string, branchId?: string | null): Promise<Cliente[]> => {
  let query = supabase
    .from('clients')
    .select('*')
    .eq('business_id', businessId)
    .order('full_name')

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) throw error

  const clients = data as Client[]

  let apptsQuery = supabase
    .from('appointments')
    .select('client_id, start_time, service_id')
    .eq('business_id', businessId)

  if (branchId) {
    apptsQuery = apptsQuery.eq('branch_id', branchId)
  }

  const { data: appointments, error: apptError } = await apptsQuery

  if (apptError) throw apptError

  let svcsQuery = supabase
    .from('services')
    .select('id, price')
    .eq('business_id', businessId)

  if (branchId) {
    svcsQuery = svcsQuery.eq('branch_id', branchId)
  }

  const { data: services, error: svcError } = await svcsQuery

  if (svcError) throw svcError

  const statsByClient = computeClientStats(
    (services ?? []) as Service[],
    (appointments ?? []) as Appointment[],
  )

  return clients.map(client => mapClientToCliente(client, statsByClient.get(client.id)))
}

export const saveCliente = async (
  businessId: string,
  data: ClienteFormData & { id?: string },
  branchId?: string | null
): Promise<Cliente> => {
  const parsed = clienteFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  const payload = { ...mapClienteFormToClientInsert(businessId, parsed.data), branch_id: branchId ?? null }

  const query = data.id
    ? mutate.from('clients').update(payload).eq('id', data.id).select('*').single()
    : mutate.from('clients').insert(payload).select('*').single()

  const { data: saved, error } = await query
  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un cliente registrado con este teléfono')
    }
    throw error
  }

  return mapClientToCliente(saved as Client)
}

export const getClienteById = async (id: string): Promise<Cliente> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return mapClientToCliente(data as Client)
}

export const deleteCliente = async (clientId: string): Promise<void> => {
  const { error } = await mutate
    .from('clients')
    .delete()
    .eq('id', clientId)

  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar el cliente porque tiene citas registradas. Para eliminarlo, primero elimina sus citas.')
    }
    throw error
  }
}

export const searchClients = async (
  businessId: string,
  query: string,
  branchId?: string | null
): Promise<Pick<Client, 'id' | 'full_name' | 'phone'>[]> => {
  if (!query.trim()) return []

  let q = supabase
    .from('clients')
    .select('id, full_name, phone')
    .eq('business_id', businessId)
    .ilike('full_name', `%${query}%`)
    .order('full_name')
    .limit(10)

  if (branchId) {
    q = q.eq('branch_id', branchId)
  }

  const { data, error } = await q

  if (error) throw error
  return (data ?? []) as Pick<Client, 'id' | 'full_name' | 'phone'>[]
}

export const findOrCreateClientByPhone = async (
  businessId: string,
  input: { fullName: string; phone: string; email?: string | null; notes?: string | null },
  branchId?: string | null
): Promise<Client> => {
  return apiRequest<Client>('POST', '/clients/find-or-create-by-phone', {
    full_name: input.fullName.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    branch_id: branchId ?? null,
    notes: input.notes?.trim() || null,
  })
}
