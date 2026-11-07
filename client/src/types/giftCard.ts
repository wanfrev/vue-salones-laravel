/** Cómo se pagó la gift card al venderla (dinero recibido, no ingreso: entra al Cuadre del Día). */
export interface GiftCardPaymentInfo {
  amount: number
  paidAt: string
  exchangeRate: number | null
  splits: { method: string; currency: 'USD' | 'VES'; inputAmount: number; amount: number; bankId: string | null; bankName: string | null }[]
}

export interface GiftCard {
  id: string
  businessId: string
  branchId: string | null
  code: string | null
  buyerName: string | null
  buyerPhone: string | null
  recipientName: string
  recipientPhone: string | null
  amount: number
  status: 'active' | 'redeemed' | 'expired'
  notes: string | null
  redeemedAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  /** null = todavía no se registró cómo se pagó. */
  payment: GiftCardPaymentInfo | null
}

export interface GiftCardFormData {
  id?: string
  code?: string
  buyerName: string
  buyerPhone: string
  recipientName: string
  recipientPhone: string
  amount: number
  notes: string
  status?: 'active' | 'redeemed' | 'expired'
}
