<template>
  <div class="rounded-xl border border-border bg-surface p-3">
    <div class="mb-3 flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-text">Ingresos manuales del período</p>
      <button type="button"
        class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
        @click="showForm = !showForm">
        {{ showForm ? 'Cancelar' : '+ Ingreso' }}
      </button>
    </div>

    <form v-if="showForm" class="mb-3 flex flex-wrap items-end gap-2" @submit.prevent="submit">
      <div>
        <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="mi-date">Fecha</label>
        <input id="mi-date" v-model="form.incomeDate" type="date" required :class="inputClass" />
      </div>
      <div class="w-28">
        <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="mi-amount">Monto ($)</label>
        <input id="mi-amount" v-model.number="form.amount" type="number" min="0.01" step="0.01" required :class="inputClass" />
      </div>
      <div class="min-w-[160px] flex-1">
        <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="mi-notes">Notas</label>
        <input id="mi-notes" v-model="form.notes" type="text" placeholder="Opcional" :class="inputClass" />
      </div>
      <button type="submit" :disabled="ctx.createMutation.isPending.value"
        class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
        {{ ctx.createMutation.isPending.value ? 'Guardando...' : 'Guardar' }}
      </button>
    </form>
    <p v-if="ctx.saveError.value" class="mb-2 text-xs text-danger">{{ ctx.saveError.value }}</p>

    <p v-if="!ctx.isLoading.value && ctx.manualIncomes.value.length === 0" class="py-4 text-center text-xs text-text-muted">
      Sin ingresos manuales en este período.
    </p>

    <div v-else-if="ctx.manualIncomes.value.length > 0" class="divide-y divide-border">
      <div v-for="row in ctx.manualIncomes.value" :key="row.id" class="flex items-center justify-between gap-3 py-2 text-sm">
        <div class="min-w-0">
          <p class="font-medium text-text">{{ formatDateUS(row.incomeDate) }}</p>
          <p v-if="row.notes" class="truncate text-xs text-text-muted">{{ row.notes }}</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-semibold tabular-nums text-success">{{ formatUSD(row.amount) }}</span>
          <button type="button" title="Eliminar" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
            @click="ctx.removeManualIncome(row.id)">
            <TrashBin2Icon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { TrashBin2Icon } from '@solar-icons/vue/linear'
import { useCurrency } from '../../composables/common/useCurrency'
import { formatDateUS } from '../../lib/formatters'
import type { useStaffingFinance } from '../../composables/staffing/useStaffingFinance'

const props = defineProps<{ ctx: ReturnType<typeof useStaffingFinance> }>()

const { formatUSD } = useCurrency()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const showForm = ref(false)
const emptyForm = () => ({ incomeDate: new Date().toISOString().slice(0, 10), amount: 0, notes: '' })
const form = reactive(emptyForm())

const submit = async () => {
  const ok = await props.ctx.addManualIncome({ incomeDate: form.incomeDate, amount: form.amount, notes: form.notes || undefined })
  if (ok) {
    Object.assign(form, emptyForm())
    showForm.value = false
  }
}
</script>
