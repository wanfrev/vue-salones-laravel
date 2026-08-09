import { computed } from 'vue'
import { db } from '../../lib/api'
import { useAuth } from '../common/useAuth'
import { useBusinessStore } from '../../store/business'

export function useCurrency() {
  const { authStore } = useAuth()
  const businessStore = useBusinessStore()

  const employeeRate = computed(() => {
    const profileRate = (authStore.profile as any)?.employee_ves_rate
    if (profileRate != null && Number(profileRate) > 0) {
      return Number(profileRate)
    }
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

  /**
   * Niches declaring currencyMode: 'single' (staffing) price, pay and bill in USD only. There is
   * no rate to apply, so every VES formatter below collapses to an empty string and the callers
   * that render a secondary amount render nothing at all.
   */
  const isSingleCurrency = computed(() => businessStore.isSingleCurrency)

  const formatVESEs = (vesValue: number) => {
    if (isSingleCurrency.value) return ''
    return `${new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vesValue)} Bs`
  }

  const formatVES = (value: number, rate?: number) => {
    if (isSingleCurrency.value) return ''
    return formatVESEs(value * (rate ?? exchangeRate.value))
  }

  const formatDual = (value: number, rate?: number) => {
    if (isSingleCurrency.value) return formatUSD(value)
    return `${formatUSD(value)} / ${formatVES(value, rate)}`
  }

  const formatVESInline = (usdValue: number, rate?: number) => {
    if (isSingleCurrency.value) return ''
    const vesValue = usdValue * (rate ?? exchangeRate.value)
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vesValue)
  }

  const formatEmployeeVESInline = (usdValue: number, rate?: number) => {
    if (isSingleCurrency.value) return ''
    const vesValue = usdValue * (rate ?? employeeRate.value)
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vesValue)
  }

  /**
   * The secondary amount WITH its unit, for the muted "1.234,56 Bs" line that sits under a USD
   * figure. Returns '' in single-currency mode — prefer this over `formatVESInline(x) + ' Bs'`
   * at call sites, because appending the unit outside the composable leaves a stray "Bs"
   * hanging when the conversion collapses.
   */
  const formatSecondary = (usdValue: number, rate?: number) => {
    const inline = formatVESInline(usdValue, rate)
    return inline ? `${inline} Bs` : ''
  }

  /** Same, for amounts converted at the employee's own rate. */
  const formatEmployeeSecondary = (usdValue: number, rate?: number) => {
    const inline = formatEmployeeVESInline(usdValue, rate)
    return inline ? `${inline} Bs` : ''
  }

  const setExchangeRate = async (rate: number) => {
    const branchId = businessStore.selectedBranchId
    const businessId = authStore.businessId

    if (branchId) {
      businessStore.updateBranch({ ves_exchange_rate: rate })
      const { error } = await db
        .from('branches')
        .update({ ves_exchange_rate: rate })
        .eq('id', branchId)

      if (error) throw error
    } else {
      businessStore.updateBusiness({ ves_exchange_rate: rate })
      const { error } = await db
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
    isSingleCurrency,
    formatUSD,
    formatVES,
    formatVESEs,
    formatDual,
    formatVESInline,
    formatEmployeeVESInline,
    formatSecondary,
    formatEmployeeSecondary,
    setExchangeRate,
    isAdmin,
  }
}
