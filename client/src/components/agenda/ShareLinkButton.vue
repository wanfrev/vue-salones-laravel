<template>
  <div v-if="businessStore.hasFeature('enable_public_booking') && !isEmployee" class="relative flex shrink-0">
    <button
      @click="copyDefaultShareLink"
      class="flex items-center gap-1 rounded-l-md border border-primary/30 bg-primary-light px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15 border-r-0"
    >
      <LinkIcon class="h-3 w-3" />
      <span>Link</span>
    </button>
    <button
      @click="dropdownOpen = !dropdownOpen"
      class="rounded-r-md border border-primary/30 bg-primary-light px-1 py-1 text-primary transition-colors hover:bg-primary/15 border-l border-primary/20"
    >
      <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </button>
    <Transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0 scale-95 -translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 -translate-y-1">
      <div v-if="dropdownOpen" class="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
        <button
          @click="copyGeneralShareLink"
          class="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-bg-secondary text-left"
        >
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
            <LinkIcon class="h-3 w-3" />
          </div>
          <span class="truncate text-text">
            Cualquier empleado
            <span class="block text-[10px] text-text-muted">El cliente elige con quién atenderse</span>
          </span>
        </button>
        <div class="my-1 h-px bg-border"></div>
        <p class="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-2.5 py-1.5">Un empleado específico</p>
        <button
          v-for="emp in employees"
          :key="emp.id"
          @click="copyShareLink(emp.id)"
          class="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-bg-secondary text-left"
        >
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary flex-shrink-0">
            {{ getInitials(emp.label) }}
          </div>
          <span class="truncate text-text">{{ emp.label }}</span>
        </button>
        <div v-if="employees.length === 0" class="px-2.5 py-3 text-xs text-text-muted text-center">
          No hay empleados disponibles
        </div>
      </div>
    </Transition>
    <div v-if="dropdownOpen" class="fixed inset-0 z-40" @click="dropdownOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { useNotification } from '../../composables/common/useNotification'
import { getInitials } from '../../lib/formatters'
import { LinkIcon } from '@solar-icons/vue/linear'

const props = defineProps<{
  employees: { id: string; label: string }[]
}>()

const authStore = useAuthStore()
const businessStore = useBusinessStore()
const { success } = useNotification()
const isEmployee = authStore.role === 'empleado'

const dropdownOpen = ref(false)

function copyShareLink(employeeId: string) {
  dropdownOpen.value = false
  const origin = window.location.origin
  const slug = businessStore.business?.slug || 'salon'
  const link = `${origin}/reservar/${slug}?empleado=${employeeId}`
  navigator.clipboard.writeText(link).then(() => {
    success('Link de reserva copiado al portapapeles')
  }).catch(() => {
    prompt('Copia este link:', link)
  })
}

function copyDefaultShareLink() {
  const defaultEmpId = authStore.profile?.id || props.employees[0]?.id
  if (defaultEmpId) {
    copyShareLink(defaultEmpId)
  }
}

function copyGeneralShareLink() {
  dropdownOpen.value = false
  const origin = window.location.origin
  const slug = businessStore.business?.slug || 'salon'
  const link = `${origin}/reservar/${slug}`
  navigator.clipboard.writeText(link).then(() => {
    success('Link de reserva copiado — el cliente elige el empleado')
  }).catch(() => {
    prompt('Copia este link:', link)
  })
}
</script>
