<template>
  <header class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:mb-6">
    <div>
      <div class="flex items-center gap-2 text-sm text-primary mb-0.5">
        <ClipboardIcon class="h-4 w-4" />
        <span class="font-medium uppercase tracking-wider">Consentimiento informado</span>
      </div>
      <p class="text-sm font-semibold text-text sm:text-base">{{ cliente?.name || terminology.client || 'Paciente' }}</p>
    </div>
    <button @click="goBack" class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
      <ArrowLeftIcon class="h-4 w-4" />
      Volver
    </button>
  </header>

  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <!-- Lista de consentimientos ya firmados -->
    <div v-if="!showNewForm" class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-text">Consentimientos firmados</p>
        <button @click="showNewForm = true" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
          <AddCircleIcon class="h-4 w-4" />
          Nuevo consentimiento
        </button>
      </div>

      <div v-if="consents.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Este paciente todavía no tiene consentimientos firmados.
      </div>

      <div v-for="c in consents" :key="c.id" class="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex-1">
            <p class="text-xs text-text-muted">{{ formatDate(c.signed_at) }}</p>
            <p class="mt-1 text-sm font-medium text-text">{{ c.procedure_description }}</p>
            <p class="mt-1 whitespace-pre-line text-xs text-text-secondary">{{ c.risks_text }}</p>
          </div>
          <img :src="c.signature_data" alt="Firma del paciente" class="h-20 w-40 shrink-0 rounded-lg border border-border bg-white object-contain" />
        </div>
      </div>
    </div>

    <!-- Nuevo consentimiento -->
    <div v-else class="space-y-4">
      <div class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6 space-y-4">
        <FormSelect v-model="selectedTemplateId" label="Plantilla de procedimiento" :options="templateOptions" @update:model-value="applyTemplate" />

        <FormTextarea v-model="procedureDescription" label="Descripción del procedimiento" :rows="2" />
        <FormTextarea v-model="risksText" label="Riesgos y complicaciones" :rows="6" />

        <div class="rounded-lg border border-border-subtle bg-bg-secondary/50 p-3">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Términos del consentimiento</p>
          <p class="max-h-40 overflow-y-auto whitespace-pre-line text-xs text-text-secondary">{{ CONSENT_LEGAL_TEXT }}</p>
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Firma del paciente</p>
          <SignaturePad v-model="signatureData" />
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button @click="cancelNew" class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
          Cancelar
        </button>
        <button
          @click="handleSign"
          :disabled="!canSign || isSaving"
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50"
        >
          {{ isSaving ? 'Guardando...' : 'Firmar y guardar' }}
        </button>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftIcon, ClipboardIcon, AddCircleIcon } from '@solar-icons/vue/linear'
import { useBusinessStore } from '../store/business'
import { getClienteById } from '../services/clientesService'
import { useConsents } from '../composables/dental/useConsents'
import SignaturePad from '../components/dental/SignaturePad.vue'
import { FormTextarea, FormSelect } from '../components/forms'
import { CONSENT_TEMPLATES, CONSENT_LEGAL_TEXT } from '../components/dental/consentTemplates'

const route = useRoute()
const router = useRouter()
const businessStore = useBusinessStore()

const clienteId = computed(() => route.params.id as string)
const terminology = computed(() => businessStore.terminology)

const { data: clienteData } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})
const cliente = computed(() => clienteData.value ?? null)

const { consents, isLoading, createMutation } = useConsents(() => clienteId.value)

const templateOptions = CONSENT_TEMPLATES.map(t => ({ value: t.id, label: t.label }))
const selectedTemplateId = ref(CONSENT_TEMPLATES[0].id)
const procedureDescription = ref('')
const risksText = ref('')
const signatureData = ref<string | null>(null)
const showNewForm = ref(false)

function applyTemplate(templateId: string) {
  const template = CONSENT_TEMPLATES.find(t => t.id === templateId)
  if (!template) return
  procedureDescription.value = template.procedureDescriptionPlaceholder
  risksText.value = template.risksText
}

function resetForm() {
  selectedTemplateId.value = CONSENT_TEMPLATES[0].id
  applyTemplate(selectedTemplateId.value)
  signatureData.value = null
}
resetForm()

const canSign = computed(() => !!procedureDescription.value.trim() && !!risksText.value.trim() && !!signatureData.value)
const isSaving = computed(() => createMutation.isPending.value)

async function handleSign() {
  if (!canSign.value || !signatureData.value) return
  await createMutation.mutateAsync({
    procedure_description: procedureDescription.value.trim(),
    risks_text: risksText.value.trim(),
    signature_data: signatureData.value,
  })
  showNewForm.value = false
  resetForm()
}

function cancelNew() {
  showNewForm.value = false
  resetForm()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function goBack() {
  router.push(`/admin/clientes/${clienteId.value}`)
}
</script>
