<template>
  <FeatureGate :gate="{ capability: 'staffing.timesheets' }">
    <header class="mb-5 lg:mb-8">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <BuildingsIcon class="h-3.5 w-3.5" />
          <span>Empresas</span>
        </div>
        <button
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover"
          @click="ctx.openNew()">
          <AddCircleIcon class="h-4 w-4" />
          <span>Nueva empresa</span>
        </button>
      </div>
    </header>

    <div class="mb-4 flex items-center justify-between gap-3 border-b border-border">
      <div class="flex gap-1">
        <button v-for="tab in STATUS_TABS" :key="tab.value" type="button"
          class="relative px-3 py-2 text-sm font-semibold transition-theme"
          :class="activeStatusTab === tab.value ? 'text-primary' : 'text-text-muted hover:text-text'"
          @click="activeStatusTab = tab.value">
          {{ tab.label }}
          <span class="ml-1.5 rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-text-muted">
            {{ ctx.companiesByStatus.value[tab.value].length }}
          </span>
          <span v-if="activeStatusTab === tab.value" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
        </button>
      </div>
      <button type="button"
        class="mb-2 shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
        @click="showMatrix = !showMatrix">
        {{ showMatrix ? 'Ver lista' : 'Ver matriz' }}
      </button>
    </div>

    <HeadcountMatrix v-if="showMatrix" class="mb-4" :business-id="businessId" :status="activeStatusTab" />

    <template v-else>
      <div v-if="ctx.isLoading.value" class="flex items-center justify-center py-16">
        <svg class="h-7 w-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>

      <div v-else-if="filteredCompanies.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary">
          <BuildingsIcon class="h-7 w-7 text-text-muted" />
        </div>
        <p class="text-lg font-semibold text-text">No hay empresas {{ STATUS_TAB_LABELS[activeStatusTab].toLowerCase() }}</p>
        <p class="mt-1 text-sm text-text-muted">Registra la primera empresa para poder cargar horas y facturar.</p>
      </div>

      <div v-else class="space-y-3">
      <div v-for="company in filteredCompanies" :key="company.id"
        class="overflow-hidden rounded-xl border border-border bg-surface">
        <div class="flex flex-wrap items-center gap-3 px-4 py-3.5">
          <button type="button" class="flex flex-1 items-center gap-3 text-left"
            @click="toggle(company.id)">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {{ getInitials(company.name) }}
            </span>
            <span class="min-w-0">
              <span class="flex items-center gap-2">
                <span class="block truncate text-sm font-semibold text-text">{{ company.name }}</span>
                <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="STATUS_BADGE_CLASS[company.status]">
                  {{ STATUS_TAB_LABELS[company.status] }}
                </span>
              </span>
              <span class="block truncate text-xs text-text-muted">
                {{ company.workSite || 'Sin sitio de trabajo' }} · {{ company.paymentTermsDays }} días de plazo
              </span>
            </span>
          </button>



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

        <template v-if="expandedId === company.id">
          <div class="flex gap-1 border-t border-border bg-bg-secondary/40 px-4 pt-3">
            <button type="button"
              class="rounded-t-lg px-3 py-1.5 text-xs font-semibold transition-theme"
              :class="expandedTab === 'rates' ? 'bg-surface text-primary' : 'text-text-muted hover:text-text'"
              @click="expandedTab = 'rates'">
              Tarifas
            </button>
            <button type="button"
              class="rounded-t-lg px-3 py-1.5 text-xs font-semibold transition-theme"
              :class="expandedTab === 'personal' ? 'bg-surface text-primary' : 'text-text-muted hover:text-text'"
              @click="expandedTab = 'personal'">
              Personal
            </button>
            <button type="button"
              class="rounded-t-lg px-3 py-1.5 text-xs font-semibold transition-theme"
              :class="expandedTab === 'billing' ? 'bg-surface text-primary' : 'text-text-muted hover:text-text'"
              @click="expandedTab = 'billing'">
              Facturación
            </button>
          </div>
          <RateCardEditor v-if="expandedTab === 'rates'" :business-id="businessId" :company-id="company.id" />
          <StaffingWorkersPanel v-else-if="expandedTab === 'personal'" :business-id="businessId" :company-id="company.id" />
          <BillingPanel v-else :business-id="businessId" :company-id="company.id" />
        </template>
      </div>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="ctx.showModal.value" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="ctx.closeModal">
        <div class="max-h-full w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
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
                <FormDropdown v-model="ctx.form.value.status" label="Estado" :options="STATUS_FORM_OPTIONS" />
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
              </div>
            </section>

            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Contacto</p>
              <div class="grid gap-3 sm:grid-cols-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-cname">Nombre</label>
                  <input id="emp-cname" v-model="ctx.form.value.contactName" type="text" :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-cphone">Teléfono</label>
                  <input id="emp-cphone" v-model="ctx.form.value.contactPhone" type="text" :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-cemail">Email</label>
                  <input id="emp-cemail" v-model="ctx.form.value.contactEmail" type="email" :class="inputClass" />
                </div>
              </div>
            </section>

            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Reglas de nómina</p>

              <div class="grid gap-3 sm:grid-cols-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-tax">Retención (Tax %)</label>
                  <input id="emp-tax" v-model.number="taxRatePercent" type="number" min="0" max="100" step="0.1"
                    :class="inputClass" />
                  <p class="mt-1 text-[10px] text-text-muted">Se aparta del pago de nómina.</p>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-terms">Plazo de pago (días)</label>
                  <input id="emp-terms" v-model.number="ctx.form.value.paymentTermsDays" type="number" min="0" max="365"
                    :class="inputClass" />
                </div>
                <FormDropdown v-model="ctx.form.value.payoutRounding" label="Redondeo del pago"
                  :options="ROUNDING_OPTIONS" />
              </div>

              <div class="rounded-xl border border-border p-3">
                <div class="mb-2 flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-text">Roles y Tarifas</p>
                    <p class="text-xs text-text-muted">
                      Configura lo que gana cada empleado y lo que se le cobra a la empresa por hora regular y overtime.
                    </p>
                  </div>
                  <button type="button"
                    class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                    @click="ctx.addRole()">
                    Agregar rol
                  </button>
                </div>

                <p v-if="ctx.form.value.roles.length === 0" class="py-2 text-xs text-text-muted">
                  Sin roles definidos. Agrégalos para poder asignar tarifas a los empleados.
                </p>

                <div v-for="(role, i) in ctx.form.value.roles" :key="i"
                  class="mb-2.5 flex flex-wrap items-end gap-2 rounded-lg border border-border/50 bg-bg-secondary/20 p-2 sm:border-0 sm:bg-transparent sm:p-0">
                  <div class="min-w-[130px] flex-1">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                      Rol / Cargo
                    </label>
                    <input v-model="role.role" type="text" :class="inputClass" placeholder="Ej: Operario" required />
                  </div>
                  <div class="w-20 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" title="Horas Regulares antes de OT">Hrs Reg</label>
                    <input v-model.number="role.overtimeThresholdHours" type="number" min="0" step="0.5" :class="inputClass" required />
                  </div>
                  <div class="w-24 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Paga Reg ($)</label>
                    <input v-model.number="role.payRate" type="number" min="0" step="0.01" :class="inputClass" required />
                  </div>
                  <div class="w-24 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Cobra Reg ($)</label>
                    <input v-model.number="role.billRate" type="number" min="0" step="0.01" :class="inputClass" required />
                  </div>
                  <div class="w-24 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Paga OT ($)</label>
                    <input v-model.number="role.overtimePayRate" type="number" min="0" step="0.01" :class="inputClass" placeholder="0.00" />
                  </div>
                  <div class="w-24 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Cobra OT ($)</label>
                    <input v-model.number="role.overtimeBillRate" type="number" min="0" step="0.01" :class="inputClass" placeholder="0.00" />
                  </div>
                  <div class="flex items-center pb-0.5 shrink-0">
                    <button type="button"
                      class="rounded-lg p-2 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                      @click="ctx.removeRole(i)">
                      <TrashBin2Icon class="h-4 w-4" />
                    </button>
                  </div>
                </div>
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
import BillingPanel from '../components/staffing/BillingPanel.vue'
import StaffingWorkersPanel from '../components/staffing/StaffingWorkersPanel.vue'
import HeadcountMatrix from '../components/staffing/HeadcountMatrix.vue'
import type { StaffingCompanyRow, StaffingCompanyStatus } from '../services/staffing/staffingService'
import { BuildingsIcon, AddCircleIcon, PenIcon, TrashBin2Icon } from '@solar-icons/vue/linear'

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const STATUS_TABS: { value: StaffingCompanyStatus; label: string }[] = [
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
  { value: 'on_hold', label: 'En descanso' },
]

