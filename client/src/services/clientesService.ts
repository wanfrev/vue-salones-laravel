import { db, apiRequest } from '../lib/api'
import { clienteFormSchema } from '../lib/validation'
import { mapClienteFormToClientInsert, mapClientToCliente } from '../mappers/clientesMapper'
import type { Client } from '../types/database'
import type { Cliente, ClienteFormData } from '../types/cliente'

export const clientesKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['clientes', businessId, branchId] as const,
}

interface ClientStatsRow {
  client_id: string
  total_appointments: number | string
  total_spent: number | string
  last_visit: string | null
}

const getClientStats = async (branchId?: string | null): Promise<Map<string, { lastVisit?: string; totalAppointments: number; totalSpent: number }>> => {
  const path = branchId ? `/clients/stats?branch_id=${encodeURIComponent(branchId)}` : '/clients/stats'
  const rows = await apiRequest<ClientStatsRow[]>('GET', path)
  const map = new Map<string, { lastVisit?: string; totalAppointments: number; totalSpent: number }>()
  for (const row of rows ?? []) {
    map.set(row.client_id, {
      lastVisit: row.last_visit ? row.last_visit.split('T')[0] : undefined,
      totalAppointments: Number(row.total_appointments ?? 0),
      totalSpent: Number(row.total_spent ?? 0),
    })
  }
  return map
}

export const listClientes = async (businessId: string, branchId?: string | null): Promise<Cliente[]> => {
  let query = db
    .from('clients')
    .select('*')
    .eq('business_id', businessId)
    .order('full_name')

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const [{ data, error }, statsByClient] = await Promise.all([
    query,
    getClientStats(branchId).catch(() => new Map<string, { lastVisit?: string; totalAppointments: number; totalSpent: number }>()),
  ])

  if (error) throw error

  const clients = data as Client[]

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
    ? db.from('clients').update(payload).eq('id', data.id).select('*').single()
    : db.from('clients').insert(payload).select('*').single()

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
  const { data, error } = await db
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return mapClientToCliente(data as Client)
}

export const deleteCliente = async (clientId: string): Promise<void> => {
  const { error } = await db
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
  _businessId: string,
  query: string,
  branchId?: string | null
): Promise<Pick<Client, 'id' | 'full_name' | 'phone'>[]> => {
  const q = query.trim()
  if (!q) return []

  let path = `/clients/search?q=${encodeURIComponent(q)}`
  if (branchId) {
    path += `&branch_id=${encodeURIComponent(branchId)}`
  }

  const results = await apiRequest<Client[]>('GET', path)
  return results.map(c => ({ id: c.id, full_name: c.full_name, phone: c.phone }))
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
