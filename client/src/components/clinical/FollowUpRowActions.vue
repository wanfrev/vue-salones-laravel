<template>
  <div class="flex items-center gap-1 max-sm:-ml-3">
    <button v-if="whatsappPhone" @click="openWhatsApp" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-success/10 hover:text-success" title="Contactar por WhatsApp">
      <ChatRoundLineIcon class="h-3.5 w-3.5" />
      WhatsApp
    </button>
    <button @click="$emit('open')" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
      Abrir expediente
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChatRoundLineIcon } from '@solar-icons/vue/linear'
import { sanitizePhone } from '../../lib/formatters'

const props = defineProps<{ clientId: string; phone: string | null }>()
defineEmits<{ open: [] }>()

const whatsappPhone = computed(() => sanitizePhone(props.phone ?? ''))

const openWhatsApp = () => window.open(`https://wa.me/${whatsappPhone.value}`, '_blank')
</script>
