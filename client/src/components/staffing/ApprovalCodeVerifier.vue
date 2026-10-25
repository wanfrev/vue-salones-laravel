<template>
  <div>
    <p class="text-sm font-semibold text-text">{{ t('approvals.verify.title') }}</p>
    <p class="text-xs text-text-muted">
      {{ t('approvals.verify.intro') }}
    </p>

    <form class="mt-3 flex flex-wrap items-center gap-2" @submit.prevent="verify">
      <input v-model="code" type="text" placeholder="NOM-7F3K-92QA" maxlength="40" autocomplete="off"
        class="w-52 rounded-lg border border-border bg-surface px-3 py-2 text-sm uppercase text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      <button type="submit" :disabled="!code.trim() || loading"
        class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60">
        {{ loading ? t('approvals.verify.loading') : t('approvals.verify.button') }}
      </button>
    </form>

    <p v-if="error" class="mt-2 text-xs text-danger">{{ error }}</p>

    <div v-else-if="result" class="mt-3 rounded-lg border px-3 py-2.5 text-sm"
      :class="!result.found ? 'border-danger/30 bg-danger/10' : result.intact ? 'border-success/30 bg-success/10' : 'border-warning/40 bg-warning/10'">
      <template v-if="!result.found">
        <p class="font-semibold text-danger">{{ t('approvals.verify.notFound') }}</p>
        <p class="text-xs text-text-secondary">{{ t('approvals.verify.notFoundDetail', { code: result.code }) }}</p>
      </template>
      <template v-else>
        <p class="font-semibold" :class="result.intact ? 'text-success' : 'text-warning'">
          {{ result.intact ? t('approvals.verify.valid') : t('approvals.verify.changed') }}
        </p>
        <p class="mt-1 text-xs text-text-secondary">
          {{ result.company }}<template v-if="result.project"> — {{ result.project }}</template>
          · {{ formatDateUS(result.week_start!) }} – {{ formatDateUS(result.week_end!) }}
        </p>
        <p class="text-xs text-text-secondary">
          {{ t('approvals.verify.approvedBy') }} <strong>{{ result.approved_by_name || '—' }}</strong><template v-if="approvedAt"> · {{ approvedAt }}</template>
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { translateError } from '../../lib/errors'
import { formatDateUS } from '../../lib/formatters'
import { verifyApprovalCode } from '../../services/staffing/approvalStampService'
import { useI18n } from '../../i18n'
import type { ApprovalVerification } from '../../services/staffing/approvalStampService'

const { t, locale } = useI18n()
const code = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<ApprovalVerification | null>(null)

const approvedAt = computed(() =>
  result.value?.approved_at ? new Date(result.value.approved_at).toLocaleString(locale.value === 'en' ? 'en-US' : 'es-VE', { dateStyle: 'short', timeStyle: 'short' }) : '',
)

const verify = async () => {
  if (!code.value.trim()) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await verifyApprovalCode(code.value)
  } catch (err) {
    error.value = translateError(err, t('approvals.verify.failed'))
  } finally {
    loading.value = false
  }
}
</script>
