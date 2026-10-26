/**
 * Ventas con Cashea (lógica pura, sin Vue). El monto por Cashea depende de la tasa del día; Cashea se queda
 * con un % de ese monto (cambia, por eso se escribe) y el cliente paga una inicial (40%) y el resto se lo
 * paga a Cashea. Al negocio le entra hoy el NETO, y sobre él va el % de cada especialista. El servidor
 * (AppServicesCasheaService) hace el mismo cálculo y es el que manda; esto es para mostrarlo en el POS.
 */

export const DEFAULT_CASHEA_FEE = 10
export const DEFAULT_CASHEA_DOWN_PAYMENT = 40
export const MAX_CASHEA_FEE = 50

/** Con qué método pagó el cliente la inicial (mismos valores que acepta el servidor; solo se anota). */
export const CASHEA_DOWN_PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo ($)' },
  { value: 'cash_ves', label: 'Efectivo (Bs)' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'binance', label: 'Binance' },
  { value: 'pago_movil', label: 'Pago Móvil' },
  { value: 'punto_venta', label: 'Punto de Vta (Bs)' },
  { value: 'other', label: 'Otro' },
] as const

const money = (n: number) => Math.round(n * 100) / 100

export interface CasheaTotals {
  /** Comisión de Cashea (sobre el total). */
  fee: number
  /** Inicial que pagó el cliente en la app. */
  downPayment: number
  /** Lo que le queda al negocio: total − comisión de Cashea (es lo que entra a Finanzas). */
  net: number
}

/** Con $164, 10% y 40%: comisión $16,40, inicial $65,60, neto $147,60. */
export function casheaTotals(total: number, feePercentage: number, downPaymentPercentage: number): CasheaTotals {
  const t = Number.isFinite(total) ? total : 0
  const fee = money(t * (feePercentage || 0) / 100)
  return {
    fee,
    downPayment: money(t * (downPaymentPercentage || 0) / 100),
    net: money(t - fee),
  }
}

/**
 * Primer problema que impide cobrar con Cashea, o null. `base` es lo que cuesta la venta (servicio +
 * productos): el monto de Cashea suele ser mayor (122, 124, 164...) y nunca menor.
 */
export function casheaProblem(
  total: number | null,
  base: number,
  feePercentage: number,
  downPaymentPercentage: number,
  /** Método de la inicial: si se pasa (el POS siempre lo pasa), hay que elegirlo cuando hay inicial. */
  downPaymentMethod?: string,
): string | null {
  if (total == null || !Number.isFinite(total) || total <= 0) return 'Escribe el monto que se cobró por Cashea.'
  if (money(total) < money(base)) return `El monto de Cashea no puede ser menor que el precio ($${money(base).toFixed(2)}).`
  if (!Number.isFinite(feePercentage) || feePercentage < 0 || feePercentage > MAX_CASHEA_FEE) return `La comisión debe estar entre 0% y ${MAX_CASHEA_FEE}%.`
  if (!Number.isFinite(downPaymentPercentage) || downPaymentPercentage < 0 || downPaymentPercentage > 100) return 'La inicial debe estar entre 0% y 100%.'
  if (downPaymentMethod !== undefined && downPaymentPercentage > 0 && !downPaymentMethod) return 'Elige con qué método se pagó la inicial de Cashea.'
  return null
}

/**
 * Reparte el monto de Cashea entre los precios de los servicios, proporcional a lo que cuesta cada uno
 * (la diferencia sobre el precio de lista se reparte igual). El último absorbe el redondeo: suman
 * exactamente `total`.
 */
export function spreadOver(prices: number[], total: number): number[] {
  const sum = prices.reduce((a, b) => a + b, 0)
  if (prices.length === 0) return []
  let left = money(total)
  return prices.map((p, i) => {
    if (i === prices.length - 1) return money(left)
    const share = money(sum > 0 ? (p / sum) * total : total / prices.length)
    left = money(left - share)
    return share
  })
}
