<template>
  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <!-- Consentimientos ya firmados -->
    <div v-if="!showNewForm" class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-text">Consentimientos firmados</p>
        <button @click="openNew" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
          <AddCircleIcon class="h-4 w-4" />
          Nuevo consentimiento
        </button>
      </div>

      <div v-if="consents.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Este paciente todavía no tiene consentimientos firmados.
      </div>

      <article v-for="c in consents" :key="c.id" class="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-xs text-text-muted">{{ formatDateTime(c.signed_at) }}</p>
            <p class="mt-1 text-sm font-medium text-text">{{ c.title }}</p>
            <p v-if="c.signer_name" class="mt-1 text-xs text-text-secondary">
              Firmado por {{ c.signer_name }}<span v-if="c.signer_relationship"> ({{ c.signer_relationship }})</span>
            </p>
            <details class="mt-2">
              <summary class="cursor-pointer text-xs font-semibold text-primary">Ver texto firmado</summary>
              <p class="mt-2 whitespace-pre-line text-xs text-text-secondary">{{ c.content }}</p>
            </details>
          </div>
          <img :src="c.signature_data" alt="Firma" class="h-20 w-40 shrink-0 rounded-lg border border-border bg-white object-contain" />
        </div>
      </article>
    </div>

    <!-- Nuevo consentimiento -->
    <div v-else class="space-y-4">
      <div class="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <FormSelect :model-value="selectedTemplateId" @update:model-value="applyTemplate" label="Plantilla" :options="templateOptions" />
        <FormInput v-model="title" label="Título del documento" />
        <FormTextarea v-model="content" label="Texto del consentimiento (editable antes de firmar)" :rows="14" :show-char-count="false" />

        <div v-if="requiresGuardian" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput v-model="signerName" label="Nombre del representante legal" required />
          <FormInput v-model="signerRelationship" label="Parentesco" placeholder="Ej: Madre, padre, tutor" />
        </div>

        <div>
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {{ requiresGuardian ? 'Firma del representante legal' : 'Firma del paciente' }}
          </p>
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
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { AddCircleIcon } from '@solar-icons/vue/linear'
import { useInformedConsents } from '../composables/clinical/useInformedConsents'
import { formatDateTime } from '../lib/formatters'
// El lienzo de firma es genérico (no tiene nada dental) — se reutiliza tal cual.
import SignaturePad from '../components/dental/SignaturePad.vue'
import { FormInput, FormSelect, FormTextarea } from '../components/forms'
import { CLINICAL_CONSENT_TEMPLATES, getClinicalConsentTemplate } from '../components/clinical/consentTemplates'
import { guardianFromMetadata, isMinor } from '../components/clinical/cases'
import { getClienteById } from '../services/clientesService'

const route = useRoute()
const clienteId = computed(() => route.params.id as string)

const { consents, isLoading, createMutation } = useInformedConsents(() => clienteId.value)

// Mismo query que el encabezado del expediente (caché compartida).
const { data: cliente } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})

const templateOptions = CLINICAL_CONSENT_TEMPLATES.map(t => ({ value: t.id, label: t.label }))
const selectedTemplateId = ref(CLINICAL_CONSENT_TEMPLATES[0].id)
const title = ref('')
const content = ref('')
const signerName = ref('')
const signerRelationship = ref('')
const signatureData = ref<string | null>(null)
const showNewForm = ref(false)

const requiresGuardian = computed(() => getClinicalConsentTemplate(selectedTemplateId.value).requiresGuardian)

function applyTemplate(templateId: string) {
  const template = getClinicalConsentTemplate(templateId)
  selectedTemplateId.value = template.id
  title.value = template.title
  content.value = template.content
}

// Para un menor se abre la plantilla de tutor y se precarga quien firma con los datos del tutor del perfil (editables).
function openNew() {
  showNewForm.value = true
  if (!isMinor(cliente.value?.birthday)) return
  applyTemplate('minor')
  const guardian = guardianFromMetadata(cliente.value?.metadata)
  if (guardian) {
    signerName.value = guardian.name
    signerRelationship.value = guardian.relationship
  }
}

function resetForm() {
  applyTemplate(CLINICAL_CONSENT_TEMPLATES[0].id)
  signerName.value = ''
  signerRelationship.value = ''
  signatureData.value = null
}
resetForm()

const isSaving = computed(() => createMutation.isPending.value)
const canSign = computed(() =>
  !!title.value.trim() && !!content.value.trim() && !!signatureData.value
  && (!requiresGuardian.value || !!signerName.value.trim()),
)

async function handleSign() {
  if (!canSign.value || !signatureData.value) return
  try {
    await createMutation.mutateAsync({
      title: title.value.trim(),
      content: content.value.trim(),
      signature_data: signatureData.value,
      signer_name: signerName.value.trim() || null,
      signer_relationship: signerRelationship.value.trim() || null,
    })
    showNewForm.value = false
    resetForm()
  } catch {
    // El toast de error ya lo muestra onError; el documento queda abierto para no perder la firma.
  }
}

function cancelNew() {
  showNewForm.value = false
  resetForm()
}
</script>
