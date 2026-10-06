import type { GenogramData, GenogramEdge, GenogramEdgeKind, GenogramPerson, GenogramPersonKind } from '../../types/database'

/**
 * Modelo del genograma, independiente de Vue Flow: lo que se guarda (cifrado) es `GenogramData`;
 * `toFlow*` / `fromFlow` lo traducen a nodos y aristas de la librería y de vuelta. Los límites
 * replican los del servidor (App\Services\Clinical\DiagramService).
 */

export const MAX_PEOPLE = 150
export const MAX_LINKS = 400

export const PERSON_KIND_LABELS: Record<GenogramPersonKind, string> = {
  male: 'Hombre',
  female: 'Mujer',
  other: 'Otro / no binario',
}

export interface EdgeKindStyle {
  label: string
  /** Texto corto sobre la línea (convención del genograma: / separación, // divorcio). */
  mark: string
  stroke: string
  width: number
  dash?: string
  hint: string
}

const BASE = 'var(--color-text-secondary, #64748b)'

export const EDGE_STYLES: Record<GenogramEdgeKind, EdgeKindStyle> = {
  parent: { label: 'Hijo/a (de)', mark: '', stroke: BASE, width: 1.5, hint: 'De un progenitor hacia su hijo/a.' },
  married: { label: 'Matrimonio', mark: '', stroke: BASE, width: 2.5, hint: 'Pareja casada o unión estable.' },
  partner: { label: 'Pareja / unión libre', mark: '', stroke: BASE, width: 1.5, dash: '7 5', hint: 'Convivencia o relación sin matrimonio.' },
  separated: { label: 'Separación', mark: '/', stroke: BASE, width: 2, hint: 'Pareja separada.' },
  divorced: { label: 'Divorcio', mark: '//', stroke: BASE, width: 2, hint: 'Pareja divorciada.' },
  close: { label: 'Vínculo cercano', mark: '', stroke: '#10b981', width: 4, hint: 'Relación muy estrecha.' },
  conflict: { label: 'Conflicto', mark: '', stroke: '#ef4444', width: 2, dash: '3 4', hint: 'Relación conflictiva u hostil.' },
  distant: { label: 'Vínculo distante', mark: '', stroke: '#94a3b8', width: 1.5, dash: '1 6', hint: 'Relación fría o distante.' },
  cutoff: { label: 'Cortado', mark: '✕', stroke: '#94a3b8', width: 1.5, dash: '8 4', hint: 'Sin contacto / ruptura de la relación.' },
}

export const EDGE_KIND_OPTIONS = (Object.keys(EDGE_STYLES) as GenogramEdgeKind[]).map(value => ({ value, label: EDGE_STYLES[value].label }))
export const PERSON_KIND_OPTIONS = (Object.keys(PERSON_KIND_LABELS) as GenogramPersonKind[]).map(value => ({ value, label: PERSON_KIND_LABELS[value] }))

