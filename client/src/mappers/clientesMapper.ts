import type { Client } from '../types/database'
import type { Cliente, ClienteFormData } from '../types/cliente'
import { toTitleCase } from '../lib/formatters'

export const mapClientToCliente = (
  client: Client,
  stats?: { lastVisit?: string; totalAppointments?: number; totalSpent?: number }
): Cliente => ({
  id: client.id,
  name: toTitleCase(client.full_name),
  phone: client.phone,
  email: client.email ?? '',
  code: client.client_code ?? '',
  notes: client.notes ?? '',
  birthday: client.birthday ?? '',
  metadata: client.metadata ?? {},
  joinDate: client.created_at.split('T')[0],
  lastVisit: stats?.lastVisit ?? 'Sin visitas',
  totalAppointments: stats?.totalAppointments ?? 0,
  totalSpent: (stats?.totalSpent ?? 0).toLocaleString(),
  preferredServices: [],
  middleName: client.middle_name ?? '',
  lastName: client.last_name ?? '',
  secondLastName: client.second_last_name ?? '',
  documentId: client.document_id ?? '',
  medicalInsurance: client.medical_insurance ?? '',
  emergencyPhone: client.emergency_phone ?? '',
})

export const mapClienteFormToClientInsert = (businessId: string, data: ClienteFormData) => ({
  business_id: businessId,
  full_name: data.name.trim(),
  phone: data.phone.trim(),
  email: data.email.trim() || null,
  client_code: data.code?.trim() || null,
  notes: data.notes.trim() || null,
  birthday: data.birthday || null,
  metadata: data.metadata ?? {},
  pets: data.pets ?? [],
  middle_name: data.middleName?.trim() || null,
  last_name: data.lastName?.trim() || null,
  second_last_name: data.secondLastName?.trim() || null,
  document_id: data.documentId?.trim() || null,
  medical_insurance: data.medicalInsurance?.trim() || null,
  emergency_phone: data.emergencyPhone?.trim() || null,
})
