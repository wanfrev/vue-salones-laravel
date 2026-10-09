<template>
  <div class="space-y-4">
    <div v-if="!showForm" class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-semibold text-text">Programas <span class="font-normal text-text-muted">({{ enrollments.length }})</span></p>
      <button @click="showForm = true" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
        <AddCircleIcon class="h-4 w-4" />
        Inscribir en un programa
      </button>
    </div>

    <EnrollmentForm
      v-if="showForm"
      :patient="{ id: clientId, full_name: '' }"
      :programs="programs"
      :employees="employees"
      :branch-id="branchId"
      :saving="enrollMutation.isPending.value"
      @submit="handleEnroll"
      @cancel="showForm = false"
    />

    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>

    <div v-else-if="enrollments.length === 0 && !showForm" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
      Este paciente no está inscrito en ningún programa.
    </div>

    <EnrollmentCard
      v-for="e in enrollments"
      :key="e.id"
      :enrollment="e"
      :is-admin="isAdmin"
      @extend="expiresOn => extendMutation.mutate({ id: e.id, expiresOn })"
      @cancel="cancelMutation.mutate(e.id)"
      @consumes="(appointmentId, consumes) => consumesMutation.mutate({ id: e.id, appointmentId, consumes })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { AddCircleIcon } from '@solar-icons/vue/linear'
import EnrollmentForm from '../components/clinical/EnrollmentForm.vue'
import EnrollmentCard from '../components/clinical/EnrollmentCard.vue'
import { useClientEnrollments, useEnrollmentOptions } from '../composables/clinical/usePrograms'
import type { EnrollPayload } from '../services/clinical/programService'

const route = useRoute()
const clientId = computed(() => route.params.id as string)

const showForm = ref(false)
const { programs, employees, branchId } = useEnrollmentOptions()
const { enrollments, isLoading, isAdmin, enrollMutation, extendMutation, cancelMutation, consumesMutation } = useClientEnrollments(() => clientId.value)

async function handleEnroll(v: { clientId: string; payload: EnrollPayload }) {
  try {
    await enrollMutation.mutateAsync(v.payload)
    showForm.value = false
  } catch {
    // El toast de error ya lo muestra onError (choque de horario, vigencia...); el formulario queda abierto.
  }
}
</script>
