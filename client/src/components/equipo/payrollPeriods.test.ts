import { describe, expect, it } from 'vitest'
import {
  inRange, isCurrentPeriod, monthKey, parseMonthInput, periodLabel, periodRange, periodYmd, presetRange, shiftAnchor, weekStart,
} from './payrollPeriods'

// Miércoles 21 de octubre de 2026, 15:30
const NOW = new Date(2026, 9, 21, 15, 30)
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('semana y mes', () => {
  it('la semana empieza el lunes', () => {
    expect(ymd(weekStart(NOW))).toBe('2026-10-19')
    expect(ymd(weekStart(new Date(2026, 9, 25)))).toBe('2026-10-19') // domingo
    expect(ymd(weekStart(new Date(2026, 9, 26)))).toBe('2026-10-26') // lunes
  })

  it('lee y escribe el valor del selector de mes', () => {
    expect(monthKey(NOW)).toBe('2026-10')
    expect(ymd(parseMonthInput('2026-03')!)).toBe('2026-03-01')
    expect(parseMonthInput('2026-13')).toBeNull()
    expect(parseMonthInput('')).toBeNull()
    expect(parseMonthInput(undefined)).toBeNull()
  })
})

describe('periodRange / periodYmd', () => {
  it('día: de las 00:00 a las 23:59', () => {
    const r = periodRange('day', NOW, NOW)
    expect(r.start.getHours()).toBe(0)
    expect(r.end.getHours()).toBe(23)
    expect(ymd(r.start)).toBe('2026-10-21')
  })

  it('semana: lunes a domingo', () => {
    expect(periodYmd('week', NOW, NOW)).toEqual({ start: '2026-10-19', end: '2026-10-25' })
  })

  it('el mes en curso termina HOY; uno pasado, en su último día', () => {
    expect(periodYmd('month', NOW, NOW)).toEqual({ start: '2026-10-01', end: '2026-10-21' })
    expect(periodYmd('month', new Date(2026, 8, 10), NOW)).toEqual({ start: '2026-09-01', end: '2026-09-30' })
    expect(periodYmd('month', new Date(2028, 1, 5), new Date(2028, 5, 1))).toEqual({ start: '2028-02-01', end: '2028-02-29' })
  })

  it('«todo» abarca todo el historial', () => {
    expect(periodYmd('all', NOW, NOW)).toEqual({ start: '2000-01-01', end: '2099-12-31' })
  })

  it('el rango personalizado respeta lo escrito y completa lo que falta', () => {
    expect(periodYmd('custom', NOW, NOW, { start: '2026-10-01', end: '2026-10-15' })).toEqual({ start: '2026-10-01', end: '2026-10-15' })
    const open = periodRange('custom', NOW, NOW, { start: '2026-10-01' })
    expect(ymd(open.start)).toBe('2026-10-01')
    expect(ymd(open.end)).toBe('2099-12-31')
  })
})

describe('periodLabel', () => {
  it('lo escribe en español', () => {
    expect(periodLabel('day', NOW)).toBe('21 Octubre 2026')
    expect(periodLabel('week', NOW)).toBe('19-25 Octubre 2026')
    expect(periodLabel('week', new Date(2026, 9, 28))).toBe('26 Octubre - 1 Noviembre 2026')
    expect(periodLabel('month', NOW)).toBe('Octubre 2026')
    expect(periodLabel('all', NOW)).toBe('Todo el historial')
  })

  it('rango personalizado: una fecha, dos fechas o sin completar', () => {
    expect(periodLabel('custom', NOW, { start: '2026-10-05', end: '2026-10-05' })).toBe('5 Octubre 2026')
    expect(periodLabel('custom', NOW, { start: '2026-10-01', end: '2026-10-15' })).toBe('1 Octubre 2026 al 15 Octubre 2026')
    expect(periodLabel('custom', NOW, { start: '2026-10-01' })).toBe('Rango personalizado')
  })
})

describe('navegación', () => {
  it('mueve un día, una semana o un mes', () => {
    expect(ymd(shiftAnchor('day', NOW, -1))).toBe('2026-10-20')
    expect(ymd(shiftAnchor('week', NOW, -1))).toBe('2026-10-14')
    expect(ymd(shiftAnchor('week', NOW, 1))).toBe('2026-10-28')
    expect(ymd(shiftAnchor('month', NOW, -1))).toBe('2026-09-01')
    expect(ymd(shiftAnchor('month', new Date(2026, 0, 31), -1))).toBe('2025-12-01') // sin desbordar de enero a diciembre
    expect(ymd(shiftAnchor('month', new Date(2026, 0, 31), 1))).toBe('2026-02-01') // 31 ene + 1 mes no salta a marzo
  })

  it('«siguiente» se bloquea cuando el periodo ya es el actual', () => {
    expect(isCurrentPeriod('day', NOW, NOW)).toBe(true)
    expect(isCurrentPeriod('day', new Date(2026, 9, 20), NOW)).toBe(false)
    expect(isCurrentPeriod('week', new Date(2026, 9, 14), NOW)).toBe(false)
    expect(isCurrentPeriod('week', NOW, NOW)).toBe(true)
    expect(isCurrentPeriod('month', new Date(2026, 8, 1), NOW)).toBe(false)
    expect(isCurrentPeriod('month', NOW, NOW)).toBe(true)
    expect(isCurrentPeriod('all', NOW, NOW)).toBe(true)
    expect(isCurrentPeriod('custom', NOW, NOW)).toBe(true)
  })
})

describe('atajos de rango', () => {
  it('quincenas: 1-15 y 16-fin de mes', () => {
    expect(presetRange('currentBiweekly', new Date(2026, 9, 10))).toEqual({ start: '2026-10-01', end: '2026-10-15' })
    expect(presetRange('currentBiweekly', NOW)).toEqual({ start: '2026-10-16', end: '2026-10-31' })
    expect(presetRange('lastBiweekly', NOW)).toEqual({ start: '2026-10-01', end: '2026-10-15' })
    expect(presetRange('lastBiweekly', new Date(2026, 9, 10))).toEqual({ start: '2026-09-16', end: '2026-09-30' })
    expect(presetRange('lastBiweekly', new Date(2026, 0, 5))).toEqual({ start: '2025-12-16', end: '2025-12-31' })
  })

  it('mes y últimos días', () => {
    expect(presetRange('currentMonth', NOW)).toEqual({ start: '2026-10-01', end: '2026-10-31' })
    expect(presetRange('last7', NOW)).toEqual({ start: '2026-10-15', end: '2026-10-21' })
    expect(presetRange('last30', NOW)).toEqual({ start: '2026-09-22', end: '2026-10-21' })
  })
})

describe('inRange', () => {
  const week = periodRange('week', NOW, NOW)

  it('incluye los dos extremos y excluye lo de afuera', () => {
    expect(inRange('2026-10-19', week)).toBe(true)
    expect(inRange('2026-10-25', week)).toBe(true)
    expect(inRange('2026-10-18', week)).toBe(false)
    expect(inRange('2026-10-26', week)).toBe(false)
  })

  it('ignora fechas vacías o inválidas', () => {
    expect(inRange('', week)).toBe(false)
    expect(inRange(undefined, week)).toBe(false)
    expect(inRange('no es fecha', week)).toBe(false)
  })
})
