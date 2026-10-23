<template>
  <div>
    <ClinicalPageHeader
      :icon="BoxIcon"
      title="Programas"
      description="Paquetes de sesiones que se cobran juntos. Al inscribir a un paciente se crean todas sus citas en el calendario; el programa se cobra una sola vez en el punto de venta, donde también se ve cuántas sesiones lleva."
    >
      <template v-if="mode === 'list'">
        <button @click="mode = 'enroll'" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover">
          <AddCircleIcon class="h-4 w-4" />
          Inscribir paciente
        </button>
        <button v-if="isAdmin" @click="openNew" class="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text transition-theme hover:bg-bg-secondary">
          Nuevo programa
        </button>
      </template>
    </ClinicalPageHeader>

    <EnrollmentForm
      v-if="mode === 'enroll'"
      class="mb-4"
      :programs="activePrograms"
      :employees="employees"
      :branch-id="branchId"
      :saving="enrolling"
      :error="enrollError"
      @submit="handleEnroll"
      @cancel="mode = 'list'"
    />

    <ProgramForm
      v-else-if="mode === 'edit'"
      :key="editing?.id ?? 'new'"
      class="mb-4"
      :initial="editing"
      :services="serviceOptions"
      :employees="employees"
      :saving="saving"
      @submit="handleSave"
      @cancel="closeForm"
    />

    <section class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <ClinicalListSkeleton v-if="isLoading" />

      <div v-else-if="programs.length === 0" class="px-4 py-12 text-center text-sm text-text-muted">
        Todavía no hay programas.<span v-if="isAdmin"> Crea el primero con «Nuevo programa».</span>
      </div>

      <ul v-else class="divide-y divide-border-subtle">
        <li v-for="p in programs" :key="p.id" class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-3 py-3 sm:px-4" :class="p.active ? '' : 'opacity-60'">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-text">
              {{ p.name }}
              <span v-if="!p.active" class="ml-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">· Desactivado</span>
            </p>
            <p class="mt-0.5 text-xs tabular-nums text-text-secondary">${{ p.price }} · {{ p.sessions_total }} sesiones · {{ p.validity_days }} días</p>
            <ul class="mt-1.5 space-y-0.5">
              <li v-for="(c, i) in p.components" :key="i" class="text-xs text-text-muted">
                <strong class="text-text-secondary">{{ c.quantity }}×</strong> {{ c.services.map(s => s.name).join(' / ') }}
                <span> — {{ c.employee_name ?? 'especialista por elegir' }}</span>
              </li>
            </ul>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button v-if="isAdmin" @click="openEdit(p)" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">Editar</button>
            <button v-if="isAdmin" @click="handleDelete(p)" :disabled="deleteMutation.isPending.value" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50">Eliminar</button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { AddCircleIcon, BoxIcon } from '@solar-icons/vue/linear'
import ClinicalListSkeleton from '../components/clinical/ClinicalListSkeleton.vue'
import ClinicalPageHeader from '../components/clinical/ClinicalPageHeader.vue'
import EnrollmentForm from '../components/clinical/EnrollmentForm.vue'
import ProgramForm from '../components/clinical/ProgramForm.vue'
import { enrollClient, type EnrollPayload, type ProgramPayload } from '../services/clinical/programService'
import { useEnrollmentOptions, usePrograms } from '../composables/clinical/usePrograms'
import { useNotification } from '../composables/common/useNotification'
import { translateError } from '../lib/errors'
import { listServicios } from '../services/serviciosService'
import { useAuthStore } from '../store/auth'
import { useBusinessStore } from '../store/business'
import { useQueryClient } from '@tanstack/vue-query'
import type { ClinicalProgram } from '../types/database'

const authStore = useAuthStore()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()
const { success, error: showError } = useNotification()

const mode = ref<'list' | 'enroll' | 'edit'>('list')
const editing = ref<ClinicalProgram | null>(null)

const { programs, isLoading, isAdmin, createMutation, updateMutation, deleteMutation } = usePrograms()
const { programs: activePrograms, employees, branchId } = useEnrollmentOptions()
const saving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

// Servicios del negocio, solo para armar el catálogo (los programas apuntan a servicios existentes).
const { data: servicesData } = useQuery({
  queryKey: computed(() => ['clinical-program-services', authStore.businessId, businessStore.currentBranchId]),
  queryFn: () => listServicios(authStore.businessId!, businessStore.currentBranchId),
  enabled: computed(() => !!authStore.businessId && isAdmin.value),
  staleTime: 5 * 60 * 1000,
})
const serviceOptions = computed(() => (servicesData.value ?? []).map(s => ({ id: s.id, name: s.name })))

const openNew = () => { editing.value = null; mode.value = 'edit' }
const openEdit = (p: ClinicalProgram) => { editing.value = p; mode.value = 'edit' }
const closeForm = () => { editing.value = null; mode.value = 'list' }

function handleDelete(p: ClinicalProgram) {
  const ok = window.confirm(
    `¿Eliminar el programa «${p.name}»?\n\nLos pacientes ya inscritos conservan su programa, sus citas y su cobro. `
    + 'Si solo quieres dejar de ofrecerlo, desactívalo en «Editar» en vez de eliminarlo.',
  )
  if (!ok) return
  // Si justo se estaba editando ese programa, se cierra el formulario para no guardar sobre uno que ya no existe.
  if (editing.value?.id === p.id) closeForm()
  deleteMutation.mutate(p.id)
}

async function handleSave(payload: ProgramPayload) {
  try {
    if (editing.value) await updateMutation.mutateAsync({ id: editing.value.id, data: payload })
    else await createMutation.mutateAsync(payload)
    closeForm()
  } catch {
    // El toast de error ya lo muestra onError; el formulario queda abierto para no perder lo escrito.
  }
}

// Inscribir desde aquí (con selector de paciente): no pasa por una ficha, así que la mutación va directa.
const enrolling = ref(false)
const enrollError = ref<string | null>(null)
async function handleEnroll(v: { clientId: string; payload: EnrollPayload }) {
  enrolling.value = true
  enrollError.value = null
  try {
    await enrollClient(v.clientId, v.payload)
    for (const key of ['clinical-enrollments', 'appointments', 'pos-pending']) queryClient.invalidateQueries({ queryKey: [key], exact: false })
    success('Paciente inscrito: las citas ya están en el calendario y el programa en el punto de venta')
    mode.value = 'list'
  } catch (err) {
    // El motivo (choques de horario, vigencia...) queda dentro del formulario, que sigue abierto para corregirlo.
    enrollError.value = translateError(err, 'No se pudo inscribir al paciente')
    showError(enrollError.value)
  } finally {
    enrolling.value = false
  }
}
</script>
