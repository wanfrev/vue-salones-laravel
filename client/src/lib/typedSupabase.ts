import { supabase } from './supabase'

/**
 * Mutation client — centralizes the `as any` escape hatch in one place.
 *
 * The typed `supabase` client is used for reads. This wrapper
 * is needed because the generated Database types don't support:
 *   - `.insert().select('*, relation(*)')` chaining
 *   - `.functions.invoke()` typing
 *   - Runtime auth access inside services
 *
 * Usage:
 *   const { data } = await mutate.from('appointments').insert(payload).select('*, clients(*)').single()
 */
export const mutate = supabase as any

/** Re-export for use as `supabase` in reads */
export { supabase }
