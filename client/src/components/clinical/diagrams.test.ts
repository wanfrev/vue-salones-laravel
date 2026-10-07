import { describe, it, expect } from 'vitest'
import {
  EDGE_STYLES, MAX_LINKS, MAX_PEOPLE, edgeStyle, emptyGenogram, fromFlow, genogramError, genogramSummary, hasLink, newLink, newPerson,
  nextFreePosition, removePerson, sameGenogram, setIndexPerson, toFlowEdges, toFlowNodes,
} from './genogram'
import {
  MAX_EVENTS, ageAt, chartLayout, lifeLineError, lifeLinePayload, lifeLineSummary, newEvent, sortEvents,
} from './lifeLine'
import type { GenogramData, GenogramEdgeKind, GenogramPerson, LifeEvent } from '../../types/database'

const person = (id: string, over: Partial<GenogramPerson> = {}): GenogramPerson => ({ id, x: 0, y: 0, kind: 'male', name: id, age: '', deceased: false, index: false, notes: '', ...over })

describe('genograma — personas y posiciones', () => {
  it('places new people on a free grid slot and never on top of each other', () => {
    const people: GenogramPerson[] = []
    for (let i = 0; i < 12; i++) people.push(newPerson('female', people))
    const spots = new Set(people.map(p => `${p.x},${p.y}`))
    expect(spots.size).toBe(12)
    expect(people[0]).toMatchObject({ x: 80, y: 80, kind: 'female', name: '', deceased: false, index: false })
    expect(new Set(people.map(p => p.id)).size).toBe(12)
  })

  it('reuses a slot freed by deleting a person', () => {
    const a = newPerson('male', [])
    const b = newPerson('male', [a])
    expect(nextFreePosition([b])).toEqual({ x: 80, y: 80 }) // el hueco de `a`
  })

  it('only one person can be the index patient', () => {
    const people = setIndexPerson([person('a', { index: true }), person('b'), person('c')], 'c')
    expect(people.map(p => p.index)).toEqual([false, false, true])
  })

  it('removing a person removes their links too — no dangling edges', () => {
    const data: GenogramData = {
      nodes: [person('a'), person('b'), person('c')],
      edges: [newLink('a', 'b', 'married'), newLink('b', 'c', 'parent'), newLink('a', 'c', 'parent')],
    }
    const out = removePerson(data, 'b')
    expect(out.nodes.map(n => n.id)).toEqual(['a', 'c'])
    expect(out.edges).toHaveLength(1)
    expect(out.edges[0]).toMatchObject({ source: 'a', target: 'c' })
  })

  it('detects an existing link of the same kind in either direction, but not another kind', () => {
    const edges = [newLink('a', 'b', 'married')]
    expect(hasLink(edges, 'a', 'b', 'married')).toBe(true)
    expect(hasLink(edges, 'b', 'a', 'married')).toBe(true)
    expect(hasLink(edges, 'a', 'b', 'conflict')).toBe(false)
    expect(hasLink(edges, 'a', 'c', 'married')).toBe(false)
  })
})

describe('genograma — validación', () => {
  it('accepts a normal drawing', () => {
    expect(genogramError({ nodes: [person('a'), person('b')], edges: [newLink('a', 'b', 'married')] })).toBeNull()
    expect(genogramError(emptyGenogram())).toBeNull()
  })

  it('rejects what the server would reject', () => {
    expect(genogramError({ nodes: Array.from({ length: MAX_PEOPLE + 1 }, (_, i) => person(`p${i}`)), edges: [] })).toContain(String(MAX_PEOPLE))
    const links = Array.from({ length: MAX_LINKS + 1 }, (_, i) => ({ id: `e${i}`, source: 'a', target: 'b', kind: 'partner' as const }))
    expect(genogramError({ nodes: [person('a'), person('b')], edges: links })).toContain(String(MAX_LINKS))
    expect(genogramError({ nodes: [person('a'), person('a')], edges: [] })).toContain('mismo identificador')
    expect(genogramError({ nodes: [person('a')], edges: [newLink('a', 'fantasma', 'parent')] })).toContain('no existen')
    expect(genogramError({ nodes: [person('a', { index: true }), person('b', { index: true })], edges: [] })).toContain('un paciente índice')
  })
})

