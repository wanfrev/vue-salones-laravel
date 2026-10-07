<template>
  <div class="space-y-4">
    <!-- Subir -->
    <div class="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">Subir archivo</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[12rem_1fr]">
        <FormSelect :model-value="category" @update:model-value="category = $event as AttachmentCategory" label="Categoría" :options="CATEGORY_OPTIONS" />
        <FormInput v-model="title" label="Título" placeholder="Ej: MMPI-2 aplicado en septiembre" />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-text-secondary">Archivo</label>
        <input ref="fileInput" type="file" :accept="ATTACHMENT_ACCEPT" @change="onFile"
          class="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/15" />
        <p class="mt-1 text-xs text-text-muted">PDF, imágenes o Word · máximo {{ formatSize(ATTACHMENT_MAX_BYTES) }}. Se guarda cifrado.</p>
      </div>

      <p v-if="fileProblem" class="text-sm text-danger">{{ fileProblem }}</p>

      <div class="flex justify-end">
        <button @click="handleUpload" :disabled="!canUpload || uploadMutation.isPending.value"
          class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50">
          {{ uploadMutation.isPending.value ? 'Subiendo...' : 'Subir archivo' }}
        </button>
      </div>
    </div>

    <!-- Lista -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>

    <div v-else-if="attachments.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
      Este paciente todavía no tiene archivos adjuntos.
    </div>

    <ul v-else class="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <li v-for="a in attachments" :key="a.id" class="flex flex-wrap items-center justify-between gap-3 p-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="CATEGORY_TONE[a.category]">{{ CATEGORY_LABELS[a.category] }}</span>
            <p class="truncate text-sm font-semibold text-text">{{ a.title }}</p>
          </div>
          <p class="mt-1 truncate text-xs text-text-muted">{{ a.original_name }} · {{ formatSize(a.size) }} · {{ formatDateTime(a.created_at) }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="handleDownload(a)" :disabled="downloadingId === a.id" class="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/10 disabled:opacity-50">
            {{ downloadingId === a.id ? 'Descargando...' : 'Descargar' }}
          </button>
          <button v-if="isStrictAdmin" @click="handleDelete(a)" class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/5">Eliminar</button>
        </div>
      </li>
    </ul>

    <p class="text-xs text-text-muted">Cada descarga y cada eliminación queda anotada en la auditoría clínica. Solo el administrador puede eliminar archivos.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { FormInput, FormSelect } from '../components/forms'
import { useAttachments } from '../composables/clinical/useAttachments'
import { useAuthStore } from '../store/auth'
import {
  ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES, CATEGORY_LABELS, CATEGORY_OPTIONS, CATEGORY_TONE, fileError, formatSize, suggestTitle,
} from '../components/clinical/attachments'
import { formatDateTime } from '../lib/formatters'
import type { AttachmentCategory, ClinicalAttachment } from '../types/database'

const route = useRoute()
const authStore = useAuthStore()
const clienteId = computed(() => route.params.id as string)

const { attachments, isLoading, uploadMutation, deleteMutation, download } = useAttachments(() => clienteId.value)

// Mismo criterio que el servidor: solo el administrador elimina.
const isStrictAdmin = computed(() => authStore.role === 'admin' || authStore.role === 'superadmin')

const category = ref<AttachmentCategory>('test_result')
const title = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const fileProblem = computed(() => (file.value ? fileError(file.value) : null))
const canUpload = computed(() => !!file.value && !fileProblem.value && !!title.value.trim())

function onFile(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
  // Sugiere el título a partir del nombre, solo si aún no se escribió uno.
  if (file.value && !title.value.trim()) title.value = suggestTitle(file.value.name)
}

async function handleUpload() {
  if (!canUpload.value || !file.value) return
  try {
    await uploadMutation.mutateAsync({ category: category.value, title: title.value.trim(), file: file.value })
    file.value = null
    title.value = ''
    if (fileInput.value) fileInput.value.value = ''
  } catch {
    // El toast de error ya lo muestra onError; el formulario conserva el archivo elegido.
  }
}

const downloadingId = ref<string | null>(null)
async function handleDownload(a: ClinicalAttachment) {
  downloadingId.value = a.id
  try {
    await download(a)
  } finally {
    downloadingId.value = null
  }
}

function handleDelete(a: ClinicalAttachment) {
  if (!window.confirm(`¿Eliminar «${a.title}»? Esta acción no se puede deshacer y queda anotada en la auditoría.`)) return
  deleteMutation.mutate(a.id)
}
</script>
