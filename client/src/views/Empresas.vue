<template>
  <FeatureGate :gate="{ capability: 'staffing.timesheets' }">
    <header class="mb-5 lg:mb-8">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div class="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <BuildingsIcon class="h-3.5 w-3.5" />
            <span>Empresas</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">Empresas cliente</h1>
          <p class="mt-1 text-sm text-text-muted">
            Las empresas donde trabajan tus empleados, con la tarifa de cada rol y las reglas de nómina.
          </p>
        </div>
        <button
          class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover"
          @click="ctx.openNew()">
          <AddCircleIcon class="h-4 w-4" />
          Nueva empresa
        </button>
      </div>
    </header>

    <div v-if="ctx.isLoading.value" class="flex items-center justify-center py-16">
      <svg class="h-7 w-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <div v-else-if="ctx.companies.value.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary">
        <BuildingsIcon class="h-7 w-7 text-text-muted" />
      </div>
      <p class="text-lg font-semibold text-text">No hay empresas</p>
      <p class="mt-1 text-sm text-text-muted">Registra la primera empresa para poder cargar horas y facturar.</p>
    </div>

    <div v-else class="space-y-3">
      <div v-for="company in ctx.companies.value" :key="company.id"
        class="overflow-hidden rounded-xl border border-border bg-surface">
        <div class="flex flex-wrap items-center gap-3 px-4 py-3.5">
          <button type="button" class="flex flex-1 items-center gap-3 text-left"
            @click="toggle(company.id)">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {{ getInitials(company.name) }}
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold text-text">{{ company.name }}</span>
              <span class="block truncate text-xs text-text-muted">
                {{ company.workSite || 'Sin sitio de trabajo' }} · {{ company.paymentTermsDays }} días de plazo
              </span>
            </span>
          </button>

          <div class="hidden text-right sm:block">
            <span class="block text-[10px] uppercase tracking-wider text-text-muted">Retención</span>
            <span class="text-xs font-semibold text-text">{{ describeBrackets(company) }}</span>
          </div>

          <div class="hidden text-right md:block">
            <span class="block text-[10px] uppercase tracking-wider text-text-muted">Pago</span>
            <span class="text-xs font-semibold text-text">{{ roundingLabel(company.payoutRounding) }}</span>
          </div>

          <div class="flex items-center gap-1">
            <button title="Editar"
              class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
              @click="ctx.openEdit(company)">
              <PenIcon class="h-4 w-4" />
            </button>
            <button title="Desactivar"
              class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
              @click="confirmDelete(company)">
              <TrashBin2Icon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <RateCardEditor v-if="expandedId === company.id" :business-id="businessId" :company-id="company.id" />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="ctx.showModal.value" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="ctx.closeModal">
        <div class="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-5">
            <h2 class="text-lg font-semibold text-text">
              {{ ctx.editingId.value ? 'Editar empresa' : 'Nueva empresa' }}
            </h2>
            <p class="text-sm text-text-muted">Datos de facturación y reglas de nómina de esta empresa.</p>
          </div>

          <form class="space-y-5" @submit.prevent="ctx.handleSave">
            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Identificación</p>
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-name">Nombre</label>
                  <input id="emp-name" v-model="ctx.form.value.name" type="text" required :class="inputClass"
                    placeholder="Ej: DYKE INDUSTRIES" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-worksite">Sitio de trabajo</label>
                  <input id="emp-worksite" v-model="ctx.form.value.workSite" type="text" :class="inputClass"
                    placeholder="Ej: GAINESVILLE" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-address">Dirección</label>
                  <input id="emp-address" v-model="ctx.form.value.address" type="text" :class="inputClass" />
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-text" for="emp-city">Ciudad</label>
                    <input id="emp-city" v-model="ctx.form.value.city" type="text" :class="inputClass" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-text" for="emp-state">Estado</label>
                    <input id="emp-state" v-model="ctx.form.value.state" type="text" :class="inputClass" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-text" for="emp-zip">ZIP</label>
                    <input id="emp-zip" v-model="ctx.form.value.zip" type="text" :class="inputClass" />
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-contact">Contacto</label>
                  <input id="emp-contact" v-model="ctx.form.value.contactName" type="text" :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-email">Email</label>
                  <input id="emp-email" v-model="ctx.form.value.contactEmail" type="email" :class="inputClass" />
                </div>
              </div>
            </section>

            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Reglas de nómina</p>
              <div class="grid gap-3 sm:grid-cols-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-terms">Plazo de pago (días)</label>
                  <input id="emp-terms" v-model.number="ctx.form.value.paymentTermsDays" type="number" min="0" max="365"
                    :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-ot-threshold">Horas antes de OT</label>
                  <input id="emp-ot-threshold" v-model.number="ctx.form.value.overtimeThresholdHours" type="number"
                    min="0" max="168" step="0.5" :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-ot-mult">Recargo OT</label>
                  <input id="emp-ot-mult" v-model.number="ctx.form.value.overtimeMultiplier" type="number" min="1"
                    max="5" step="0.1" :class="inputClass" />
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <FormDropdown v-model="ctx.form.value.taxDestination" label="¿Qué pasa con la retención?"
                  :options="TAX_DESTINATION_OPTIONS" />
                <FormDropdown v-model="ctx.form.value.payoutRounding" label="Redondeo del pago"
                  :options="ROUNDING_OPTIONS" />
              </div>

              <div class="rounded-xl border border-border p-3">
                <div class="mb-2 flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-text">Tramos de retención</p>
                    <p class="text-xs text-text-muted">
                      El porcentaje se aplica sobre el bruto completo, no solo sobre el excedente.
                      Sin tramos, no se retiene nada.
                    </p>
                  </div>
                  <button type="button"
                    class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                    @click="ctx.addBracket()">
                    Agregar tramo
                  </button>
                </div>

                <p v-if="ctx.form.value.taxBrackets.length === 0" class="py-2 text-xs text-text-muted">
                  Sin retención — el empleado cobra el bruto completo.
                </p>

                <div v-for="(bracket, i) in ctx.form.value.taxBrackets" :key="i"
                  class="mb-2 flex flex-wrap items-end gap-2">
                  <div class="w-40">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                      Si el bruto es menor a
                    </label>
                    <input v-model.number="bracket.threshold" type="number" min="0" step="0.01" :class="inputClass"
                      placeholder="Sin límite" />
                  </div>
                  <div class="w-32">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Retener %</label>
                    <input :value="toPercent(bracket.rate)" type="number" min="0" max="100" step="0.1"
                      :class="inputClass" @input="setRate(bracket, $event)" />
                  </div>
                  <button type="button"
                    class="rounded-lg p-2 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                    @click="ctx.removeBracket(i)">
                    <TrashBin2Icon class="h-4 w-4" />
                  </button>
                </div>

                <p v-if="cliffWarning" class="mt-1 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
                  {{ cliffWarning }}
                </p>
              </div>
            </section>

            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="emp-notes">Notas</label>
              <textarea id="emp-notes" v-model="ctx.form.value.notes" rows="2" :class="inputClass" />
            </div>

            <p v-if="ctx.saveError.value" class="text-sm text-danger">{{ ctx.saveError.value }}</p>

            <div class="flex items-center justify-end gap-3">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="ctx.closeModal">
                Cancelar
              </button>
              <button type="submit" :disabled="ctx.isSaving.value"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                {{ ctx.isSaving.value ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { useEmpresas } from '../composables/staffing/useEmpresas'
import { getInitials } from '../lib/formatters'
import { FeatureGate } from '../components/common'
import { FormDropdown } from '../components/forms'
import RateCardEditor from '../components/staffing/RateCardEditor.vue'
import type { StaffingCompanyRow } from '../services/staffingService'
import type { StaffingTaxBracket } from '../types/database'
import { BuildingsIcon, AddCircleIcon, PenIcon, TrashBin2Icon } from '@solar-icons/vue/linear'

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const TAX_DESTINATION_OPTIONS = [
  { value: 'remitted', label: 'Se entrega a un tercero (es un costo)' },
  { value: 'retained', label: 'Se la queda la agencia (es margen)' },
]

const ROUNDING_OPTIONS = [
  { value: 'cent', label: 'Al centavo' },
  { value: 'floor', label: 'A dólar entero hacia abajo' },
  { value: 'exact', label: 'Exacto, sin redondear' },
]

const ROUNDING_LABELS: Record<string, string> = {
  cent: 'Al centavo',
  floor: 'Dólar entero',
  exact: 'Exacto',
}

// A row saved before a mode existed (or by hand) must not render "undefined" in the list.
const roundingLabel = (mode: string) => ROUNDING_LABELS[mode] ?? 'Al centavo'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
const ctx = useEmpresas(businessId)

const expandedId = ref<string | null>(null)
const toggle = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

const confirmDelete = (company: StaffingCompanyRow) => {
  if (window.confirm(`¿Desactivar ${company.name}? Su historial de nómina se conserva.`)) {
    ctx.handleDelete(company.id)
  }
}

// Rates are stored as fractions (0.07) but typed as percentages (7).
const toPercent = (rate: number) => Math.round(rate * 10000) / 100
const setRate = (bracket: StaffingTaxBracket, event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  bracket.rate = Number.isFinite(value) ? value / 100 : 0
}

const describeBrackets = (company: StaffingCompanyRow): string => {
  if (!company.taxBrackets.length) return 'Ninguna'
  return company.taxBrackets.map(b => `${toPercent(b.rate)}%`).join(' / ')
}

/**
 * A flat-rate tier applies to the whole gross, so crossing a threshold can leave someone with
 * less take-home than the person just below it. Surfacing it here turns an accidental cliff
 * into a deliberate one.
 */
const cliffWarning = computed(() => {
  const brackets = ctx.form.value.taxBrackets
  for (let i = 0; i < brackets.length - 1; i++) {
    const current = brackets[i]
    const next = brackets[i + 1]
    if (current.threshold === null || next.rate <= current.rate) continue

    const atThreshold = current.threshold
    const netBelow = atThreshold * (1 - current.rate)
    const netAbove = atThreshold * (1 - next.rate)
    const drop = netBelow - netAbove

    if (drop > 0) {
      return `Ojo: al pasar de $${atThreshold} de bruto, el neto del empleado cae $${drop.toFixed(2)}. `
        + 'Ganar un dólar más le deja menos dinero.'
    }
  }
  return ''
})
</script>
