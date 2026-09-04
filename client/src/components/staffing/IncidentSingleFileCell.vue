<template>
  <div class="flex items-center justify-center gap-1">
    <button v-if="fileName" type="button" class="rounded p-1 text-primary transition-theme hover:bg-primary/10" :title="`Ver ${fileName}`" @click="handleView">
      <FileTextIcon class="h-4 w-4" />
    </button>
    <button v-if="fileName" type="button" class="rounded p-1 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar archivo" @click="handleDelete">
      <CloseCircleIcon class="h-4 w-4" />
    </button>
    <label class="cursor-pointer rounded p-1 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary" title="Subir archivo">
      <input type="file" class="hidden" accept=".pdf,.jpg,.jpeg,.png" @change="handleUpload" />
      <UploadIcon class="h-4 w-4" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { FileTextIcon, UploadIcon, CloseCircleIcon } from '@solar-icons/vue/linear'
import { viewIncidentSingleFile } from '../../services/staffing/staffingIncidentService'

const props = defineProps<{
  incidentId: string
  field: 'reporte' | 'relief_form'
  fileName: string | null
}>()

const emit = defineEmits<{ upload: [file: File]; remove: [] }>()

const handleView = () => {
  viewIncidentSingleFile(props.incidentId, props.field)
}

const handleDelete = () => {
  if (window.confirm('¿Eliminar este archivo?')) emit('remove')
}

const handleUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) emit('upload', file)
  ;(e.target as HTMLInputElement).value = ''
}
</script>
