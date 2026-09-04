import { DEFAULT_FEATURES, type FeatureKey } from '../features'
import { getNiche } from './registry'

/**
 * Precedence, lowest to highest:
 *   DEFAULT_FEATURES  ->  niche.featureDefaults  ->  stored (DB, superadmin's choice)  ->  niche.featureLocks
 *
 * The niche supplies *defaults*, not a lock — superadmin can always override by writing
 * the key explicitly. featureLocks is reserved for structural impossibilities (e.g. a
 * niche with no product/service catalog cannot render a POS), and wins over everything.
 */
export function resolveFeatures(
  nicheType: string | null | undefined,
  stored: Partial<Record<FeatureKey, boolean>> | null | undefined,
): Record<FeatureKey, boolean> {
  const niche = getNiche(nicheType)
  return {
    ...DEFAULT_FEATURES,
    ...niche.featureDefaults,
    ...(stored ?? {}),
    ...(niche.featureLocks ?? {}),
  } as Record<FeatureKey, boolean>
}

export const DEFAULT_TERMINOLOGY: Record<string, string> = {
  client: 'Cliente',
  clientPlural: 'Clientes',
  employee: 'Empleado',
  employeePlural: 'Empleados',
  service: 'Servicio',
  servicePlural: 'Servicios',
  appointment: 'Cita',
  appointmentPlural: 'Citas',
  staff: 'Personal',
  pet: 'Mascota',
  owner: 'Dueño',
  breed: 'Raza',
  weight: 'Peso',
  vaccines: 'Vacunas',
  history: 'Historia clínica',
  historyPlural: 'Historias clínicas',
  professional: 'Profesional',
  professionalPlural: 'Profesionales',
}

const PLURAL_TERMS: Array<[string, string]> = [
  ['client', 'clientPlural'],
  ['employee', 'employeePlural'],
  ['service', 'servicePlural'],
  ['appointment', 'appointmentPlural'],
  ['history', 'historyPlural'],
  ['professional', 'professionalPlural'],
]

function pluralizeTerm(term: string): string {
  if (/[zZ]$/.test(term)) return `${term.slice(0, -1)}ces`
  if (/[aeiouáéíóúAEIOUáéíóú]$/.test(term)) return `${term}s`
  if (/[sSxX]$/.test(term)) return term
  return `${term}es`
}

/**
 * Precedence, lowest to highest:
 *   DEFAULT_TERMINOLOGY  ->  niche.terminologyDefaults  ->  stored (businesses.terminology)
 *
 * No lock layer here — unlike features, there's no "structurally impossible" label override,
 * so a business can always rename any term in Configuración regardless of niche.
 */
export function resolveTerminology(
  nicheType: string | null | undefined,
  stored: Partial<Record<string, string>> | null | undefined,
): Record<string, string> {
  const niche = getNiche(nicheType)
  const resolved = {
    ...DEFAULT_TERMINOLOGY,
    ...niche.terminologyDefaults,
    ...(stored ?? {}),
  } as Record<string, string>

  // A custom singular term from Configuración should not leave the UI with the
  // plural from another niche unless the plural was explicitly customized too.
  for (const [singularKey, pluralKey] of PLURAL_TERMS) {
    const singularWasStored = stored?.[singularKey] !== undefined
    if (!stored?.[pluralKey] && (singularWasStored || !niche.terminologyDefaults?.[pluralKey])) {
      resolved[pluralKey] = pluralizeTerm(resolved[singularKey] ?? '')
    }
  }

  return resolved
}
