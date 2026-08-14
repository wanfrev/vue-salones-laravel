import { db } from '../lib/api'
import { handleDbError } from '../lib/errors'
import { leadFormSchema } from '../lib/validation'
import type { Lead, LeadStatus } from '../types/database'

export const leadKeys = {
  all: (businessId?: string | null) => ['leads', businessId] as const,
}

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'called', label: 'Llamó' },
  { value: 'answered', label: 'Contestó' },
  { value: 'emailed', label: 'Envió correo' },
  { value: 'meeting', label: 'Reunión agendada' },
  { value: 'won', label: 'Ganado' },
  { value: 'lost', label: 'Perdido' },
]

export interface LeadRow {
  id: string
  ownerId: string
  companyName: string
  workArea: string
  address: string
  phone: string
  status: LeadStatus
  notes: string
  updatedAt: string
}

export interface LeadFormData {
  companyName: string
  workArea: string
  address: string
  phone: string
  status: LeadStatus
  notes: string
}

const toLeadRow = (row: Lead): LeadRow => ({
  id: row.id,
  ownerId: row.owner_id,
  companyName: row.company_name,
  workArea: row.work_area ?? '',
  address: row.address ?? '',
  phone: row.phone ?? '',
  status: row.status,
  notes: row.notes ?? '',
  updatedAt: row.updated_at,
})

/**
 * businessId isn't part of the URL — the backend derives it (and the owner scoping) from the
 * authenticated profile — but stays a parameter for consistency with every other service here.
 */
export const listLeads = async (_businessId: string): Promise<LeadRow[]> => {
  const { data, error } = await db.from('leads').select('*')
  if (error) handleDbError(error, 'Error al cargar los leads')

  return ((data ?? []) as Lead[]).map(toLeadRow)
}

export const saveLead = async (
  _businessId: string,
  data: LeadFormData & { id?: string },
): Promise<LeadRow> => {
  const parsed = leadFormSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join('. '))
  }

  const payload = {
    company_name: parsed.data.companyName,
    work_area: parsed.data.workArea || null,
    address: parsed.data.address || null,
    phone: parsed.data.phone || null,
    status: parsed.data.status,
    notes: parsed.data.notes || null,
  }

  const { data: saved, error } = data.id
    ? await db.from('leads').update(payload).eq('id', data.id).select('*').single()
    : await db.from('leads').insert(payload).select('*').single()

  if (error) handleDbError(error, 'Error al guardar el lead')

  return toLeadRow(saved as Lead)
}

export const deleteLead = async (id: string): Promise<void> => {
  const { error } = await db.from('leads').delete().eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar el lead')
}
