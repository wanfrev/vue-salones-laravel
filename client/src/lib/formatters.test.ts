import { describe, it, expect } from 'vitest'
import {
  getInitials,
  formatMethod,
  getStatusLabel,
  getStatusColor,
  normalizeAppointmentStatus,
  formatDate,
  formatTime,
  toISODate,
  sanitizePhone,
  minutesToHHmm,
  formatNumber,
  formatMovementType,
  formatPayType,
  formatPercentage,
  formatTime24to12,
  dateToHHmm12,
} from './formatters'

describe('getInitials', () => {
  it('extracts initials from full name', () => {
    expect(getInitials('Juan Perez')).toBe('JP')
    expect(getInitials('Maria')).toBe('M')
    expect(getInitials('Ana Maria Garcia')).toBe('AM')
    expect(getInitials('José')).toBe('J')
  })

  it('returns U for empty/null name', () => {
    expect(getInitials()).toBe('U')
    expect(getInitials('')).toBe('U')
  })
})

describe('formatMethod', () => {
  it('maps known methods to Spanish labels', () => {
    expect(formatMethod('cash')).toBe('Efectivo ($)')
    expect(formatMethod('cash_ves')).toBe('Efectivo (Bs)')
    expect(formatMethod('card')).toBe('Tarjeta')
    expect(formatMethod('transfer')).toBe('Transferencia')
    expect(formatMethod('zelle')).toBe('Zelle')
    expect(formatMethod('pago_movil')).toBe('Pago Móvil')
    expect(formatMethod('punto_venta')).toBe('Punto de Venta (Bs)')
    expect(formatMethod('mixed')).toBe('Mixto')
    expect(formatMethod('other')).toBe('Otro')
  })

  it('returns unknown methods as-is', () => {
    expect(formatMethod('crypto')).toBe('crypto')
  })
})

describe('getStatusLabel', () => {
  it('maps status codes to Spanish labels', () => {
    expect(getStatusLabel('confirmed')).toBe('Confirmada')
    expect(getStatusLabel('pending')).toBe('Pendiente')
    expect(getStatusLabel('cancelled')).toBe('Cancelada')
    expect(getStatusLabel('paid')).toBe('Pagada')
    expect(getStatusLabel('completed')).toBe('Completada')
    expect(getStatusLabel('no_show')).toBe('Cancelada')
  })
})

describe('getStatusColor', () => {
  it('returns correct tailwind classes', () => {
    expect(getStatusColor('confirmed')).toBe('bg-primary/10 text-primary')
    expect(getStatusColor('pending')).toBe('bg-warning/10 text-warning')
    expect(getStatusColor('cancelled')).toBe('bg-danger/10 text-danger')
  })
})

describe('normalizeAppointmentStatus', () => {
  it('returns paid when payment_status is paid', () => {
    expect(normalizeAppointmentStatus({ status: 'confirmed', payment_status: 'paid' })).toBe('paid')
  })

  it('returns cancelled for no_show', () => {
    expect(normalizeAppointmentStatus({ status: 'no_show', payment_status: 'unpaid' })).toBe('cancelled')
  })

  it('returns confirmed for completed', () => {
    expect(normalizeAppointmentStatus({ status: 'completed', payment_status: 'unpaid' })).toBe('confirmed')
  })

  it('returns original status otherwise', () => {
    expect(normalizeAppointmentStatus({ status: 'confirmed', payment_status: 'unpaid' })).toBe('confirmed')
    expect(normalizeAppointmentStatus({ status: 'pending', payment_status: 'unpaid' })).toBe('pending')
  })
})

