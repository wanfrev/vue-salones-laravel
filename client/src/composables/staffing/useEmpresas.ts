import { computed, ref, type Ref } from 'vue'
import { useCrud } from '../empleados/useCrud'
import { useBusinessStore } from '../../store/business'
import {
  DEFAULT_TAX_BRACKETS,
  deleteStaffingCompany,
  listStaffingCompanies,
  saveStaffingCompany,
  staffingCompanyKeys,
  type StaffingCompanyFormData,
  type StaffingCompanyRow,
} from '../../services/staffingService'

const emptyForm = (): StaffingCompanyFormData => ({
  name: '',
  legalName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  workSite: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  paymentTermsDays: 15,
  overtimeThresholdHours: 40,
  overtimeMultiplier: 1.5,
  // A new client starts on the agreement the agency actually uses today; blanking the brackets
  // is one click away and means "this client withholds nothing".
  taxBrackets: DEFAULT_TAX_BRACKETS.map(b => ({ ...b })),
  taxDestination: 'remitted',
  payoutRounding: 'cent',
  notes: '',
})

export function useEmpresas(businessId: Ref<string | null>) {
  const businessStore = useBusinessStore()
  const branchId = computed(() => businessStore.currentBranchId)

  const showModal = ref(false)
  const editingId = ref<string | null>(null)
  const form = ref<StaffingCompanyFormData>(emptyForm())

  const crud = useCrud<StaffingCompanyRow, StaffingCompanyFormData>({
    businessId,
    branchId,
    queryKey: (id, brId) => staffingCompanyKeys.all(id, brId),
    queryFn: (id, brId) => listStaffingCompanies(id, brId),
    saveFn: (id, data, brId) => saveStaffingCompany(id, data, brId),
    deleteFn: (id) => deleteStaffingCompany(id),
    entityName: 'Empresa',
  })

  const openNew = () => {
    editingId.value = null
    form.value = emptyForm()
    showModal.value = true
  }

  const openEdit = (company: StaffingCompanyRow) => {
    editingId.value = company.id
    form.value = {
      name: company.name,
      legalName: company.legalName,
      address: company.address,
      city: company.city,
      state: company.state,
      zip: company.zip,
      workSite: company.workSite,
      contactName: company.contactName,
      contactPhone: company.contactPhone,
      contactEmail: company.contactEmail,
      paymentTermsDays: company.paymentTermsDays,
      overtimeThresholdHours: company.overtimeThresholdHours,
      overtimeMultiplier: company.overtimeMultiplier,
      taxBrackets: company.taxBrackets.map(b => ({ ...b })),
      taxDestination: company.taxDestination,
      payoutRounding: company.payoutRounding,
      notes: company.notes,
    }
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false
    editingId.value = null
  }

  const handleSave = async () => {
    const payload = editingId.value
      ? { ...form.value, id: editingId.value }
      : { ...form.value }

    await crud.handleSave(payload)

    // useCrud swallows the rejection and reports through saveError instead, so closing
    // unconditionally would hide the failure and look like a successful save.
    if (!crud.saveError.value) {
      closeModal()
    }
  }

  const addBracket = () => {
    form.value.taxBrackets.push({ threshold: null, rate: 0 })
  }

  const removeBracket = (index: number) => {
    form.value.taxBrackets.splice(index, 1)
  }

  return {
    ...crud,
    companies: crud.items,
    showModal,
    editingId,
    form,
    openNew,
    openEdit,
    closeModal,
    handleSave,
    addBracket,
    removeBracket,
  }
}
