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
  unitPrice2?: number | null
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
  unitPrice2?: number | null
  reorderPoint: number
  active: 'Activo' | 'Inactivo'
  isSellable: boolean
  initialStock?: number
}

export interface ProductAttributeValue {
  id: string
  attributeId: string
  value: string
}

export interface ProductAttribute {
  id: string
  name: string
  values: ProductAttributeValue[]
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  sku: string | null
  barcode: string | null
  unitCost: number
  unitPrice: number
  active: boolean
  availableQty: number
  attributeValues: ProductAttributeValue[]
}

export interface ProductVariantFormData {
  sku: string
  barcode: string
  unitCost: number
  unitPrice: number
  active: boolean
  initialStock: number
  attributeValueIds: string[]
}
