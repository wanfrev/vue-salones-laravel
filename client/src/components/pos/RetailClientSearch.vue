<template>
  <div class="relative w-full">
    <input v-model="localClientSearch" type="text" :placeholder="`${businessStore.terminology.client} (opcional)...`"
      class="w-full rounded-lg border border-border bg-surface pl-3 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
      @focus="showClientDropdown = true" @blur="onClientBlur" @input="onClientInput" />
    <div v-if="showClientDropdown && clientSuggestions.length > 0" class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg max-h-52 overflow-y-auto touch-pan-y overscroll-contain" style="overflow-x: clip; -webkit-overflow-scrolling: touch;">
      <button v-for="client in clientSuggestions" :key="client.id"
        @mousedown.prevent="onSelectClient(client)"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary border-b border-border last:border-b-0">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-text truncate">{{ client.full_name }}</span>
            <span v-if="client.client_code" class="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/10">{{ client.client_code }}</span>
          </div>
          <span class="text-xs text-text-muted">{{ client.phone }}</span>
        </div>
      </button>
    </div>
    <input v-if="localClientSearch && !hasSelectedClient" v-model="localClientPhone" type="text" placeholder="Teléfono (opcional)..."
      class="mt-2 w-full rounded-lg border border-border bg-surface pl-3 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
      @input="$emit('update:client-phone', localClientPhone)" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBusinessStore } from '../../store/business'

const businessStore = useBusinessStore()

defineProps<{
  clientSuggestions: { id: string; full_name: string; phone: string; client_code?: string | null }[]
}>()

const emit = defineEmits<{
  'select-client': [client: any]
  'search-clients': [query: string]
  'update:client-name': [name: string]
  'update:client-phone': [phone: string]
}>()

const localClientSearch = ref('')
const localClientPhone = ref('')
const hasSelectedClient = ref(false)
const showClientDropdown = ref(false)
let clientTimeout: ReturnType<typeof setTimeout> | null = null

const onClientBlur = () => setTimeout(() => { showClientDropdown.value = false }, 150)

const onClientInput = () => {
  hasSelectedClient.value = false
  emit('update:client-name', localClientSearch.value)
  if (clientTimeout) clearTimeout(clientTimeout)
  const q = localClientSearch.value.trim()
  if (q.length < 1) { showClientDropdown.value = false; return }
  showClientDropdown.value = true
  clientTimeout = setTimeout(() => emit('search-clients', q), 200)
}

const onSelectClient = (client: any) => {
  hasSelectedClient.value = true
  localClientSearch.value = client.full_name
  localClientPhone.value = client.phone
  emit('select-client', client)
}

defineExpose({
  reset() {
    localClientSearch.value = ''
    localClientPhone.value = ''
    hasSelectedClient.value = false
  },
  /** Impose a client name/phone from the parent — used when resuming a held sale. */
  setClient({ name, phone }: { name: string; phone: string }) {
    localClientSearch.value = name
    localClientPhone.value = phone
    hasSelectedClient.value = false
  },
})
</script>