export function newId(prefix = 'g'): string {
  const rand = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${rand}`
}

export const emptyGenogram = (): GenogramData => ({ nodes: [], edges: [] })

const GRID_X = 150
const GRID_Y = 170
const GRID_COLS = 5

/** Posición libre en una cuadrícula para una persona nueva (no se encima con las existentes). */
export function nextFreePosition(existing: ReadonlyArray<Pick<GenogramPerson, 'x' | 'y'>>): { x: number; y: number } {
  for (let slot = 0; slot < MAX_PEOPLE + 1; slot++) {
    const x = 80 + (slot % GRID_COLS) * GRID_X
    const y = 80 + Math.floor(slot / GRID_COLS) * GRID_Y
    if (!existing.some(p => Math.abs(p.x - x) < GRID_X / 2 && Math.abs(p.y - y) < GRID_Y / 2)) return { x, y }
  }
  return { x: 80, y: 80 }
}

export function newPerson(kind: GenogramPersonKind, existing: ReadonlyArray<GenogramPerson>, overrides: Partial<GenogramPerson> = {}): GenogramPerson {
  return {
    id: newId('p'),
    ...nextFreePosition(existing),
    kind,
    name: '',
    age: '',
    deceased: false,
    index: false,
    notes: '',
    ...overrides,
  }
}

/** Una persona solo puede ser el paciente índice a la vez: marcar una desmarca las demás. */
export function setIndexPerson(people: ReadonlyArray<GenogramPerson>, id: string): GenogramPerson[] {
  return people.map(p => ({ ...p, index: p.id === id }))
}

/** Quitar una persona se lleva sus vínculos (no deja aristas colgando). */
export function removePerson(data: GenogramData, id: string): GenogramData {
  return {
    nodes: data.nodes.filter(n => n.id !== id),
    edges: data.edges.filter(e => e.source !== id && e.target !== id),
  }
}

/** Evita duplicar el mismo vínculo (misma pareja, mismo tipo, en cualquier dirección). */
export function hasLink(edges: ReadonlyArray<GenogramEdge>, a: string, b: string, kind: GenogramEdgeKind): boolean {
  return edges.some(e => e.kind === kind && ((e.source === a && e.target === b) || (e.source === b && e.target === a)))
}

export function newLink(source: string, target: string, kind: GenogramEdgeKind): GenogramEdge {
  return { id: newId('e'), source, target, kind }
}

/** Texto de error si el dibujo no se puede guardar; null si es válido. */
export function genogramError(data: GenogramData): string | null {
  if (data.nodes.length > MAX_PEOPLE) return `El genograma admite hasta ${MAX_PEOPLE} personas.`
  if (data.edges.length > MAX_LINKS) return `El genograma admite hasta ${MAX_LINKS} vínculos.`
  if (new Set(data.nodes.map(n => n.id)).size !== data.nodes.length) return 'Hay personas con el mismo identificador.'
  const ids = new Set(data.nodes.map(n => n.id))
  if (data.edges.some(e => !ids.has(e.source) || !ids.has(e.target))) return 'Hay vínculos hacia personas que no existen.'
  if (data.nodes.filter(n => n.index).length > 1) return 'Solo puede haber un paciente índice.'
  return null
}

// ── Traducción hacia/desde Vue Flow ─────────────────────────────────────────────

export interface FlowNode {
  id: string
  type: 'person'
  position: { x: number; y: number }
  data: Omit<GenogramPerson, 'id' | 'x' | 'y'>
  /** Lo mantiene Vue Flow: la persona seleccionada en el lienzo. */
  selected?: boolean
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  type: 'smoothstep'
  label?: string
  style: Record<string, string | number>
  data: { kind: GenogramEdgeKind }
  selected?: boolean
}

export function toFlowNodes(data: GenogramData): FlowNode[] {
  return data.nodes.map(({ id, x, y, ...rest }) => ({ id, type: 'person' as const, position: { x, y }, data: rest }))
}

export function edgeStyle(kind: GenogramEdgeKind): Record<string, string | number> {
  const s = EDGE_STYLES[kind] ?? EDGE_STYLES.partner
  return { stroke: s.stroke, strokeWidth: s.width, ...(s.dash ? { strokeDasharray: s.dash } : {}) }
}

export function toFlowEdges(data: GenogramData): FlowEdge[] {
  return data.edges.map(e => {
    const s = EDGE_STYLES[e.kind] ?? EDGE_STYLES.partner
    return {
      id: e.id, source: e.source, target: e.target, type: 'smoothstep' as const,
      ...(s.mark ? { label: s.mark } : {}),
      style: edgeStyle(e.kind),
      data: { kind: e.kind },
    }
  })
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function fromFlow(
  nodes: ReadonlyArray<{ id: string; position: { x: number; y: number }; data: Omit<GenogramPerson, 'id' | 'x' | 'y'> }>,
  edges: ReadonlyArray<{ id: string; source: string; target: string; data?: { kind?: GenogramEdgeKind } }>,
): GenogramData {
  return {
    nodes: nodes.map(n => ({
      id: n.id,
      x: round1(n.position.x),
      y: round1(n.position.y),
      kind: n.data.kind,
      name: n.data.name ?? '',
      age: n.data.age ?? '',
      deceased: !!n.data.deceased,
      index: !!n.data.index,
      notes: n.data.notes ?? '',
    })),
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, kind: e.data?.kind ?? 'partner' })),
  }
}

/** Compara dos dibujos ignorando ruido de coma flotante y el orden de las listas (para saber si hay cambios sin guardar). */
export function sameGenogram(a: GenogramData, b: GenogramData): boolean {
  const norm = (d: GenogramData) => JSON.stringify({
    n: [...d.nodes].sort((p, q) => p.id.localeCompare(q.id)).map(p => ({ ...p, x: round1(p.x), y: round1(p.y) })),
    e: [...d.edges].sort((p, q) => p.id.localeCompare(q.id)),
  })
  return norm(a) === norm(b)
}

export function genogramSummary(data: GenogramData): string {
  const people = data.nodes.length
  if (people === 0) return 'Sin personas todavía'
  const links = data.edges.length
  return `${people} persona${people === 1 ? '' : 's'} · ${links} vínculo${links === 1 ? '' : 's'}`
}
