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

const HAIR_TYPE_OPTIONS = [
  { value: 'liso', label: 'Liso' },
  { value: 'ondulado', label: 'Ondulado' },
  { value: 'rizado', label: 'Rizado' },
  { value: 'crespo', label: 'Crespo' },
]

const BEARD_STYLE_OPTIONS = [
  { value: 'corta', label: 'Corta' },
  { value: 'media', label: 'Media' },
  { value: 'larga', label: 'Larga' },
  { value: 'candado', label: 'Candado' },
  { value: 'perilla', label: 'Perilla' },
  { value: 'sin_barba', label: 'Sin barba' },
]

const FADE_OPTIONS = [
  { value: 'bajo', label: 'Fade bajo' },
  { value: 'medio', label: 'Fade medio' },
  { value: 'alto', label: 'Fade alto' },
  { value: 'skin', label: 'Skin fade' },
  { value: 'mid', label: 'Mid fade' },
  { value: 'taper', label: 'Taper' },
]

const HAIR_LENGTH_OPTIONS = [
  { value: 'corto', label: 'Corto' },
  { value: 'medio', label: 'Medio' },
  { value: 'largo', label: 'Largo' },
  { value: 'extra_largo', label: 'Extra largo' },
]

const SKIN_TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'seca', label: 'Seca' },
  { value: 'grasa', label: 'Grasa' },
  { value: 'mixta', label: 'Mixta' },
  { value: 'sensible', label: 'Sensible' },
]

const MASSAGE_OPTIONS = [
  { value: 'relajante', label: 'Relajante' },
  { value: 'descontracturante', label: 'Descontracturante' },
  { value: 'piedras', label: 'Piedras calientes' },
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'linfatico', label: 'Drenaje linfático' },
  { value: 'aromatico', label: 'Aromaterapia' },
]

const PET_FIELDS: NicheFieldConfig[] = [
  { key: 'pet_name', label: 'Mascota', type: 'input', required: true, terminologyKey: 'pet' },
  { key: 'pet_breed', label: 'Raza', type: 'input', terminologyKey: 'breed' },
  { key: 'pet_weight', label: 'Peso', type: 'input', terminologyKey: 'weight' },
  { key: 'pet_owner', label: 'Dueño', type: 'input', required: true, terminologyKey: 'owner' },
]

const VET_EXTRA_FIELDS: NicheFieldConfig[] = [
  { key: 'last_vaccine', label: 'Última vacuna', type: 'date' },
  { key: 'last_checkup', label: 'Última revisión', type: 'date' },
  { key: 'medical_notes', label: 'Notas veterinarias', type: 'textarea', placeholder: 'Condiciones médicas, alergias, medicamentos...' },
]

export const NICHE_FIELDS: Record<string, NicheConfig> = {
  barberia: {
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
  salon: {
    sectionTitle: 'Perfil capilar',
    fields: [
      { key: 'hair_type', label: 'Tipo de cabello', type: 'select', options: HAIR_TYPE_OPTIONS },
      { key: 'hair_length', label: 'Largo del cabello', type: 'select', options: HAIR_LENGTH_OPTIONS },
      { key: 'chemical_history', label: 'Historial de químicos', type: 'textarea', placeholder: 'Tintes, alisados, decoloraciones recientes...' },
    ],
  },
  spa: {
    sectionTitle: 'Perfil de bienestar',
    fields: [
      { key: 'skin_type', label: 'Tipo de piel', type: 'select', options: SKIN_TYPE_OPTIONS },
      { key: 'massage_preference', label: 'Preferencia de masaje', type: 'select', options: MASSAGE_OPTIONS },
      { key: 'allergies', label: 'Alergias o contraindicaciones', type: 'textarea', placeholder: 'Aceites esenciales, fragancias, condiciones médicas...' },
    ],
  },
  spa_perros: {
    sectionTitle: 'Mascotas',
    fields: [...PET_FIELDS],
    listType: 'petList',
  },
  dog_spa: {
    sectionTitle: 'Mascotas',
    fields: [...PET_FIELDS],
    listType: 'petList',
  },
  vet: {
    sectionTitle: 'Mascotas',
    fields: [...PET_FIELDS, ...VET_EXTRA_FIELDS],
    listType: 'petList',
  },
  mixto: {
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
}

export function getNicheConfig(nicheType: string): NicheConfig | null {
  return NICHE_FIELDS[nicheType] ?? null
}

export const PET_NICHE_TYPES = ['spa_perros', 'dog_spa', 'vet']
export function isPetNiche(nicheType: string): boolean {
  return PET_NICHE_TYPES.includes(nicheType)
}

export function isVetNiche(nicheType: string): boolean {
  return nicheType === 'vet'
}
