/** Historial de visitas de un cliente — respuesta de GET /clients/{id}/visits (ClientVisitService). */

/** attended = completada o pagada · pending = sin cerrar o futura · cancelled / no_show no suman al total. */
export type VisitState = 'attended' | 'pending' | 'cancelled' | 'no_show'

export interface VisitService {
  name: string
  employee: string | null
  assistant: string | null
  price: number
  status: string
}

export interface VisitPayment {
  method: string
  amount: number
  /** 'USD' | 'VES' | null (null = el monto ya está en USD, sin desglose) */
  currency: string | null
  bank: string | null
}

export interface VisitProduct {
  name: string
  quantity: number
}

export interface ClientVisit {
  /** group_id de la visita (o id de la cita / de la venta) */
  id: string
  /** 'appointment' = cita(s) · 'sale' = venta directa del POS sin cita */
  kind: 'appointment' | 'sale'
  /** ISO 8601 (UTC) */
  date: string
  state: VisitState
  services: VisitService[]
  products: VisitProduct[]
  amount: number
  payment_status: 'paid' | 'partial' | 'unpaid'
  payments: VisitPayment[]
  notes: string | null
  /** Solo llega a admin y encargado; el servidor lo manda null a los demás roles. */
  internal_notes: string | null
}

export interface ClientVisitsSummary {
  total_visits: number
  attended: number
  pending: number
  cancelled: number
  no_show: number
  direct_sales: number
  direct_sales_total: number
  total_billed: number
  total_paid: number
  /** Lo completado y sin pagar. */
  balance: number
  last_visit: string | null
  next_visit: string | null
}

export interface ClientVisitsPage {
  data: ClientVisit[]
  meta: { page: number; per_page: number; has_more: boolean }
  /** Solo en la primera página. */
  summary?: ClientVisitsSummary
}
