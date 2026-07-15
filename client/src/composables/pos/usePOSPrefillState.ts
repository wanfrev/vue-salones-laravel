import { ref } from 'vue'
import type { PaymentBreakdownItem } from '../../types/pos'

export interface POSPrefillData {
  /** The payment method to pre-select */
  paymentMethod: string
  /** Payment amount in display currency */
  paymentAmount: number
  /** Display currency */
  paymentCurrency: 'USD' | 'VES'
  /** Exchange rate used */
  exchangeRate: number
  /** Tip amount in USD */
  tipAmount: number
  /** Staff notes about the payment */
  notes: string | null
  /** Mixed payment breakdown */
  breakdown: PaymentBreakdownItem[] | null
  /** Products that were in the cart */
  products: { productId: string; productName: string; quantity: number; unitCost: number }[] | null
}

export const posPrefill = ref<POSPrefillData | null>(null)
