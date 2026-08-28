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
      <div class="mb-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar empresa por nombre o sitio..."
          class="w-full max-w-md rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>

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
        <p class="text-lg font-semibold text-text">
          {{ searchQuery ? 'Sin resultados' : 'No hay empresas ' + STATUS_TAB_LABELS[activeStatusTab].toLowerCase() }}
        </p>
        <p class="mt-1 text-sm text-text-muted">
          {{ searchQuery ? 'Prueba con otro término de búsqueda.' : 'Registra la primera empresa para poder cargar horas y facturar.' }}
        </p>
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
            <button title="Eliminar"
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
            <button type="button"
              class="rounded-t-lg px-3 py-1.5 text-xs font-semibold transition-theme"
              :class="expandedTab === 'projects' ? 'bg-surface text-primary' : 'text-text-muted hover:text-text'"
              @click="expandedTab = 'projects'">
              Proyectos
            </button>
          </div>
          <RateCardEditor v-if="expandedTab === 'rates'" :business-id="businessId" :company-id="company.id" />
          <StaffingWorkersPanel v-else-if="expandedTab === 'personal'" :business-id="businessId" :company-id="company.id" />
          <BillingPanel v-else-if="expandedTab === 'billing'" :business-id="businessId" :company-id="company.id" />
          <StaffingProjectsPanel v-else :company-id="company.id" />
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

              <div>
                <label class="mb-1 block text-sm font-medium text-text">Retención (Tax)</label>
                <SegmentedTabs :tabs="TAX_MODE_TABS" :model-value="taxMode" @update:model-value="setTaxMode" />
              </div>

              <div v-if="taxMode === 'flat'">
                <label class="mb-1 block text-sm font-medium text-text" for="emp-tax">Retención (Tax %)</label>
                <input id="emp-tax" v-model.number="taxRatePercent" type="number" min="0" max="100" step="0.1"
                  class="max-w-[10rem]" :class="inputClass" />
                <p class="mt-1 text-[10px] text-text-muted">Se aparta del pago de nómina.</p>
              </div>

              <div v-else class="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-tax-threshold">Umbral ($)</label>
                  <input id="emp-tax-threshold" v-model.number="taxTierThreshold" type="number" min="0" step="1"
                    :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-tax-low">% si es menor al umbral</label>
                  <input id="emp-tax-low" v-model.number="taxTierLowPercent" type="number" min="0" max="100" step="0.1"
                    :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-tax-high">% si es igual o mayor</label>
                  <input id="emp-tax-high" v-model.number="taxTierHighPercent" type="number" min="0" max="100" step="0.1"
                    :class="inputClass" />
                </div>
                <p class="text-[10px] text-text-muted sm:col-span-3">
                  Ej: {{ taxTierLowPercent }}% si el pago semanal es menor a ${{ taxTierThreshold }}, {{ taxTierHighPercent }}% si es ${{ taxTierThreshold }} o más.
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-terms">Plazo de pago (días)</label>
                  <input id="emp-terms" v-model.number="ctx.form.value.paymentTermsDays" type="number" min="0" max="365"
                    :class="inputClass" />
                </div>
                <FormDropdown v-model="ctx.form.value.payoutRounding" label="Redondeo del pago"
                  :options="ROUNDING_OPTIONS" />
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="emp-perdiem">Per diem ($/día)</label>
                <input id="emp-perdiem" v-model.number="ctx.form.value.perDiemRate" type="number" min="0" step="0.01"
                  class="max-w-[10rem]" :class="inputClass" />
                <p class="mt-1 text-[10px] text-text-muted">
                  Opcional. Se paga al empleado por día en Nómina, nunca se incluye en la factura de esta empresa.
                </p>
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
                  <div class="w-28 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" title="Solo si este rol paga distinto según el turno">Turno</label>
                    <select v-model="role.shift" :class="inputClass">
                      <option :value="null">General</option>
                      <option v-for="opt in SHIFT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
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

            <section class="space-y-3">
              <div class="flex items-center justify-between border-b border-border pb-1.5">
                <p class="text-xs font-semibold uppercase tracking-wider text-primary">Proyectos (Opcional)</p>
                <button type="button"
                  class="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                  @click="ctx.form.value.projects ? ctx.form.value.projects.push({ name: '', active: true }) : (ctx.form.value.projects = [{ name: '', active: true }])">
                  + Agregar proyecto
                </button>
              </div>

              <div class="space-y-2">
                <div v-for="(proj, i) in ctx.form.value.projects" :key="i"
                  class="flex items-center gap-3 rounded-xl border border-border/70 bg-bg-secondary/10 p-3">
                  <div class="flex-1">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Nombre del Proyecto</label>
                    <input v-model="proj.name" type="text" :class="inputClass" placeholder="Ej: Fase 1, Site B..." required />
                  </div>
                  <div class="flex flex-col items-center shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Activo</label>
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="proj.active"
                      @click="proj.active = !proj.active"
                      :class="[
                        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2 mt-1.5',
                        proj.active ? 'bg-primary border-primary' : 'bg-border border-border'
                      ]"
                    >
                      <span
                        :class="[
                          'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                          proj.active ? 'translate-x-4' : 'translate-x-0'
                        ]"
                      />
                    </button>
                  </div>
                  <div class="flex items-center pb-0.5 shrink-0 mt-4">
                    <button type="button"
                      class="rounded-lg p-2 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                      @click="ctx.form.value.projects?.splice(i, 1)">
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
import SegmentedTabs from '../components/common/SegmentedTabs.vue'
import StaffingProjectsPanel from '../components/staffing/StaffingProjectsPanel.vue'
import RateCardEditor from '../components/staffing/RateCardEditor.vue'
import BillingPanel from '../components/staffing/BillingPanel.vue'
import StaffingWorkersPanel from '../components/staffing/StaffingWorkersPanel.vue'
import HeadcountMatrix from '../components/staffing/HeadcountMatrix.vue'
import { SHIFT_OPTIONS, type StaffingCompanyRow, type StaffingCompanyStatus } from '../services/staffing/staffingService'
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
  { value: 'exact', label: 'Exacto (se respetan los decimales)' },
  { value: 'round', label: 'Redondeo (5 o más hacia arriba)' },
  { value: 'floor', label: 'Sin decimales (mantiene enteros, elimina decimales)' },
]

