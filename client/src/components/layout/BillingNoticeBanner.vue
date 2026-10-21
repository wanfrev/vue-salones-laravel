<template>
  <Transition
    enter-active-class="transition duration-300 ease-out" enter-from-class="-translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="-translate-y-1 opacity-0">
    <div v-if="notice" role="status" class="px-4 pt-4 lg:px-6 lg:pt-6">
      <div class="relative overflow-hidden rounded-2xl border p-4 shadow-sm sm:p-5" :class="tone.box">
        <!-- Brillo decorativo -->
        <div class="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-3xl" :class="tone.glow" />

        <div class="relative flex items-start gap-3 sm:gap-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11" :class="tone.icon">
            <DangerTriangleIcon v-if="notice.status === 'overdue'" :size="22" />
            <WalletMoneyIcon v-else :size="22" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-bold uppercase tracking-wider" :class="tone.eyebrow">Recuerda pagar tu aliado</p>
            <h2 class="mt-0.5 text-sm font-bold text-text sm:text-base">{{ text.title }}</h2>
            <p class="mt-1 text-xs leading-relaxed text-text-secondary sm:text-sm">{{ text.body }}</p>
            <p v-if="notice.custom_message" class="mt-2 text-xs italic leading-relaxed text-text-secondary">{{ notice.custom_message }}</p>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums" :class="tone.amount">
                {{ formatBillingAmount(notice.amount, notice.currency) }}
              </span>
              <button v-if="notice.payment_instructions" type="button"
                class="rounded-lg border border-border bg-surface/70 px-2.5 py-1 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text"
                :aria-expanded="showHow" @click="showHow = !showHow">
                {{ showHow ? 'Ocultar' : '¿Cómo pago?' }}
              </button>
            </div>

            <Transition
              enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
              leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <p v-if="showHow && notice.payment_instructions"
                class="mt-2 whitespace-pre-line rounded-xl border border-border-subtle bg-surface/80 px-3 py-2 text-xs leading-relaxed text-text">
                {{ notice.payment_instructions }}
              </p>
            </Transition>
          </div>

          <button v-if="notice.dismissible" type="button" title="Ocultar por hoy" aria-label="Ocultar por hoy"
            class="shrink-0 rounded-lg p-1 text-text-muted transition-colors hover:bg-surface/70 hover:text-text"
            @click="dismiss">
            <CloseCircleIcon :size="20" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CloseCircleIcon, DangerTriangleIcon, WalletMoneyIcon } from '@solar-icons/vue/linear'
import { useBillingNotice } from '../../composables/common/useBillingNotice'
import { billingNoticeText, formatBillingAmount } from '../../lib/billing'

const { notice, dismiss } = useBillingNotice()
const showHow = ref(false)

const text = computed(() => (notice.value ? billingNoticeText(notice.value) : { title: '', body: '' }))

const tone = computed(() => {
  if (notice.value?.status === 'overdue') {
    return {
      box: 'border-danger/30 bg-linear-to-br from-danger/10 via-surface to-surface',
      glow: 'bg-danger/20',
      icon: 'bg-danger/15 text-danger',
      eyebrow: 'text-danger',
      amount: 'bg-danger/10 text-danger',
    }
  }
  if (notice.value?.status === 'due_today') {
    return {
      box: 'border-warning/30 bg-linear-to-br from-warning/10 via-surface to-surface',
      glow: 'bg-warning/20',
      icon: 'bg-warning/15 text-warning',
      eyebrow: 'text-warning',
      amount: 'bg-warning/10 text-warning',
    }
  }
  return {
    box: 'border-primary/30 bg-linear-to-br from-primary-light via-surface to-surface',
    glow: 'bg-primary/25',
    icon: 'bg-primary/15 text-primary',
    eyebrow: 'text-primary',
    amount: 'bg-primary/10 text-primary-dark',
  }
})
</script>
