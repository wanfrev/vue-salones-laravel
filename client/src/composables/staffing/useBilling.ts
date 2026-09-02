import { computed, ref, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  createCompanyPayment,
  deleteCompanyPayment,
  deleteStaffingInvoice,
  generateStaffingInvoice,
  getCompanyBalance,
  getStaffingProjects,
  listCompanyPayments,
  listStaffingInvoices,
  staffingCompanyKeys,
  staffingCompanyPaymentKeys,
  staffingInvoiceKeys,
  staffingTimesheetKeys,
  type StaffingCompanyPaymentFormData,
} from '../../services/staffing/staffingService'

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

  // So the invoice table can show/filter by project name instead of a bare id.
  const { data: projects } = useQuery({
    queryKey: computed(() => staffingCompanyKeys.projects(businessId.value, companyId.value)),
    queryFn: () => getStaffingProjects(companyId.value!),
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
      // Deleting an invoice reopens its week to draft — the "Horas trabajadas" tab needs to
      // pick that status change up too.
      queryClient.invalidateQueries({ queryKey: staffingTimesheetKeys.byCompany(businessId.value, companyId.value), exact: false }),
    ])

  const generateMutation = useMutation({
    mutationFn: ({ timesheetId, invoiceNumber }: { timesheetId: string; invoiceNumber?: string }) =>
      generateStaffingInvoice(timesheetId, invoiceNumber),
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

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) => deleteStaffingInvoice(id),
    onSuccess: async () => {
      await invalidateAll()
      success('Factura eliminada — la semana volvió a borrador y ya puede editarse')
    },
    onError: (err) => showError(translateError(err)),
  })

  const generateInvoice = async (timesheetId: string, invoiceNumber?: string) => {
    saveError.value = ''
    try {
      return await generateMutation.mutateAsync({ timesheetId, invoiceNumber })
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
    projects,
    balance,
    balanceLoading,
    payments,
    paymentsLoading,
    saveError,
    generateMutation,
    paymentMutation,
    deleteInvoiceMutation,
    generateInvoice,
    addPayment,
    removePayment: (id: string) => deletePaymentMutation.mutate(id),
    removeInvoice: (id: string) => deleteInvoiceMutation.mutate(id),
  }
}
