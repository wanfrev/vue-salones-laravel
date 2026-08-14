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

const emptyForm = (): LeadFormData => ({
  companyName: '',
  workArea: '',
  address: '',
  phone: '',
  status: 'new',
  notes: '',
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
    form.value = {
      companyName: lead.companyName,
      workArea: lead.workArea,
      address: lead.address,
      phone: lead.phone,
      status: lead.status,
      notes: lead.notes,
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

    if (!crud.saveError.value) {
      closeModal()
    }
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
  }
}
