import { computed } from 'vue'
import { api as supabase } from '../../lib/api'
import { useAuth } from '../common/useAuth'
import { useBusinessStore } from '../../store/business'

export function useCurrency() {
  const { authStore } = useAuth()
  const businessStore = useBusinessStore()

  const employeeRate = computed(() => {
    if (businessStore.employeeExchangeRate != null) {
      return businessStore.employeeExchangeRate
    }
    if (businessStore.currentBranch?.ves_exchange_rate != null) {
      return businessStore.currentBranch.ves_exchange_rate
    }
    return businessStore.business?.ves_exchange_rate ?? 1
  })

  const exchangeRate = computed(() => {
    if (businessStore.currentBranch?.ves_exchange_rate != null) {
      return businessStore.currentBranch.ves_exchange_rate
    }
    return businessStore.business?.ves_exchange_rate ?? 1
  })
  const currency = computed(() => businessStore.business?.currency ?? 'USD')

  const formatUSD = (value: number) => {
    return `$${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`
  }

  const formatVESEs = (vesValue: number) =>
    `${new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vesValue)} Bs`

  const formatVES = (value: number, rate?: number) => {
    return formatVESEs(value * (rate ?? exchangeRate.value))
  }

  const formatDual = (value: number, rate?: number) => {
    return `${formatUSD(value)} / ${formatVES(value, rate)}`
  }

  const formatVESInline = (usdValue: number, rate?: number) => {
    const vesValue = usdValue * (rate ?? exchangeRate.value)
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vesValue)
  }

  const formatEmployeeVESInline = (usdValue: number, rate?: number) => {
    const vesValue = usdValue * (rate ?? employeeRate.value)
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vesValue)
  }

  const setExchangeRate = async (rate: number) => {
    const branchId = businessStore.selectedBranchId
    const businessId = authStore.businessId

    if (branchId) {
      businessStore.updateBranch({ ves_exchange_rate: rate })
      const { error } = await supabase
        .from('branches')
        .update({ ves_exchange_rate: rate })
        .eq('id', branchId)

      if (error) throw error
    } else {
      businessStore.updateBusiness({ ves_exchange_rate: rate })
      const { error } = await supabase
        .from('businesses')
        .update({ ves_exchange_rate: rate })
        .eq('id', businessId)

      if (error) throw error
    }
  }

  const isAdmin = computed(() => {
    const role = authStore.profile?.role
    return role === 'admin' || role === 'superadmin'
  })

  return {
    exchangeRate,
    employeeRate,
    currency,
    formatUSD,
    formatVES,
    formatVESEs,
    formatDual,
    formatVESInline,
    formatEmployeeVESInline,
    setExchangeRate,
    isAdmin,
  }
}
