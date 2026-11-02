/**
 * Filtros, orden y búsqueda del directorio de clientes — TypeScript puro, sin Vue.
 *
 * Segmentos (excluyentes entre sí, salvo «all»):
 *   active   vino en los últimos N días
 *   inactive tiene visitas, pero la última fue hace más de N días
 *   never    nunca tuvo una visita atendida
 *   new      se registró en los últimos NEW_CLIENT_DAYS días
 * «Visita» = lo que el servidor devuelve como lastVisit (cita atendida que ya pasó o venta directa);
 * un cliente sin ninguna llega con 'Sin visitas'.
 */
import type { Cliente } from '../../types/cliente'

export type ClientSegment = 'all' | 'active' | 'inactive' | 'never' | 'new'
export type ClientSort = 'recent' | 'oldest' | 'name' | 'lastVisit' | 'visits'

/**
 * Filtro por producto o servicio (solo administración): «did» = lo compraron o se lo hicieron en el último año;
 * «lapsed» = lo hicieron alguna vez en el último año, pero la última vez fue hace más de N días (ya les toca).
 */
export type ItemMode = 'did' | 'lapsed'

/** Lo que el servidor sabe de una cliente respecto a lo buscado (producto o servicio). */
export interface ClientItemMatch {
  client_id: string
  last_at: string | null
  first_at: string | null
  times: number
  last_item: string | null
}

/** Con menos letras casi todo coincidiría: el filtro no se activa hasta tener estas. */
export const ITEM_MIN_CHARS = 2

export interface ClientFilterState {
  search: string
  segment: ClientSegment
  /** Ventana en días para «activos» e «inactivos». */
  windowDays: number
  sort: ClientSort
  /** Producto o servicio buscado (ya sin esperas de escritura). */
  item: string
  itemMode: ItemMode
  /** Días sin volver a lo buscado, para el modo «lapsed». */
  itemDays: number
}

export const WINDOW_OPTIONS = [30, 60, 90, 180] as const
export const NEW_CLIENT_DAYS = 30

export const DEFAULT_FILTERS: ClientFilterState = { search: '', segment: 'all', windowDays: 30, sort: 'recent', item: '', itemMode: 'did', itemDays: 60 }

export const SORT_OPTIONS: { value: ClientSort; label: string }[] = [
  // Etiquetas cortas: el selector mide ~140 px en móvil. «Más nuevos» = fecha de registro.
  { value: 'recent', label: 'Más nuevos' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'name', label: 'Nombre A-Z' },
  { value: 'lastVisit', label: 'Última visita' },
  { value: 'visits', label: 'Más visitas' },
]

const DAY_MS = 86_400_000

/** "2026-10-05" -> Date local a medianoche. */
function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/** La fecha de la última visita, o null si el cliente nunca tuvo una. */
export function visitDay(client: Pick<Cliente, 'lastVisit'>): string | null {
  const v = client.lastVisit
  return v && v !== 'Sin visitas' && parseDay(v) ? v.slice(0, 10) : null
}

/** Días completos entre una fecha y hoy (0 = hoy). null si la fecha no es válida. */
export function daysSince(day: string, today: Date): number | null {
  const d = parseDay(day)
  if (!d) return null
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((t.getTime() - d.getTime()) / DAY_MS)
}

export function matchesSegment(client: Cliente, segment: ClientSegment, windowDays: number, today: Date): boolean {
  if (segment === 'all') return true
  if (segment === 'new') {
    const age = client.joinDate ? daysSince(client.joinDate, today) : null
    return age !== null && age <= NEW_CLIENT_DAYS
  }
  const last = visitDay(client)
  if (segment === 'never') return last === null
  if (last === null) return false
  const ago = daysSince(last, today)
  if (ago === null) return false
  return segment === 'active' ? ago <= windowDays : ago > windowDays
}

/** Sin mayúsculas ni acentos: «María» y «maria» coinciden. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const digitsOf = (value: string) => value.replace(/\D/g, '')

/** Busca por nombre, correo, código, documento y teléfono (el teléfono ignora +, espacios y guiones). */
export function matchesSearch(client: Cliente, query: string): boolean {
  const q = normalizeText(query)
  if (!q) return true
  const text = [client.name, client.email, client.code, client.documentId]
  if (text.some(t => t && normalizeText(t).includes(q))) return true
  const qDigits = digitsOf(q)
  return qDigits.length >= 3 && digitsOf(client.phone ?? '').includes(qDigits)
}

export function isItemActive(state: Pick<ClientFilterState, 'item'>): boolean {
  return state.item.trim().length >= ITEM_MIN_CHARS
}

