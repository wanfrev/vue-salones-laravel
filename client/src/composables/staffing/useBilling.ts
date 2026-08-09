import { computed, ref, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  createCompanyPayment,
  deleteCompanyPayment,
  generateStaffingInvoice,
  getCompanyBalance,
  listCompanyPayments,
  listStaffingInvoices,
  staffingCompanyPaymentKeys,
  staffingInvoiceKeys,
  type StaffingCompanyPaymentFormData,
} from '../../services/staffingService'

/** One company's billing: invoices, running balance, and the abonos against it. */
export function useBilling(businessId: Ref<string | null>, companyId: Ref<string | null>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const saveError = ref('')

  const enabled = computed(() => !!businessId.value && !!companyId.value)

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: computed(() => staffingInvoiceKeys.byCompany(businessId.value, companyId.value)),
    queryFn: () => listStaffingInvoices(businessId.value!, companyId.value),
    enabled,
  })

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: computed(() => staffingInvoiceKeys.balance(businessId.value, companyId.value)),
    queryFn: () => getCompanyBalance(companyId.value!),
    enabled,
  })

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: computed(() => staffingCompanyPaymentKeys.byCompany(businessId.value, companyId.value)),
    queryFn: () => listCompanyPayments(businessId.value!, companyId.value),
    enabled,
  })

  const invalidateAll = () =>
    Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: staffingInvoiceKeys.byCompany(businessId.value, companyId.value), exact: false }),
      queryClient.invalidateQueries({ queryKey: staffingInvoiceKeys.balance(businessId.value, companyId.value), exact: false }),
      queryClient.invalidateQueries({ queryKey: staffingCompanyPaymentKeys.byCompany(businessId.value, companyId.value), exact: false }),
    ])

  const generateMutation = useMutation({
    mutationFn: (timesheetId: string) => generateStaffingInvoice(timesheetId),
    onSuccess: async (invoice) => {
      await invalidateAll()
      success(`Factura #${invoice.invoice_number} generada`)
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const paymentMutation = useMutation({
    mutationFn: (data: StaffingCompanyPaymentFormData) => createCompanyPayment(data),
    onSuccess: async () => {
      await invalidateAll()
      success('Abono registrado')
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => deleteCompanyPayment(id),
    onSuccess: async () => {
      await invalidateAll()
      success('Abono eliminado')
    },
    onError: (err) => showError(translateError(err)),
  })

  const generateInvoice = async (timesheetId: string) => {
    saveError.value = ''
    try {
      return await generateMutation.mutateAsync(timesheetId)
    } catch {
      return null
    }
  }

  const addPayment = async (data: StaffingCompanyPaymentFormData) => {
    saveError.value = ''
    try {
      await paymentMutation.mutateAsync(data)
      return true
    } catch {
      return false
    }
  }

  return {
    invoices,
    invoicesLoading,
    balance,
    balanceLoading,
    payments,
    paymentsLoading,
    saveError,
    generateMutation,
    paymentMutation,
    generateInvoice,
    addPayment,
    removePayment: (id: string) => deletePaymentMutation.mutate(id),
  }
}
