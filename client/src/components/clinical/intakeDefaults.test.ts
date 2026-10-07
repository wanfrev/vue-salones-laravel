import { describe, it, expect } from 'vitest'
import { emptyIntakeData, mergeIntakeData } from './intakeDefaults'

describe('mergeIntakeData', () => {
  it('returns a complete empty record for a patient with no intake yet', () => {
    expect(mergeIntakeData(null)).toEqual(emptyIntakeData())
    expect(mergeIntakeData(undefined)).toEqual(emptyIntakeData())
  })

  it('keeps saved values and backfills fields the saved record never had', () => {
    const merged = mergeIntakeData({ consulta: { motivo: 'Ansiedad' } } as never)
    expect(merged.consulta.motivo).toBe('Ansiedad')
    expect(merged.consulta.expectativas).toBe('')
    expect(merged.riesgo.ideacion_suicida).toBe('')
    expect(merged.impresion.codigo_cie10).toBe('')
  })

  it('does not share mutable state between calls', () => {
    const a = mergeIntakeData(null)
    a.consulta.motivo = 'cambiado'
    expect(mergeIntakeData(null).consulta.motivo).toBe('')
    expect(emptyIntakeData().consulta.motivo).toBe('')
  })

  it('ignores a section that is not an object', () => {
    const merged = mergeIntakeData({ areas: 'basura' } as never)
    expect(merged.areas).toEqual(emptyIntakeData().areas)
  })
})
