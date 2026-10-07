import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'

const s = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { diagram: ref<unknown>(null), falsy: ref(false), save: vi.fn(), pending: ref(false) }
})

vi.mock('../../composables/clinical/useDiagram', () => ({
  useDiagram: () => ({ diagram: s.diagram, isLoading: s.falsy, saveMutation: { isPending: s.pending, mutateAsync: s.save } }),
}))

import GenogramEditor from './GenogramEditor.vue'
import { PERSON_KIND_LABELS } from './genogram'
import type { GenogramData, GenogramPerson } from '../../types/database'

// Vue Flow necesita un DOM real (medidas, ResizeObserver…). Este doble respeta el contrato que usa el editor:
// recibe nodes/edges por v-model y emite `connect`; la selección se simula emitiendo update:nodes con selected.
const FlowStub = defineComponent({
  name: 'VueFlow',
  props: ['nodes', 'edges'],
  emits: ['update:nodes', 'update:edges', 'connect'],
  template: '<div data-testid="flow"><span v-for="n in nodes" :key="n.id" class="person" :data-id="n.id">{{ n.data.name }}</span></div>',
})
const NodeStub = defineComponent({ template: '<i />' })

const mountEditor = () => mount(GenogramEditor, {
  props: { scope: { kind: 'client' as const, id: 'c1' } },
  global: { stubs: { VueFlow: FlowStub, GenogramPersonNode: NodeStub } },
})

const person = (id: string, over: Partial<GenogramPerson> = {}): GenogramPerson => ({ id, x: 100, y: 100, kind: 'male', name: id, age: '', deceased: false, index: false, notes: '', ...over })
const saved = (data: GenogramData) => ({ id: 'd1', type: 'genogram', client_id: 'c1', case_id: null, data, updated_at: '' })
const btn = (w: ReturnType<typeof mount>, text: string) => {
  const b = w.findAll('button').find(x => x.text().includes(text))
  if (!b) throw new Error(`No hay botón «${text}»`)
  return b
}
const flow = (w: ReturnType<typeof mount>) => w.findComponent(FlowStub)
const nodesOf = (w: ReturnType<typeof mount>) => flow(w).props('nodes') as Array<{ id: string; position: { x: number; y: number }; data: Record<string, any>; selected?: boolean }>
const edgesOf = (w: ReturnType<typeof mount>) => flow(w).props('edges') as Array<{ id: string; source: string; target: string; label?: string; data: { kind: string } }>
const select = async (w: ReturnType<typeof mount>, id: string) => {
  flow(w).vm.$emit('update:nodes', nodesOf(w).map(n => ({ ...n, selected: n.id === id })))
  await flushPromises()
}

beforeEach(() => {
  s.diagram.value = null
  s.save.mockReset()
})

