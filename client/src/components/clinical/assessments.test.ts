import { describe, it, expect } from 'vitest'
import { ASSESSMENTS, scoreAssessment, SEVERITY_LABELS } from './assessments'

const all = (n: number, value: number) => Array<number>(n).fill(value)

describe('scoreAssessment — PHQ-9', () => {
  it('sums to 0 / minimal with no risk when everything is "Nunca"', () => {
    expect(scoreAssessment('phq9', all(9, 0))).toEqual({ complete: true, total: 0, severity: 'minimal', riskFlag: false })
  })

  it('maxes out at 27 / severe', () => {
    const s = scoreAssessment('phq9', all(9, 3))
    expect(s.total).toBe(27)
    expect(s.severity).toBe('severe')
    expect(ASSESSMENTS.phq9.maxScore).toBe(27)
  })

  it.each([
    [4, 'minimal'], [5, 'mild'], [9, 'mild'], [10, 'moderate'], [14, 'moderate'],
    [15, 'moderately_severe'], [19, 'moderately_severe'], [20, 'severe'],
  ])('total %i => %s', (total, severity) => {
    // Reparte el total en el ítem 1..8 (índices 0-7) para no tocar el ítem de riesgo.
    const answers = all(9, 0)
    let left = total
    for (let i = 0; i < 8 && left > 0; i++) {
      const v = Math.min(3, left)
      answers[i] = v
      left -= v
    }
    const s = scoreAssessment('phq9', answers)
    expect(s.total).toBe(total)
    expect(s.severity).toBe(severity)
    expect(s.riskFlag).toBe(false)
  })

  it('flags risk whenever item 9 is above zero, regardless of the total', () => {
    const answers = all(9, 0)
    answers[8] = 1
    const s = scoreAssessment('phq9', answers)
    expect(s.total).toBe(1)
    expect(s.severity).toBe('minimal')
    expect(s.riskFlag).toBe(true)
  })
})

describe('scoreAssessment — GAD-7', () => {
  it('maxes out at 21 / severe and never raises the risk flag', () => {
    const s = scoreAssessment('gad7', all(7, 3))
    expect(s).toEqual({ complete: true, total: 21, severity: 'severe', riskFlag: false })
    expect(ASSESSMENTS.gad7.maxScore).toBe(21)
  })

  it.each([[4, 'minimal'], [5, 'mild'], [10, 'moderate'], [15, 'severe']])('total %i => %s', (total, severity) => {
    const answers = all(7, 0)
    let left = total
    for (let i = 0; i < 7 && left > 0; i++) {
      const v = Math.min(3, left)
      answers[i] = v
      left -= v
    }
    expect(scoreAssessment('gad7', answers).severity).toBe(severity)
  })
})

describe('incomplete answers', () => {
  it('is not complete while any item is unanswered, and unanswered items do not add up', () => {
    const answers: Array<number | null> = all(9, 1)
    answers[3] = null
    const s = scoreAssessment('phq9', answers)
    expect(s.complete).toBe(false)
    expect(s.total).toBe(8)
  })

  it('is not complete when fewer answers than items were given', () => {
    expect(scoreAssessment('gad7', [1, 1, 1]).complete).toBe(false)
  })
})

describe('definitions', () => {
  it('have the standard item counts and a label for every severity band', () => {
    expect(ASSESSMENTS.phq9.items).toHaveLength(9)
    expect(ASSESSMENTS.gad7.items).toHaveLength(7)
    for (const def of Object.values(ASSESSMENTS)) {
      for (const band of def.bands) expect(SEVERITY_LABELS[band.severity]).toBeTruthy()
    }
  })
})
