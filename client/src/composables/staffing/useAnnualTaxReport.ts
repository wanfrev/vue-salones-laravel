import { computed, ref, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  deleteTaxEntry,
  downloadTaxEntryFile,
  getAnnualTaxReport,
  saveTaxEntry,
  type StaffingTaxEntryFormData,
} from '../../services/staffingService'

const queryKey = (businessId: string | null, year: number) => ['staffing-annual-tax', businessId, year] as const

/** The annual taxes grid — employees x configurable tax entities — plus the per-cell mutation. */
export function useAnnualTaxReport(businessId: Ref<string | null>, year: Ref<number>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const saveError = ref('')

  const key = computed(() => queryKey(businessId.value, year.value))

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => getAnnualTaxReport(year.value),
    enabled: computed(() => !!businessId.value),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key.value, exact: false })

  const saveMutation = useMutation({
    mutationFn: (form: StaffingTaxEntryFormData) => saveTaxEntry(form),
    onSuccess: async () => {
      await invalidate()
      success('Registro guardado')
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxEntry(id),
    onSuccess: async () => {
      await invalidate()
      success('Registro eliminado')
    },
    onError: (err) => showError(translateError(err)),
  })

  const saveEntry = async (form: StaffingTaxEntryFormData) => {
    saveError.value = ''
    try {
      await saveMutation.mutateAsync(form)
      return true
    } catch {
      return false
    }
  }

  const downloadFile = async (entryId: string, fallbackFilename: string) => {
    try {
      await downloadTaxEntryFile(entryId, fallbackFilename)
    } catch (err) {
      showError(translateError(err))
    }
  }

  return {
    entities: computed(() => data.value?.entities ?? []),
    employees: computed(() => data.value?.employees ?? []),
    isLoading,
    saveError,
    saveMutation,
    deleteMutation,
    saveEntry,
    removeEntry: (id: string) => deleteMutation.mutate(id),
    downloadFile,
  }
}
