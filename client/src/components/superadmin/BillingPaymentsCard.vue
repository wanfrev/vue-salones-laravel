<template>
  <section class="rounded-2xl border border-border bg-surface p-5">
    <h2 class="text-base font-bold text-text">Pagos recibidos</h2>
    <p class="mb-4 text-[11px] text-text-muted">
      Al registrar un pago, el vencimiento actual queda cubierto y la próxima fecha avanza un ciclo. Solo se puede deshacer el último.
    </p>

    <div v-if="canRecord" class="mb-4 rounded-xl border border-border-subtle bg-bg-secondary/40 p-3">
      <p class="mb-2 text-xs font-semibold text-text">
        Registrar pago del {{ formatDateHuman(nextDueOn!) }}
        <span class="font-normal text-text-muted">· {{ isInitial ? 'primer pago' : 'pago recurrente' }}</span>
      </p>
      <div class="grid gap-2 sm:grid-cols-3">
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold text-text-muted">Monto ({{ currency }})</span>
          <input v-model.number="form.amount" type="number" min="0.01" step="0.01" :class="inputClass" />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold text-text-muted">Fecha en que pagó</span>
          <input v-model="form.paid_on" type="date" :class="inputClass" />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold text-text-muted">Nota (opcional)</span>
          <input v-model="form.notes" type="text" maxlength="500" placeholder="Ref. 1234, Zelle…" :class="inputClass" />
        </label>
      </div>
      <p v-if="disabledReason" class="mt-2 text-[11px] text-warning">{{ disabledReason }}</p>
      <button type="button" :disabled="!!disabledReason || recording || !(form.amount > 0)"
        class="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        @click="submit">
        {{ recording ? 'Registrando…' : 'Registrar pago' }}
      </button>
    </div>
    <p v-else class="mb-4 rounded-xl border border-border-subtle bg-bg-secondary/40 px-3 py-2 text-xs text-text-muted">
      No hay un vencimiento pendiente. Configura la próxima fecha de pago para poder registrar pagos.
    </p>

    <div v-if="payments.length === 0" class="py-4 text-center text-sm text-text-muted">Todavía no hay pagos registrados.</div>
    <ul v-else class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
      <li v-for="(p, i) in payments" :key="p.id" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-text">
            {{ formatBillingAmount(p.amount, p.currency) }}
            <span class="ml-1 rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-text-muted">{{ p.kind === 'initial' ? 'Primer pago' : 'Recurrente' }}</span>
          </p>
          <p class="text-[11px] text-text-muted">
            Cubre el {{ formatDateHuman(p.covered_due_on) }} · pagó el {{ formatDateHuman(p.paid_on) }}
            <template v-if="p.recorded_by"> · registró {{ p.recorded_by }}</template>
          </p>
          <p v-if="p.notes" class="text-[11px] text-text-secondary">{{ p.notes }}</p>
        </div>
        <button v-if="i === 0" type="button" :disabled="undoing"
          class="rounded-lg border border-danger/20 px-2.5 py-1 text-[11px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          @click="emit('undo', p.id)">
          {{ undoing ? 'Deshaciendo…' : 'Deshacer' }}
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatDateHuman } from '../../lib/formatters'
import { formatBillingAmount, type BillingCurrency, type BillingPayment } from '../../lib/billing'
import type { RecordBillingPaymentInput } from '../../composables/superadmin/useBusinessBilling'

const props = defineProps<{
  payments: BillingPayment[]
  nextDueOn: string | null
  isInitial: boolean
  amountDue: number | null
  currency: BillingCurrency
  today: string
  /** Mensaje si no se debe registrar todavía (p. ej. hay cambios del plan sin guardar). */
  disabledReason?: string
  recording: boolean
  undoing: boolean
}>()

const emit = defineEmits<{
  record: [input: RecordBillingPaymentInput]
  undo: [paymentId: string]
}>()

const inputClass = 'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10'

const canRecord = computed(() => !!props.nextDueOn)
const form = ref({ amount: 0, paid_on: '', notes: '' })

// Se reinicia cada vez que cambia el vencimiento (al registrar/deshacer o al guardar el plan).
watch(() => [props.nextDueOn, props.amountDue, props.today] as const, () => {
  form.value = { amount: props.amountDue ?? 0, paid_on: props.today, notes: '' }
}, { immediate: true })

function submit() {
  emit('record', {
    amount: form.value.amount,
    paid_on: form.value.paid_on || null,
    notes: form.value.notes.trim() || null,
  })
}
</script>
