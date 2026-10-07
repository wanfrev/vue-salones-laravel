import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  addCaseMember, createCase, getCase, listCases, removeCaseMember, updateCase,
  type CreateCasePayload, type UpdateCasePayload,
} from '../../services/clinical/caseService'
import { useClinicalAccess } from './useClinicalToolsNavTabs'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import type { ClinicalCaseStatus } from '../../types/database'

/** Claves de TanStack Query de todo lo que cambia cuando cambia un caso — se invalidan juntas. */
const CASE_KEYS = ['clinical-cases', 'clinical-case', 'clinical-client-cases'] as const

export function useCases(status: () => ClinicalCaseStatus | undefined = () => undefined) {
  const queryClient = useQueryClient()
  const hasAccess = useClinicalAccess()
  const { success, error: showError } = useNotification()

  const casesQuery = useQuery({
    queryKey: computed(() => ['clinical-cases', status() ?? 'all']),
    queryFn: () => listCases(status()),
    enabled: hasAccess,
    staleTime: 0,
  })

  const cases = computed(() => casesQuery.data.value ?? [])

  const createMutation = useMutation({
    mutationFn: (data: CreateCasePayload) => createCase(data),
    onSuccess: () => {
      for (const key of CASE_KEYS) queryClient.invalidateQueries({ queryKey: [key], exact: false })
      success('Caso creado')
    },
    onError: err => showError(translateError(err, 'Error al crear el caso')),
  })

  return { casesQuery, cases, isLoading: casesQuery.isLoading, hasAccess, createMutation }
}

export function useCase(caseId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const caseQuery = useQuery({
    queryKey: computed(() => ['clinical-case', caseId()]),
    queryFn: async () => {
      const id = caseId()
      return id ? await getCase(id) : null
    },
    enabled: computed(() => !!caseId()),
    staleTime: 0,
  })

  const invalidate = () => {
    for (const key of CASE_KEYS) queryClient.invalidateQueries({ queryKey: [key], exact: false })
  }

  const withCaseId = async <T>(fn: (id: string) => Promise<T>): Promise<T> => {
    const id = caseId()
    if (!id) throw new Error('No case selected')
    return await fn(id)
  }

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCasePayload) => withCaseId(id => updateCase(id, data)),
    onSuccess: () => { invalidate(); success('Caso actualizado') },
    onError: err => showError(translateError(err, 'Error al actualizar el caso')),
  })

  const addMemberMutation = useMutation({
    mutationFn: (data: { client_id: string; role?: string | null }) => withCaseId(id => addCaseMember(id, data)),
    onSuccess: () => { invalidate(); success('Integrante agregado') },
    onError: err => showError(translateError(err, 'No se pudo agregar al integrante')),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (clientId: string) => withCaseId(id => removeCaseMember(id, clientId)),
    onSuccess: () => { invalidate(); success('El integrante salió del caso') },
    onError: err => showError(translateError(err, 'No se pudo quitar al integrante')),
  })

  return {
    caseQuery,
    clinicalCase: computed(() => caseQuery.data.value ?? null),
    isLoading: caseQuery.isLoading,
    updateMutation,
    addMemberMutation,
    removeMemberMutation,
  }
}
