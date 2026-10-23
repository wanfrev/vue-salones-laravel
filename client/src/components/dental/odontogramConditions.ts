import type { DentalCondition } from '../../types/database'

export const CONDITION_LABELS: Record<DentalCondition, string> = {
  sano: 'Sano',
  caries: 'Caries',
  obturado: 'Obturado / Resina',
  corona: 'Corona',
  ausente: 'Ausente',
  extraccion_indicada: 'Extracción indicada',
  endodoncia: 'Endodoncia',
  sellante: 'Sellante',
  implante: 'Implante',
  puente: 'Puente',
}

export const CONDITION_COLORS: Record<DentalCondition, string> = {
  sano: '#f1f5f9',
  caries: '#c0504a',
  obturado: '#5b82b8',
  corona: '#c9a227',
  ausente: '#94a3b8',
  extraccion_indicada: '#cf7a3c',
  endodoncia: '#8b6bb0',
  sellante: '#3f9a93',
  implante: '#6a70b3',
  puente: '#bf5a8a',
}

export const CONDITION_ORDER: DentalCondition[] = [
  'sano', 'caries', 'obturado', 'corona', 'ausente',
  'extraccion_indicada', 'endodoncia', 'sellante', 'implante', 'puente',
]
