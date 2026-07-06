import { supabase } from '../lib/supabase'
import { mutate } from '../lib/typedSupabase'
import { validateSaleQuantity, movementTypeForAdjust } from '../business/stockRules'
import type { InventoryStock, InventoryMovement } from '../types/database'
import type { InventarioItem, InventarioMovimiento } from '../types/inventario'

export async function getDefaultLocation(businessId: string, branchId?: string | null): Promise<string> {
  let query = supabase
    .from('inventory_locations')
    .select('id')
    .eq('business_id', businessId)
    .eq('is_default', true)

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  let { data: loc } = await query.maybeSingle()

  if (!loc) {
    let firstQuery = supabase
      .from('inventory_locations')
      .select('id')
      .eq('business_id', businessId)

    if (branchId) {
      firstQuery = firstQuery.eq('branch_id', branchId)
    }

    const { data: firstLoc } = await firstQuery.limit(1).maybeSingle()
    loc = firstLoc
  }

  if (!loc) {
    const { data: newLoc, error: insertErr } = await mutate
      .from('inventory_locations')
      .insert({ business_id: businessId, branch_id: branchId ?? null, name: 'Principal', is_default: true })
      .select('id')
      .single()
    if (insertErr) {
      const isDuplicate = insertErr.code === '23505' && insertErr.message.includes('inventory_locations_business_id_name_key')
      if (isDuplicate && branchId) {
        const { data: existingLoc } = await supabase
          .from('inventory_locations')
          .select('id')
          .eq('business_id', businessId)
          .eq('name', 'Principal')
          .maybeSingle()
        loc = existingLoc
      }
      if (!loc) {
        console.error('[getDefaultLocation] error creating location:', insertErr)
        throw new Error(insertErr.message || 'Error al crear ubicación de inventario')
      }
    } else {
      loc = newLoc
    }
  }

  if (!loc?.id) {
    throw new Error('No se pudo crear ni encontrar una ubicación de inventario para esta sucursal')
  }

  return loc.id
}

export async function getStockRecord(
  businessId: string,
  productId: string,
  locationId: string,
  variantId?: string | null,
  branchId?: string | null,
) {
  let query = supabase
    .from('inventory_stock')
    .select('id, quantity, reserved_qty')
    .eq('business_id', businessId)
    .eq('product_id', productId)
    .eq('location_id', locationId)

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  if (variantId) {
    query = query.eq('variant_id', variantId)
  } else {
    query = query.is('variant_id', null)
  }

  return query.maybeSingle()
}

export async function updateStockQuantity(stockId: string, newQuantity: number): Promise<void> {
  const { error } = await mutate
    .from('inventory_stock')
    .update({ quantity: newQuantity })
    .eq('id', stockId)
  if (error) throw error
}

export async function insertStockRecord(
  businessId: string,
  productId: string,
  locationId: string,
  quantity: number,
  variantId?: string | null,
  branchId?: string | null,
): Promise<void> {
  const { error } = await mutate
    .from('inventory_stock')
    .insert({
      business_id: businessId,
      branch_id: branchId ?? null,
      location_id: locationId,
      product_id: productId,
      variant_id: variantId ?? null,
      quantity,
    })
  if (error) throw error
}

export async function recordMovement(
  businessId: string,
  params: {
    locationId: string
    productId: string
    variantId?: string | null
    movementType: string
    quantity: number
    notes: string
    unitCost?: number
    exchangeRate?: number
    branchId?: string | null
  },
): Promise<void> {
  const supabaseUser = mutate.auth?.currentUser
  const { error } = await mutate
    .from('inventory_movements')
    .insert({
      business_id: businessId,
      branch_id: params.branchId ?? null,
      location_id: params.locationId,
      product_id: params.productId,
      variant_id: params.variantId ?? null,
      movement_type: params.movementType,
      quantity: params.quantity,
      unit_cost: params.unitCost ?? 0,
      exchange_rate_used: params.exchangeRate ?? 1,
      notes: params.notes,
      created_by: supabaseUser?.id ?? null,
    })
  if (error) throw error
}

export const inventarioKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['inventario', businessId, branchId] as const,
  movements: (businessId?: string | null, branchId?: string | null) => ['inventario-movements', businessId, branchId] as const,
}

