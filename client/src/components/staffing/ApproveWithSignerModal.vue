<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">¿Quién aprueba esta nómina?</h2>
          <p class="mt-0.5 text-xs text-text-muted">
            Elige tu nombre e ingresa tu PIN. Quedará registrado en la nómina quién la aprobó.
          </p>
          <p v-if="context" class="mt-1 text-xs font-medium text-text-secondary">{{ context }}</p>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <div class="space-y-2">
            <label v-for="a in approvers" :key="a.id"
              class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-theme"
              :class="selectedId === a.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-bg-secondary/50'">
              <input v-model="selectedId" type="radio" :value="a.id" name="approver" class="h-4 w-4" />
              <span class="flex-1 text-sm font-medium text-text">{{ a.name }}</span>
              <img v-if="a.image" :src="a.image" :alt="`Firma de ${a.name}`" class="h-8 rounded border border-border bg-white" />
            </label>
          </div>

          <div v-if="selectedId">
            <label for="approver-pin" class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">PIN</label>
            <input id="approver-pin" ref="pinInput" v-model="pin" type="password" inputmode="numeric" autocomplete="off"
              maxlength="8" placeholder="••••"
              class="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm font-medium tracking-widest text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>

          <div v-if="errorMsg" class="rounded-lg bg-danger/10 p-2.5 text-xs text-danger">{{ errorMsg }}</div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')">Cancelar</button>
            <button type="submit" :disabled="!canSubmit || isApproving"
              class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ isApproving ? 'Aprobando...' : 'Aprobar nómina' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { isValidPin } from '../../services/staffing/approverService'
import type { StaffingApprover } from '../../services/staffing/approverService'

const props = defineProps<{
  show: boolean
  approvers: StaffingApprover[]
  isApproving?: boolean
  /** Server error from the last attempt (wrong PIN, locked out...), shown inside the dialog. */
  errorMsg?: string
  /** One line saying which week this approves, e.g. "BALIN · 04/10/2026". */
  context?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', signer: { approverId: string; pin: string }): void
}>()

const selectedId = ref('')
const pin = ref('')
const pinInput = ref<HTMLInputElement | null>(null)

// Never keep a previous PIN around: each opening starts clean, and the PIN is wiped on close.
watch(() => props.show, (open) => {
  selectedId.value = open && props.approvers.length === 1 ? props.approvers[0].id : ''
  pin.value = ''
})
watch(selectedId, async (id) => {
  pin.value = ''
  if (id) { await nextTick(); pinInput.value?.focus() }
})

const canSubmit = computed(() => !!selectedId.value && isValidPin(pin.value))

const submit = () => {
  if (!canSubmit.value) return
  emit('confirm', { approverId: selectedId.value, pin: pin.value })
}
</script>
