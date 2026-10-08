<template>
  <div>
    <div v-if="adding" class="flex items-center gap-1.5">
      <input
        ref="inputEl"
        v-model="draft"
        type="text"
        :maxlength="MAX_ROLE_LENGTH"
        placeholder="Nuevo rol (ej. Hijo, Abuela)"
        aria-label="Nuevo rol"
        class="min-w-0 flex-1 rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20"
        @keydown.enter.prevent="confirm"
        @keydown.esc.stop.prevent="cancel"
      />
      <button type="button" :disabled="!normalizeRole(draft)" @click="confirm" class="rounded-lg bg-primary px-2.5 py-2 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:opacity-50">Agregar</button>
      <button type="button" @click="cancel" class="rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary">Cancelar</button>
    </div>
    <FormSelect v-else :model-value="modelValue" :label="label" :options="options" @update:model-value="onSelect" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { FormSelect } from '../forms'
import { MAX_ROLE_LENGTH, normalizeRole, roleChoices } from './cases'
import { useCustomRoles } from '../../composables/clinical/useCustomRoles'

const NEW = '__new__'

const props = defineProps<{ modelValue: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [role: string] }>()

const { customRoles, addCustomRole } = useCustomRoles()

const adding = ref(false)
const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

const options = computed(() => [
  { value: '', label: 'Sin rol' },
  ...roleChoices(customRoles.value, props.modelValue).map(r => ({ value: r, label: r })),
  { value: NEW, label: '＋ Agregar otro rol…' },
])

function onSelect(value: string) {
  if (value !== NEW) return emit('update:modelValue', value)
  draft.value = ''
  adding.value = true
  nextTick(() => inputEl.value?.focus())
}

function confirm() {
  const role = addCustomRole(draft.value)
  if (role) emit('update:modelValue', role)
  adding.value = false
}

const cancel = () => { adding.value = false }
</script>
