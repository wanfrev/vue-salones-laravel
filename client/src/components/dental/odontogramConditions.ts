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
  caries: '#ef4444',
  obturado: '#3b82f6',
  corona: '#eab308',
  ausente: '#94a3b8',
  extraccion_indicada: '#f97316',
  endodoncia: '#a855f7',
  sellante: '#14b8a6',
  implante: '#6366f1',
  puente: '#ec4899',
}

export const CONDITION_ORDER: DentalCondition[] = [
  'sano', 'caries', 'obturado', 'corona', 'ausente',
  'extraccion_indicada', 'endodoncia', 'sellante', 'implante', 'puente',
]
