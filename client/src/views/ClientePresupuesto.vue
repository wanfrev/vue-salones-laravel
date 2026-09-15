<template>
  <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between no-print">
    <div class="flex items-center gap-2">
      <label class="text-xs font-semibold uppercase tracking-wider text-text-muted">Presupuesto</label>
      <select :value="selectedId ?? '__new__'" @change="onSelect(($event.target as HTMLSelectElement).value)"
        class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary">
        <option v-if="isCreatingNew" value="__new__">Presupuesto nuevo (sin guardar)</option>
        <option v-for="b in budgets" :key="b.id" :value="b.id">
          {{ formatDate(b.created_at) }} — ${{ Number(b.total).toLocaleString() }}
        </option>
      </select>
    </div>
    <div class="flex items-center gap-2">
      <button @click="windowPrint" class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
        <PrinterIcon class="h-4 w-4" />
        Imprimir
      </button>
      <button @click="startNew" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
        <AddCircleIcon class="h-4 w-4" />
        Nuevo presupuesto
      </button>
    </div>
  </div>

  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <div class="print-only mb-4">
      <p class="text-lg font-bold text-text">Presupuesto de tratamiento</p>
      <p class="text-xs text-text-muted">Emitido el {{ formatDate(new Date().toISOString()) }}</p>
    </div>

    <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border-subtle text-text-muted">
              <th class="px-2 py-2 text-left">Incluir</th>
              <th class="px-2 py-2 text-left">Diente</th>
              <th class="px-2 py-2 text-left">Descripción</th>
              <th class="px-2 py-2 text-left no-print">Servicio (precio)</th>
              <th class="px-2 py-2 text-right">Precio</th>
              <th class="px-2 py-2 no-print"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items" :key="index" class="border-b border-border-subtle last:border-b-0">
              <td class="px-2 py-2">
                <input type="checkbox" v-model="item.included" class="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
              </td>
              <td class="px-2 py-2 text-text-secondary">{{ item.tooth ?? '—' }}</td>
              <td class="px-2 py-2">
                <input v-model="item.description" class="w-full rounded border border-border bg-surface px-2 py-1 text-text outline-none focus:border-primary" />
              </td>
              <td class="px-2 py-2 no-print">
                <FormDropdown
                  :model-value="item.service_id ?? ''"
                  placeholder="Sin vincular"
                  :options="serviceOptions"
                  size="sm"
                  searchable
                  @update:model-value="onServiceLink(index, String($event))"
                />
              </td>
              <td class="px-2 py-2">
                <div class="relative">
                  <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">$</span>
                  <input v-model.number="item.price" type="number" min="0" step="0.01" class="w-24 rounded border border-border bg-surface py-1 pl-5 pr-2 text-right text-text outline-none focus:border-primary" />
                </div>
              </td>
              <td class="px-2 py-2 no-print">
                <button type="button" @click="items.splice(index, 1)" class="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger">
                  <TrashBin2Icon class="h-4 w-4" />
                </button>
              </td>
            </tr>
            <tr v-if="items.length === 0">
              <td colspan="6" class="px-2 py-8 text-center text-text-muted">
                Sin líneas todavía. {{ suggestedFromOdontograma.length > 0 ? '' : 'Agrega una manualmente.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button type="button" @click="addManualLine" class="no-print mt-3 flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5">
        <AddCircleIcon class="h-3.5 w-3.5" />
        Agregar línea manual
      </button>

      <div class="mt-4 flex items-center justify-end gap-3 border-t border-border pt-4">
        <span class="text-sm font-semibold text-text">Total:</span>
        <span class="text-xl font-bold text-primary">${{ total.toLocaleString() }}</span>
      </div>
    </div>

    <div class="mt-4 rounded-xl border border-border bg-surface p-4 shadow-sm no-print">
      <FormTextarea v-model="observacionesGenerales" label="Observaciones / condiciones del presupuesto" :rows="3" />
    </div>

    <div class="mt-4 flex justify-end no-print">
      <button @click="handleSave" :disabled="isSaving"
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50">
        {{ isSaving ? 'Guardando...' : isCreatingNew ? 'Crear presupuesto' : 'Guardar presupuesto' }}
      </button>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { AddCircleIcon, PrinterIcon, TrashBin2Icon } from '@solar-icons/vue/linear'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../store/auth'
import { useBusinessStore } from '../store/business'
import { useBudgets } from '../composables/dental/useBudgets'
import { useDentalChart } from '../composables/dental/useDentalChart'
import { listServicios, serviciosKeys } from '../services/serviciosService'
import { FormDropdown, FormTextarea } from '../components/forms'
import { CONDITION_LABELS } from '../components/dental/odontogramConditions'
import type { DentalCondition } from '../types/database'
import type { Budget, BudgetItem } from '../types/database'

const route = useRoute()
const authStore = useAuthStore()
const businessStore = useBusinessStore()

const clienteId = computed(() => route.params.id as string)
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const { budgets, isLoading, createMutation, updateMutation } = useBudgets(() => clienteId.value)
const { chart } = useDentalChart(() => clienteId.value)

const { data: serviciosData } = useQuery({
  queryKey: computed(() => serviciosKeys.all(businessId.value, branchId.value)),
  queryFn: () => listServicios(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
})
const serviceOptions = computed(() => (serviciosData.value ?? []).map(s => ({ value: s.id, label: s.name, sublabel: `$${s.price}` })))

// Conditions marked on the odontogram that imply pending (not-yet-treated) work — used only to
// PRE-FILL a brand new budget, never to overwrite one already saved or being edited.
const PENDING_CONDITIONS: DentalCondition[] = ['caries', 'extraccion_indicada']
const suggestedFromOdontograma = computed<BudgetItem[]>(() => {
  const teeth = chart.value?.teeth ?? {}
  const result: BudgetItem[] = []
  for (const [toothStr, faces] of Object.entries(teeth)) {
    for (const [face, condition] of Object.entries(faces ?? {})) {
      if (!PENDING_CONDITIONS.includes(condition as DentalCondition)) continue
      result.push({
        tooth: Number(toothStr),
        description: `Diente ${toothStr} — ${CONDITION_LABELS[condition as DentalCondition]} (${face})`,
        service_id: null,
        price: 0,
        included: true,
      })
    }
  }
  return result
})

const items = reactive<BudgetItem[]>([])
const observacionesGenerales = ref('')

const total = computed(() => items.filter(i => i.included).reduce((sum, i) => sum + (Number(i.price) || 0), 0))

const selectedId = ref<string | null>(null)
const isCreatingNew = ref(false)

const selectedBudget = computed<Budget | null>(() => budgets.value.find(b => b.id === selectedId.value) ?? null)

function loadIntoForm(b: Budget | null) {
  items.splice(0, items.length, ...(b ? b.items.map(i => ({ ...i })) : suggestedFromOdontograma.value.map(i => ({ ...i }))))
  observacionesGenerales.value = b?.observaciones_generales ?? ''
}

watch(budgets, (list) => {
  if (selectedId.value || isCreatingNew.value) return
  if (list.length > 0) {
    selectedId.value = list[0].id
    loadIntoForm(list[0])
  } else {
    isCreatingNew.value = true
    loadIntoForm(null)
  }
}, { immediate: true })

function onSelect(value: string) {
  if (value === '__new__') { startNew(); return }
  selectedId.value = value
  isCreatingNew.value = false
  loadIntoForm(selectedBudget.value)
}

function startNew() {
  selectedId.value = null
  isCreatingNew.value = true
  loadIntoForm(null)
}

function addManualLine() {
  items.push({ tooth: null, description: '', service_id: null, price: 0, included: true })
}

function onServiceLink(index: number, serviceId: string) {
  const item = items[index]
  if (!item) return
  item.service_id = serviceId || null
  const svc = (serviciosData.value ?? []).find(s => s.id === serviceId)
  if (svc) {
    item.price = svc.price
    if (!item.description) item.description = svc.name
  }
}

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

async function handleSave() {
  const payload = { items: items.map(i => ({ ...i })), observaciones_generales: observacionesGenerales.value }
  if (isCreatingNew.value) {
    const created = await createMutation.mutateAsync(payload)
    selectedId.value = created.id
    isCreatingNew.value = false
  } else if (selectedBudget.value) {
    await updateMutation.mutateAsync({ id: selectedBudget.value.id, data: payload })
  }
}

const windowPrint = () => window.print()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>
