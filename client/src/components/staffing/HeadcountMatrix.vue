<template>
  <div class="p-3 sm:p-4">
    <div class="mb-3 flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-text">{{ t('empresas.matrix.title') }}</p>
      <div class="flex items-center gap-1">
        <button type="button" :title="t('common.prevYear')" :aria-label="t('common.prevYear')"
          class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
          @click="year -= 1">
          <ArrowLeftIcon class="h-4 w-4" />
        </button>
        <span class="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-text">{{ year }}</span>
        <button type="button" :title="t('common.nextYear')" :aria-label="t('common.nextYear')"
          class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
          @click="year += 1">
          <ArrowRightIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div v-if="matrix.isLoading.value" class="py-8 text-center text-sm text-text-muted">{{ t('empresas.matrix.loading') }}</div>

    <p v-else-if="matrix.companies.value.length === 0" class="py-8 text-center text-sm text-text-muted">
      {{ t('empresas.matrix.empty') }}
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
            <th class="sticky left-0 z-10 bg-surface px-3 py-2">{{ t('empresas.matrix.company') }}</th>
            <th v-for="week in matrix.weeks.value" :key="week.week_start" class="whitespace-nowrap px-3 py-2 text-right">
              {{ week.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="company in matrix.companies.value" :key="company.companyId">
            <td class="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2 font-medium text-text">
              {{ company.name }}
            </td>
            <td v-for="week in matrix.weeks.value" :key="week.week_start"
              class="px-3 py-2 text-right tabular-nums text-text-secondary">
              {{ company.weeklyHeadcount[week.week_start] ?? '' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/vue/linear'
import { useHeadcountMatrix } from '../../composables/staffing/useHeadcountMatrix'
import type { StaffingCompanyStatus } from '../../services/staffing/staffingService'
import { useI18n } from '../../i18n'

const props = defineProps<{
  businessId: string | null
  status: StaffingCompanyStatus
}>()

const { t } = useI18n()
const year = ref(new Date().getFullYear())

const matrix = useHeadcountMatrix(toRef(props, 'businessId'), year, toRef(props, 'status'))
</script>
