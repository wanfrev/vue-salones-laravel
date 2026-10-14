import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FeaturesPanel from './FeaturesPanel.vue'
import { groupsForNiche } from './featureCatalog'

const groups = groupsForNiche('salon')
const allKeys = groups.flatMap(g => g.flags.map(f => f.key))
const base = Object.fromEntries(allKeys.map(k => [k, false]))

function make(over: { features?: Record<string, boolean>; defaults?: Record<string, boolean>; locked?: string[]; busy?: boolean } = {}) {
  return mount(FeaturesPanel, {
    props: {
      groups,
      features: { ...base, ...over.features },
      nicheDefaults: { ...base, ...over.defaults },
      lockedKeys: new Set(over.locked ?? []),
      busy: over.busy ?? false,
      nicheLabel: 'Salón',
    },
  })
}

const switchFor = (wrapper: ReturnType<typeof make>, label: string) =>
  wrapper.findAll('[role="switch"]').find(b => b.attributes('aria-label')!.startsWith(label + ':'))!

describe('FeaturesPanel', () => {
  it('shows every switch of the niche, each reflecting its resolved value', () => {
    const w = make({ features: { agenda: true, pos: true } })
    expect(w.findAll('[role="switch"]')).toHaveLength(allKeys.length)
    expect(switchFor(w, 'Agenda').attributes('aria-checked')).toBe('true')
    expect(switchFor(w, 'Calendario').attributes('aria-checked')).toBe('false')
    expect(w.text()).toContain('2 de ' + allKeys.length + ' funciones activas')
  })

  it('asks to flip exactly the key that was clicked', async () => {
    const w = make()
    await switchFor(w, 'Gift Cards').trigger('click')
    expect(w.emitted('toggle')).toEqual([['gift_cards']])
  })

  it('does nothing while another change is being saved', async () => {
    const w = make({ busy: true })
    expect(switchFor(w, 'Agenda').attributes('disabled')).toBeDefined()
    await switchFor(w, 'Agenda').trigger('click')
    expect(w.emitted('toggle')).toBeUndefined()
  })

  it('cannot flip a function the niche locks, and says why', async () => {
    const w = make({ locked: ['agenda'] })
    expect(switchFor(w, 'Agenda').attributes('disabled')).toBeDefined()
    await switchFor(w, 'Agenda').trigger('click')
    expect(w.emitted('toggle')).toBeUndefined()
    expect(w.text()).toContain('No disponible para el nicho «Salón»')
  })

  it('marks the functions that differ from what the niche brings, and can show only those', async () => {
    const w = make({ features: { pos: true }, defaults: { agenda: true } })
    // agenda: niche default on, now off · pos: niche default off, now on
    expect(w.text().match(/Distinta del nicho/g)).toHaveLength(2)
    expect(w.text()).toContain('2 distintas de lo que trae el nicho')

    await w.find('input[type="checkbox"]').setValue(true)
    expect(w.findAll('[role="switch"]')).toHaveLength(2)
  })

  it('says the business matches its niche when nothing was changed', () => {
    const w = make()
    expect(w.text()).toContain('igual que lo que trae el nicho')
    expect(w.text()).not.toContain('Distinta del nicho')
  })

  it('filters by the search text, ignoring accents, and says when nothing matches', async () => {
    const w = make()
    await w.find('input[type="search"]').setValue('catalogo')
    expect(w.findAll('[role="switch"]').map(b => b.attributes('aria-label')!.split(':')[0])).toEqual(['Servicios', 'Productos'])

    await w.find('input[type="search"]').setValue('zzzz')
    expect(w.text()).toContain('Ninguna función coincide')
  })
})
