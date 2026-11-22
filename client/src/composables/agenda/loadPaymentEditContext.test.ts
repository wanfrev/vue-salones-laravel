import { describe, it, expect } from 'vitest'
import { buildPaymentEditContextFromTransactions } from './loadPaymentEditContext'

describe('buildPaymentEditContextFromTransactions', () => {
  it('suma todas las transacciones de un grupo en Bs en vez de cargar solo una sub-cita', () => {
    const rate = 1100
    const mk = (id: string, appointmentId: string, usd: number) => ({
      id,
      appointment_id: appointmentId,
      total_amount: usd,
      method: 'pago_movil',
      exchange_rate_used: rate,
      tip_amount: 0,
      notes: 'ref 123',
      payments_breakdown: [
        { method: 'pago_movil' as const, currency: 'VES' as const, inputAmount: usd * rate, amount: usd },
      ],
    })

    // Caso real: visita grupal de $77 ($17 + $5 + $14.5 + $5.5 + $0.5 + $34.5)
    const rows = [
      mk('tx-1', 'appt-1', 17),
      mk('tx-2', 'appt-2', 5),
      mk('tx-3', 'appt-3', 14.5),
      mk('tx-4', 'appt-4', 5.5),
      mk('tx-5', 'appt-5', 0.5),
      mk('tx-6', 'appt-6', 34.5),
    ]

    // Aunque se abra la sub-cita de $5.50, el monto del cobro debe ser el total del grupo ($77 = 84700 Bs)
    const ctx = buildPaymentEditContextFromTransactions(rows, 'appt-4')
    expect(ctx).not.toBeNull()
    expect(ctx!.transactionId).toBe('tx-4')
    expect(ctx!.currency).toBe('VES')
    expect(ctx!.exchangeRate).toBe(1100)
    expect(ctx!.amount).toBe(77 * 1100)
    expect(ctx!.method).toBe('pago_movil')
  })

  it('conserva el comportamiento para una cita individual en USD', () => {
    const ctx = buildPaymentEditContextFromTransactions([
      {
        id: 'tx-single',
        appointment_id: 'appt-single',
        total_amount: 25,
        method: 'zelle',
        exchange_rate_used: 1100,
        tip_amount: 2,
        notes: 'ok',
        payments_breakdown: [
          { method: 'zelle', currency: 'USD', inputAmount: 25, amount: 25 },
        ],
      },
    ], 'appt-single')

    expect(ctx).not.toBeNull()
    expect(ctx!.amount).toBe(25)
    expect(ctx!.currency).toBe('USD')
    expect(ctx!.tipAmount).toBe(2)
    expect(ctx!.method).toBe('zelle')
  })
})
