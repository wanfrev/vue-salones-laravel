<script setup lang="ts">
import { ref } from 'vue'
import { searchClients } from '../../services/clientesService'
import { FormInput } from '../../components/forms'

const props = defineProps<{
  modelValue: string
  clientPhone: string
  businessId: string | null
  branchId: string | null
  t: { client: string }
  canCreateClients: boolean
  error?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:clientPhone': [value: string]
  'select-client': [client: { id: string; full_name: string; phone: string }]
}>()

const suggestions = ref<{ id: string; full_name: string; phone: string }[]>([])
const showSuggestions = ref(false)
const searchLoading = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const onInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  const query = props.modelValue.trim()
  if (query.length < 1) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }
  searchTimeout = setTimeout(async () => {
    if (!props.businessId) return
    searchLoading.value = true
    try {
      suggestions.value = await searchClients(props.businessId, query, props.branchId)
      showSuggestions.value = true
    } catch {
      suggestions.value = []
      showSuggestions.value = false
    } finally {
      searchLoading.value = false
    }
  }, 300)
}

const selectClient = (client: { id: string; full_name: string; phone: string }) => {
  emit('update:modelValue', client.full_name)
  emit('update:clientPhone', client.phone)
  showSuggestions.value = false
  if (searchTimeout) clearTimeout(searchTimeout)
  emit('select-client', client)
}

const onBlur = () => setTimeout(() => { showSuggestions.value = false }, 200)
const onFocus = () => { if (suggestions.value.length > 0) showSuggestions.value = true }
</script>

<template>
  <div class="relative sm:col-span-2 lg:col-span-1">
    <FormInput
      :model-value="modelValue"
      :label="t.client"
      :placeholder="`Nombre del ${t.client.toLowerCase()}`"
      required
      prefix-icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      :error="error"
      @update:model-value="$emit('update:modelValue', $event)"
      @blur="onBlur"
      @focus="onFocus"
      @input="onInput"
    />
    <div v-if="showSuggestions && suggestions.length > 0"
      class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
      <button v-for="client in suggestions" :key="client.id" type="button"
        @mousedown.prevent="selectClient(client)"
        class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-bg-secondary border-b border-border last:border-b-0">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <div class="flex-1 min-w-0"><div class="font-medium text-text truncate">{{ client.full_name }}</div><div class="text-xs text-text-muted">{{ client.phone }}</div></div>
      </button>
    </div>
    <div v-if="showSuggestions && suggestions.length === 0 && modelValue.trim().length >= 1"
      class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg px-4 py-3 text-center text-sm text-text-muted">
      <template v-if="searchLoading">Buscando...</template>
      <template v-else-if="!canCreateClients">No puedes crear clientes.</template>
      <template v-else>Sin resultados</template>
    </div>
  </div>
</template>
