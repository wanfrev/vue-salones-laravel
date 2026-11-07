/**
 * En un pago MIXTO una parte puede no ser dinero cobrado: lo que se dejó a crédito y lo que se regaló (cortesía).
 * `total_amount` es el valor de la venta (sobre él sale la comisión de quien atendió) pero el ingreso del negocio es
 * solo lo cobrado. El servidor manda `uncollected_amount` por cobro (ver App\Support\UncollectedAmount); estas
 * funciones solo lo restan, no recalculan dinero.
 */
const UNCOLLECTED_METHODS = ['credito', 'cortesia']

/** ¿Esta línea de un pago mixto es crédito o cortesía (no entró dinero)? */
export const isUncollectedSplit = (split: { method?: string } | null | undefined): boolean =>
  !!split && UNCOLLECTED_METHODS.includes(String(split.method))

/** Lo que de un cobro no entró como dinero (0 si el servidor no lo manda, p. ej. en caché vieja). */
export const uncollectedOf = (tx: { uncollected_amount?: number | string | null }): number => {
  const n = Number(tx.uncollected_amount ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Lo que de verdad se cobró: el valor de la venta menos lo que quedó a crédito o fue cortesía. */
export const collectedAmount = (tx: { total_amount?: number | string | null; uncollected_amount?: number | string | null }): number =>
  Math.max(0, Number(tx.total_amount ?? 0) - uncollectedOf(tx))

/** ¿El pago deja algo a crédito? Todo el cobro a crédito, o una línea de crédito con monto dentro de un pago mixto. */
export const hasCreditPortion = (
  method: string,
  breakdown: { method?: string; inputAmount?: number | null }[] | null | undefined,
): boolean =>
  method === 'credito'
  || (method === 'mixed' && (breakdown ?? []).some(s => s.method === 'credito' && Number(s.inputAmount ?? 0) > 0))