const ROUNDING_LABELS: Record<string, string> = {
  exact: 'Exacto (se respetan los decimales)',
  cent: 'Exacto (se respetan los decimales)', // support legacy
  round: 'Redondeo entero',
  floor: 'Sin decimales',
}

// A row saved before a mode existed (or by hand) must not render "undefined" in the list.
const roundingLabel = (mode: string) => ROUNDING_LABELS[mode] ?? 'Exacto (se respetan los decimales)'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
const ctx = useEmpresas(businessId)

const taxRatePercent = computed({
  get: () => Math.round(ctx.form.value.taxRate * 10000) / 100,
  set: (val: number | string) => {
    ctx.form.value.taxRate = val === '' || val == null ? 0 : Number(val) / 100
  }
})

// "Escalonada" is only ever the two-tier shape described by the client (a flat % under a
// threshold, a higher flat % from it up — e.g. DYKE's 3.5%/7% at $500). The engine
// (TaxRule::tiered) supports any number of brackets, but no UI has ever needed more than two, so
// this editor stays a fixed low/high pair rather than a general N-bracket builder.
const TAX_MODE_TABS = [
  { key: 'flat', label: 'Retención plana' },
  { key: 'tiered', label: 'Retención escalonada' },
]
const taxMode = computed<'flat' | 'tiered'>(() => ctx.form.value.taxBrackets && ctx.form.value.taxBrackets.length >= 2 ? 'tiered' : 'flat')
const setTaxMode = (mode: string) => {
  if (mode === 'tiered') {
    ctx.form.value.taxBrackets = ctx.form.value.taxBrackets && ctx.form.value.taxBrackets.length >= 2
      ? ctx.form.value.taxBrackets
      : [{ threshold: 500, rate: 0.035 }, { threshold: null, rate: 0.07 }]
  } else {
    ctx.form.value.taxBrackets = null
  }
}

const taxTierThreshold = computed({
  get: () => ctx.form.value.taxBrackets?.[0]?.threshold ?? 500,
  set: (val: number | string) => {
    if (!ctx.form.value.taxBrackets) return
    ctx.form.value.taxBrackets[0].threshold = val === '' || val == null ? 0 : Number(val)
  }
})
const taxTierLowPercent = computed({
  get: () => Math.round((ctx.form.value.taxBrackets?.[0]?.rate ?? 0) * 10000) / 100,
  set: (val: number | string) => {
    if (!ctx.form.value.taxBrackets) return
    ctx.form.value.taxBrackets[0].rate = val === '' || val == null ? 0 : Number(val) / 100
  }
})
const taxTierHighPercent = computed({
  get: () => Math.round((ctx.form.value.taxBrackets?.[1]?.rate ?? 0) * 10000) / 100,
  set: (val: number | string) => {
    if (!ctx.form.value.taxBrackets) return
    ctx.form.value.taxBrackets[1].rate = val === '' || val == null ? 0 : Number(val) / 100
  }
})

const searchQuery = ref('')
const filteredCompanies = computed(() => {
  const list = ctx.companiesByStatus.value[activeStatusTab.value] ?? []
  if (!searchQuery.value.trim()) return list
  const q = searchQuery.value.toLowerCase().trim()
  return list.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.legalName || '').toLowerCase().includes(q) ||
    (c.workSite || '').toLowerCase().includes(q)
  )
})
const showMatrix = ref(false)

const expandedId = ref<string | null>(null)
const expandedTab = ref<'rates' | 'personal' | 'billing'>('rates')
const toggle = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
  expandedTab.value = 'rates'
}

const confirmDelete = (company: StaffingCompanyRow) => {
  if (window.confirm(`¿Estás seguro de eliminar la empresa "${company.name}"? Esta acción no se puede deshacer.`)) {
    ctx.handleDelete(company.id)
  }
}


</script>
