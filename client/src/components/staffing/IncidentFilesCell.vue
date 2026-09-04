<template>
  <div class="flex flex-wrap items-center justify-center gap-1">
    <button v-for="f in files" :key="f.id" type="button"
      class="group relative rounded p-1 text-primary transition-theme hover:bg-primary/10"
      :title="`Ver ${f.fileOriginalName}`"
      @click="handleView(f.id)">
      <FileTextIcon class="h-4 w-4" />
      <span class="absolute -right-1 -top-1 hidden rounded-full bg-danger p-0.5 text-white group-hover:block"
        title="Eliminar archivo" @click.stop="handleDelete(f.id)">
        <CloseCircleIcon class="h-2.5 w-2.5" />
      </span>
    </button>
    <label class="cursor-pointer rounded p-1 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary" title="Agregar archivo">
      <input type="file" class="hidden" accept=".pdf,.jpg,.jpeg,.png" @change="handleUpload" />
      <UploadIcon class="h-4 w-4" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { FileTextIcon, UploadIcon, CloseCircleIcon } from '@solar-icons/vue/linear'
import { viewIncidentFile, type IncidentFileType, type StaffingIncidentFileRow } from '../../services/staffing/staffingIncidentService'

const props = defineProps<{
  files: StaffingIncidentFileRow[]
  fileType: IncidentFileType
}>()

const emit = defineEmits<{ upload: [file: File]; remove: [fileId: string] }>()

const handleView = (id: string) => {
  viewIncidentFile(id)
}

const handleDelete = (id: string) => {
  if (window.confirm('¿Eliminar este archivo?')) emit('remove', id)
}

const handleUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) emit('upload', file)
  ;(e.target as HTMLInputElement).value = ''
}
</script>
