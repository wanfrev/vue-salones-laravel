import { api as supabase, api as mutate } from '../lib/api'
import { ensureDefaultLocation, createInitialStock } from '../business/productWorkflow'
import { mapProductToProducto, mapProductoFormToProductInsert } from '../mappers/productosMapper'
import type { Product, ProductCategory } from '../types/database'
import type { Producto, ProductoFormData } from '../types/producto'

export const productosKeys = {
  all: (businessId?: string | null, branchId?: string | null) => ['productos', businessId, branchId] as const,
  categories: (businessId?: string | null, branchId?: string | null) => ['productos-categories', businessId, branchId] as const,
}

export const listProductCategories = async (businessId: string, branchId?: string | null): Promise<ProductCategory[]> => {
  let query = supabase
    .from('product_categories')
    .select('*')
    .eq('business_id', businessId)
    .order('name')

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as ProductCategory[]
}

export const listProductos = async (businessId: string, branchId?: string | null): Promise<Producto[]> => {
  let productsQuery = supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .order('name')

  if (branchId) {
    // Include both branch-specific and global (branch_id IS NULL) products
    productsQuery = productsQuery.or(`branch_id.is.null,branch_id.eq.${branchId}`)
  }

  const { data: products, error } = await productsQuery

  if (error) throw error

  let catQuery = supabase
    .from('product_categories')
    .select('id, name')
    .eq('business_id', businessId)

  if (branchId) {
    // Include branch-specific and global categories
    catQuery = catQuery.or(`branch_id.is.null,branch_id.eq.${branchId}`)
  }

  const { data: categories } = await catQuery

  const catMap = new Map<string, string>()
  for (const cat of (categories ?? []) as ProductCategory[]) {
    catMap.set(cat.id, cat.name)
  }

  let stockQuery = supabase
    .from('inventory_stock')
    .select('product_id, quantity')
    .eq('business_id', businessId)

  if (branchId) {
    stockQuery = stockQuery.eq('branch_id', branchId)
  }

  const { data: stock } = await stockQuery

  const stockMap = new Map<string, number>()
  for (const s of (stock ?? []) as Array<{ product_id: string; quantity: number }>) {
    stockMap.set(s.product_id, (stockMap.get(s.product_id) ?? 0) + Number(s.quantity))
  }

  return (products as Product[]).map(p =>
    mapProductToProducto(p, catMap.get(p.category_id ?? ''), stockMap.get(p.id) ?? 0)
  )
}

export const saveProducto = async (
  businessId: string,
  data: ProductoFormData & { id?: string },
  branchId?: string | null
): Promise<Producto> => {
  const { initialStock, ...formData } = data
  const payload = { ...mapProductoFormToProductInsert(businessId, formData), branch_id: branchId ?? null }

  const isNew = !data.id
  const query = isNew
    ? mutate.from('products').insert(payload).select('*').single()
    : mutate.from('products').update(payload).eq('id', data.id).select('*').single()

  const { data: saved, error } = await query
  if (error) throw error
  if (!saved) throw new Error('No se pudo guardar el producto')

  if (isNew) {
    try {
      const loc = await ensureDefaultLocation(businessId, branchId)
      await createInitialStock(businessId, saved.id, loc.id, Number(initialStock ?? 0), branchId)
    } catch (err) {
      console.error('[saveProducto] Error creando stock inicial:', err)
    }
  }

  return mapProductToProducto(saved as Product)
}

export const createProductCategory = async (businessId: string, name: string, branchId?: string | null): Promise<ProductCategory> => {
  const { data, error } = await mutate
    .from('product_categories')
    .insert({ business_id: businessId, branch_id: branchId ?? null, name: name.trim() })
    .select('*')
    .single()

  if (error) throw error
  return data as ProductCategory
}

export const deleteProducto = async (id: string): Promise<void> => {
  const { error } = await mutate
    .from('products')
    .update({ active: false })
    .eq('id', id)

  if (error) throw error
}

export const deleteProductoPermanently = async (id: string): Promise<void> => {
  const { error } = await mutate
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}
