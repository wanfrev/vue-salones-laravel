/**
 * Filtering, sorting and counting for the superadmin business list. Pure, so the list screen only
 * wires inputs to it — and so the rules (what "Activos" means, how ties are sorted) are tested.
 */

export interface ListedBusiness {
  id: string
  name: string
  slug: string
  niche_type?: string | null
  active: boolean
  deleted_at?: string | null
  created_at: string
}

export type StatusFilter = 'all' | 'active' | 'inactive' | 'deleted'
export type SortKey = 'recent' | 'oldest' | 'name' | 'niche'

export interface BusinessFilters {
  search: string
  status: StatusFilter
  /** A niche id, or '' for every niche. 'sin_nicho' matches businesses with no niche set. */
  niche: string
}

export const NO_NICHE = 'sin_nicho'
export const nicheOf = (b: ListedBusiness): string => b.niche_type || NO_NICHE

const normalize = (s: string) => s.trim().toLowerCase()

/** A business counts as "Activo"/"Inactivo" only while it hasn't been deleted. */
export function matchesStatus(b: ListedBusiness, status: StatusFilter): boolean {
  switch (status) {
    case 'all': return !b.deleted_at
    case 'active': return !b.deleted_at && b.active
    case 'inactive': return !b.deleted_at && !b.active
    case 'deleted': return !!b.deleted_at
  }
}

export function filterBusinesses<T extends ListedBusiness>(list: T[], f: BusinessFilters, nicheLabel: (niche: string) => string = n => n): T[] {
  const term = normalize(f.search)
  return list.filter(b => {
    if (!matchesStatus(b, f.status)) return false
    if (f.niche && nicheOf(b) !== f.niche) return false
    if (!term) return true
    return normalize(b.name).includes(term)
      || normalize(b.slug).includes(term)
      || normalize(nicheOf(b)).includes(term)
      || normalize(nicheLabel(nicheOf(b))).includes(term)
  })
}

export function sortBusinesses<T extends ListedBusiness>(list: T[], key: SortKey, nicheLabel: (niche: string) => string = n => n): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  const copy = [...list]
  switch (key) {
    case 'recent': return copy.sort((a, b) => b.created_at.localeCompare(a.created_at) || byName(a, b))
    case 'oldest': return copy.sort((a, b) => a.created_at.localeCompare(b.created_at) || byName(a, b))
    case 'name': return copy.sort(byName)
    case 'niche': return copy.sort((a, b) => nicheLabel(nicheOf(a)).localeCompare(nicheLabel(nicheOf(b)), 'es', { sensitivity: 'base' }) || byName(a, b))
  }
}

export interface StatusCounts { all: number; active: number; inactive: number; deleted: number }

export const countByStatus = (list: ListedBusiness[]): StatusCounts => ({
  all: list.filter(b => matchesStatus(b, 'all')).length,
  active: list.filter(b => matchesStatus(b, 'active')).length,
  inactive: list.filter(b => matchesStatus(b, 'inactive')).length,
  deleted: list.filter(b => matchesStatus(b, 'deleted')).length,
})

/** Live (not deleted) businesses per niche, biggest first — what the niche chips show. */
export function countByNiche(list: ListedBusiness[]): { niche: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const b of list) {
    if (b.deleted_at) continue
    counts.set(nicheOf(b), (counts.get(nicheOf(b)) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([niche, count]) => ({ niche, count }))
    .sort((a, b) => b.count - a.count || a.niche.localeCompare(b.niche))
}
