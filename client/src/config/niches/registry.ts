import type { NicheDefinition } from './types'
import {
  HAIR_TYPE_OPTIONS, BEARD_STYLE_OPTIONS, FADE_OPTIONS, HAIR_LENGTH_OPTIONS,
  SKIN_TYPE_OPTIONS, MASSAGE_OPTIONS, PET_FIELDS,
} from './fieldOptions'

export const NICHES: Record<string, NicheDefinition> = {
  salon: {
    id: 'salon',
    label: 'Salón de belleza',
    status: 'creatable',
    clientProfile: {
      sectionTitle: 'Perfil capilar',
      fields: [
        { key: 'hair_type', label: 'Tipo de cabello', type: 'select', options: HAIR_TYPE_OPTIONS },
        { key: 'hair_length', label: 'Largo del cabello', type: 'select', options: HAIR_LENGTH_OPTIONS },
        { key: 'chemical_history', label: 'Historial de químicos', type: 'textarea', placeholder: 'Tintes, alisados, decoloraciones recientes...' },
      ],
    },
    capabilities: [],
    featureDefaults: {},
  },
  barberia: {
    id: 'barberia',
    label: 'Barbería',
    status: 'creatable',
    clientProfile: {
      sectionTitle: 'Perfil de Cabello',
      fields: [
        { key: 'hair_type', label: 'Tipo de cabello', type: 'select', options: HAIR_TYPE_OPTIONS },
        { key: 'products_used', label: 'Productos que usa', type: 'input', placeholder: 'Ej: Pomada, cera, aceite' },
        {
          key: 'beard_style', label: 'Estilo de barba', type: 'select', options: BEARD_STYLE_OPTIONS,
          collapsibleGroup: 'barber_extra', collapsibleGroupLabel: 'Agregar estilo de barba y fade',
        },
        {
          key: 'fade_preference', label: 'Preferencia de fade', type: 'select', options: FADE_OPTIONS,
          collapsibleGroup: 'barber_extra',
        },
        { key: 'notes', label: 'Preferencias del Cliente', type: 'textarea', placeholder: 'Indicaciones específicas del corte...' },
      ],
    },
    capabilities: [],
    featureDefaults: {},
  },
  spa: {
    id: 'spa',
    label: 'Spa',
    status: 'creatable',
    clientProfile: {
      sectionTitle: 'Perfil de bienestar',
      fields: [
        { key: 'skin_type', label: 'Tipo de piel', type: 'select', options: SKIN_TYPE_OPTIONS },
        { key: 'massage_preference', label: 'Preferencia de masaje', type: 'select', options: MASSAGE_OPTIONS },
        { key: 'allergies', label: 'Alergias o contraindicaciones', type: 'textarea', placeholder: 'Aceites esenciales, fragancias, condiciones médicas...' },
      ],
    },
    capabilities: [],
    featureDefaults: {},
  },
  mixto: {
    id: 'mixto',
    label: 'Mixto (Barbería + Salón + Spa)',
    status: 'creatable',
    clientProfile: {
      sectionTitle: 'Perfil del Cliente',
      fields: [
        { key: 'hair_type', label: 'Tipo de cabello', type: 'select', options: HAIR_TYPE_OPTIONS },
        { key: 'hair_length', label: 'Largo del cabello', type: 'select', options: HAIR_LENGTH_OPTIONS },
        { key: 'products_used', label: 'Productos que usa', type: 'input', placeholder: 'Ej: Pomada, cera, aceite, shampoo' },
        {
          key: 'beard_style', label: 'Estilo de barba', type: 'select', options: BEARD_STYLE_OPTIONS,
          collapsibleGroup: 'barber_extra', collapsibleGroupLabel: 'Agregar estilo de barba y fade',
        },
        {
          key: 'fade_preference', label: 'Preferencia de fade', type: 'select', options: FADE_OPTIONS,
          collapsibleGroup: 'barber_extra',
        },
        { key: 'chemical_history', label: 'Historial de químicos', type: 'textarea', placeholder: 'Tintes, alisados, decoloraciones recientes...' },
        { key: 'skin_type', label: 'Tipo de piel', type: 'select', options: SKIN_TYPE_OPTIONS },
        { key: 'massage_preference', label: 'Preferencia de masaje', type: 'select', options: MASSAGE_OPTIONS },
        { key: 'allergies', label: 'Alergias o contraindicaciones', type: 'textarea', placeholder: 'Aceites esenciales, fragancias, condiciones médicas...' },
        { key: 'notes', label: 'Preferencias del Cliente', type: 'textarea', placeholder: 'Indicaciones específicas del corte, peinado o tratamiento...' },
      ],
    },
    capabilities: [],
    featureDefaults: {},
  },
  dog_spa: {
    id: 'dog_spa',
    label: 'Spa canino / Veterinaria',
    status: 'creatable',
    clientProfile: {
      sectionTitle: 'Mascotas',
      fields: [...PET_FIELDS],
      listType: 'petList',
    },
    capabilities: ['clients.pets'],
    featureDefaults: {},
  },
  // No NICHE_FIELDS entry existed for these three before the registry — clientProfile: null
  // preserves that (getNicheConfig() returned null, so no niche section rendered).
  vet: {
    id: 'vet',
    label: 'Veterinaria',
    status: 'creatable',
    clientProfile: null,
    capabilities: ['clients.pets', 'clients.medical'],
    featureDefaults: {},
  },
  nail_bar: {
    id: 'nail_bar',
    label: 'Barra de uñas',
    status: 'creatable',
    clientProfile: null,
    capabilities: [],
    featureDefaults: {},
  },
  centro_estetico: {
    id: 'centro_estetico',
    label: 'Centro estético',
    status: 'creatable',
    clientProfile: null,
    capabilities: [],
    featureDefaults: {},
  },
}

export const UNKNOWN_NICHE: NicheDefinition = {
  id: '__unknown__',
  label: 'Sin configurar',
  status: 'legacy',
  clientProfile: null,
  capabilities: [],
  featureDefaults: {},
}

/** Never throws, never returns null/undefined — an unregistered id resolves to zero capabilities and zero defaults, i.e. today's behaviour for free-text niches. */
export function getNiche(nicheType?: string | null): NicheDefinition {
  if (!nicheType) return UNKNOWN_NICHE
  return NICHES[nicheType] ?? UNKNOWN_NICHE
}

export function creatableNiches(): NicheDefinition[] {
  return Object.values(NICHES).filter(n => n.status === 'creatable')
}

export function creatableIds(): string[] {
  return creatableNiches().map(n => n.id)
}
