<template>
  <div>
    <p class="mb-3 text-xs text-text-muted">Genograma de la familia o del grupo. Es del caso: lo ven todos los integrantes.</p>
    <GenogramEditor :scope="scope" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GenogramEditor from '../components/clinical/GenogramEditor.vue'
import type { DiagramScope } from '../services/clinical/diagramService'

const route = useRoute()
const scope = computed<DiagramScope>(() => ({ kind: 'case', id: route.params.caseId as string }))
</script>
