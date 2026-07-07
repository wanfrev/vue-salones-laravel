export interface GiftCard {
  id: string
  businessId: string
  branchId: string | null
  recipientName: string
  recipientPhone: string | null
  amount: number
  status: 'active' | 'redeemed' | 'expired'
  notes: string | null
  redeemedAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface GiftCardFormData {
  id?: string
  recipientName: string
  recipientPhone: string
  amount: number
  notes: string
  status?: 'active' | 'redeemed' | 'expired'
}
