import { ref, type Ref } from 'vue'
import { useCrud } from '../empleados/useCrud'
import {
  deleteLead,
  leadKeys,
  listLeads,
  saveLead,
  type LeadFormData,
  type LeadRow,
} from '../../services/leadsService'
import type { LeadStatus } from '../../types/database'

const emptyForm = (): LeadFormData => ({
  companyName: '',
  workArea: '',
  address: '',
  phone: '',
  email: '',
  status: 'new',
  visitDate: '',
  companyCategory: '',
  priority: '',
  contactCard: '',
  state: '',
  notes: '',
})

const leadToFormData = (lead: LeadRow): LeadFormData => ({
  companyName: lead.companyName,
  workArea: lead.workArea,
  address: lead.address,
  phone: lead.phone,
  email: lead.email,
  status: lead.status,
  visitDate: lead.visitDate,
  companyCategory: lead.companyCategory,
  priority: lead.priority,
  contactCard: lead.contactCard,
  state: lead.state,
  notes: lead.notes,
})

export function useLeads(businessId: Ref<string | null>) {
  const showModal = ref(false)
  const editingId = ref<string | null>(null)
  const form = ref<LeadFormData>(emptyForm())

  const crud = useCrud<LeadRow, LeadFormData>({
    businessId,
    queryKey: (id) => leadKeys.all(id),
    queryFn: (id) => listLeads(id),
    saveFn: (id, data) => saveLead(id, data),
    deleteFn: (id) => deleteLead(id),
    entityName: 'Lead',
  })

  const openNew = () => {
    editingId.value = null
    form.value = emptyForm()
    showModal.value = true
  }

  const openEdit = (lead: LeadRow) => {
    editingId.value = lead.id
    form.value = leadToFormData(lead)
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

    if (!crud.saveError.value) {
      closeModal()
    }
  }

  /** Kanban drag-and-drop — moves a card to a new column without opening the edit modal. */
  const updateStatus = (lead: LeadRow, status: LeadStatus) => {
    if (lead.status === status) return
    crud.handleSave({ ...leadToFormData(lead), status, id: lead.id })
  }

  return {
    ...crud,
    leads: crud.items,
    showModal,
    editingId,
    form,
    openNew,
    openEdit,
    closeModal,
    handleSave,
    updateStatus,
  }
}
