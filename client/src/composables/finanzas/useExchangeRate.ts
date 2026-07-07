import { ref, computed, watch } from 'vue'
import { useCurrency } from '../common/useCurrency'
import { useNotification } from '../common/useNotification'

export function useExchangeRate() {
  const { exchangeRate, setExchangeRate, isAdmin } = useCurrency()
  const { success, error: showError } = useNotification()

  const editRateValue = ref(0)
  const updatingRate = ref(false)

  watch(exchangeRate, (val) => {
    editRateValue.value = val
  }, { immediate: true })

  const isEditable = computed(() => isAdmin.value)
  const displayRate = computed(() =>
    exchangeRate.value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )

  const handleUpdate = async () => {
    if (!editRateValue.value || editRateValue.value <= 0) {
      showError('Ingresa una tasa válida mayor a 0')
      return
    }
    updatingRate.value = true
    try {
      await setExchangeRate(editRateValue.value)
      success(`Tasa actualizada a 1 USD = ${editRateValue.value} Bs`)
    } catch {
      showError('Error al actualizar la tasa')
    } finally {
      updatingRate.value = false
    }
  }

  return {
    editRateValue,
    updatingRate,
    isEditable,
    displayRate,
    handleUpdate,
  }
}
