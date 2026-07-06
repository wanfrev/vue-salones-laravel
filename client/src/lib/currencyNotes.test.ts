import { describe, it, expect } from 'vitest'
import {
  encodeExpenseNotes,
  encodeEmployeePaymentNotes,
  encodeInventorySaleNotes,
  getSaleCurrencyFromNotes,
  decodeCurrencyNotes,
} from './currencyNotes'

describe('encodeExpenseNotes', () => {
  it('returns userNotes unchanged for USD currency', () => {
    const result = encodeExpenseNotes(500, 'USD', 40, 'Renta local')
    expect(result).toBe('Renta local')
  })

  it('includes VES prefix with amount and rate', () => {
    const result = encodeExpenseNotes(500, 'VES', 40, 'Compra insumos')
    expect(result).toBe('[VES:500:40] Compra insumos')
  })

  it('handles empty userNotes for VES', () => {
    const result = encodeExpenseNotes(500, 'VES', 40, '')
    expect(result).toBe('[VES:500:40]')
  })

  it('uses rate 1 when exchangeRate is 0', () => {
    const result = encodeExpenseNotes(500, 'VES', 0, 'test')
    expect(result).toBe('[VES:500:1] test')
  })
})

describe('encodeEmployeePaymentNotes', () => {
  it('encodes USD payment notes', () => {
    const result = encodeEmployeePaymentNotes(100, 'USD', 'Pago parcial')
    expect(result).toBe('[USD:100] Pago parcial')
  })

  it('encodes VES payment notes', () => {
    const result = encodeEmployeePaymentNotes(4000, 'VES', 'Pago')
    expect(result).toBe('[VES:4000] Pago')
  })

  it('handles empty userNotes', () => {
    const result = encodeEmployeePaymentNotes(100, 'USD', '')
    expect(result).toBe('[USD:100]')
  })
})

describe('encodeInventorySaleNotes', () => {
  it('encodes VES sale notes with exchange rate', () => {
    const result = encodeInventorySaleNotes(36.5, 'Venta directa')
    expect(result).toBe('[VES:36.5] Venta directa')
  })

  it('defaults to "Venta directa" when notes empty', () => {
    const result = encodeInventorySaleNotes(40, '')
    expect(result).toBe('[VES:40] Venta directa')
  })
})

describe('getSaleCurrencyFromNotes', () => {
  it('returns USD when isVES is false', () => {
    const result = getSaleCurrencyFromNotes(undefined, 40, false)
    expect(result.currency).toBe('USD')
    expect(result.exchangeRateUsed).toBe(40)
  })

  it('parses rate from notes for VES sales', () => {
    const result = getSaleCurrencyFromNotes('[VES:36.5] Venta directa', 40, true)
    expect(result.currency).toBe('VES')
    expect(result.exchangeRateUsed).toBe(36.5)
  })

  it('falls back to default rate when notes have no match', () => {
    const result = getSaleCurrencyFromNotes('Sin prefijo', 42, true)
    expect(result.currency).toBe('VES')
    expect(result.exchangeRateUsed).toBe(42)
  })
})

describe('decodeCurrencyNotes', () => {
  it('decodes VES notes with rate', () => {
    const result = decodeCurrencyNotes('[VES:4000:40] Pago completo', 100)
    expect(result.currency).toBe('VES')
    expect(result.originalAmount).toBe(4000)
    expect(result.exchangeRateUsed).toBe(40)
    expect(result.cleanNotes).toBe('Pago completo')
  })

  it('decodes old VES format (rate derived from storedAmount)', () => {
    const result = decodeCurrencyNotes('[VES:4000] Pago viejo', 100)
    expect(result.currency).toBe('VES')
    expect(result.originalAmount).toBe(4000)
    expect(result.exchangeRateUsed).toBe(40) // 4000 / 100
    expect(result.cleanNotes).toBe('Pago viejo')
  })

  it('decodes USD notes', () => {
    const result = decodeCurrencyNotes('[USD:100] Pago en dolares', 100)
    expect(result.currency).toBe('USD')
    expect(result.originalAmount).toBe(100)
    expect(result.exchangeRateUsed).toBe(1)
    expect(result.cleanNotes).toBe('Pago en dolares')
  })

  it('returns default for unrecognized format', () => {
    const result = decodeCurrencyNotes('Notas sin prefijo', 75)
    expect(result.currency).toBe('USD')
    expect(result.originalAmount).toBe(75)
    expect(result.exchangeRateUsed).toBe(1)
    expect(result.cleanNotes).toBe('Notas sin prefijo')
  })

  it('handles empty notes', () => {
    const result = decodeCurrencyNotes('', 50)
    expect(result.currency).toBe('USD')
    expect(result.originalAmount).toBe(50)
    expect(result.exchangeRateUsed).toBe(1)
    expect(result.cleanNotes).toBe('')
  })
})
