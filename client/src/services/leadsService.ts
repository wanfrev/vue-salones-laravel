import { apiRequest, db } from '../lib/api'
import { handleDbError } from '../lib/errors'
import { leadFormSchema } from '../lib/validation'
import type { Lead, LeadPriority, LeadStatus } from '../types/database'

export const leadKeys = {
  all: (businessId?: string | null) => ['leads', businessId] as const,
}

export const vendedoraKeys = {
  all: (businessId?: string | null) => ['crm-vendedoras', businessId] as const,
}

/** "Estado del Seguimiento" in the UI — same underlying `status` column, relabeled per the client. */
export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'No Iniciado' },
  { value: 'called', label: 'Llamado' },
  { value: 'answered', label: 'Contestado' },
  { value: 'emailed', label: 'Email Enviado' },
  { value: 'meeting', label: 'Reunión Agendada' },
  { value: 'won', label: 'Ganado' },
  { value: 'lost', label: 'Perdido' },
]

export const LEAD_PRIORITY_OPTIONS: { value: LeadPriority; label: string }[] = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
]

export interface LeadRow {
  id: string
  ownerId: string
  ownerName: string
  companyName: string
  workArea: string
  address: string
  phone: string
  email: string
  status: LeadStatus
  visitDate: string
  companyCategory: string
  priority: LeadPriority | ''
  contactCard: string
  state: string
  notes: string
  updatedAt: string
}

export interface LeadFormData {
  companyName: string
  workArea: string
  address: string
  phone: string
  email: string
  status: LeadStatus
  visitDate: string
  companyCategory: string
  priority: LeadPriority | ''
  contactCard: string
  state: string
  notes: string
}

export interface VendedoraRow {
  id: string
  name: string
  leadCount: number
}

const toLeadRow = (row: Lead): LeadRow => ({
  id: row.id,
  ownerId: row.owner_id,
  ownerName: row.owner?.full_name ?? '',
  companyName: row.company_name,
  workArea: row.work_area ?? '',
  address: row.address ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  status: row.status,
  // Eloquent's `date` cast serializes visit_date as a full ISO datetime ("2026-08-16T00:00:00.000000Z"),
  // not the bare "2026-08-16" an <input type="date"> needs — feeding it the full string leaves
  // that field blank when editing and risks a UTC/local off-by-one-day when displayed.
  visitDate: row.visit_date ? row.visit_date.slice(0, 10) : '',
  companyCategory: row.company_category ?? '',
  priority: row.priority ?? '',
  contactCard: row.contact_card ?? '',
  state: row.state ?? '',
  notes: row.notes ?? '',
  updatedAt: row.updated_at,
})

/** The admin CRM sidebar roster — every vendedora and her lead count. Empty for a non-admin. */
export const listVendedoras = (): Promise<VendedoraRow[]> =>
  apiRequest<VendedoraRow[]>('GET', '/leads/vendedoras')

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
    email: parsed.data.email || null,
    status: parsed.data.status,
    visit_date: parsed.data.visitDate || null,
    company_category: parsed.data.companyCategory || null,
    priority: parsed.data.priority || null,
    contact_card: parsed.data.contactCard || null,
    state: parsed.data.state || null,
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
