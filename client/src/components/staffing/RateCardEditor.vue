<template>
  <div class="border-t border-border bg-bg-secondary/40 px-4 py-4">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-text">Tarifas por rol</p>
        <p class="text-xs text-text-muted">
          Lo que gana el empleado por hora y lo que se le cobra a la empresa por esa misma hora.
        </p>
      </div>
      <p v-if="rates.length" class="text-right">
        <span class="block text-[10px] uppercase tracking-wider text-text-muted">Margen promedio</span>
        <span class="text-sm font-bold tabular-nums text-success">{{ formatUSD(averageHourlyMargin) }}/h</span>
      </p>
    </div>

    <div v-if="isLoading" class="py-6 text-center text-sm text-text-muted">Cargando tarifas...</div>

    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
            <th class="pb-2 pr-3">Rol</th>
            <th class="pb-2 pr-3 text-right">Paga al empleado</th>
            <th class="pb-2 pr-3 text-right">Cobra a la empresa</th>
            <th class="pb-2 pr-3 text-right">Margen</th>
            <th class="pb-2 pr-3 text-right">Horas antes de OT</th>
            <th class="pb-2 pr-3 text-right">Recargo OT</th>
            <th class="pb-2 w-10"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="rate in rates" :key="rate.id" class="text-sm">
            <td class="py-2 pr-3 font-medium text-text">{{ rate.role }}</td>
            <td class="py-2 pr-3 text-right tabular-nums text-text-secondary">{{ formatUSD(rate.payRate) }}</td>
            <td class="py-2 pr-3 text-right tabular-nums text-text-secondary">{{ formatUSD(rate.billRate) }}</td>
            <td class="py-2 pr-3 text-right tabular-nums font-semibold"
              :class="rate.hourlyMargin > 0 ? 'text-success' : 'text-danger'">
              {{ formatUSD(rate.hourlyMargin) }}
            </td>
            <td class="py-2 pr-3 text-right tabular-nums text-text-secondary">
              {{ rate.overtimeThresholdHours ?? 'de la empresa' }}
            </td>
            <td class="py-2 pr-3 text-right tabular-nums text-text-secondary">
              {{ rate.overtimeMultiplier ? `${rate.overtimeMultiplier}x` : 'de la empresa' }}
            </td>
            <td class="py-2 text-right">
              <button type="button" title="Eliminar tarifa"
                class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                @click="remove(rate.id)">
                <TrashBin2Icon class="h-4 w-4" />
              </button>
            </td>
          </tr>

          <tr v-if="rates.length === 0">
            <td colspan="7" class="py-3 text-center text-xs text-text-muted">
              Sin tarifas todavía. Agrega el primer rol abajo.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <form class="mt-3 flex flex-wrap items-end gap-2" @submit.prevent="submit">
      <div class="min-w-[140px] flex-1">
        <label :for="`role-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Rol</label>
        <input :id="`role-${companyId}`" v-model="draft.role" type="text" list="staffing-job-titles" required
          placeholder="Ej: Operario"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
        <!-- Reuses the business's existing job_titles list so roles stay consistent with Equipo. -->
        <datalist id="staffing-job-titles">
          <option v-for="title in jobTitles" :key="title" :value="title" />
        </datalist>
      </div>

      <div class="w-32">
        <label :for="`pay-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Paga $/h</label>
        <input :id="`pay-${companyId}`" v-model.number="draft.payRate" type="number" min="0" step="0.01" required
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-32">
        <label :for="`bill-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Cobra $/h</label>
        <input :id="`bill-${companyId}`" v-model.number="draft.billRate" type="number" min="0" step="0.01" required
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-28">
        <span class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Margen</span>
        <p class="px-1 py-2 text-sm font-semibold tabular-nums"
          :class="draftMargin > 0 ? 'text-success' : 'text-text-muted'">
          {{ formatUSD(draftMargin) }}
        </p>
      </div>

      <div class="w-32">
        <label :for="`ot-threshold-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
          Horas antes de OT
        </label>
        <input :id="`ot-threshold-${companyId}`" v-model.number="draft.overtimeThresholdHours" type="number" min="0"
          max="168" step="0.5" placeholder="de la empresa"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-28">
        <label :for="`ot-mult-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
          Recargo OT
        </label>
        <input :id="`ot-mult-${companyId}`" v-model.number="draft.overtimeMultiplier" type="number" min="1" max="5"
          step="0.1" placeholder="de la empresa"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <button type="submit" :disabled="saveMutation.isPending.value"
        class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
        {{ saveMutation.isPending.value ? 'Guardando...' : 'Agregar' }}
      </button>
    </form>

    <p v-if="saveError" class="mt-2 text-xs text-danger">{{ saveError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useRateCard } from '../../composables/staffing/useRateCard'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { TrashBin2Icon } from '@solar-icons/vue/linear'
import type { StaffingRateFormData } from '../../services/staffingService'

const props = defineProps<{
  businessId: string | null
  companyId: string
}>()

const businessStore = useBusinessStore()
const { formatUSD } = useCurrency()
const jobTitles = computed(() => businessStore.jobTitles)

const { rates, isLoading, save, remove, saveError, saveMutation, averageHourlyMargin } = useRateCard(
  toRef(props, 'businessId'),
  toRef(props, 'companyId'),
)

const emptyDraft = (): StaffingRateFormData => ({
  companyId: props.companyId,
  role: '',
  payRate: 0,
  billRate: 0,
  overtimeThresholdHours: null,
  overtimeMultiplier: null,
})

const draft = ref<StaffingRateFormData>(emptyDraft())

const draftMargin = computed(() => (draft.value.billRate || 0) - (draft.value.payRate || 0))

// v-model.number leaves a cleared field as '' rather than null.
const normalizeOptionalNumber = (v: number | string | null): number | null =>
  v === '' || v === null || v === undefined ? null : Number(v)

const submit = async () => {
  const ok = await save({
    ...draft.value,
    companyId: props.companyId,
    overtimeThresholdHours: normalizeOptionalNumber(draft.value.overtimeThresholdHours),
    overtimeMultiplier: normalizeOptionalNumber(draft.value.overtimeMultiplier),
  })
  if (ok) draft.value = emptyDraft()
}
</script>