/** Día local (YYYY-MM-DD) de un instante ISO del servidor (las fechas llegan en UTC). */
function localDay(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Cuántos días hace que la cliente hizo o compró lo buscado por última vez (null si no se sabe). */
export function daysSinceItem(match: Pick<ClientItemMatch, 'last_at'>, today: Date): number | null {
  const day = localDay(match.last_at)
  return day ? daysSince(day, today) : null
}

/** ¿La cliente cumple el filtro de producto o servicio? Sin coincidencia en el servidor, no. */
export function matchesItem(match: ClientItemMatch | undefined, state: Pick<ClientFilterState, 'itemMode' | 'itemDays'>, today: Date): boolean {
  if (!match) return false
  if (state.itemMode === 'did') return true
  const ago = daysSinceItem(match, today)
  return ago !== null && ago > state.itemDays
}

/** «Tinte · hace 12 días · 3 veces»: qué fue lo último que hizo o compró, cuándo y cuántas veces. */
export function itemInfoLine(match: ClientItemMatch, today: Date = new Date()): string {
  const parts: string[] = []
  if (match.last_item) parts.push(match.last_item)
  const when = relativeVisit(localDay(match.last_at), today)
  if (when) parts.push(when)
  parts.push(`${match.times} ${match.times === 1 ? 'vez' : 'veces'}`)
  return parts.join(' · ')
}

const byName = (a: Cliente, b: Cliente) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })

export function sortClients(clients: Cliente[], sort: ClientSort): Cliente[] {
  const join = (c: Cliente) => c.joinDate ?? ''
  const sorted = [...clients]
  switch (sort) {
    case 'name':
      return sorted.sort(byName)
    case 'oldest':
      return sorted.sort((a, b) => join(a).localeCompare(join(b)) || byName(a, b))
    case 'lastVisit':
      // Con visita primero (la más reciente arriba); los que nunca vinieron, al final.
      return sorted.sort((a, b) => {
        const va = visitDay(a)
        const vb = visitDay(b)
        if (va && vb) return vb.localeCompare(va) || byName(a, b)
        if (va) return -1
        if (vb) return 1
        return byName(a, b)
      })
    case 'visits':
      return sorted.sort((a, b) => (b.totalAppointments ?? 0) - (a.totalAppointments ?? 0) || byName(a, b))
    case 'recent':
    default:
      return sorted.sort((a, b) => join(b).localeCompare(join(a)) || byName(a, b))
  }
}

/**
 * Filtra y ordena el directorio. `itemMatches` son las coincidencias que devolvió el servidor para el producto o
 * servicio buscado; mientras el filtro está activo y todavía no llegan (`null`), no se muestra nadie en vez de
 * mostrar la lista completa como si el filtro no existiera.
 */
export function filterAndSortClients(
  clients: Cliente[],
  state: ClientFilterState,
  today: Date = new Date(),
  itemMatches: ReadonlyMap<string, ClientItemMatch> | null = null,
): Cliente[] {
  const byItem = isItemActive(state)
  const filtered = clients.filter(c =>
    matchesSearch(c, state.search)
    && matchesSegment(c, state.segment, state.windowDays, today)
    && (!byItem || matchesItem(itemMatches?.get(c.id), state, today)))
  return sortClients(filtered, state.sort)
}

/** Cuántos clientes tiene cada segmento (la búsqueda no los recorta: son los números de las pestañas). */
export function segmentCounts(clients: Cliente[], windowDays: number, today: Date = new Date()): Record<ClientSegment, number> {
  const counts: Record<ClientSegment, number> = { all: clients.length, active: 0, inactive: 0, never: 0, new: 0 }
  for (const c of clients) {
    if (matchesSegment(c, 'active', windowDays, today)) counts.active++
    else if (matchesSegment(c, 'inactive', windowDays, today)) counts.inactive++
    if (matchesSegment(c, 'never', windowDays, today)) counts.never++
    if (matchesSegment(c, 'new', windowDays, today)) counts.new++
  }
  return counts
}

/** ¿Hay algo distinto de los valores por defecto? (el orden solo no cuenta como filtro) */
export function isFiltered(state: ClientFilterState): boolean {
  return state.search.trim() !== '' || state.segment !== 'all' || isItemActive(state)
}

/** "hoy", "ayer", "hace 5 días", "hace 3 meses", "hace 1 año". Vacío si no hay visita. */
export function relativeVisit(day: string | null, today: Date = new Date()): string {
  if (!day) return ''
  const ago = daysSince(day, today)
  if (ago === null || ago < 0) return ''
  if (ago === 0) return 'hoy'
  if (ago === 1) return 'ayer'
  if (ago < 30) return `hace ${ago} días`
  if (ago < 365) {
    const months = Math.floor(ago / 30)
    return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`
  }
  const years = Math.floor(ago / 365)
  return `hace ${years} ${years === 1 ? 'año' : 'años'}`
}