export const listInventario = async (businessId: string, branchId?: string | null): Promise<InventarioItem[]> => {
  let stockQuery = supabase
    .from('inventory_stock')
    .select('*, products(name, sku, unit_cost, unit_price, reorder_point)')
    .eq('business_id', businessId)

  if (branchId) {
    stockQuery = stockQuery.eq('branch_id', branchId)
  }

  const { data: stock, error } = await stockQuery

  if (error) throw error

  const raw = (stock ?? []) as Array<
    InventoryStock & {
      products?: { name: string; sku: string | null; unit_cost: number; unit_price: number; reorder_point: number } | null
    }
  >

  if (raw.length === 0) {
    let productsQuery = supabase
      .from('products')
      .select('id, name, sku, unit_cost, unit_price, reorder_point')
      .eq('business_id', businessId)
      .eq('active', true)

    if (branchId) {
      // Include both branch-specific and global (branch_id IS NULL) products
      productsQuery = productsQuery.or(`branch_id.is.null,branch_id.eq.${branchId}`)
    }

    const { data: products } = await productsQuery

    type ProductRow = { id: string; name: string; sku: string | null; unit_cost: number; unit_price: number; reorder_point: number }
    return ((products ?? []) as ProductRow[]).map(p => ({
      id: p.id,
      productId: p.id,
      productName: p.name,
      productSku: p.sku ?? '',
      variantId: null,
      variantName: null,
      quantity: 0,
      reservedQty: 0,
      availableQty: 0,
      reorderPoint: Number(p.reorder_point ?? 0),
      unitCost: Number(p.unit_cost ?? 0),
      unitPrice: Number(p.unit_price ?? 0),
    }))
  }

  const productIds = [...new Set(raw.map(r => r.product_id))]
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, product_id, name')
    .eq('active', true)
    .in('product_id', productIds.length ? productIds : [null])

  const variantMap = new Map<string, { product_id: string; name: string }>()
  for (const v of (variants ?? []) as Array<{ id: string; product_id: string; name: string }>) {
    variantMap.set(v.id, v)
  }

  const grouped = new Map<string, {
    stockIds: string[]
    productId: string
    productName: string
    productSku: string
    totalQty: number
    totalReserved: number
    reorderPoint: number
    unitCost: number
    unitPrice: number
    variants: Set<string>
  }>()

  for (const row of raw) {
    const pid = row.product_id
    if (!grouped.has(pid)) {
      grouped.set(pid, {
        stockIds: [],
        productId: pid,
        productName: row.products?.name ?? '',
        productSku: row.products?.sku ?? '',
        totalQty: 0,
        totalReserved: 0,
        reorderPoint: Number(row.products?.reorder_point ?? 0),
        unitCost: Number(row.products?.unit_cost ?? 0),
        unitPrice: Number(row.products?.unit_price ?? 0),
        variants: new Set(),
      })
    }
    const g = grouped.get(pid)!
    g.stockIds.push(row.id)
    g.totalQty += Number(row.quantity)
    g.totalReserved += Number(row.reserved_qty)
    if (row.variant_id) g.variants.add(row.variant_id)
  }

  return [...grouped.values()].map(g => {
    const firstVariantId = g.variants.values().next().value ?? null
    return {
      id: g.stockIds[0],
      productId: g.productId,
      productName: g.productName,
      productSku: g.productSku,
      variantId: firstVariantId,
      variantName: firstVariantId ? variantMap.get(firstVariantId)?.name ?? null : null,
      quantity: g.totalQty,
      reservedQty: g.totalReserved,
      availableQty: g.totalQty - g.totalReserved,
      reorderPoint: g.reorderPoint,
      unitCost: g.unitCost,
      unitPrice: g.unitPrice,
    }
  })
}

export const listInventoryMovements = async (
  businessId: string,
  branchId?: string | null,
  productId?: string
): Promise<InventarioMovimiento[]> => {
  let query = supabase
    .from('inventory_movements')
    .select('*, products!inner(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  if (productId) {
    query = query.eq('product_id', productId)
  }

  const { data, error } = await query

  if (error) throw error

  const raw = (data ?? []) as Array<
    InventoryMovement & {
      products?: { name: string } | null
    }
  >

  const productIds = [...new Set(raw.map(r => r.product_id))]
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, name')
    .in('product_id', productIds.length ? productIds : [null])

  const variantMap = new Map<string, string>()
  for (const v of (variants ?? []) as Array<{ id: string; name: string }>) {
    variantMap.set(v.id, v.name)
  }

  return raw.map(row => ({
    id: row.id,
    productId: row.product_id,
    productName: row.products?.name ?? '',
    variantId: row.variant_id,
    variantName: row.variant_id ? variantMap.get(row.variant_id) ?? null : null,
    movementType: row.movement_type,
    quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }))
}

export const adjustInventory = async (
  businessId: string,
  productId: string,
  quantity: number,
  notes: string,
  variantId?: string | null,
  branchId?: string | null,
): Promise<void> => {
  const locationId = await getDefaultLocation(businessId, branchId)
  const existing = await getStockRecord(businessId, productId, locationId, variantId, branchId)

  if (existing?.data) {
    await updateStockQuantity(existing.data.id, Number(existing.data.quantity) + quantity)
  } else {
    await insertStockRecord(businessId, productId, locationId, quantity, variantId, branchId)
  }

  await recordMovement(businessId, {
    locationId,
    productId,
    variantId,
    movementType: movementTypeForAdjust(quantity),
    quantity,
    notes,
    branchId,
  })
}

export const sellProduct = async (
  businessId: string,
  productId: string,
  quantity: number,
  notes: string,
  variantId?: string | null,
  unitPrice?: number,
  exchangeRate?: number,
  currency?: 'USD' | 'VES',
  branchId?: string | null,
): Promise<void> => {
  const locationId = await getDefaultLocation(businessId, branchId)
  const existing = await getStockRecord(businessId, productId, locationId, variantId, branchId)

  if (!existing?.data) throw new Error('No hay stock de este producto')

  const currentQty = Number(existing.data.quantity)
  const reservedQty = Number(existing.data.reserved_qty ?? 0)
  const availableQty = Math.max(0, currentQty - reservedQty)
  validateSaleQuantity(quantity, availableQty)

  const newQty = currentQty - quantity
  await updateStockQuantity(existing.data.id, newQty)

  const rate = exchangeRate ?? 1
  let finalNotes = notes || 'Venta directa'
  if (currency === 'VES') {
    finalNotes = `[VES:${rate}] ` + finalNotes
  }

  await recordMovement(businessId, {
    locationId,
    productId,
    variantId,
    movementType: 'sale',
    quantity: -quantity,
    notes: finalNotes,
    unitCost: unitPrice,
    exchangeRate: rate,
    branchId,
  })
}