describe('GenogramEditor', () => {
  it('starts empty: a guide, no people and nothing to save', () => {
    const w = mountEditor()
    expect(w.text()).toContain('Sin personas todavía')
    expect(w.text()).toContain('Cómo se usa')
    expect(btn(w, 'Guardar genograma').attributes('disabled')).toBeDefined()
  })

  it('offers every genogram person type and every relationship kind', () => {
    const w = mountEditor()
    for (const label of Object.values(PERSON_KIND_LABELS)) expect(w.text()).toContain(`+ ${label}`)
    const kinds = w.findAll('select')[0].findAll('option').map(o => o.text())
    expect(kinds).toEqual(expect.arrayContaining(['Matrimonio', 'Divorcio', 'Conflicto', 'Vínculo cercano', 'Hijo/a (de)']))
  })

  it('the first person added is the index patient named "Paciente"; later ones are not', async () => {
    const w = mountEditor()
    await btn(w, '+ Mujer').trigger('click')
    await btn(w, '+ Hombre').trigger('click')

    const [first, second] = nodesOf(w)
    expect(first.data).toMatchObject({ kind: 'female', name: 'Paciente', index: true })
    expect(second.data).toMatchObject({ kind: 'male', name: '', index: false })
    expect(w.text()).toContain('2 personas · 0 vínculos')
    expect(w.text()).toContain('Cambios sin guardar')
  })

  it('new people never land on top of each other', async () => {
    const w = mountEditor()
    for (let i = 0; i < 8; i++) await btn(w, '+ Otro').trigger('click')
    const spots = new Set(nodesOf(w).map(n => `${n.position.x},${n.position.y}`))
    expect(spots.size).toBe(8)
  })

  it('selecting a person opens the editing panel; typing a name updates the drawing', async () => {
    s.diagram.value = saved({ nodes: [person('a', { name: 'Padre' }), person('b', { name: 'Madre', kind: 'female', x: 300 })], edges: [] })
    const w = mountEditor()
    expect(w.text()).not.toContain('Fallecido(a)') // sin selección: panel de ayuda

    await select(w, 'a')
    expect(w.text()).toContain('Fallecido(a)')
    const name = w.find('input[type="text"], input:not([type])')
    await name.setValue('Papá Luis')

    expect(nodesOf(w).find(n => n.id === 'a')!.data.name).toBe('Papá Luis')
    expect(nodesOf(w).find(n => n.id === 'b')!.data.name).toBe('Madre') // la otra persona no cambia
    expect(w.text()).toContain('Cambios sin guardar')
  })

  it('only one person can be the index patient: marking another unmarks the first', async () => {
    s.diagram.value = saved({ nodes: [person('a', { index: true }), person('b', { x: 300 })], edges: [] })
    const w = mountEditor()
    await select(w, 'b')

    const toggle = w.findAll('[role="switch"]').at(-1)!
    await toggle.trigger('click')

    expect(nodesOf(w).map(n => [n.id, n.data.index])).toEqual([['a', false], ['b', true]])
    expect(nodesOf(w).find(n => n.id === 'b')!.selected).toBe(true) // la selección se conserva
  })

  it('connecting two people creates the chosen kind of link with its mark; duplicates and self-links are ignored', async () => {
    s.diagram.value = saved({ nodes: [person('a'), person('b', { x: 300 })], edges: [] })
    const w = mountEditor()
    await w.findAll('select')[0].setValue('divorced')

    flow(w).vm.$emit('connect', { source: 'a', target: 'b' })
    await flushPromises()
    expect(edgesOf(w)).toHaveLength(1)
    expect(edgesOf(w)[0]).toMatchObject({ source: 'a', target: 'b', label: '//', data: { kind: 'divorced' } })

    flow(w).vm.$emit('connect', { source: 'b', target: 'a' })   // mismo vínculo, otra dirección
    flow(w).vm.$emit('connect', { source: 'a', target: 'a' })   // a sí misma
    flow(w).vm.$emit('connect', { source: 'a', target: null })  // incompleto
    await flushPromises()
    expect(edgesOf(w)).toHaveLength(1)

    await w.findAll('select')[0].setValue('conflict')            // otro tipo entre las mismas dos sí se permite
    flow(w).vm.$emit('connect', { source: 'a', target: 'b' })
    await flushPromises()
    expect(edgesOf(w).map(e => e.data.kind)).toEqual(['divorced', 'conflict'])
  })

  it('removing a person removes their links as well', async () => {
    s.diagram.value = saved({
      nodes: [person('a'), person('b', { x: 300 }), person('c', { x: 500 })],
      edges: [{ id: 'e1', source: 'a', target: 'b', kind: 'married' }, { id: 'e2', source: 'b', target: 'c', kind: 'parent' }, { id: 'e3', source: 'a', target: 'c', kind: 'parent' }],
    })
    const w = mountEditor()
    await select(w, 'b')
    await btn(w, 'Quitar persona').trigger('click')

    expect(nodesOf(w).map(n => n.id)).toEqual(['a', 'c'])
    expect(edgesOf(w).map(e => e.id)).toEqual(['e3'])
  })

  it('a link can be re-typed from the panel and deleted', async () => {
    s.diagram.value = saved({ nodes: [person('a'), person('b', { x: 300 })], edges: [{ id: 'e1', source: 'a', target: 'b', kind: 'married' }] })
    const w = mountEditor()
    flow(w).vm.$emit('update:edges', edgesOf(w).map(e => ({ ...e, selected: true })))
    await flushPromises()
    expect(w.text()).toContain('Vínculo')

    await w.findAll('select').at(-1)!.setValue('separated')
    expect(edgesOf(w)[0]).toMatchObject({ label: '/', data: { kind: 'separated' } })

    await btn(w, 'Quitar vínculo').trigger('click')
    expect(edgesOf(w)).toHaveLength(0)
  })

  it('saves exactly what is drawn and then shows no pending changes', async () => {
    const w = mountEditor()
    await btn(w, '+ Hombre').trigger('click')
    await btn(w, '+ Mujer').trigger('click')
    const [a, b] = nodesOf(w)
    flow(w).vm.$emit('connect', { source: a.id, target: b.id })
    await flushPromises()

    s.save.mockImplementation(async (data: GenogramData) => saved(data))
    await btn(w, 'Guardar genograma').trigger('click')
    await flushPromises()

    const [sent] = s.save.mock.calls[0] as [GenogramData]
    expect(sent.nodes.map(n => n.kind)).toEqual(['male', 'female'])
    expect(sent.edges).toHaveLength(1)
    expect(sent.edges[0]).toMatchObject({ source: a.id, target: b.id })
    expect(w.text()).not.toContain('Cambios sin guardar')
    expect(btn(w, 'Guardar genograma').attributes('disabled')).toBeDefined()
  })

  it('a failed save keeps the drawing and the unsaved warning (no data loss)', async () => {
    const w = mountEditor()
    await btn(w, '+ Hombre').trigger('click')
    s.save.mockRejectedValueOnce(new Error('falló'))
    await btn(w, 'Guardar genograma').trigger('click')
    await flushPromises()

    expect(nodesOf(w)).toHaveLength(1)
    expect(w.text()).toContain('Cambios sin guardar')
  })

  it('a background refetch never overwrites unsaved edits, but does refresh a clean editor', async () => {
    s.diagram.value = saved({ nodes: [person('a', { name: 'Original' })], edges: [] })
    const w = mountEditor()
    expect(nodesOf(w)[0].data.name).toBe('Original')

    s.diagram.value = saved({ nodes: [person('a', { name: 'Cambio de otro usuario' })], edges: [] })
    await flushPromises()
    expect(nodesOf(w)[0].data.name).toBe('Cambio de otro usuario') // editor limpio: se actualiza

    await btn(w, '+ Mujer').trigger('click')                         // ahora hay cambios locales
    s.diagram.value = saved({ nodes: [person('a', { name: 'Otro cambio' })], edges: [] })
    await flushPromises()
    expect(nodesOf(w)).toHaveLength(2)                               // no se pisó lo que se estaba haciendo
    expect(nodesOf(w)[0].data.name).toBe('Cambio de otro usuario')
  })
})
