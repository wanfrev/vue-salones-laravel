import { reactive } from 'vue'
import { DEFAULT_CASHEA_DOWN_PAYMENT, DEFAULT_CASHEA_FEE } from '../../components/pos/cashea'

/**
 * Lo que la cajera escribe al cobrar con Cashea: el monto que se cobró por Cashea, la comisión de hoy y
 * la inicial. Estado de módulo (una sola venta a la vez en el POS): lo comparten el panel de pago, que
 * lo muestra, y usePOSPayment, que lo manda con el cobro.
 *
 * La comisión de Cashea cambia de un día a otro pero no dentro del día: se recuerda la de hoy en este
 * navegador para no escribirla en cada venta (conveniencia; si no hay almacenamiento, vuelve al 10%).
 */
const FEE_KEY = 'luma.pos.cashea-fee'

const today = () => new Date().toLocaleDateString('en-CA')

function todaysFee(): number {
  try {
    const saved = JSON.parse(localStorage.getItem(FEE_KEY) ?? 'null')
    if (saved && saved.date === today() && Number.isFinite(saved.fee)) return saved.fee
  } catch { /* sin almacenamiento: valor por defecto */ }
  return DEFAULT_CASHEA_FEE
}

const draft = reactive({
  /** Monto cobrado por Cashea; null = aún no se escribió (se propone el precio). */
  total: null as number | null,
  feePercentage: todaysFee(),
  downPaymentPercentage: DEFAULT_CASHEA_DOWN_PAYMENT,
  /** Método con el que el cliente pagó la inicial; '' = aún no se eligió. */
  downPaymentMethod: '',
})

export function useCasheaDraft() {
  /** Al cambiar de venta: el monto se borra; la comisión del día se conserva; la inicial vuelve al 40%. */
  function reset() {
    draft.total = null
    draft.feePercentage = todaysFee()
    draft.downPaymentPercentage = DEFAULT_CASHEA_DOWN_PAYMENT
    draft.downPaymentMethod = ''
  }

  function rememberFee(fee: number) {
    draft.feePercentage = fee
    try { localStorage.setItem(FEE_KEY, JSON.stringify({ date: today(), fee })) } catch { /* sin almacenamiento */ }
  }

  /** Bloque `cashea` del cobro: el % de Cashea de hoy, la inicial y con qué se pagó (si se eligió). */
  function payload() {
    return {
      fee_percentage: draft.feePercentage,
      down_payment_percentage: draft.downPaymentPercentage,
      ...(draft.downPaymentMethod ? { down_payment_method: draft.downPaymentMethod } : {}),
    }
  }

  return { draft, reset, rememberFee, payload }
}
