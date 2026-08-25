import { apiRequest } from '../lib/api'
import { ensureDefaultLocation, createInitialStock } from '../business/productWorkflow'
import { mapApiAttribute, mapApiVariant } from '../mappers/productosMapper'
import type { ProductAttribute, ProductVariant, ProductVariantFormData } from '../types/producto'

export const productVariantsKeys = {
  attributes: (businessId?: string | null) => ['product-attributes', businessId] as const,
  variants: (productId?: string | null) => ['product-variants', productId] as const,
}

export const listProductAttributes = async (businessId: string): Promise<ProductAttribute[]> => {
  const data = await apiRequest<any[]>('GET', `/product-attributes?business_id=${businessId}`)
  return (data ?? []).map(mapApiAttribute)
}

export const createProductAttribute = async (name: string): Promise<ProductAttribute> => {
  const data = await apiRequest<any>('POST', '/product-attributes', { name: name.trim() })
  return mapApiAttribute(data)
}

export const createProductAttributeValue = async (attributeId: string, value: string) => {
  return apiRequest<{ id: string; attribute_id: string; value: string }>(
    'POST',
    `/product-attributes/${attributeId}/values`,
    { value: value.trim() },
  )
}

export const listProductVariants = async (businessId: string, productId: string): Promise<ProductVariant[]> => {
  const data = await apiRequest<any[]>('GET', `/product-variants?business_id=${businessId}&product_id=${productId}`)
  return (data ?? []).map(mapApiVariant)
}

export const createProductVariant = async (
  businessId: string,
  productId: string,
  data: ProductVariantFormData,
  branchId?: string | null,
): Promise<ProductVariant> => {
  const raw = await apiRequest<any>('POST', '/product-variants', {
    product_id: productId,
    branch_id: branchId ?? null,
    sku: data.sku.trim() || null,
    barcode: data.barcode.trim() || null,
    unit_cost: Number(data.unitCost),
    unit_price: Number(data.unitPrice),
    active: data.active,
    attribute_value_ids: data.attributeValueIds,
  })
  const variant = mapApiVariant(raw)

  if (data.initialStock > 0) {
    try {
      const loc = await ensureDefaultLocation(businessId, branchId)
      await createInitialStock(businessId, productId, loc.id, Number(data.initialStock), branchId, variant.id)
    } catch (err) {
      console.error('[createProductVariant] Error creando stock inicial:', err)
    }
  }

  return variant
}

export const updateProductVariant = async (
  id: string,
  data: Partial<ProductVariantFormData>,
): Promise<ProductVariant> => {
  const payload: Record<string, unknown> = {}
  if (data.sku !== undefined) payload.sku = data.sku.trim() || null
  if (data.barcode !== undefined) payload.barcode = data.barcode.trim() || null
  if (data.unitCost !== undefined) payload.unit_cost = Number(data.unitCost)
  if (data.unitPrice !== undefined) payload.unit_price = Number(data.unitPrice)
  if (data.active !== undefined) payload.active = data.active
  if (data.attributeValueIds !== undefined) payload.attribute_value_ids = data.attributeValueIds

  const raw = await apiRequest<any>('PUT', `/product-variants/${id}`, payload)
  return mapApiVariant(raw)
}

export const deleteProductVariant = async (id: string): Promise<void> => {
  await apiRequest<void>('DELETE', `/product-variants/${id}`)
}
