<template>
  <LifeLineEditor :scope="scope" :birth-year="birthYear" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import LifeLineEditor from '../components/clinical/LifeLineEditor.vue'
import { getClienteById } from '../services/clientesService'
import { ageFromBirthday } from '../components/clinical/cases'
import type { DiagramScope } from '../services/clinical/diagramService'

const route = useRoute()
const clienteId = computed(() => route.params.id as string)
const scope = computed<DiagramScope>(() => ({ kind: 'client', id: clienteId.value }))

// Mismo query que el encabezado del expediente: se comparte la caché, no se pide dos veces.
const { data: cliente } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})

const birthYear = computed(() => {
  const age = ageFromBirthday(cliente.value?.birthday)
  return age === null ? null : new Date().getFullYear() - age
})
</script>
