<template>
  <div v-if="isLoading" class="flex justify-center py-12">
    <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
  <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
    <section class="rounded-2xl border border-border bg-surface p-5">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-text">Cobro del servicio</h2>
          <p class="text-[11px] text-text-muted">Mes gratis, primer pago, ciclo y recordatorios. El aviso lo ve solo el admin del negocio, como banner arriba.</p>
        </div>
        <label class="flex cursor-pointer items-center gap-2 text-xs font-semibold text-text">
          <input v-model="form.enabled" type="checkbox" class="h-4 w-4 accent-primary" />
          Avisos activos
        </label>
      </div>

      <div class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-light/60 px-4 py-3">
        <p class="text-xs text-text-secondary">
          <b class="text-text">Mes gratis:</b>
          {{ form.trial_ends_on ? `termina el ${formatDateHuman(form.trial_ends_on)}` : 'sin configurar' }}
        </p>
        <button type="button" class="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover" @click="startTrial">
          Activar mes gratis desde hoy
        </button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block">
          <span :class="labelClass">Fin del mes gratis</span>
          <input v-model="form.trial_ends_on" type="date" :class="inputClass" />
        </label>
        <label class="block">
          <span :class="labelClass">Moneda</span>
          <select v-model="form.currency" :class="inputClass">
            <option value="USD">USD ($)</option>
            <option value="VES">VES (Bs.)</option>
          </select>
        </label>
        <label class="block">
          <span :class="labelClass">{{ form.cycle === 'none' ? 'Monto del pago' : 'Monto del primer pago' }}</span>
          <input v-model.number="form.initial_amount" type="number" min="0" step="0.01"
            :placeholder="form.cycle === 'none' ? '' : 'Vacío = igual al recurrente'" :class="inputClass" />
        </label>
        <label class="block">
          <span :class="labelClass">Ciclo</span>
          <select v-model="form.cycle" :class="inputClass">
            <option v-for="c in CYCLE_OPTIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </label>
        <label v-if="form.cycle !== 'none'" class="block">
          <span :class="labelClass">Monto de cada {{ cycleLabel(form.cycle).toLowerCase() }}</span>
          <input v-model.number="form.recurring_amount" type="number" min="0" step="0.01" :class="inputClass" />
        </label>
        <label class="block">
          <span :class="labelClass">Próxima fecha de pago</span>
          <input v-model="form.next_due_on" type="date" :class="inputClass" />
        </label>
        <label class="flex items-center gap-2 text-xs text-text-secondary sm:col-span-2">
          <input v-model="form.next_is_initial" type="checkbox" class="h-4 w-4 accent-primary" />
          El próximo pago es el primero (usa el monto del primer pago)
        </label>
      </div>

      <div class="mt-5">
        <span :class="labelClass">Avisar estos días antes del vencimiento</span>
        <div class="flex flex-wrap items-center gap-1.5">
          <button v-for="d in dayChoices" :key="d" type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            :class="form.remind_days_before.includes(d) ? 'border-primary bg-primary text-white' : 'border-border text-text-secondary hover:bg-bg-secondary'"
            @click="toggleDay(d)">
            {{ d }} {{ d === 1 ? 'día' : 'días' }}
          </button>
          <input v-model.number="customDay" type="number" min="1" max="90" placeholder="Otro" class="w-20 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text outline-none focus:border-primary" @keydown.enter.prevent="addCustomDay" />
          <button type="button" class="text-xs font-semibold text-primary hover:text-primary-hover" @click="addCustomDay">Agregar</button>
        </div>
        <p class="mt-1 text-[11px] text-text-muted">Además avisa el mismo día del vencimiento y todos los días mientras esté vencido (ese aviso no se puede cerrar).</p>
      </div>

      <div class="mt-5 grid gap-3">
        <label class="block">
          <span :class="labelClass">Cómo pagar (se muestra en «¿Cómo pago?»)</span>
          <textarea v-model="form.payment_instructions" rows="3" maxlength="2000" placeholder="Pago móvil: 0102 · V-12345678 · 0414-0000000&#10;Zelle: pagos@ejemplo.com" :class="inputClass" />
        </label>
        <label class="block">
          <span :class="labelClass">Mensaje personalizado (opcional)</span>
          <input v-model="form.custom_message" type="text" maxlength="500" placeholder="¡Gracias por confiar en Luma!" :class="inputClass" />
        </label>
      </div>

      <div class="mt-5 flex flex-wrap items-center justify-end gap-2">
        <span v-if="isDirty" class="text-[11px] font-semibold text-warning">Cambios sin guardar</span>
        <button type="button" :disabled="isSaving || !isDirty"
          class="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          @click="save">
          {{ isSaving ? 'Guardando…' : 'Guardar plan' }}
        </button>
      </div>
    </section>

    <div class="space-y-6">
      <section class="rounded-2xl border border-border bg-surface p-5">
        <h2 class="mb-3 text-base font-bold text-text">Próximos cobros</h2>
        <p v-if="!form.enabled" class="mb-2 rounded-lg bg-bg-secondary px-3 py-1.5 text-[11px] text-text-muted">Avisos desactivados: el negocio no ve nada.</p>
        <ul v-if="schedule.length" class="space-y-1.5">
          <li v-for="s in schedule" :key="s.date" class="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 text-xs">
            <span class="text-text-secondary">{{ formatDateHuman(s.date) }} <span class="text-text-muted">· {{ s.label }}</span></span>
            <span class="font-bold tabular-nums text-text">{{ formatBillingAmount(s.amount, form.currency) }}</span>
          </li>
        </ul>
        <p v-else class="text-xs text-text-muted">Configura la próxima fecha y un monto para ver el calendario de cobros.</p>
        <p class="mt-3 text-[11px] text-text-muted">
          <b class="text-text-secondary">Hoy el admin ve:</b>
          {{ data?.notice_today ? billingNoticeText(data.notice_today).title : 'ningún aviso' }}
          <span v-if="isDirty">(según lo guardado)</span>
        </p>
      </section>

      <BillingPaymentsCard
        :payments="data?.payments ?? []" :next-due-on="data?.plan?.next_due_on ?? null"
        :is-initial="!!data?.plan?.next_is_initial && (data?.plan?.initial_amount ?? 0) > 0"
        :amount-due="data?.amount_due ?? null" :currency="data?.plan?.currency ?? 'USD'" :today="data?.today ?? ''"
        :disabled-reason="isDirty ? 'Guarda los cambios del plan antes de registrar un pago.' : ''"
        :recording="isRecording" :undoing="isUndoing"
        @record="(input) => recordPayment(input).catch(() => {})" @undo="confirmUndo" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { formatDateHuman } from '../../lib/formatters'
