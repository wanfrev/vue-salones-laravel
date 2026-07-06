import type { Product, ProductCategory } from '../types/database'
import type { Producto, ProductoFormData } from '../types/producto'

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
  reorder_point: Number(data.reorderPoint),
  active: data.active === 'Activo',
  is_sellable: data.isSellable,
})

export const mapCategoryToOption = (cat: ProductCategory) => ({
  value: cat.id,
  label: cat.name,
})
