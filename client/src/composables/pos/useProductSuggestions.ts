import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuth } from '../common/useAuth'
import { useBusinessStore } from '../../store/business'
import { getFrequentlyBoughtTogether, posKeys } from '../../services/posService'
import type { POSProductItem } from '../../types/pos'

export function useProductSuggestions(cart: Ref<POSProductItem[]>) {
  const { authStore } = useAuth()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const lastProductId = computed(() => cart.value[cart.value.length - 1]?.productId ?? null)

  const { data } = useQuery({
    queryKey: computed(() => posKeys.suggestions(businessId.value, branchId.value, lastProductId.value)),
    queryFn: () => getFrequentlyBoughtTogether(businessId.value!, lastProductId.value!, branchId.value),
    enabled: computed(() => !!businessId.value && !!lastProductId.value),
  })

  const suggestions = computed(() => {
    const cartIds = new Set(cart.value.map(item => item.productId))
    return (data.value ?? []).filter(product => !cartIds.has(product.id))
  })

  return { suggestions }
}
