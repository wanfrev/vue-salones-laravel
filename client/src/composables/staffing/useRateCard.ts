import { computed, ref, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  deleteStaffingRate,
  listStaffingRates,
  saveStaffingRate,
  staffingRateKeys,
  type StaffingRateFormData,
  type StaffingRateRow,
} from '../../services/staffingService'

/**
 * The rate card of one company: role -> (pay rate, bill rate). Kept separate from useEmpresas
 * because it is scoped to whichever company is expanded, not to the company list.
 */
export function useRateCard(businessId: Ref<string | null>, companyId: Ref<string | null>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const saveError = ref('')

  const queryKey = computed(() => staffingRateKeys.byCompany(businessId.value, companyId.value))

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listStaffingRates(businessId.value!, companyId.value),
    enabled: computed(() => !!businessId.value && !!companyId.value),
  })

  const rates = computed<StaffingRateRow[]>(() => data.value ?? [])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: staffingRateKeys.all(businessId.value), exact: false })

  const saveMutation = useMutation({
    mutationFn: (form: StaffingRateFormData & { id?: string }) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return saveStaffingRate(businessId.value, form)
    },
    onSuccess: async () => {
      await invalidate()
      success('Tarifa guardada')
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStaffingRate(id),
    onSuccess: async () => {
      await invalidate()
      success('Tarifa eliminada')
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const save = async (form: StaffingRateFormData & { id?: string }) => {
    saveError.value = ''
    try {
      await saveMutation.mutateAsync(form)
      return true
    } catch {
      return false // reported through saveError + toast
    }
  }

  /** Average of what the agency keeps per hour across the card — a quick health read. */
  const averageHourlyMargin = computed(() => {
    if (rates.value.length === 0) return 0
    return rates.value.reduce((acc, r) => acc + r.hourlyMargin, 0) / rates.value.length
  })

  return {
    rates,
    isLoading,
    saveError,
    saveMutation,
    deleteMutation,
    save,
    remove: (id: string) => deleteMutation.mutate(id),
    averageHourlyMargin,
  }
}