import {
  CYCLE_OPTIONS, addMonthsISO, billingNoticeText, cycleLabel, formatBillingAmount, type BillingPlan,
} from '../../lib/billing'
import { useBusinessBilling } from '../../composables/superadmin/useBusinessBilling'
import BillingPaymentsCard from './BillingPaymentsCard.vue'

const props = defineProps<{ businessId: string }>()

const { data, isLoading, savePlan, isSaving, recordPayment, isRecording, undoPayment, isUndoing } =
  useBusinessBilling(toRef(props, 'businessId'))

const labelClass = 'mb-1 block text-[11px] font-semibold text-text-muted'
const inputClass = 'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10'

const emptyPlan = (): BillingPlan => ({
  enabled: false, currency: 'USD', trial_ends_on: null, initial_amount: null, cycle: 'monthly',
  recurring_amount: null, next_due_on: null, next_is_initial: true, remind_days_before: [5, 3, 1],
  payment_instructions: null, custom_message: null,
})

const form = ref<BillingPlan>(emptyPlan())
const saved = computed<BillingPlan>(() => data.value?.plan ?? emptyPlan())
watch(saved, (p) => { form.value = { ...p, remind_days_before: [...p.remind_days_before] } }, { immediate: true })

/** Lo que se envía: campos vacíos como null y días ordenados, para comparar y guardar igual. */
function normalized(p: BillingPlan): BillingPlan {
  const num = (v: unknown) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))
  return {
    ...p,
    trial_ends_on: p.trial_ends_on || null,
    next_due_on: p.next_due_on || null,
    initial_amount: num(p.initial_amount),
    recurring_amount: num(p.recurring_amount),
    remind_days_before: [...new Set(p.remind_days_before)].sort((a, b) => b - a),
    payment_instructions: p.payment_instructions?.trim() || null,
    custom_message: p.custom_message?.trim() || null,
  }
}
const isDirty = computed(() => JSON.stringify(normalized(form.value)) !== JSON.stringify(normalized(saved.value)))

const dayChoices = computed(() => [...new Set([10, 7, 5, 3, 2, 1, ...form.value.remind_days_before])].sort((a, b) => b - a))
const customDay = ref<number | null>(null)
function toggleDay(d: number) {
  const days = form.value.remind_days_before
  form.value.remind_days_before = days.includes(d) ? days.filter(x => x !== d) : [...days, d]
}
function addCustomDay() {
  const d = Math.round(Number(customDay.value))
  if (d >= 1 && d <= 90 && !form.value.remind_days_before.includes(d)) form.value.remind_days_before = [...form.value.remind_days_before, d]
  customDay.value = null
}

function startTrial() {
  const today = data.value?.today
  if (!today) return
  const end = addMonthsISO(today, 1)
  form.value = { ...form.value, enabled: true, trial_ends_on: end, next_due_on: end, next_is_initial: true }
}

/** Los próximos 4 cobros según el formulario (lo mismo que hará el servidor al marcar pagos). */
const schedule = computed(() => {
  const p = normalized(form.value)
  if (!p.next_due_on) return []
  const months = CYCLE_OPTIONS.find(c => c.value === p.cycle)?.months ?? 0
  const out: { date: string; amount: number; label: string }[] = []
  let date = p.next_due_on
  let first = p.next_is_initial && (p.initial_amount ?? 0) > 0
  for (let i = 0; i < 4; i++) {
    const amount = first ? p.initial_amount! : p.recurring_amount ?? 0
    if (amount > 0) out.push({ date, amount, label: first ? 'Primer pago' : cycleLabel(p.cycle) })
    if (!months) break
    date = addMonthsISO(date, months)
    first = false
  }
  return out
})

async function save() {
  try { await savePlan(normalized(form.value)) } catch { /* el toast ya lo muestra el composable */ }
}

function confirmUndo(paymentId: string) {
  if (!window.confirm('¿Deshacer el último pago? La próxima fecha volverá al vencimiento que ese pago cubría.')) return
  undoPayment(paymentId).catch(() => {})
}
</script>
