<template>
  <div class="text-xs" data-testid="gc-payment-badge">
    <div v-if="giftCard.payment" class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span class="text-text-muted">Pagó:</span>
      <span class="font-medium text-text" data-testid="gc-payment-text">{{ describePayment(giftCard.payment.splits) }}</span>
      <span class="text-text-muted">· {{ formatDate(giftCard.payment.paidAt) }}</span>
      <button type="button" class="font-semibold text-primary hover:text-primary-hover" data-testid="gc-payment-change" @click="emit('register', giftCard)">Cambiar</button>
      <button type="button" class="font-semibold text-text-muted hover:text-danger" data-testid="gc-payment-remove" @click="emit('remove', giftCard)">Quitar</button>
    </div>
    <div v-else class="flex flex-wrap items-center gap-2">
      <span class="font-medium text-warning" data-testid="gc-payment-missing">Sin cobro registrado</span>
      <button type="button" class="rounded-md border border-primary/30 px-2 py-0.5 font-semibold text-primary hover:bg-primary/10" data-testid="gc-payment-register" @click="emit('register', giftCard)">Registrar cobro</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '../../lib/formatters'
import { describePayment } from '../../lib/giftCardPayment'
import type { GiftCard } from '../../types/giftCard'

defineProps<{ giftCard: GiftCard }>()
const emit = defineEmits<{ register: [giftCard: GiftCard]; remove: [giftCard: GiftCard] }>()
</script>
