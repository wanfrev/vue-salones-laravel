<template>
  <FeatureGate :gate="{ capability: 'staffing.timesheets' }">
    <header class="mb-4 flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <BuildingsIcon class="h-4 w-4 shrink-0 text-primary" />
        <h1 class="truncate text-xl font-bold tracking-tight text-text sm:text-2xl">{{ t('empresas.title') }}</h1>
      </div>
      <button
        class="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover"
        @click="ctx.openNew()">
        <AddCircleIcon class="h-4 w-4" />
        <span>{{ t('empresas.new') }}</span>
      </button>
    </header>

    <div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div class="flex items-center justify-between gap-2 border-b border-border-subtle pr-2 sm:pr-3">
        <div class="scroll-thin flex min-w-0 gap-1 overflow-x-auto overflow-y-hidden px-2 sm:px-3" role="tablist" :aria-label="t('empresas.tabs.aria')">
          <button v-for="tab in STATUS_TABS" :key="tab.value" type="button" role="tab" :aria-selected="activeStatusTab === tab.value"
            class="relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors"
            :class="activeStatusTab === tab.value ? 'text-primary' : 'text-text-secondary hover:text-text'"
            @click="activeStatusTab = tab.value">
            {{ tab.label }}
            <span class="ml-1 text-xs font-semibold tabular-nums text-text-muted">
              {{ ctx.companiesByStatus.value[tab.value].length }}
            </span>
            <span v-if="activeStatusTab === tab.value" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
          </button>
        </div>
        <button type="button"
          class="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          @click="showMatrix = !showMatrix">
          {{ showMatrix ? t('empresas.viewList') : t('empresas.viewMatrix') }}
        </button>
      </div>

      <HeadcountMatrix v-if="showMatrix" :business-id="businessId" :status="activeStatusTab" />

      <template v-else>
        <div class="border-b border-border-subtle px-3 py-3 sm:px-4">
          <div class="relative max-w-md">
            <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('empresas.search')"
              :aria-label="t('empresas.searchAria')"
              class="w-full rounded-xl border border-border bg-bg-secondary/40 py-2.5 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        <ul v-if="ctx.isLoading.value" class="divide-y divide-border-subtle" aria-busy="true">
          <li v-for="n in 4" :key="n" class="flex items-center gap-3 px-3 py-3.5 sm:px-4">
            <span class="h-9 w-9 shrink-0 animate-pulse rounded-full bg-bg-secondary" />
            <span class="flex-1 space-y-2">
              <span class="block h-3 w-1/3 animate-pulse rounded bg-bg-secondary" />
              <span class="block h-2.5 w-1/2 animate-pulse rounded bg-bg-secondary" />
            </span>
          </li>
        </ul>

        <div v-else-if="filteredCompanies.length === 0"
          class="flex flex-col items-center justify-center px-4 py-16 text-center">
          <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary">
            <BuildingsIcon class="h-7 w-7 text-text-muted" />
          </div>
          <p class="text-base font-medium text-text">
            {{ searchQuery ? t('empresas.noResults') : t(`empresas.empty.${activeStatusTab}`) }}
          </p>
          <p class="mt-1 text-sm text-text-muted">
            {{ searchQuery ? t('empresas.noResultsHint') : t('empresas.emptyHint') }}
          </p>
        </div>

        <ul v-else class="divide-y divide-border-subtle">
          <li v-for="company in filteredCompanies" :key="company.id" data-testid="company-row">
            <div class="flex items-center gap-3 px-3 py-3 sm:px-4">
              <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left"
                :aria-expanded="expandedId === company.id"
                @click="toggle(company.id)">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {{ getInitials(company.name) }}
                </span>
                <span class="min-w-0">
                  <span class="flex items-center gap-2">
                    <span class="block truncate text-sm font-semibold text-text">{{ company.name }}</span>
                    <span class="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold" :class="STATUS_TEXT_CLASS[company.status]">
                      <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                      {{ STATUS_TAB_LABELS[company.status] }}
                    </span>
                  </span>
                  <span class="block truncate text-xs text-text-muted">
                    {{ company.workSite || t('empresas.noWorkSite') }} · {{ t('empresas.termDays', { n: company.paymentTermsDays }) }}
                  </span>
                </span>
              </button>

              <div class="hidden w-44 shrink-0 text-right md:block">
                <span class="block text-[11px] font-bold uppercase tracking-wider text-text-muted">{{ t('empresas.payout') }}</span>
                <span class="block text-xs font-semibold leading-tight text-text">{{ roundingLabel(company.payoutRounding) }}</span>
              </div>

              <div class="flex w-14 shrink-0 items-center justify-end">
                <button :title="t('common.edit')" :aria-label="t('common.edit')"
                  class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary"
                  @click="ctx.openEdit(company)">
                  <PenIcon class="h-4 w-4" />
                </button>
                <button :title="t('common.delete')" :aria-label="t('common.delete')"
                  class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  @click="confirmDelete(company)">
                  <TrashBin2Icon class="h-4 w-4" />
                </button>
              </div>
            </div>

            <template v-if="expandedId === company.id">
              <div class="scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden border-t border-border-subtle bg-bg-secondary/30 px-2 sm:px-3" role="tablist" :aria-label="t('empresas.detail.aria')">
                <button v-for="tab in EXPANDED_TABS" :key="tab.value" type="button" role="tab" :aria-selected="expandedTab === tab.value"
                  class="relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors"
                  :class="expandedTab === tab.value ? 'text-primary' : 'text-text-secondary hover:text-text'"
                  @click="expandedTab = tab.value">
                  {{ tab.label }}
                  <span v-if="expandedTab === tab.value" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
                </button>
              </div>
              <RateCardEditor v-if="expandedTab === 'rates'" :business-id="businessId" :company-id="company.id" />
              <StaffingWorkersPanel v-else-if="expandedTab === 'personal'" :business-id="businessId" :company-id="company.id" />
              <BillingPanel v-else-if="expandedTab === 'billing'" :business-id="businessId" :company-id="company.id" />
              <StaffingProjectsPanel v-else :company-id="company.id" />
            </template>
          </li>
        </ul>
      </template>
    </div>

    <Teleport to="body">
      <div v-if="ctx.showModal.value" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="ctx.closeModal">
        <div class="max-h-full w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-5">
            <h2 class="text-lg font-semibold text-text">
              {{ ctx.editingId.value ? t('empresas.form.titleEdit') : t('empresas.form.titleNew') }}
            </h2>
            <p class="text-sm text-text-muted">{{ t('empresas.form.intro') }}</p>
          </div>

          <form class="space-y-5" @submit.prevent="ctx.handleSave">
            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">{{ t('empresas.form.identification') }}</p>
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-name">{{ t('empresas.form.name') }}</label>
                  <input id="emp-name" v-model="ctx.form.value.name" type="text" required :class="inputClass"
                    :placeholder="t('empresas.form.namePlaceholder')" />
                </div>
                <FormDropdown v-model="ctx.form.value.status" :label="t('empresas.form.status')" :options="STATUS_FORM_OPTIONS" />
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-worksite">{{ t('empresas.form.workSite') }}</label>
                  <input id="emp-worksite" v-model="ctx.form.value.workSite" type="text" :class="inputClass"
                    :placeholder="t('empresas.form.workSitePlaceholder')" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-address">{{ t('empresas.form.address') }}</label>
                  <input id="emp-address" v-model="ctx.form.value.address" type="text" :class="inputClass" />
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-text" for="emp-city">{{ t('empresas.form.city') }}</label>
                    <input id="emp-city" v-model="ctx.form.value.city" type="text" :class="inputClass" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-text" for="emp-state">{{ t('empresas.form.state') }}</label>
                    <input id="emp-state" v-model="ctx.form.value.state" type="text" :class="inputClass" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-text" for="emp-zip">{{ t('empresas.form.zip') }}</label>
                    <input id="emp-zip" v-model="ctx.form.value.zip" type="text" :class="inputClass" />
                  </div>
                </div>
              </div>
            </section>

            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">{{ t('empresas.form.contact') }}</p>
              <div class="grid gap-3 sm:grid-cols-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-cname">{{ t('empresas.form.contactName') }}</label>
                  <input id="emp-cname" v-model="ctx.form.value.contactName" type="text" :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-cphone">{{ t('empresas.form.contactPhone') }}</label>
                  <input id="emp-cphone" v-model="ctx.form.value.contactPhone" type="text" :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-cemail">{{ t('empresas.form.contactEmail') }}</label>
                  <input id="emp-cemail" v-model="ctx.form.value.contactEmail" type="email" :class="inputClass" />
                </div>
              </div>
            </section>

            <section class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">{{ t('empresas.form.payrollRules') }}</p>

              <div>
                <label class="mb-1 block text-sm font-medium text-text">{{ t('empresas.form.taxLabel') }}</label>
                <SegmentedTabs :tabs="TAX_MODE_TABS" :model-value="taxMode" @update:model-value="setTaxMode" />
              </div>

              <div v-if="taxMode === 'flat'">
                <label class="mb-1 block text-sm font-medium text-text" for="emp-tax">{{ t('empresas.form.taxPercent') }}</label>
                <input id="emp-tax" v-model.number="taxRatePercent" type="number" min="0" max="100" step="0.1"
                  class="max-w-[10rem]" :class="inputClass" />
                <p class="mt-1 text-[10px] text-text-muted">{{ t('empresas.form.taxHint') }}</p>
              </div>

              <div v-else class="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-tax-threshold">{{ t('empresas.form.threshold') }}</label>
                  <input id="emp-tax-threshold" v-model.number="taxTierThreshold" type="number" min="0" step="1"
                    :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-tax-low">{{ t('empresas.form.belowThreshold') }}</label>
                  <input id="emp-tax-low" v-model.number="taxTierLowPercent" type="number" min="0" max="100" step="0.1"
                    :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-tax-high">{{ t('empresas.form.atOrAbove') }}</label>
                  <input id="emp-tax-high" v-model.number="taxTierHighPercent" type="number" min="0" max="100" step="0.1"
                    :class="inputClass" />
                </div>
                <p class="text-[10px] text-text-muted sm:col-span-3">
                  {{ t('empresas.form.tierExample', { low: taxTierLowPercent, high: taxTierHighPercent, threshold: taxTierThreshold }) }}
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text" for="emp-terms">{{ t('empresas.form.paymentTerms') }}</label>
                  <input id="emp-terms" v-model.number="ctx.form.value.paymentTermsDays" type="number" min="0" max="365"
                    :class="inputClass" />
                </div>
                <FormDropdown v-model="ctx.form.value.payoutRounding" :label="t('empresas.form.rounding')"
                  :options="ROUNDING_OPTIONS" />
              </div>

              <div class="rounded-xl border border-border p-3">
                <div class="mb-2 flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-text">{{ t('empresas.form.rolesTitle') }}</p>
                    <p class="text-xs text-text-muted">
                      {{ t('empresas.form.rolesIntro') }}
                    </p>
                  </div>
                  <button type="button"
                    class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                    @click="ctx.addRole()">
                    {{ t('empresas.form.addRole') }}
                  </button>
                </div>

                <p v-if="ctx.form.value.roles.length === 0" class="py-2 text-xs text-text-muted">
                  {{ t('empresas.form.noRoles') }}
                </p>

                <div v-for="(role, i) in ctx.form.value.roles" :key="i"
                  class="mb-2.5 flex flex-wrap items-end gap-2 rounded-lg border border-border/50 bg-bg-secondary/20 p-2 sm:border-0 sm:bg-transparent sm:p-0">
                  <div class="min-w-[130px] flex-1">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                      {{ t('empresas.form.role') }}
                    </label>
                    <input v-model="role.role" type="text" :class="inputClass" :placeholder="t('empresas.form.rolePlaceholder')" required />
                  </div>
                  <div class="w-28 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :title="t('empresas.form.shiftHint')">{{ t('empresas.form.shift') }}</label>
                    <select v-model="role.shift" :class="inputClass">
                      <option :value="null">{{ t('common.general') }}</option>
                      <option v-for="opt in SHIFT_OPTIONS" :key="opt.value" :value="opt.value">{{ t(`common.shift.${opt.value}`) }}</option>
                    </select>
                  </div>
                  <div class="w-20 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :title="t('empresas.form.regHoursHint')">{{ t('empresas.form.regHours') }}</label>
                    <input v-model.number="role.overtimeThresholdHours" type="number" min="0" step="0.5" :class="inputClass" required />
                  </div>
                  <div class="w-24 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('empresas.form.payReg') }}</label>
                    <input v-model.number="role.payRate" type="number" min="0" step="0.01" :class="inputClass" required />
                  </div>
                  <div class="w-24 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('empresas.form.billReg') }}</label>
                    <input v-model.number="role.billRate" type="number" min="0" step="0.01" :class="inputClass" required />
                  </div>
                  <div class="w-24 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('empresas.form.payOt') }}</label>
                    <input v-model.number="role.overtimePayRate" type="number" min="0" step="0.01" :class="inputClass" placeholder="0.00" />
                  </div>
                  <div class="w-24 shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('empresas.form.billOt') }}</label>
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
                <p class="text-xs font-semibold uppercase tracking-wider text-primary">{{ t('empresas.form.projects') }}</p>
                <button type="button"
                  class="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                  @click="ctx.form.value.projects ? ctx.form.value.projects.push({ name: '', active: true }) : (ctx.form.value.projects = [{ name: '', active: true }])">
                  {{ t('empresas.form.addProject') }}
                </button>
              </div>

              <div class="space-y-2">
                <div v-for="(proj, i) in ctx.form.value.projects" :key="i"
                  class="flex items-center gap-3 rounded-xl border border-border/70 bg-bg-secondary/10 p-3">
                  <div class="flex-1">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('empresas.form.projectName') }}</label>
                    <input v-model="proj.name" type="text" :class="inputClass" :placeholder="t('empresas.form.projectPlaceholder')" required />
                  </div>
                  <div class="flex flex-col items-center shrink-0">
                    <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('empresas.form.projectActive') }}</label>
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
              <label class="mb-1 block text-sm font-medium text-text" for="emp-notes">{{ t('empresas.form.notes') }}</label>
              <textarea id="emp-notes" v-model="ctx.form.value.notes" rows="2" :class="inputClass" />
            </div>

            <p v-if="ctx.saveError.value" class="text-sm text-danger">{{ ctx.saveError.value }}</p>

            <div class="flex items-center justify-end gap-3">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="ctx.closeModal">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" :disabled="ctx.isSaving.value"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                {{ ctx.isSaving.value ? t('common.saving') : t('common.save') }}
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
import { useI18n, type MessageKey } from '../i18n'
import { BuildingsIcon, AddCircleIcon, PenIcon, TrashBin2Icon, MagnifierIcon } from '@solar-icons/vue/linear'

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const { t } = useI18n()

