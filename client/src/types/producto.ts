export interface Producto {
  id: string
  name: string
  description: string
  categoryId: string
  categoryName: string
  sku: string
  barcode: string
  unit: string
  unitCost: number
  unitPrice: number
  reorderPoint: number
  status: 'Activo' | 'Inactivo'
  isSellable: boolean
  stockTotal: number
  createdAt: string
}

export interface ProductoFormData {
  name: string
  description: string
  categoryId: string
  sku: string
  barcode: string
  unit: string
  unitCost: number
  unitPrice: number
  reorderPoint: number
  active: 'Activo' | 'Inactivo'
  isSellable: boolean
  initialStock?: number
}

export interface ProductVariantFormData {
  name: string
  sku: string
  unitCost: number
  unitPrice: number
  active: boolean
}
