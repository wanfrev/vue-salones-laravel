import type { Product, ProductCategory } from '../types/database'
import type { Producto, ProductoFormData, ProductAttribute, ProductVariant } from '../types/producto'

export const mapProductToProducto = (
  product: Product,
  categoryName?: string,
  stockTotal = 0
): Producto => ({
  id: product.id,
  name: product.name,
  description: product.description ?? '',
  categoryId: product.category_id ?? '',
  categoryName: categoryName ?? '',
  sku: product.sku ?? '',
  barcode: product.barcode ?? '',
  unit: product.unit,
  unitCost: Number(product.unit_cost),
  unitPrice: Number(product.unit_price),
  unitPrice2: product.unit_price_2 ? Number(product.unit_price_2) : null,
  reorderPoint: Number(product.reorder_point),
  status: product.active ? 'Activo' : 'Inactivo',
  isSellable: product.is_sellable ?? true,
  stockTotal,
  createdAt: product.created_at,
})

export const mapProductoFormToProductInsert = (
  businessId: string,
  data: ProductoFormData
) => ({
  business_id: businessId,
  category_id: data.categoryId || null,
  name: data.name.trim(),
  description: data.description.trim() || null,
  sku: data.sku.trim() || null,
  barcode: data.barcode.trim() || null,
  unit: data.unit,
  unit_cost: Number(data.unitCost),
  unit_price: Number(data.unitPrice),
  unit_price_2: data.unitPrice2 ? Number(data.unitPrice2) : null,
  reorder_point: Number(data.reorderPoint),
  active: data.active === 'Activo',
  is_sellable: data.isSellable,
})

export const mapCategoryToOption = (cat: ProductCategory) => ({
  value: cat.id,
  label: cat.name,
})

export const mapApiAttribute = (raw: any): ProductAttribute => ({
  id: raw.id,
  name: raw.name,
  values: (raw.values ?? []).map((v: any) => ({
    id: v.id,
    attributeId: v.attribute_id,
    value: v.value,
  })),
})

export const mapApiVariant = (raw: any): ProductVariant => ({
  id: raw.id,
  productId: raw.product_id,
  name: raw.name,
  sku: raw.sku ?? null,
  barcode: raw.barcode ?? null,
  unitCost: Number(raw.unit_cost ?? 0),
  unitPrice: Number(raw.unit_price ?? 0),
  active: !!raw.active,
  availableQty: Number(raw.available_qty ?? 0),
  attributeValues: (raw.attribute_values ?? []).map((v: any) => ({
    id: v.id,
    attributeId: v.attribute_id,
    value: v.value,
  })),
})
