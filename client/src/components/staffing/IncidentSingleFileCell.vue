<template>
  <div class="flex items-center justify-center gap-1">
    <button v-if="fileName" type="button" class="rounded p-1 text-primary transition-theme hover:bg-primary/10" :title="fileName" @click="handleDownload">
      <FileTextIcon class="h-4 w-4" />
    </button>
    <label class="cursor-pointer rounded p-1 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary" title="Subir archivo">
      <input type="file" class="hidden" accept=".pdf,.jpg,.jpeg,.png" @change="handleUpload" />
      <UploadIcon class="h-4 w-4" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { FileTextIcon, UploadIcon } from '@solar-icons/vue/linear'
import { downloadIncidentSingleFile } from '../../services/staffing/staffingIncidentService'

const props = defineProps<{
  incidentId: string
  field: 'reporte' | 'relief_form'
  fileName: string | null
}>()

const emit = defineEmits<{ upload: [file: File] }>()

const handleDownload = () => {
  downloadIncidentSingleFile(props.incidentId, props.field, props.fileName ?? 'documento')
}

const handleUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) emit('upload', file)
  ;(e.target as HTMLInputElement).value = ''
}
</script>
