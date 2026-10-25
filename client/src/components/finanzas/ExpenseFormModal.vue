<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="$emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">{{ isEditing ? t('finance.expense.titleEdit') : t('finance.expense.titleNew') }}</h2>
          <p class="text-sm text-text-muted">{{ isEditing ? t('finance.expense.subtitleEdit') : t('finance.expense.subtitleNew') }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="$emit('save')">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="exp-name">{{ t('finance.expense.concept') }}</label>
            <input id="exp-name" v-model="form.name" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              :placeholder="t('finance.expense.conceptPlaceholder')" required />
            <p v-if="formErrors?.name" class="text-xs text-danger mt-1">{{ formErrors.name }}</p>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="exp-category">{{ t('finance.expense.category') }}</label>
              <select id="exp-category" v-model="form.category"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="Fijos">{{ t('finance.expense.cat.Fijos') }}</option>
                <option value="Insumos">{{ t('finance.expense.cat.Insumos') }}</option>
                <option value="General">{{ t('finance.expense.cat.General') }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="exp-amount">{{ t('finance.expense.amount') }}</label>
              <input id="exp-amount" v-model.number="form.amount" type="number" min="0" step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="0.00" required />
              <p v-if="formErrors?.amount" class="text-xs text-danger mt-1">{{ formErrors.amount }}</p>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="exp-currency">{{ t('finance.expense.currency') }}</label>
              <select id="exp-currency" v-model="form.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="USD">USD $</option>
                <option v-if="!isSingleCurrency" value="VES">Bs</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="exp-date">{{ t('finance.expense.date') }}</label>
            <input id="exp-date" v-model="form.expenseDate" type="date"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              required />
            <p v-if="formErrors?.expenseDate" class="text-xs text-danger mt-1">{{ formErrors.expenseDate }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="exp-notes">{{ t('finance.expense.notes') }}</label>
            <textarea id="exp-notes" v-model="form.notes" rows="2"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              :placeholder="t('finance.manual.optional')" />
          </div>
          <p v-if="saveError" class="text-sm text-danger">{{ saveError }}</p>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="$emit('close')">{{ t('common.cancel') }}</button>
            <button type="submit" :disabled="isSaving"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ isSaving ? t('common.saving') : t('common.save') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from '../../i18n'
import { useCurrency } from '../../composables/common/useCurrency'

defineProps<{
  isOpen: boolean
  isEditing: boolean
  form: Record<string, string | number>
  saveError: string
  isSaving: boolean
  formErrors?: Record<string, string>
}>()

const { isSingleCurrency } = useCurrency()
const { t } = useI18n()

defineEmits<{
  close: []
  save: []
}>()
</script>
