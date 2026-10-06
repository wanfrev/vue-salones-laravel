<template>
  <div>
    <p class="mb-3 text-xs text-text-muted">Genograma individual del paciente (su familia de origen). Para la familia o pareja en terapia conjunta usa el genograma del caso.</p>
    <GenogramEditor :scope="scope" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GenogramEditor from '../components/clinical/GenogramEditor.vue'
import type { DiagramScope } from '../services/clinical/diagramService'

const route = useRoute()
const scope = computed<DiagramScope>(() => ({ kind: 'client', id: route.params.id as string }))
</script>
