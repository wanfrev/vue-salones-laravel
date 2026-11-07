import { db, apiRequest } from '../lib/api'
import { handleDbError } from '../lib/errors'
import type { GiftCard, GiftCardFormData } from '../types/giftCard'
import type { toPayload } from '../lib/giftCardPayment'

/** Cuerpo del cobro que entiende el servidor (ver lib/giftCardPayment.toPayload). */
export type GiftCardPaymentPayload = ReturnType<typeof toPayload>

export const giftCardsKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['gift-cards', businessId, branchId] as const,
}

export const listGiftCards = async (businessId: string, branchId?: string | null): Promise<GiftCard[]> => {
  let query = db
    .from('gift_cards')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) handleDbError(error, 'Error al cargar gift cards')
  return (data ?? []).map(mapRowToGiftCard)
}

export const saveGiftCard = async (businessId: string, form: GiftCardFormData, branchId?: string | null, payment?: GiftCardPaymentPayload | null): Promise<GiftCard> => {
  const buyerTag = form.buyerName?.trim()
    ? `[Comprador: ${form.buyerName.trim()}${form.buyerPhone?.trim() ? ' | ' + form.buyerPhone.trim() : ''}]`
    : ''

  let cleanNotes = form.notes.trim()
  if (buyerTag && !cleanNotes.includes('[Comprador:')) {
    cleanNotes = cleanNotes ? `${buyerTag} ${cleanNotes}` : buyerTag
  }

  const generatedCode = form.code?.trim() || 'GC-' + Math.random().toString(36).substring(2, 8).toUpperCase()

  const payload: any = {
    recipient_name: form.recipientName.trim(),
    recipient_phone: form.recipientPhone.trim() || null,
    buyer_name: form.buyerName?.trim() || null,
    buyer_phone: form.buyerPhone?.trim() || null,
    code: generatedCode,
    amount: form.amount,
    status: form.status ?? 'active',
    notes: cleanNotes || null,
    branch_id: branchId ?? null,
  }

  if (form.id) {
    const { data, error } = await db
      .from('gift_cards')
      .update(payload)
      .eq('id', form.id)
      .select('*')
      .single()
    if (error) handleDbError(error, 'Error al actualizar gift card')
    return mapRowToGiftCard(data)
  }

  payload.business_id = businessId

  // Con el cobro, la gift card y su pago se crean juntos en el servidor (o no se crea ninguno).
  if (payment) {
    const row = await apiRequest<any>('POST', '/gift-cards', { ...payload, payment })
    return mapRowToGiftCard(row)
  }

  const { data, error } = await db
    .from('gift_cards')
    .insert(payload)
    .select('*')
    .single()
  if (error) handleDbError(error, 'Error al crear gift card')
  return mapRowToGiftCard(data)
}

/** Registra (o cambia) cómo se pagó una gift card ya creada. */
export const saveGiftCardPayment = async (id: string, payment: GiftCardPaymentPayload): Promise<GiftCard> =>
  mapRowToGiftCard(await apiRequest<any>('PUT', `/gift-cards/${id}/payment`, payment))

/** Quita el cobro registrado; la gift card se queda. */
export const deleteGiftCardPayment = async (id: string): Promise<void> => {
  await apiRequest('DELETE', `/gift-cards/${id}/payment`)
}

export const deleteGiftCard = async (id: string): Promise<void> => {
  const { error } = await db
    .from('gift_cards')
    .delete()
    .eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar gift card')
}

function mapRowToGiftCard(row: any): GiftCard {
  const fallbackCode = row.id ? 'GC-' + String(row.id).replace(/-/g, '').substring(0, 6).toUpperCase() : 'GC-CARD'

  let buyerName = row.buyer_name ?? null
  let buyerPhone = row.buyer_phone ?? null

  if (!buyerName && row.notes && typeof row.notes === 'string') {
    const match = row.notes.match(/\[Comprador:\s*([^\]|]+)(?:\|\s*([^\]]+))?\]/)
    if (match) {
      buyerName = match[1].trim()
      if (match[2] && !buyerPhone) buyerPhone = match[2].trim()
    }
  }

  // Clean notes from internal tag when returning to UI
  let displayNotes = row.notes ?? null
  if (displayNotes && typeof displayNotes === 'string') {
    displayNotes = displayNotes.replace(/\[Comprador:[^\]]+\]\s*/g, '').trim() || null
  }

  return {
    id: row.id,
    businessId: row.business_id,
    branchId: row.branch_id ?? null,
    code: row.code || fallbackCode,
    buyerName: buyerName,
    buyerPhone: buyerPhone,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone ?? null,
    amount: Number(row.amount),
    status: row.status ?? 'active',
    notes: displayNotes,
    redeemedAt: row.redeemed_at ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payment: mapPayment(row.payment),
  }
}

function mapPayment(p: any): GiftCard['payment'] {
  if (!p) return null
  return {
    amount: Number(p.amount),
    paidAt: p.paid_at,
    exchangeRate: p.exchange_rate != null ? Number(p.exchange_rate) : null,
    splits: (Array.isArray(p.payments_breakdown) ? p.payments_breakdown : []).map((s: any) => ({
      method: s.method,
      currency: s.currency === 'VES' ? 'VES' : 'USD',
      inputAmount: Number(s.inputAmount ?? 0),
      amount: Number(s.amount ?? 0),
      bankId: s.bank_id ?? null,
      bankName: s.bank_name ?? null,
    })),
  }
}