const STATUS_TAB_LABELS: Record<StaffingCompanyStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  on_hold: 'En descanso',
}

const STATUS_FORM_OPTIONS = [
  { value: 'active', label: 'Activa' },
  { value: 'inactive', label: 'Inactiva' },
  { value: 'on_hold', label: 'En descanso (pausa temporal)' },
]

const STATUS_BADGE_CLASS: Record<StaffingCompanyStatus, string> = {
  active: 'bg-success/10 text-success',
  inactive: 'bg-danger/10 text-danger',
  on_hold: 'bg-warning/10 text-warning',
}

const activeStatusTab = ref<StaffingCompanyStatus>('active')



const ROUNDING_OPTIONS = [
  { value: 'cent', label: 'Al centavo' },
  { value: 'floor', label: 'Al entero inferior' },
  { value: 'exact', label: 'Exacto (no redondea)' },
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

const taxRatePercent = computed({
  get: () => Math.round(ctx.form.value.taxRate * 10000) / 100,
  set: (val: number | string) => {
    ctx.form.value.taxRate = val === '' || val == null ? 0 : Number(val) / 100
  }
})

const filteredCompanies = computed(() => ctx.companiesByStatus.value[activeStatusTab.value])
const showMatrix = ref(false)

const expandedId = ref<string | null>(null)
const expandedTab = ref<'rates' | 'personal' | 'billing'>('rates')
const toggle = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
  expandedTab.value = 'rates'
}

const confirmDelete = (company: StaffingCompanyRow) => {
  if (window.confirm(`¿Desactivar ${company.name}? Su historial de nómina se conserva.`)) {
    ctx.handleDelete(company.id)
  }
}


</script>
