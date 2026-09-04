<template>
  <div class="rounded-lg border border-border-subtle p-3">
    <div class="mb-2 flex items-center justify-between">
      <p class="text-sm font-semibold text-text">Diente {{ tooth }}</p>
      <div class="flex items-center gap-2">
        <FormInput :model-value="modelValue.movilidad" label="Movilidad" class="w-24" @update:model-value="updateField('movilidad', $event)" />
        <FormInput :model-value="modelValue.furca" label="Furca" class="w-24" @update:model-value="updateField('furca', $event)" />
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-subtle text-text-muted">
            <th class="px-1.5 py-1 text-left">Sitio</th>
            <th class="px-1.5 py-1 text-left">Profundidad (mm)</th>
            <th class="px-1.5 py-1 text-left">Sangrado</th>
            <th class="px-1.5 py-1 text-left">Recesión (mm)</th>
            <th class="px-1.5 py-1 text-left">CAL</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="site in PERIODONTAL_SITES" :key="site" class="border-b border-border-subtle last:border-b-0">
            <td class="px-1.5 py-1 font-medium text-text-secondary">{{ SITE_LABELS[site] }}</td>
            <td class="px-1.5 py-1">
              <input
                :value="sitio(site).profundidad"
                @input="updateSite(site, 'profundidad', ($event.target as HTMLInputElement).value)"
                class="w-16 rounded border border-border bg-surface px-1.5 py-1 text-text outline-none focus:border-primary"
              />
            </td>
            <td class="px-1.5 py-1">
              <input
                type="checkbox"
                :checked="sitio(site).sangrado"
                @change="updateSite(site, 'sangrado', ($event.target as HTMLInputElement).checked)"
                class="h-4 w-4 rounded border-border text-danger focus:ring-danger"
              />
            </td>
            <td class="px-1.5 py-1">
              <input
                :value="sitio(site).recesion"
                @input="updateSite(site, 'recesion', ($event.target as HTMLInputElement).value)"
                class="w-16 rounded border border-border bg-surface px-1.5 py-1 text-text outline-none focus:border-primary"
              />
            </td>
            <td class="px-1.5 py-1 text-text-muted">{{ cal(site) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormInput } from '../forms'
import { PERIODONTAL_SITES, type PeriodontalSite, type PeriodontalSiteMeasurement, type PeriodontalToothMeasurement } from '../../types/database'

const SITE_LABELS: Record<PeriodontalSite, string> = {
  mv: 'Mesio-vestibular', v: 'Vestibular', dv: 'Disto-vestibular',
  dl: 'Disto-lingual', l: 'Lingual', ml: 'Mesio-lingual',
}

const props = defineProps<{
  tooth: number
  modelValue: PeriodontalToothMeasurement
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PeriodontalToothMeasurement]
}>()

function emptySite(): PeriodontalSiteMeasurement {
  return { profundidad: '', sangrado: false, recesion: '' }
}

function sitio(site: PeriodontalSite): PeriodontalSiteMeasurement {
  return props.modelValue.sitios[site] ?? emptySite()
}

function cal(site: PeriodontalSite): string {
  const s = sitio(site)
  const p = parseFloat(s.profundidad)
  const r = parseFloat(s.recesion)
  if (isNaN(p) && isNaN(r)) return '—'
  return String((isNaN(p) ? 0 : p) + (isNaN(r) ? 0 : r))
}

function updateSite(site: PeriodontalSite, key: keyof PeriodontalSiteMeasurement, value: string | boolean) {
  emit('update:modelValue', {
    ...props.modelValue,
    sitios: { ...props.modelValue.sitios, [site]: { ...sitio(site), [key]: value } },
  })
}

function updateField(key: 'movilidad' | 'furca', value: string | number) {
  emit('update:modelValue', { ...props.modelValue, [key]: String(value) })
}
</script>
