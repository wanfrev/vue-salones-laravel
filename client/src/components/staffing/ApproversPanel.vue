<template>
  <div>
    <p class="text-sm font-semibold text-text">{{ t('approvals.panel.title') }}</p>
    <p class="text-xs text-text-muted">
      {{ t('approvals.panel.intro') }}
    </p>

    <p v-if="isLoading" class="mt-3 text-xs text-text-muted">{{ t('approvals.panel.loading') }}</p>

    <ul v-else class="mt-3 space-y-2">
      <li v-for="a in approvers" :key="a.id" class="rounded-xl border border-border px-3 py-2.5">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-text">{{ a.name }}</span>
          <button type="button" class="ml-auto text-xs font-semibold text-primary hover:underline" @click="openManage(a.id)">
            {{ managing === a.id ? t('approvals.panel.close') : t('approvals.panel.manage') }}
          </button>
        </div>

        <div v-if="managing === a.id" class="mt-3 space-y-3 border-t border-border pt-3">
          <div class="grid max-w-sm grid-cols-2 gap-2">
            <div>
              <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :for="`pin-${a.id}`">{{ t('approvals.panel.currentPin') }}</label>
              <input :id="`pin-${a.id}`" v-model="managePin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :for="`newpin-${a.id}`">{{ t('approvals.panel.newPin') }}</label>
              <input :id="`newpin-${a.id}`" v-model="newPin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" :class="inputClass" />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button type="button" :disabled="!isValidPin(managePin) || !isValidPin(newPin) || busy"
              class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              @click="changePin(a.id)">{{ t('approvals.panel.changePin') }}</button>
            <button type="button" :disabled="!isValidPin(managePin) || busy"
              class="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
              @click="remove(a)">{{ t('approvals.panel.remove') }}</button>
          </div>
          <p v-if="manageError" class="text-xs text-danger">{{ manageError }}</p>
        </div>
      </li>
      <li v-if="approvers.length === 0" class="text-xs text-text-muted">{{ t('approvals.panel.empty') }}</li>
    </ul>

    <div class="mt-4">
      <button v-if="!adding" type="button"
        class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
        @click="adding = true">{{ t('approvals.panel.add') }}</button>

      <form v-else class="max-w-md space-y-3 rounded-xl border border-border p-3" @submit.prevent="add">
        <div>
          <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="new-approver-name">{{ t('approvals.panel.name') }}</label>
          <input id="new-approver-name" v-model="form.name" type="text" maxlength="80" :class="inputClass" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="new-approver-pin">{{ t('approvals.panel.pin') }}</label>
            <input id="new-approver-pin" v-model="form.pin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="new-approver-pin2">{{ t('approvals.panel.pinRepeat') }}</label>
            <input id="new-approver-pin2" v-model="form.pin2" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" :class="inputClass" />
          </div>
        </div>
        <p v-if="formProblem" class="text-xs text-danger">{{ formProblem }}</p>
        <div class="flex gap-2">
          <button type="submit" :disabled="!!formProblem || form.name.trim().length < 2 || busy"
            class="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
            {{ busy ? t('approvals.panel.saving') : t('approvals.panel.save') }}
          </button>
          <button type="button" class="rounded-lg border border-border px-4 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary" @click="resetForm">{{ t('approvals.panel.cancel') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../../composables/common/useNotification'
import { translateError } from '../../lib/errors'
import { approverKeys, createApprover, deleteApprover, isValidPin, listApprovers, updateApprover } from '../../services/staffing/approverService'
import type { StaffingApprover } from '../../services/staffing/approverService'
import { useI18n } from '../../i18n'

const props = defineProps<{ businessId: string | null }>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const { t } = useI18n()
const queryClient = useQueryClient()
const { success, error: showError } = useNotification()

const { data, isLoading } = useQuery({
  queryKey: computed(() => approverKeys.all(props.businessId)),
  queryFn: listApprovers,
  enabled: computed(() => !!props.businessId),
  staleTime: 0,
})
const approvers = computed<StaffingApprover[]>(() => data.value ?? [])
const refresh = () => queryClient.invalidateQueries({ queryKey: ['staffing-approvers'], exact: false })

const busy = ref(false)

// ── add ────────────────────────────────────────────────────────────────────
const adding = ref(false)
const form = ref({ name: '', pin: '', pin2: '' })
const resetForm = () => { adding.value = false; form.value = { name: '', pin: '', pin2: '' } }

const formProblem = computed(() => {
  if (form.value.pin && !isValidPin(form.value.pin)) return t('approvals.panel.pinRange')
  if (form.value.pin2 && form.value.pin !== form.value.pin2) return t('approvals.panel.pinMismatch')
  if (!form.value.pin || !form.value.pin2) return t('approvals.panel.pinNeeded')
  return ''
})

const add = async () => {
  busy.value = true
  try {
    await createApprover({ name: form.value.name.trim(), pin: form.value.pin })
    await refresh()
    success(t('approvals.panel.added'))
    resetForm()
  } catch (err) {
    showError(translateError(err, t('approvals.panel.addFailed')))
  } finally {
    busy.value = false
  }
}

// ── manage one (always needs that boss's current PIN) ──────────────────────
const managing = ref<string | null>(null)
const managePin = ref('')
const newPin = ref('')
const manageError = ref('')

const openManage = (id: string) => {
  managing.value = managing.value === id ? null : id
  managePin.value = ''
  newPin.value = ''
  manageError.value = ''
}

const changePin = async (id: string) => {
  busy.value = true
  manageError.value = ''
  try {
    await updateApprover(id, { pin: managePin.value, new_pin: newPin.value })
    success(t('approvals.panel.pinUpdated'))
    openManage(id)
  } catch (err) {
    manageError.value = translateError(err, t('approvals.panel.pinFailed'))
  } finally {
    busy.value = false
  }
}

const remove = async (a: StaffingApprover) => {
  if (!window.confirm(t('approvals.panel.confirmRemove', { name: a.name }))) return
  busy.value = true
  manageError.value = ''
  try {
    await deleteApprover(a.id, managePin.value)
    await refresh()
    success(t('approvals.panel.removed'))
    managing.value = null
  } catch (err) {
    manageError.value = translateError(err, t('approvals.panel.removeFailed'))
  } finally {
    busy.value = false
  }
}
</script>
