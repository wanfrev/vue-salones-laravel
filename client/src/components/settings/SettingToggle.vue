<template>
  <div class="border-b border-border-subtle py-3.5 last:border-b-0">
    <FormToggle
      :model-value="isOn(settingKey)"
      :label="copy.label"
      :hint="copy.hint"
      :disabled="updating"
      @update:model-value="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import { FormToggle } from '../forms'
import { useBusinessFeatures } from '../../composables/common/useBusinessFeatures'
import type { SettingKey, ToggleCopy } from './featureCopy'

const props = defineProps<{
  settingKey: SettingKey
  copy: ToggleCopy
  /** Turning it ON asks the parent first (e.g. a warning dialog) instead of saving right away. */
  confirmOn?: boolean
}>()

const emit = defineEmits<{ (e: 'request-on'): void }>()

const { updating, isOn, setFeature } = useBusinessFeatures()

const onChange = (value: boolean) => {
  if (value && props.confirmOn) {
    emit('request-on')
    return
  }
  setFeature(props.settingKey, value, props.copy)
}
</script>
