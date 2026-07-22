import { ref, computed, watch } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../common/useAuth'
import { useNotification } from '../common/useNotification'
import { useCurrency } from '../common/useCurrency'
import { apiRequest } from '../../lib/api'
import { useBusinessStore } from '../../store/business'

export function useExchangeRate() {
  const { authStore } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const businessStore = useBusinessStore()
  const { exchangeRate } = useCurrency()

  const isEditable = computed(() => {
    const role = authStore.role
    if (role === 'admin' || role === 'superadmin') return true
    if (role === 'encargado' && businessStore.hasFeature('encargados_change_exchange_rate')) return true
    return false
  })
  const editRateValue = ref(exchangeRate.value)
  const updatingRate = ref(false)

  watch(exchangeRate, (val) => {
    editRateValue.value = val
  })

  const displayRate = computed(() => String(exchangeRate.value))

  const updateMutation = useMutation({
    mutationFn: async (rate: number) => {
      const branchId = businessStore.currentBranchId
      const businessId = authStore.businessId

      if (branchId) {
        await apiRequest('PUT', `/branches/${branchId}`, {
          name: businessStore.currentBranch?.name ?? '',
          ves_exchange_rate: rate,
        })
        if (businessStore.currentBranch) {
          businessStore.currentBranch.ves_exchange_rate = rate
        }
      } else if (businessId) {
        await apiRequest('PUT', `/businesses/${businessId}`, {
          ves_exchange_rate: rate,
        })
        if (businessStore.business) {
          businessStore.business.ves_exchange_rate = rate
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      success('Tasa actualizada')
    },
    onError: (err: any) => {
      showError(err?.message ?? 'Error al actualizar la tasa')
    },
  })

  const handleUpdate = async () => {
    if (editRateValue.value <= 0) return
    updatingRate.value = true
    try {
      await updateMutation.mutateAsync(editRateValue.value)
    } finally {
      updatingRate.value = false
    }
  }

  return {
    isEditable,
    editRateValue,
    updatingRate,
    displayRate,
    handleUpdate,
  }
}
