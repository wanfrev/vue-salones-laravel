<template>
  <div v-if="config" :class="embedded ? '' : 'border-t border-border pt-4'">
    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
      {{ config.sectionTitle }}
    </p>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <template v-for="field in config.fields" :key="field.key">
        <!-- Always-visible fields -->
        <template v-if="!field.collapsibleGroup">
          <div v-if="field.type === 'textarea'" class="sm:col-span-2">
            <FormTextarea :model-value="values[field.key] ?? ''" @update:model-value="update(field.key, $event)"
              :label="resolveLabel(field)" :placeholder="field.placeholder" :rows="2" />
          </div>
          <div v-else>
            <FormSelect v-if="field.type === 'select'" :model-value="values[field.key] ?? ''"
              @update:model-value="update(field.key, $event)" :label="resolveLabel(field)"
              :options="field.options ?? []" :required="field.required" />
            <FormInput v-else :model-value="values[field.key] ?? ''" @update:model-value="update(field.key, $event)"
              :label="resolveLabel(field)" :type="field.type === 'date' ? 'date' : 'text'"
              :placeholder="field.placeholder" :required="field.required" />
          </div>
        </template>

        <!-- Collapsible group toggle -->
        <template v-else-if="isFirstInGroup(field)">
          <div v-if="!expandedGroups[field.collapsibleGroup]" class="flex items-end">
            <button type="button"
              class="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-muted transition-theme hover:text-text-secondary"
              @click="expandedGroups[field.collapsibleGroup!] = true">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ field.collapsibleGroupLabel || `Agregar ${field.label.toLowerCase()}` }}
            </button>
          </div>
          <template v-else>
            <div>
              <FormSelect v-if="field.type === 'select'" :model-value="values[field.key] ?? ''"
                @update:model-value="update(field.key, $event)" :label="resolveLabel(field)"
                :options="field.options ?? []" />
              <FormInput v-else :model-value="values[field.key] ?? ''" @update:model-value="update(field.key, $event)"
                :label="resolveLabel(field)" type="text" :placeholder="field.placeholder" />
            </div>
            <!-- Render rest of the group -->
            <template v-for="other in groupFields(field.collapsibleGroup).slice(1)" :key="other.key">
              <div v-if="other.type !== 'textarea'">
                <FormSelect v-if="other.type === 'select'" :model-value="values[other.key] ?? ''"
                  @update:model-value="update(other.key, $event)" :label="resolveLabel(other)"
                  :options="other.options ?? []" />
                <FormInput v-else :model-value="values[other.key] ?? ''" @update:model-value="update(other.key, $event)"
                  :label="resolveLabel(other)" type="text" :placeholder="other.placeholder" />
              </div>
              <div v-else class="sm:col-span-2">
                <FormTextarea :model-value="values[other.key] ?? ''" @update:model-value="update(other.key, $event)"
                  :label="resolveLabel(other)" :placeholder="other.placeholder" :rows="2" />
              </div>
            </template>
          </template>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { FormInput, FormSelect, FormTextarea } from '../forms'
import type { NicheConfig, NicheFieldConfig } from '../../config/nicheFields'

interface Props {
  config: NicheConfig | null
  values: Record<string, string>
  terminology?: Record<string, string>
  embedded?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update': [key: string, value: string]
}>()

const expandedGroups = ref<Record<string, boolean>>({})

watch(() => props.values, (vals) => {
  if (!props.config) return
  for (const field of props.config.fields) {
    if (field.collapsibleGroup && vals[field.key]) {
      expandedGroups.value[field.collapsibleGroup] = true
    }
  }
}, { immediate: true })

const update = (key: string, value: string | number | undefined) => {
  emit('update', key, String(value ?? ''))
}

const resolveLabel = (field: NicheFieldConfig): string => {
  if (field.terminologyKey && props.terminology) {
    return (props.terminology as Record<string, string>)[field.terminologyKey] || field.label
  }
  return field.label
}

const isFirstInGroup = (field: NicheFieldConfig): boolean => {
  if (!field.collapsibleGroup || !props.config) return false
  const idx = props.config.fields.findIndex(f => f.key === field.key)
  if (idx <= 0) return true
  return props.config.fields[idx - 1].collapsibleGroup !== field.collapsibleGroup
}

const groupFields = (group: string): NicheFieldConfig[] => {
  if (!props.config) return []
  return props.config.fields.filter(f => f.collapsibleGroup === group)
}
</script>
