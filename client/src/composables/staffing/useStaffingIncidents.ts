import { computed, ref, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  listStaffingIncidents, createStaffingIncident, updateStaffingIncident, deleteStaffingIncident,
  uploadIncidentSingleFile, deleteIncidentSingleFile, addIncidentFile, deleteIncidentFile,
  staffingIncidentKeys,
  type StaffingIncidentFormData, type IncidentFileType,
} from '../../services/staffing/staffingIncidentService'

export function useStaffingIncidents(businessId: Ref<string | null>, companyId: Ref<string | null>, status: Ref<string | null>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const saveError = ref('')

  const queryKey = computed(() => staffingIncidentKeys.all(businessId.value, companyId.value, status.value))

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listStaffingIncidents(companyId.value, status.value),
    enabled: computed(() => !!businessId.value),
  })

  const incidents = computed(() => data.value ?? [])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staffing-incidents', businessId.value], exact: false })

  const createMutation = useMutation({
    mutationFn: (form: StaffingIncidentFormData) => createStaffingIncident(form),
    onSuccess: async () => { await invalidate(); success('Incidente creado') },
    onError: (err) => { saveError.value = translateError(err); showError(saveError.value) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffingIncidentFormData> }) => updateStaffingIncident(id, data),
    onSuccess: async () => { await invalidate() },
    onError: (err) => showError(translateError(err, 'No se pudo actualizar el incidente.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStaffingIncident(id),
    onSuccess: async () => { await invalidate(); success('Incidente eliminado') },
    onError: (err) => showError(translateError(err, 'No se pudo eliminar el incidente.')),
  })

  const uploadSingleMutation = useMutation({
    mutationFn: ({ incidentId, field, file }: { incidentId: string; field: 'reporte' | 'relief_form'; file: File }) =>
      uploadIncidentSingleFile(incidentId, field, file),
    onSuccess: async () => { await invalidate(); success('Archivo subido') },
    onError: (err) => showError(translateError(err, 'No se pudo subir el archivo.')),
  })

  const deleteSingleFileMutation = useMutation({
    mutationFn: ({ incidentId, field }: { incidentId: string; field: 'reporte' | 'relief_form' }) =>
      deleteIncidentSingleFile(incidentId, field),
    onSuccess: async () => { await invalidate(); success('Archivo eliminado') },
    onError: (err) => showError(translateError(err, 'No se pudo eliminar el archivo.')),
  })

  const addFileMutation = useMutation({
    mutationFn: ({ incidentId, fileType, file }: { incidentId: string; fileType: IncidentFileType; file: File }) =>
      addIncidentFile(incidentId, fileType, file),
    onSuccess: async () => { await invalidate(); success('Archivo agregado') },
    onError: (err) => showError(translateError(err, 'No se pudo subir el archivo.')),
  })

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => deleteIncidentFile(fileId),
    onSuccess: async () => { await invalidate() },
    onError: (err) => showError(translateError(err, 'No se pudo eliminar el archivo.')),
  })

  return {
    incidents,
    isLoading,
    saveError,
    createMutation,
    updateMutation,
    deleteMutation,
    uploadSingleMutation,
    deleteSingleFileMutation,
    addFileMutation,
    deleteFileMutation,
  }
}
