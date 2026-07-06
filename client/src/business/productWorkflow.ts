import { api as supabase, api as mutate } from '../lib/api'

export async function ensureDefaultLocation(businessId: string, branchId?: string | null): Promise<{ id: string }> {
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
        console.error('[ensureDefaultLocation] error creating location:', insertErr)
        throw new Error(insertErr.message || 'Error al crear ubicación de inventario')
      }
    } else {
      loc = newLoc
    }
  }

  if (!loc?.id) {
    throw new Error('No se pudo crear ni encontrar una ubicación de inventario para esta sucursal')
  }

  return loc
}

export async function createInitialStock(
  businessId: string,
  productId: string,
  locationId: string,
  quantity: number,
  branchId?: string | null,
): Promise<void> {
  const { error } = await mutate.from('inventory_stock').insert({
    business_id: businessId,
    branch_id: branchId ?? null,
    location_id: locationId,
    product_id: productId,
    quantity: Math.max(0, Number(quantity)),
  })

  if (error) {
    console.error('[createInitialStock]', error)
    throw error
  }
}
