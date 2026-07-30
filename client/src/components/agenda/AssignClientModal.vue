<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="close"></div>
      <div class="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
        <h2 class="text-lg font-bold text-text mb-4">Asignar cliente a reserva</h2>

        <div v-if="appointment" class="rounded-lg bg-bg-secondary p-3 mb-4 text-xs space-y-1">
          <p><span class="text-text-muted">Servicio:</span> {{ appointment.service_name || 'Servicio' }}</p>
          <p><span class="text-text-muted">Fecha:</span> {{ formatDate(appointment.start_time) }}</p>
          <p><span class="text-text-muted">Hora:</span> {{ formatTime(appointment.start_time) }}</p>
        </div>

        <!-- Buscador de clientes existentes -->
        <div class="mb-4">
          <label class="block text-xs font-semibold text-text mb-1.5">Buscar cliente existente</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Nombre o teléfono..."
              class="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-sm text-text outline-none focus:border-primary"
              @input="onSearchInput"
            />
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>

          <div v-if="searchResults.length > 0" class="mt-2 border border-border rounded-lg divide-y divide-border-subtle max-h-48 overflow-y-auto">
            <button
              v-for="c in searchResults"
              :key="c.id"
              @click="selectClient(c)"
              class="w-full px-3 py-2.5 text-left hover:bg-bg-secondary transition-colors"
            >
              <p class="text-sm font-medium text-text">{{ c.full_name }}</p>
              <p class="text-xs text-text-muted">{{ c.phone || 'Sin teléfono' }}</p>
            </button>
          </div>
          <div v-else-if="searchQuery.length >= 2 && !loadingSearch" class="mt-2 text-xs text-text-muted px-1">
            No se encontraron clientes.
          </div>
        </div>

        <div class="flex items-center gap-2 mb-4">
          <div class="flex-1 h-px bg-border"></div>
          <span class="text-xs text-text-muted">o</span>
          <div class="flex-1 h-px bg-border"></div>
        </div>

        <!-- Crear nuevo cliente -->
        <div class="rounded-lg border border-dashed border-border p-4 mb-4">
          <p class="text-xs font-semibold text-text mb-3">Crear nuevo cliente</p>
          <p v-if="props.appointment?.internal_notes" class="text-[10px] text-text-muted bg-primary-light/30 rounded-md px-2 py-1 mb-2">
            Nombre proporcionado por el cliente en la reserva. Verifica antes de guardar.
          </p>
          <div class="space-y-2">
            <input v-model="newClientName" type="text" placeholder="Nombre completo" class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary" />
            <input v-model="newClientPhone" type="text" placeholder="Teléfono" class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary" />
          </div>
          <div v-if="newClientError" class="mt-2 text-xs text-danger">{{ newClientError }}</div>
        </div>

        <div class="flex gap-2">
          <button @click="close" class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-bg-secondary">
            Cancelar
          </button>
          <button @click="handleAssignNew" :disabled="assigning || !newClientName.trim()" class="flex-1 rounded-lg border border-primary/20 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light disabled:opacity-40">
            {{ assigning ? 'Asignando...' : 'Crear y asignar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBusinessStore } from '../../store/business'
import { db } from '../../lib/api'

const props = defineProps<{
  appointmentId: string | null
  appointment: any | null
}>()

const emit = defineEmits<{
  close: []
  assigned: []
}>()

const visible = ref(false)
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const loadingSearch = ref(false)
const newClientName = ref('')
const newClientPhone = ref('')
const newClientError = ref('')
const assigning = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null
const businessStore = useBusinessStore()

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => doSearch(), 300)
}

async function doSearch() {
  const q = searchQuery.value.trim()
  if (q.length < 2) { searchResults.value = []; return }
  loadingSearch.value = true
  try {
    const { data } = await db.from('clients').select('id, full_name, phone')
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(10)
    searchResults.value = data || []
  } catch {
    searchResults.value = []
  } finally {
    loadingSearch.value = false
  }
}

function selectClient(client: any) {
  assignClient(client.id)
}

async function assignClient(clientId: string) {
  if (!props.appointmentId) return
  assigning.value = true
  try {
    const { error } = await db.from('appointments').update({ client_id: clientId }).eq('id', props.appointmentId)
    if (error) throw error
    emit('assigned')
    close()
  } catch (e: any) {
    newClientError.value = e.message || 'Error al asignar cliente'
  } finally {
    assigning.value = false
  }
}

async function handleAssignNew() {
  const name = newClientName.value.trim()
  const phone = newClientPhone.value.trim()
  if (!name) { newClientError.value = 'Nombre requerido'; return }

  assigning.value = true
  newClientError.value = ''

  try {
    const bizStore = businessStore
    const bid = bizStore.business?.id
    const brId = bizStore.currentBranchId

    const { data: existing } = await db.from('clients')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    if (existing) {
      await assignClient((existing as any).id)
      return
    }

    const { data: created, error: createError } = await db.from('clients')
      .insert({
        full_name: name,
        phone: phone,
        business_id: bid,
        branch_id: brId || null,
      })
      .select('id')
      .single()

    if (createError) { newClientError.value = createError.message; return }

    await assignClient((created as any).id)
  } catch (e: any) {
    newClientError.value = e.message || 'Error al crear cliente'
  } finally {
    assigning.value = false
  }
}

function open(appointment: any) {
  searchQuery.value = ''
  searchResults.value = []
  newClientName.value = appointment?.internal_notes || ''
  newClientPhone.value = ''
  newClientError.value = ''
  visible.value = true
}

function close() {
  visible.value = false
  emit('close')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

defineExpose({ open, close })
</script>
