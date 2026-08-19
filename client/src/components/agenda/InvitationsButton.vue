<template>
  <template v-if="canManageInvitations">
    <button
      @click="modalRef?.open()"
      title="Invitaciones pendientes"
      class="relative rounded-lg p-1.5 text-orange-600 transition-theme hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
    >
      <BellIcon :size="20" />
      <span v-if="count > 0"
        class="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
        {{ count > 9 ? '9+' : count }}
      </span>
    </button>
    <PendingInvitationsModal ref="modalRef" />
  </template>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { BellIcon } from '@solar-icons/vue/linear'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { usePendingInvitations } from '../../composables/agenda/usePendingInvitations'
import PendingInvitationsModal from './PendingInvitationsModal.vue'

const authStore = useAuthStore()
const businessStore = useBusinessStore()
const modalRef = ref<InstanceType<typeof PendingInvitationsModal> | null>(null)
const { count } = usePendingInvitations()

const canManageInvitations = computed(() => {
  const role = authStore.role
  // Invitaciones son solicitudes de cita por link público — no aplica a nichos sin agenda (staffing, tienda).
  if (!role || !businessStore.hasFeature('agenda') || !businessStore.hasFeature('enable_public_booking')) return false
  if (role === 'admin' || role === 'superadmin') return true
  return (authStore.profile as any)?.can_create_appointments !== false
})
</script>
