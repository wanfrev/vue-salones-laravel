import { describe, expect, it } from 'vitest'
import { addMonthsISO, billingDismissKey, billingNoticeText, formatBillingAmount, type BillingNotice } from './billing'

const base: BillingNotice = {
  status: 'upcoming', kind: 'initial', in_trial: true, amount: 50, currency: 'USD', due_on: '2026-11-20',
  days_left: 5, days_overdue: 0, cycle: 'monthly', payment_instructions: null, custom_message: null, dismissible: true,
}

describe('addMonthsISO', () => {
  it('suma meses sin desbordar fin de mes, igual que el servidor', () => {
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonthsISO('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonthsISO('2026-01-31', 3)).toBe('2026-04-30')
    expect(addMonthsISO('2026-11-20', 12)).toBe('2027-11-20')
    expect(addMonthsISO('2026-12-15', 1)).toBe('2027-01-15')
  })
})

describe('formatBillingAmount', () => {
  it('formatea USD y VES', () => {
    expect(formatBillingAmount(1234.5, 'USD')).toBe('$1,234.50')
    expect(formatBillingAmount(1234.5, 'VES')).toMatch(/^Bs\. 1\.234,50$/)
  })
})

describe('billingNoticeText', () => {
  it('fin del mes gratis menciona los días y el primer pago', () => {
    const t = billingNoticeText(base)
    expect(t.title).toBe('Tu mes gratis termina en 5 días')
    expect(t.body).toContain('tu primer pago será de $50.00')
  })

  it('un día antes dice mañana', () => {
    expect(billingNoticeText({ ...base, days_left: 1 }).title).toBe('Mañana termina tu mes gratis')
    expect(billingNoticeText({ ...base, in_trial: false, kind: 'recurring', days_left: 1 }).body).toContain('vence mañana')
  })

  it('recurrente usa el nombre del ciclo', () => {
    const t = billingNoticeText({ ...base, in_trial: false, kind: 'recurring', cycle: 'quarterly', amount: 90 })
    expect(t.title).toBe('Recuerda renovar a tu aliado')
    expect(t.body).toMatch(/^Tu trimestre de \$90\.00 vence en 5 días/)
  })

  it('vence hoy y vencido', () => {
    expect(billingNoticeText({ ...base, status: 'due_today', days_left: 0 }).title).toBe('Hoy toca renovar a tu aliado')
    const late = billingNoticeText({ ...base, status: 'overdue', days_left: 0, days_overdue: 1, kind: 'recurring' })
    expect(late.title).toBe('Tu pago de Luma está pendiente')
    expect(late.body).toContain('hace 1 día')
  })
})

describe('billingDismissKey', () => {
  it('cambia con el día y con el vencimiento, para que el aviso vuelva a salir', () => {
    const k = billingDismissKey('b1', base, '2026-11-15')
    expect(billingDismissKey('b1', base, '2026-11-17')).not.toBe(k)
    expect(billingDismissKey('b1', { ...base, due_on: '2026-12-20' }, '2026-11-15')).not.toBe(k)
  })
})
