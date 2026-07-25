import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { useBusinessStore } from '../../store/business'
import { useAuthStore } from '../../store/auth'
import {
  listDailyReports,
  saveDailyReport,
  deleteDailyReport,
  dailyReportsKeys,
  type DailyReport,
} from '../../services/dailyReportService'

export function useDailyReports() {
  const queryClient = useQueryClient()
  const businessStore = useBusinessStore()
  const authStore = useAuthStore()
  const { success: showSuccess, error: showError } = useNotification()

  const activeBusinessId = computed(() => businessStore.business?.id || authStore.profile?.business_id || null)
  const selectedBranchId = computed(() => businessStore.selectedBranchId)

  const queryKey = computed(() => dailyReportsKeys.all(activeBusinessId.value, selectedBranchId.value))

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => listDailyReports(activeBusinessId.value!, selectedBranchId.value),
    enabled: computed(() => !!activeBusinessId.value),
    staleTime: 0,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<DailyReport>) => saveDailyReport(payload),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['daily-reports'],
        exact: false,
      })
      showSuccess(variables.id ? 'Reporte actualizado exitosamente' : 'Reporte guardado exitosamente')
    },
    onError: (err: any) => {
      console.error('[useDailyReports] Save Error:', err)
      const errorMsg = err?.response?.data?.message || err?.message || 'Error al guardar el reporte'
      showError(errorMsg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDailyReport(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['daily-reports'],
        exact: false,
      })
      showSuccess('Reporte eliminado')
    },
    onError: (err: any) => {
      console.error('[useDailyReports] Delete Error:', err)
      const errorMsg = err?.response?.data?.message || err?.message || 'Error al eliminar el reporte'
      showError(errorMsg)
    },
  })

  return {
    reports,
    isLoading,
    refetch,
    saveMutation,
    deleteMutation,
    activeBusinessId,
    selectedBranchId,
  }
}
