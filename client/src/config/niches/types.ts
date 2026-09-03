import type { FeatureKey } from '../features'

export interface NicheFieldConfig {
  key: string
  label: string
  type: 'input' | 'select' | 'textarea' | 'date'
  placeholder?: string
  options?: { value: string; label: string }[]
  required?: boolean
  /** When set, field is hidden behind a toggle. Fields sharing the same group name collapse together under one button. */
  collapsibleGroup?: string
  collapsibleGroupLabel?: string
  terminologyKey?: string
}

export interface NicheConfig {
  sectionTitle: string
  fields: NicheFieldConfig[]
  listType?: 'petList'
}

/**
 * A capability is a boolean trait a niche either has or doesn't — used to replace
 * ad-hoc predicates like isPetNiche()/isVetNiche() with a single lookup.
 */
export type Capability =
  | 'clients.pets'
  | 'clients.medical'
  | 'catalog.services'
  | 'catalog.products'
  | 'catalog.requirements'
  | 'scheduling.appointments'
  | 'commerce.pos'
  | 'pos.standalone_tips'
  | 'staffing.timesheets'
  | 'staffing.billing'
  | 'staffing.crm'
  | 'staffing.reports'
  | 'staffing.spreadsheet'
  | 'staffing.incidents'

export interface NicheCopy {
  serviceNamePlaceholder?: string
  serviceDescriptionPlaceholder?: string
}

export interface NicheDefinition {
  id: string
  label: string
  /** creatable = offered when registering a new business. legacy = kept working, not offered. */
  status: 'creatable' | 'legacy'
  /** Client profile fields section (NicheFields.vue). null = render nothing. */
  clientProfile: NicheConfig | null
  capabilities: readonly Capability[]
  /** Seed/fallback layer for businesses.features — superadmin's persisted choice wins over this. */
  featureDefaults: Partial<Record<FeatureKey, boolean>>
  /** Hard runtime override for structural impossibilities. Wins over everything, including superadmin. */
  featureLocks?: Partial<Record<FeatureKey, boolean>>
  /** Seed/fallback layer for businesses.terminology — same precedence rule as featureDefaults. */
  terminologyDefaults?: Partial<Record<string, string>>
  copy?: NicheCopy
  locale?: 'es' | 'en'
  currencyMode?: 'dual' | 'single'
}