describe('formatDate', () => {
  it('formats ISO date to dd/mm/yyyy', () => {
    expect(formatDate('2025-06-15')).toBe('15/06/2025')
    expect(formatDate('2025-01-01')).toBe('01/01/2025')
  })

  it('formats Date object', () => {
    expect(formatDate(new Date(2025, 5, 15))).toBe('15/06/2025')
  })

  it('returns original value for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatTime', () => {
  it('formats time from ISO string in 12h format', () => {
    const result = formatTime('2025-06-15T14:30:00')
    expect(result).toMatch(/^\d{1,2}:\d{2}\s[ap]\.\s?m\.$/i)
  })
})

describe('toISODate', () => {
  it('converts to YYYY-MM-DD', () => {
    expect(toISODate(new Date(2025, 5, 15))).toBe('2025-06-15')
    expect(toISODate('2025-06-15')).toBe('2025-06-15')
  })
})

describe('sanitizePhone', () => {
  it('removes non-digit characters', () => {
    expect(sanitizePhone('+52 55-1234-5678')).toBe('525512345678')
    expect(sanitizePhone('(555) 123-4567')).toBe('5551234567')
  })
})

describe('minutesToHHmm', () => {
  it('converts minutes to HH:mm', () => {
    expect(minutesToHHmm(90)).toBe('01:30')
    expect(minutesToHHmm(0)).toBe('00:00')
    expect(minutesToHHmm(1440)).toBe('24:00')
    expect(minutesToHHmm(45)).toBe('00:45')
  })
})

describe('formatNumber', () => {
  it('uses locale formatting', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatMovementType', () => {
  it('maps movement types to Spanish', () => {
    expect(formatMovementType('purchase')).toBe('Compra')
    expect(formatMovementType('sale')).toBe('Venta')
    expect(formatMovementType('adjustment')).toBe('Ajuste')
    expect(formatMovementType('consumption')).toBe('Consumo')
  })
})

describe('formatPayType', () => {
  it('formats salary type', () => {
    expect(formatPayType('salary', 100)).toBe('Sueldo base ($100)')
  })

  it('formats percentage type', () => {
    expect(formatPayType('percentage', undefined, 50)).toBe('50% por servicio')
  })

  it('formats mixed type', () => {
    expect(formatPayType('mixed', 50, 30)).toBe('Sueldo + % ($50 + 30%)')
  })

  it('defaults for null type', () => {
    expect(formatPayType(null)).toBe('Por servicio')
  })
})

describe('formatPercentage', () => {
  it('formats as percentage', () => {
    expect(formatPercentage(0.5)).toBe('50.0%')
    expect(formatPercentage(1)).toBe('100.0%')
    expect(formatPercentage(0.333)).toBe('33.3%')
    expect(formatPercentage(0)).toBe('0.0%')
  })

  it('handles NaN', () => {
    expect(formatPercentage(NaN)).toBe('0.0%')
  })

  it('handles Infinity', () => {
    expect(formatPercentage(Infinity)).toBe('0.0%')
  })
})

describe('dateToHHmm12', () => {
  it('formats morning times with AM', () => {
    expect(dateToHHmm12(new Date(2025, 5, 15, 9, 30))).toBe('9:30 AM')
    expect(dateToHHmm12(new Date(2025, 5, 15, 0, 0))).toBe('12:00 AM')
  })

  it('formats afternoon times with PM', () => {
    expect(dateToHHmm12(new Date(2025, 5, 15, 14, 30))).toBe('2:30 PM')
    expect(dateToHHmm12(new Date(2025, 5, 15, 12, 0))).toBe('12:00 PM')
  })
})

describe('formatTime24to12', () => {
  it('converts 24h strings to 12h', () => {
    expect(formatTime24to12('09:30')).toBe('9:30 AM')
    expect(formatTime24to12('14:30')).toBe('2:30 PM')
    expect(formatTime24to12('00:00')).toBe('12:00 AM')
    expect(formatTime24to12('12:00')).toBe('12:00 PM')
    expect(formatTime24to12('07:45')).toBe('7:45 AM')
  })

  it('returns original for invalid input', () => {
    expect(formatTime24to12('invalid')).toBe('invalid')
    expect(formatTime24to12('')).toBe('')
  })
})