const STATUS_TABS = computed<{ value: StaffingCompanyStatus; label: string }[]>(() => [
  { value: 'active', label: t('empresas.tabs.active') },
  { value: 'inactive', label: t('empresas.tabs.inactive') },
  { value: 'on_hold', label: t('empresas.tabs.on_hold') },
])
const STATUS_TAB_LABELS = computed<Record<StaffingCompanyStatus, string>>(() => ({
  active: t('empresas.status.active'),
  inactive: t('empresas.status.inactive'),
  on_hold: t('empresas.status.on_hold'),
}))
const STATUS_FORM_OPTIONS = computed(() => [
  { value: 'active', label: t('empresas.status.active') },
  { value: 'inactive', label: t('empresas.status.inactive') },
  { value: 'on_hold', label: t('empresas.statusOption.on_hold') },
])

const STATUS_TEXT_CLASS: Record<StaffingCompanyStatus, string> = {
  active: 'text-success',
  inactive: 'text-danger',
  on_hold: 'text-warning',
}

const activeStatusTab = ref<StaffingCompanyStatus>('active')



const ROUNDING_OPTIONS = computed(() => [
  { value: 'exact', label: t('empresas.rounding.exact') },
  { value: 'round', label: t('empresas.roundingOption.round') },
  { value: 'floor', label: t('empresas.roundingOption.floor') },
])
// 'cent' is the legacy name of 'exact'.
const ROUNDING_LABEL_KEYS: Record<string, MessageKey> = {
  exact: 'empresas.rounding.exact',
  cent: 'empresas.rounding.exact',
  round: 'empresas.rounding.round',
  floor: 'empresas.rounding.floor',
}

// A row saved before a mode existed (or by hand) must not render "undefined" in the list.
const roundingLabel = (mode: string) => t(ROUNDING_LABEL_KEYS[mode] ?? 'empresas.rounding.exact')

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
const TAX_MODE_TABS = computed(() => [
  { key: 'flat', label: t('empresas.form.taxFlat') },
  { key: 'tiered', label: t('empresas.form.taxTiered') },
])
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
const expandedTab = ref<'rates' | 'personal' | 'billing' | 'projects'>('rates')
const EXPANDED_TABS = computed(() => [
  { value: 'rates' as const, label: t('empresas.detail.rates') },
  { value: 'personal' as const, label: t('empresas.detail.personal') },
  { value: 'billing' as const, label: t('empresas.detail.billing') },
  { value: 'projects' as const, label: t('empresas.detail.projects') },
])
const toggle = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
  expandedTab.value = 'rates'
}

const confirmDelete = (company: StaffingCompanyRow) => {
  if (window.confirm(t('empresas.confirmDelete', { name: company.name }))) {
    ctx.handleDelete(company.id)
  }
}


</script>
