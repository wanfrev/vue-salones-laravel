export type ServiceSort = 'recent' | 'times' | 'name'

export const SERVICE_SORT_OPTIONS: { value: ServiceSort; label: string }[] = [
  { value: 'recent', label: 'Más reciente' },
  { value: 'times', label: 'Más veces' },
  { value: 'name', label: 'Nombre (A–Z)' },
]

/** «1 vez» / «3 veces». */
export function visitsLabel(n: number): string {
  return `${n} ${n === 1 ? 'vez' : 'veces'}`
}
