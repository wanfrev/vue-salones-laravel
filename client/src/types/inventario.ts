export interface InventarioItem {
  id: string
  productId: string
  productName: string
  productSku: string
  variantId: string | null
  variantName: string | null
  quantity: number
  reservedQty: number
  availableQty: number
  reorderPoint: number
  unitCost: number
  unitPrice: number
  unitPrice2: number | null
}

