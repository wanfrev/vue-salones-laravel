<template>
  <div class="flex items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-2">
    <p class="text-sm font-semibold text-text">Diente {{ tooth }}</p>
    <div class="flex items-center gap-1.5">
      <button
        v-for="face in FACES"
        :key="face"
        type="button"
        class="flex h-7 w-9 items-center justify-center rounded-md border text-[11px] font-bold transition-theme"
        :class="modelValue[face]
          ? 'border-danger bg-danger/15 text-danger'
          : 'border-border bg-bg-secondary text-text-muted hover:border-danger/40'"
        :title="`${FACE_LABELS[face]}${modelValue[face] ? ' — con placa' : ' — sin placa'}`"
        @click="toggle(face)"
      >
        {{ FACE_SHORT[face] }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BiofilmFace } from '../../types/database'

const FACES: BiofilmFace[] = ['vestibular', 'lingual', 'mesial', 'distal']
const FACE_SHORT: Record<BiofilmFace, string> = { vestibular: 'V', lingual: 'L', mesial: 'M', distal: 'D' }
const FACE_LABELS: Record<BiofilmFace, string> = {
  vestibular: 'Vestibular', lingual: 'Lingual/Palatino', mesial: 'Mesial', distal: 'Distal',
}

const props = defineProps<{
  tooth: number
  modelValue: Partial<Record<BiofilmFace, boolean>>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Partial<Record<BiofilmFace, boolean>>]
}>()

function toggle(face: BiofilmFace) {
  emit('update:modelValue', { ...props.modelValue, [face]: !props.modelValue[face] })
}
</script>
