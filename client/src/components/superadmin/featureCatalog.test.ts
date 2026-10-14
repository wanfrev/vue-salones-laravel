import { describe, expect, it } from 'vitest'
import { ALL_FLAGS, FLAG_GROUPS, flagMatches, flagStats, groupsForNiche } from './featureCatalog'
import { DEFAULT_FEATURES } from '../../config/features'

describe('feature catalog', () => {
  it('lists the same 24 switches as the original page, each exactly once', () => {
    expect(ALL_FLAGS).toHaveLength(24)
    expect(new Set(ALL_FLAGS.map(f => f.key)).size).toBe(24)
  })

  it('only refers to features that really exist (no typos)', () => {
    for (const f of ALL_FLAGS) {
      expect(Object.keys(DEFAULT_FEATURES), f.key).toContain(f.key)
    }
  })

  it('keeps the original grouping and order', () => {
    expect(FLAG_GROUPS.map(g => g.id)).toEqual(['schedule', 'core', 'management', 'staffing', 'comms'])
    expect(FLAG_GROUPS.find(g => g.id === 'core')!.flags.map(f => f.key)).toEqual(['pos', 'inventario', 'productos', 'proveedores', 'retail_module_enabled'])
  })

  it('shows the staffing extras only to staffing businesses', () => {
    expect(groupsForNiche('staffing').map(g => g.id)).toContain('staffing')
    expect(groupsForNiche('salon').map(g => g.id)).not.toContain('staffing')
    expect(groupsForNiche(null).map(g => g.id)).not.toContain('staffing')
  })

  it('gives every switch a label and an explanation', () => {
    for (const f of ALL_FLAGS) {
      expect(f.label.length, f.key).toBeGreaterThan(3)
      expect(f.description.length, f.key).toBeGreaterThan(15)
    }
  })
})

describe('flagMatches', () => {
  const flag = { key: 'whatsapp_available', label: 'WhatsApp', description: 'Configurar WhatsApp via Evolution API con QR' }

  it('matches name, explanation and key, ignoring case and accents', () => {
    expect(flagMatches(flag, 'whats')).toBe(true)
    expect(flagMatches(flag, 'EVOLUTION')).toBe(true)
    expect(flagMatches(flag, 'available')).toBe(true)
    expect(flagMatches({ ...flag, label: 'Reservas públicas' }, 'publicas')).toBe(true)
  })

  it('matches everything when the search is empty and nothing when it is unrelated', () => {
    expect(flagMatches(flag, '   ')).toBe(true)
    expect(flagMatches(flag, 'inventario')).toBe(false)
  })
})

describe('flagStats', () => {
  it('counts switches on and those that differ from the niche default', () => {
    const groups = groupsForNiche('salon')
    const keys = groups.flatMap(g => g.flags.map(f => f.key))
    const defaults = Object.fromEntries(keys.map(k => [k, false]))
    const resolved = { ...defaults, agenda: true, pos: true }

    expect(flagStats(groups, resolved, defaults)).toEqual({ on: 2, total: keys.length, changed: 2 })
    expect(flagStats(groups, resolved, { ...defaults, agenda: true, pos: true })).toEqual({ on: 2, total: keys.length, changed: 0 })
  })
})
