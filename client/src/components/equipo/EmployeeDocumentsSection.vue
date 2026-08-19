<template>
  <div class="mt-8 border-t border-border pt-6">
    <p class="text-xs font-semibold uppercase tracking-wider text-primary">Documentos</p>
    <p class="text-xs text-text-muted">Escaneos de identificación, cartas de trabajo, contratos, etc.</p>

    <p v-if="!ctx.isLoading.value && ctx.documents.value.length === 0" class="mt-3 rounded-lg bg-bg-secondary/60 p-2.5 text-center text-xs text-text-muted">
      Sin documentos adjuntos
    </p>

    <ul v-else class="mt-3 space-y-1.5">
      <li v-for="doc in ctx.documents.value" :key="doc.id"
        class="flex items-center gap-2 rounded-lg bg-gradient-to-br from-bg-secondary/80 to-bg-secondary/40 px-2.5 py-2">
        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PaperclipIcon class="h-3.5 w-3.5" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-text">{{ doc.label || doc.fileOriginalName }}</p>
          <p v-if="doc.label" class="truncate text-xs text-text-muted">{{ doc.fileOriginalName }}</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-primary transition-theme hover:bg-primary/10"
          @click="ctx.download(doc.id, doc.fileOriginalName)">
          Descargar
        </button>
        <button type="button" class="shrink-0 rounded-md p-1 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
          title="Eliminar documento" @click="confirmDelete(doc)">
          <TrashBin2Icon class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <form class="mt-3 flex flex-wrap items-end gap-2" @submit.prevent="submit">
      <div class="min-w-[140px] flex-1">
        <label class="mb-1 block text-xs font-medium text-text-muted" for="doc-label">Etiqueta (opcional)</label>
        <input id="doc-label" v-model="label" type="text" placeholder="Ej: Cédula" :class="inputClass" />
      </div>
      <div class="min-w-[180px] flex-1">
        <label class="mb-1 block text-xs font-medium text-text-muted" for="doc-file">Archivo</label>
        <input id="doc-file" ref="fileInputEl" type="file" accept=".pdf,.jpg,.jpeg,.png"
          class="w-full text-sm text-text-secondary" @change="onFileChange" />
      </div>
      <button type="submit" :disabled="!selectedFile || ctx.uploadMutation.isPending.value"
        class="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
        {{ ctx.uploadMutation.isPending.value ? 'Subiendo...' : 'Adjuntar' }}
      </button>
    </form>
    <p class="mt-1 text-[10px] text-text-muted">PDF, JPG o PNG — máx. 10 MB.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useEmployeeDocuments } from '../../composables/empleados/useEmployeeDocuments'
import type { EmployeeDocument } from '../../services/employeeDocumentsService'
import { PaperclipIcon, TrashBin2Icon } from '@solar-icons/vue/linear'

const props = defineProps<{ employeeId: string }>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const ctx = useEmployeeDocuments(toRef(() => props.employeeId))

const label = ref('')
const selectedFile = ref<File | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

const submit = () => {
  if (!selectedFile.value) return
  ctx.uploadMutation.mutate(
    { file: selectedFile.value, label: label.value.trim() || undefined },
    {
      onSuccess: () => {
        label.value = ''
        selectedFile.value = null
        if (fileInputEl.value) fileInputEl.value.value = ''
      },
    },
  )
}

const confirmDelete = (doc: EmployeeDocument) => {
  if (!window.confirm(`¿Eliminar "${doc.label || doc.fileOriginalName}"? Esta acción no se puede deshacer.`)) return
  ctx.deleteMutation.mutate(doc.id)
}
</script>
