<template>
  <div v-if="hasAccess">
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DangerTriangleIcon } from '@solar-icons/vue/linear'
import { useClinicalToolsNavTabs } from '../../composables/clinical/useClinicalToolsNavTabs'
import DentalToolsNav from '../dental/DentalToolsNav.vue'

/**
 * Herramientas del expediente clínico (alertas de riesgo + accesos a las 5 pestañas) para la ficha
 * del paciente (ClienteHistorial / EmployeeClienteHistorial), dentro del mismo bloque
 * "Herramientas clínicas" que usa odontología. El encabezado lo pone el padre; aquí solo va el
 * contenido. Se renderiza solo con `v-else-if="isClinicalNiche"`, y se oculta por sí mismo para
 * quien no tenga permiso de expediente (p. ej. recepción).
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
