import type { NicheFieldConfig } from './types'

export const HAIR_TYPE_OPTIONS = [
  { value: 'liso', label: 'Liso' },
  { value: 'ondulado', label: 'Ondulado' },
  { value: 'rizado', label: 'Rizado' },
  { value: 'crespo', label: 'Crespo' },
]

export const BEARD_STYLE_OPTIONS = [
  { value: 'corta', label: 'Corta' },
  { value: 'media', label: 'Media' },
  { value: 'larga', label: 'Larga' },
  { value: 'candado', label: 'Candado' },
  { value: 'perilla', label: 'Perilla' },
  { value: 'sin_barba', label: 'Sin barba' },
]

export const FADE_OPTIONS = [
  { value: 'bajo', label: 'Fade bajo' },
  { value: 'medio', label: 'Fade medio' },
  { value: 'alto', label: 'Fade alto' },
  { value: 'skin', label: 'Skin fade' },
  { value: 'mid', label: 'Mid fade' },
  { value: 'taper', label: 'Taper' },
]

export const HAIR_LENGTH_OPTIONS = [
  { value: 'corto', label: 'Corto' },
  { value: 'medio', label: 'Medio' },
  { value: 'largo', label: 'Largo' },
  { value: 'extra_largo', label: 'Extra largo' },
]

export const SKIN_TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'seca', label: 'Seca' },
  { value: 'grasa', label: 'Grasa' },
  { value: 'mixta', label: 'Mixta' },
  { value: 'sensible', label: 'Sensible' },
]

export const MASSAGE_OPTIONS = [
  { value: 'relajante', label: 'Relajante' },
  { value: 'descontracturante', label: 'Descontracturante' },
  { value: 'piedras', label: 'Piedras calientes' },
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'linfatico', label: 'Drenaje linfático' },
  { value: 'aromatico', label: 'Aromaterapia' },
]

export const PET_FIELDS: NicheFieldConfig[] = [
  { key: 'pet_name', label: 'Mascota', type: 'input', required: true, terminologyKey: 'pet' },
  { key: 'pet_breed', label: 'Raza', type: 'input', terminologyKey: 'breed' },
  { key: 'pet_weight', label: 'Peso', type: 'input', terminologyKey: 'weight' },
  { key: 'pet_owner', label: 'Dueño', type: 'input', required: true, terminologyKey: 'owner' },
]

export const VET_EXTRA_FIELDS: NicheFieldConfig[] = [
  { key: 'last_vaccine', label: 'Última vacuna', type: 'date' },
  { key: 'last_checkup', label: 'Última revisión', type: 'date' },
  { key: 'medical_notes', label: 'Notas veterinarias', type: 'textarea', placeholder: 'Condiciones médicas, alergias, medicamentos...' },
]
