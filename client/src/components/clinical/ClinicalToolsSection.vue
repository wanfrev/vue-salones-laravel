<template>
  <section v-if="hasAccess" class="mb-6 no-print">
    <div class="mb-3 flex items-end justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Atención psicológica</p>
        <h2 class="mt-1 text-lg font-bold text-text">Expediente clínico</h2>
      </div>
      <span class="hidden text-xs text-text-muted sm:block">Accesos rápidos del expediente</span>
    </div>

    <div v-if="riskAlerts.length > 0" class="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-danger/40 bg-danger/5 px-3 py-2">
      <DangerTriangleIcon class="h-4 w-4 shrink-0 text-danger" />
      <span
        v-for="alert in riskAlerts"
        :key="alert.key"
        class="rounded-lg border border-danger/30 bg-surface px-2 py-0.5 text-xs font-semibold text-danger"
      >{{ alert.label }}</span>
    </div>

    <!-- Mismo nav que usa el shell dentro del expediente — íconos y puntos de "tiene datos"
         idénticos aquí y allá. -->
    <DentalToolsNav :tabs="navTabs" model-value="" @update:model-value="goToTab" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DangerTriangleIcon } from '@solar-icons/vue/linear'
import { useClinicalToolsNavTabs } from '../../composables/clinical/useClinicalToolsNavTabs'
import DentalToolsNav from '../dental/DentalToolsNav.vue'

/**
 * Bloque de acceso rápido al expediente clínico para la ficha del paciente (ClienteHistorial /
 * EmployeeClienteHistorial). Se renderiza solo con `v-if` del nicho clínico; además se oculta
 * solo si el usuario no tiene permiso de expediente (p. ej. recepción).
 */
const route = useRoute()
const router = useRouter()

const clienteId = computed(() => route.params.id as string)
const basePath = computed(() => (route.path.startsWith('/dashboard') ? '/dashboard' : '/admin'))

const { navTabs, riskAlerts, hasAccess } = useClinicalToolsNavTabs(() => clienteId.value)

const goToTab = (key: string) => {
  router.push(`${basePath.value}/clientes/${clienteId.value}/expediente-clinico/${key}`)
}
</script>
