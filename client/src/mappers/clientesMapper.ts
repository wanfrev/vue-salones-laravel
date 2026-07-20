import type { Client } from '../types/database'
import type { Cliente, ClienteFormData } from '../types/cliente'

export const mapClientToCliente = (
  client: Client,
  stats?: { lastVisit?: string; totalAppointments?: number; totalSpent?: number }
): Cliente => ({
  id: client.id,
  name: client.full_name,
  phone: client.phone,
  email: client.email ?? '',
  notes: client.notes ?? '',
  birthday: client.birthday ?? '',
  metadata: client.metadata ?? {},
  joinDate: client.created_at.split('T')[0],
  lastVisit: stats?.lastVisit ?? 'Sin visitas',
  totalAppointments: stats?.totalAppointments ?? 0,
  totalSpent: (stats?.totalSpent ?? 0).toLocaleString(),
  preferredServices: [],
})

export const mapClienteFormToClientInsert = (businessId: string, data: ClienteFormData) => ({
  business_id: businessId,
  full_name: data.name.trim(),
  phone: data.phone.trim(),
  email: data.email.trim() || null,
  notes: data.notes.trim() || null,
  birthday: data.birthday || null,
  metadata: data.metadata ?? {},
  pets: data.pets ?? [],
})
