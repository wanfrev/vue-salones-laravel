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
}

export interface InventarioMovimiento {
  id: string
  productId: string
  productName: string
  variantId: string | null
  variantName: string | null
  movementType: string
  quantity: number
  unitCost: number
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}
