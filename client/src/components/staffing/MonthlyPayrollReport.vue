<template>
  <div class="p-3 sm:p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm font-semibold text-text">{{ t('reports.monthly.title') }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input v-model="search" type="text" :placeholder="t('reports.searchCompany')"
            class="w-40 rounded-xl border border-border bg-bg-secondary/40 py-2 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15 sm:w-48" />
        </div>
        <select v-model.number="month" class="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
          <option v-for="(label, i) in MONTH_LABELS" :key="i" :value="i + 1">{{ label }}</option>
        </select>
        <div class="flex items-center gap-1">
          <button type="button" :title="t('common.prevYear')" :aria-label="t('common.prevYear')"
            class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary"
            @click="year -= 1">
            <ArrowLeftIcon class="h-4 w-4" />
          </button>
          <span class="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-text">{{ year }}</span>
          <button type="button" :title="t('common.nextYear')" :aria-label="t('common.nextYear')"
            class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary"
            @click="year += 1">
            <ArrowRightIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="report.isLoading.value" class="divide-y divide-border-subtle" aria-busy="true">
      <p class="sr-only">{{ t('reports.loading') }}</p>
      <div v-for="n in 4" :key="n" class="flex items-center gap-4 px-3 py-3"><span class="h-3 w-32 animate-pulse rounded bg-bg-secondary" /><span class="h-3 flex-1 animate-pulse rounded bg-bg-secondary" /><span class="h-3 w-20 animate-pulse rounded bg-bg-secondary" /></div>
    </div>

    <p v-else-if="report.companies.value.length === 0" class="py-8 text-center text-sm text-text-muted">
      {{ t('reports.noCompanies') }}
    </p>

    <p v-else-if="filteredCompanies.length === 0" class="py-8 text-center text-sm text-text-muted">
      {{ t('reports.noCompanyMatch', { search }) }}
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border-subtle bg-bg-secondary/30 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
            <th class="px-3 py-2">{{ t('reports.company') }}</th>
            <th v-for="(week, i) in report.weeks.value" :key="week.week_start" class="px-3 py-2 text-right">
              {{ t('reports.monthly.week', { n: i + 1 }) }}
            </th>
            <th class="px-3 py-2 text-right">{{ t('reports.total') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle">
          <tr v-for="company in filteredCompanies" :key="company.companyId">
            <td class="whitespace-nowrap px-3 py-2 font-medium text-text">{{ company.name }}</td>
            <td v-for="week in report.weeks.value" :key="week.week_start" class="px-1 py-1 text-right">
              <button type="button"
                class="w-full rounded-md px-2 py-1 tabular-nums text-text-secondary transition-theme hover:bg-primary/10 hover:text-primary"
                :title="t('reports.monthly.goTo', { company: company.name, week: week.week_start })"
                @click="goToNomina(company.companyId, week.week_start, company.weeklyProjectId[week.week_start])">
                {{ formatUSD(company.weeklyPayroll[week.week_start] ?? 0) }}
              </button>
            </td>
            <td class="px-3 py-2 text-right tabular-nums font-semibold text-text">{{ formatUSD(company.total) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, ArrowRightIcon, MagnifierIcon } from '@solar-icons/vue/linear'
import { useStaffingMonthlyReport } from '../../composables/staffing/useStaffingMonthlyReport'
import { useCurrency } from '../../composables/common/useCurrency'
import { useI18n, type MessageKey } from '../../i18n'

const props = defineProps<{ businessId: string | null }>()

const { formatUSD } = useCurrency()
const { t } = useI18n()
const router = useRouter()

// `projectId` is `null` for "General (Sin proyecto)" — vue-router drops a `null` query value
// entirely, which would be indistinguishable from "no project known", so it travels as the
// literal string 'general' instead and Nomina.vue unpacks it back.
const goToNomina = (companyId: string, weekStart: string, projectId: string | null) => {
  router.push({ path: '/admin/nomina', query: { companyId, weekStart, projectId: projectId ?? 'general' } })
}

const MONTH_LABELS = computed(() => Array.from({ length: 12 }, (_, i) => t(`reports.month.${i + 1}` as MessageKey)))

const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)

const report = useStaffingMonthlyReport(toRef(props, 'businessId'), year, month)

const search = ref('')
const filteredCompanies = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return report.companies.value
  return report.companies.value.filter(c => c.name.toLowerCase().includes(term))
})
</script>