describe('genograma — traducción a Vue Flow y de vuelta', () => {
  const data: GenogramData = {
    nodes: [person('a', { x: 10.26, y: 20, name: 'Padre', deceased: true }), person('b', { x: 200, y: 20, kind: 'female', index: true })],
    edges: [{ id: 'e1', source: 'a', target: 'b', kind: 'divorced' }],
  }

  it('round-trips without losing anything (positions rounded to one decimal)', () => {
    const back = fromFlow(toFlowNodes(data), toFlowEdges(data))
    expect(back.nodes[0]).toEqual({ ...data.nodes[0], x: 10.3 })
    expect(back.nodes[1]).toEqual(data.nodes[1])
    expect(back.edges).toEqual(data.edges)
  })

  it('draws each relationship kind with its own style and conventional mark', () => {
    const e = toFlowEdges(data)[0]
    expect(e.label).toBe('//')          // divorcio
    expect(e.type).toBe('smoothstep')
    expect(e.data.kind).toBe('divorced')
    expect(edgeStyle('conflict')).toMatchObject({ stroke: '#ef4444', strokeDasharray: '3 4' })
    expect(edgeStyle('married')).not.toHaveProperty('strokeDasharray')
    expect(toFlowEdges({ nodes: [], edges: [{ id: 'x', source: 'a', target: 'b', kind: 'parent' }] })[0]).not.toHaveProperty('label')
  })

  it('every relationship kind has a label and a distinct visual', () => {
    const kinds = Object.keys(EDGE_STYLES) as GenogramEdgeKind[]
    expect(kinds).toHaveLength(9)
    const visuals = kinds.map(k => `${EDGE_STYLES[k].stroke}|${EDGE_STYLES[k].width}|${EDGE_STYLES[k].dash ?? ''}|${EDGE_STYLES[k].mark}`)
    for (const k of kinds) expect(EDGE_STYLES[k].label).toBeTruthy()
    // separación y divorcio se distinguen solo por la marca (/ vs //), el resto por trazo
    expect(new Set(visuals).size).toBeGreaterThanOrEqual(8)
  })

  it('falls back safely for a missing kind coming back from the library', () => {
    const out = fromFlow([{ id: 'a', position: { x: 1, y: 2 }, data: { kind: 'male', name: 'x', age: '', deceased: false, index: false, notes: '' } }], [{ id: 'e', source: 'a', target: 'a' }])
    expect(out.edges[0].kind).toBe('partner')
  })

  it('sameGenogram ignores float noise and list order, but notices real changes', () => {
    const shuffled: GenogramData = { nodes: [...data.nodes].reverse().map(n => ({ ...n, x: n.x + 0.04 })), edges: data.edges }
    expect(sameGenogram(data, shuffled)).toBe(true)
    expect(sameGenogram(data, { ...data, nodes: [{ ...data.nodes[0], name: 'Otro' }, data.nodes[1]] })).toBe(false)
    expect(sameGenogram(data, { ...data, edges: [] })).toBe(false)
  })

  it('summary reads naturally', () => {
    expect(genogramSummary(emptyGenogram())).toBe('Sin personas todavía')
    expect(genogramSummary({ nodes: [person('a')], edges: [] })).toBe('1 persona · 0 vínculos')
    expect(genogramSummary(data)).toBe('2 personas · 1 vínculo')
  })
})

describe('línea de vida', () => {
  const ev = (year: number, valence: LifeEvent['valence'], title = 'x') => newEvent(year, { valence, title })

  it('sorts chronologically and keeps insertion order within the same year', () => {
    const a = ev(2010, 0, 'a'); const b = ev(1990, 0, 'b'); const c = ev(2010, 0, 'c')
    expect(sortEvents([a, b, c]).map(e => e.title)).toEqual(['b', 'a', 'c'])
  })

  it('computes the age at an event only with a believable birth year', () => {
    expect(ageAt(2010, 1990)).toBe(20)
    expect(ageAt(1980, 1990)).toBeNull()   // antes de nacer
    expect(ageAt(2200, 1990)).toBeNull()   // > 120
    expect(ageAt(2010, null)).toBeNull()
  })

  it('validates what the server validates', () => {
    expect(lifeLineError([ev(2000, 0, 'ok')])).toBeNull()
    expect(lifeLineError([ev(2000, 0, '   ')])).toContain('título')
    expect(lifeLineError([ev(1800, 0)])).toContain('1900')
    expect(lifeLineError([ev(2000.5, 0)])).toContain('año')
    expect(lifeLineError([newEvent(2000, { title: 'x', age: 130 })])).toContain('edad')
    expect(lifeLineError(Array.from({ length: MAX_EVENTS + 1 }, () => ev(2000, 0)))).toContain(String(MAX_EVENTS))
  })

  it('payload is trimmed and ordered', () => {
    const out = lifeLinePayload([newEvent(2010, { title: '  Mudanza ', note: ' n ' }), newEvent(1990, { title: 'Nacimiento' })])
    expect(out.events.map(e => e.title)).toEqual(['Nacimiento', 'Mudanza'])
    expect(out.events[1].note).toBe('n')
  })

  it('lays the chart out: time left→right, positive up, neutral on the baseline, everything inside the frame', () => {
    const layout = chartLayout([ev(1990, 2), ev(2000, 0), ev(2010, -2)], { width: 700, height: 300 })
    const [first, mid, last] = layout.points
    expect(first.x).toBeLessThan(mid.x)
    expect(mid.x).toBeLessThan(last.x)
    expect(first.y).toBeLessThan(mid.y)            // +2 arriba
    expect(mid.y).toBe(layout.baseline)             // 0 en el eje
    expect(last.y).toBeGreaterThan(mid.y)           // -2 abajo
    for (const p of layout.points) {
      expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(700)
      expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(300)
    }
  })

  it('does not divide by zero with one event or events in a single year, and handles none', () => {
    const one = chartLayout([ev(2000, 1)], { width: 700, height: 300 })
    expect(one.points[0].x).toBe(350)
    expect(Number.isFinite(one.points[0].y)).toBe(true)
    expect(chartLayout([ev(2000, 1), ev(2000, -1)]).points.every(p => Number.isFinite(p.x))).toBe(true)
    expect(chartLayout([])).toMatchObject({ points: [], ticks: [] })
  })

  it('axis ticks are sensible: yearly for short spans, coarser for long ones, always including the first year', () => {
    const short = chartLayout([ev(2000, 0), ev(2005, 0)]).ticks.map(t => t.year)
    expect(short).toEqual([2000, 2001, 2002, 2003, 2004, 2005])
    const long = chartLayout([ev(1962, 0), ev(2026, 0)]).ticks.map(t => t.year)
    expect(long[0]).toBe(1962)
    expect(long.length).toBeLessThanOrEqual(9)
  })

  it('summary reads naturally', () => {
    expect(lifeLineSummary([])).toBe('Sin eventos todavía')
    expect(lifeLineSummary([ev(2000, -1)])).toBe('1 evento · 1 negativo')
    expect(lifeLineSummary([ev(2000, 1), ev(2001, -2), ev(2002, -1)])).toBe('3 eventos · 2 negativos')
  })
})
