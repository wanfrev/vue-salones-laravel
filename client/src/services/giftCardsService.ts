import { db } from '../lib/api'
import { handleDbError } from '../lib/errors'
import type { GiftCard, GiftCardFormData } from '../types/giftCard'

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

export const saveGiftCard = async (businessId: string, form: GiftCardFormData, branchId?: string | null): Promise<GiftCard> => {
  const payload = {
    recipient_name: form.recipientName.trim(),
    recipient_phone: form.recipientPhone.trim() || null,
    amount: form.amount,
    status: form.status ?? 'active',
    notes: form.notes.trim() || null,
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

  const { data, error } = await db
    .from('gift_cards')
    .insert(payload)
    .select('*')
    .single()
  if (error) handleDbError(error, 'Error al crear gift card')
  return mapRowToGiftCard(data)
}

export const deleteGiftCard = async (id: string): Promise<void> => {
  const { error } = await db
    .from('gift_cards')
    .delete()
    .eq('id', id)
  if (error) handleDbError(error, 'Error al eliminar gift card')
}

function mapRowToGiftCard(row: any): GiftCard {
  return {
    id: row.id,
    businessId: row.business_id,
    branchId: row.branch_id ?? null,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone ?? null,
    amount: Number(row.amount),
    status: row.status ?? 'active',
    notes: row.notes ?? null,
    redeemedAt: row.redeemed_at ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
