<template>
  <div class="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
    <p class="text-xs font-semibold uppercase tracking-wider text-primary">{{ isEditing ? 'Editar programa' : 'Nuevo programa' }}</p>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem_9rem]">
      <FormInput v-model="form.name" label="Nombre" placeholder="Ej: Estimulación temprana" />
      <FormInput v-model="form.price" type="number" label="Precio (USD)" placeholder="120" />
      <FormInput v-model="form.validity_days" type="number" label="Vigencia (días)" placeholder="30" />
    </div>

    <div class="space-y-3">
      <p class="text-sm font-medium text-text-secondary">Qué incluye</p>
      <div v-for="(c, i) in form.components" :key="i" class="rounded-lg border border-border-subtle bg-bg-secondary/40 p-3">
        <div class="flex flex-wrap items-end gap-3">
          <div class="w-28">
            <FormInput v-model="c.quantity" type="number" label="Sesiones" placeholder="8" />
          </div>
          <p class="pb-2.5 text-xs text-text-muted">de cualquiera de estos servicios:</p>
          <button v-if="form.components.length > 1" type="button" @click="removeComponent(i)" class="ml-auto rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/5">Quitar</button>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="s in services"
            :key="s.id"
            type="button"
            :aria-pressed="c.service_ids.includes(s.id)"
            @click="toggleService(c, s.id)"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition-theme"
            :class="c.service_ids.includes(s.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-secondary hover:border-primary/30'"
          >{{ s.name }}</button>
          <p v-if="services.length === 0" class="text-xs text-text-muted">Primero crea los servicios en la sección Servicios.</p>
        </div>
      </div>
      <button type="button" @click="addComponent" :disabled="form.components.length >= MAX_COMPONENTS" class="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-theme hover:bg-primary/10 disabled:opacity-50">
        + Agregar otro tipo de sesión (ej. asesoría para padres)
      </button>
      <p class="text-xs text-text-muted">
        Total: <strong class="text-text">{{ total }} sesiones</strong>. Al inscribir a un paciente, cada cita elige su servicio entre los de su tipo.
      </p>
    </div>

    <label v-if="isEditing" class="flex items-center gap-2 text-sm text-text-secondary">
      <input type="checkbox" v-model="form.active" />
      Programa activo (se puede inscribir a pacientes)
    </label>

    <p v-if="problem" class="text-sm text-danger">{{ problem }}</p>

    <div class="flex justify-end gap-3">
      <button @click="$emit('cancel')" class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">Cancelar</button>
      <button @click="handleSubmit" :disabled="!!problem || saving" class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50">
        {{ saving ? 'Guardando...' : 'Guardar programa' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { FormInput } from '../forms'
import { MAX_PROGRAM_SESSIONS, programTotal } from './programs'
import type { ProgramPayload } from '../../services/clinical/programService'
import type { ClinicalProgram } from '../../types/database'

const MAX_COMPONENTS = 6

const props = defineProps<{
  /** Programa que se edita; sin él es uno nuevo. */
  initial?: ClinicalProgram | null
  services: Array<{ id: string; name: string }>
  saving: boolean
}>()
const emit = defineEmits<{ submit: [payload: ProgramPayload]; cancel: [] }>()

interface ComponentDraft { quantity: number | string; service_ids: string[] }

const isEditing = computed(() => !!props.initial)

// Estado local: el formulario nunca muta el programa del padre.
const form = reactive({
  name: props.initial?.name ?? '',
  price: (props.initial?.price ?? '') as number | string,
  validity_days: (props.initial?.validity_days ?? 30) as number | string,
  active: props.initial?.active ?? true,
  components: (props.initial?.components.map(c => ({ quantity: c.quantity as number | string, service_ids: [...c.service_ids] }))
    ?? [{ quantity: 8 as number | string, service_ids: [] as string[] }]) as ComponentDraft[],
})

const total = computed(() => programTotal(form.components.map(c => ({ quantity: Number(c.quantity) }))))

const problem = computed<string | null>(() => {
  if (form.name.trim().length < 2) return 'Ponle un nombre al programa.'
  const price = Number(form.price)
  if (form.price === '' || !Number.isFinite(price) || price < 0) return 'El precio no es válido.'
  const days = Number(form.validity_days)
  if (!Number.isInteger(days) || days < 1 || days > 730) return 'La vigencia debe ser entre 1 y 730 días.'
  for (const c of form.components) {
    const q = Number(c.quantity)
    if (!Number.isInteger(q) || q < 1) return 'Cada tipo de sesión necesita al menos 1 sesión.'
    if (c.service_ids.length === 0) return 'Elige al menos un servicio en cada tipo de sesión.'
  }
  if (total.value > MAX_PROGRAM_SESSIONS) return `Un programa no puede pasar de ${MAX_PROGRAM_SESSIONS} sesiones.`
  return null
})

const addComponent = () => form.components.push({ quantity: 1, service_ids: [] })
const removeComponent = (i: number) => form.components.splice(i, 1)

function toggleService(c: ComponentDraft, id: string) {
  const i = c.service_ids.indexOf(id)
  if (i >= 0) c.service_ids.splice(i, 1)
  else c.service_ids.push(id)
}

function handleSubmit() {
  if (problem.value) return
  emit('submit', {
    name: form.name.trim(),
    price: Number(form.price),
    validity_days: Number(form.validity_days),
    ...(isEditing.value ? { active: form.active } : {}),
    components: form.components.map(c => ({ service_ids: [...c.service_ids], quantity: Number(c.quantity) })),
  })
}
</script>
