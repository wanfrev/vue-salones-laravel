<template>
  <div class="space-y-4">
    <!-- Subir -->
    <div class="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">Subir archivo</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[13rem_1fr_11rem]">
        <FormSelect :model-value="category" @update:model-value="category = $event as AttachmentCategory" label="Categoría" :options="CATEGORY_OPTIONS" />
        <FormInput v-model="title" label="Título" placeholder="Ej: MMPI-2 aplicado en septiembre" />
        <FormInput v-model="documentDate" type="date" label="Fecha del documento" :hint="'Opcional'" />
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

    <!-- Búsqueda y filtro por categoría -->
    <div v-if="attachments.length > 0" class="space-y-2">
      <input
        v-model="query"
        type="search"
        placeholder="Buscar por título, archivo, categoría o quién lo subió..."
        aria-label="Buscar archivos"
        class="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
        <button
          type="button"
          :aria-pressed="filter === 'all'"
          @click="filter = 'all'"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-theme"
          :class="filter === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-secondary hover:border-primary/30'"
        >Todos ({{ searched.length }})</button>
        <button
          v-for="c in availableCategories"
          :key="c"
          type="button"
          :aria-pressed="filter === c"
          @click="filter = c"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-theme"
          :class="filter === c ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-secondary hover:border-primary/30'"
        >{{ CATEGORY_LABELS[c] }} ({{ counts[c] }})</button>
      </div>
    </div>

    <!-- Lista -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>

    <div v-else-if="attachments.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
      Este paciente todavía no tiene archivos adjuntos.
    </div>

    <div v-else-if="groups.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
      Ningún archivo coincide con la búsqueda.
    </div>

    <section v-for="g in groups" :key="g.category" class="space-y-2">
      <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
        <span class="rounded-full px-2.5 py-0.5" :class="CATEGORY_TONE[g.category]">{{ g.label }}</span>
        <span class="font-semibold text-text-muted">{{ g.items.length }}</span>
      </h3>
      <ul class="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <li v-for="a in g.items" :key="a.id" class="flex flex-wrap items-center justify-between gap-3 p-4">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-text">{{ a.title }}</p>
            <p class="mt-1 truncate text-xs text-text-muted">
              {{ formatDateHuman(attachmentDate(a)) }}
              <span v-if="!a.document_date"> (subido)</span>
              · {{ a.original_name }} · {{ formatSize(a.size) }}
              <span v-if="a.uploaded_by_name"> · por {{ a.uploaded_by_name }}</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button @click="handleDownload(a)" :disabled="downloadingId === a.id" class="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/10 disabled:opacity-50">
              {{ downloadingId === a.id ? 'Descargando...' : 'Descargar' }}
            </button>
            <button v-if="a.can_delete" @click="handleDelete(a)" class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/5">Eliminar</button>
          </div>
        </li>
      </ul>
    </section>

    <p class="text-xs text-text-muted">
      Cada descarga y cada eliminación queda anotada en la auditoría clínica. Quien sube un archivo puede quitarlo durante las primeras 24 horas (por si se equivocó); después solo el administrador.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { FormInput, FormSelect } from '../components/forms'
import { useAttachments } from '../composables/clinical/useAttachments'
import {
  ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES, CATEGORY_LABELS, CATEGORY_OPTIONS, CATEGORY_ORDER, CATEGORY_TONE, attachmentDate, categoryCounts,
  fileError, formatSize, organizeAttachments, searchAttachments, suggestTitle,
} from '../components/clinical/attachments'
import { formatDateHuman } from '../lib/formatters'
import type { AttachmentCategory, ClinicalAttachment } from '../types/database'

const route = useRoute()
const clienteId = computed(() => route.params.id as string)

const { attachments, isLoading, uploadMutation, deleteMutation, download } = useAttachments(() => clienteId.value)

// ── Subir ──
const category = ref<AttachmentCategory>('test_result')
const title = ref('')
const documentDate = ref('')
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
    await uploadMutation.mutateAsync({
      category: category.value,
      title: title.value.trim(),
      file: file.value,
      ...(documentDate.value ? { document_date: documentDate.value } : {}),
    })
    file.value = null
    title.value = ''
    documentDate.value = ''
    if (fileInput.value) fileInput.value.value = ''
  } catch {
    // El toast de error ya lo muestra onError; el formulario conserva el archivo elegido.
  }
}

// ── Organizar: búsqueda + filtro por categoría + grupos ──
const query = ref('')
const filter = ref<AttachmentCategory | 'all'>('all')

// Los contadores respetan la búsqueda: «Informe externo (2)» es lo que aparecería al elegirlo.
const searched = computed(() => searchAttachments(attachments.value, query.value))
const counts = computed(() => categoryCounts(searched.value))
const availableCategories = computed(() => CATEGORY_ORDER.filter(c => counts.value[c] > 0 || filter.value === c))
const groups = computed(() => organizeAttachments(attachments.value, { category: filter.value, query: query.value }))

// ── Descargar y eliminar ──
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
