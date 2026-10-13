<template>
  <div>
    <p class="text-sm font-semibold text-text">Firmantes de nómina</p>
    <p class="text-xs text-text-muted">
      Registra a cada jefe que aprueba nóminas. Al aprobar una semana se elige quién es y pone su PIN, así
      queda su nombre y su firma en la nómina aunque todos usen la misma cuenta.
    </p>

    <p v-if="isLoading" class="mt-3 text-xs text-text-muted">Cargando...</p>

    <ul v-else class="mt-3 space-y-2">
      <li v-for="a in approvers" :key="a.id" class="rounded-xl border border-border px-3 py-2.5">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-sm font-medium text-text">{{ a.name }}</span>
          <img v-if="a.image" :src="a.image" :alt="`Firma de ${a.name}`" class="h-10 rounded border border-border bg-white" />
          <span v-else class="text-xs text-text-muted">Sin firma dibujada</span>
          <button type="button" class="ml-auto text-xs font-semibold text-primary hover:underline" @click="openManage(a.id)">
            {{ managing === a.id ? 'Cerrar' : 'Administrar' }}
          </button>
        </div>

        <div v-if="managing === a.id" class="mt-3 space-y-3 border-t border-border pt-3">
          <div class="max-w-[10rem]">
            <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :for="`pin-${a.id}`">PIN actual</label>
            <input :id="`pin-${a.id}`" v-model="managePin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" :class="inputClass" />
          </div>

          <div v-if="redrawing">
            <SignaturePad v-model="redrawn" />
          </div>

          <div class="flex flex-wrap gap-2">
            <button v-if="!redrawing" type="button" class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="redrawing = true">Cambiar firma</button>
            <button v-else type="button" :disabled="!redrawn || !isValidPin(managePin) || busy"
              class="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              @click="saveSignature(a.id)">Guardar firma</button>
            <button type="button" :disabled="!isValidPin(managePin) || busy"
              class="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
              @click="remove(a)">Eliminar firmante</button>
          </div>
          <p v-if="manageError" class="text-xs text-danger">{{ manageError }}</p>
        </div>
      </li>
      <li v-if="approvers.length === 0" class="text-xs text-text-muted">Todavía no hay firmantes. Mientras no haya ninguno, las nóminas se aprueban igual que antes.</li>
    </ul>

    <div class="mt-4">
      <button v-if="!adding" type="button"
        class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
        @click="adding = true">+ Agregar firmante</button>

      <form v-else class="max-w-md space-y-3 rounded-xl border border-border p-3" @submit.prevent="add">
        <div>
          <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="new-approver-name">Nombre</label>
          <input id="new-approver-name" v-model="form.name" type="text" maxlength="80" :class="inputClass" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="new-approver-pin">PIN (4 a 8 números)</label>
            <input id="new-approver-pin" v-model="form.pin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="new-approver-pin2">Repite el PIN</label>
            <input id="new-approver-pin2" v-model="form.pin2" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" :class="inputClass" />
          </div>
        </div>
        <div>
          <p class="mb-1 text-[10px] uppercase tracking-wider text-text-muted">Firma</p>
          <SignaturePad v-model="form.image" />
        </div>
        <p v-if="formProblem" class="text-xs text-danger">{{ formProblem }}</p>
        <div class="flex gap-2">
          <button type="submit" :disabled="!!formProblem || !form.name.trim() || busy"
            class="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
            {{ busy ? 'Guardando...' : 'Guardar firmante' }}
          </button>
          <button type="button" class="rounded-lg border border-border px-4 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary" @click="resetForm">Cancelar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import SignaturePad from '../dental/SignaturePad.vue'
import { useNotification } from '../../composables/common/useNotification'
import { translateError } from '../../lib/errors'
import { approverKeys, createApprover, deleteApprover, isValidPin, listApprovers, updateApprover } from '../../services/staffing/approverService'
import type { StaffingApprover } from '../../services/staffing/approverService'

const props = defineProps<{ businessId: string | null }>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const queryClient = useQueryClient()
const { success, error: showError } = useNotification()

const { data, isLoading } = useQuery({
  queryKey: computed(() => approverKeys.all(props.businessId)),
  queryFn: listApprovers,
  enabled: computed(() => !!props.businessId),
  staleTime: 0,
})
const approvers = computed<StaffingApprover[]>(() => data.value ?? [])
const refresh = () => queryClient.invalidateQueries({ queryKey: ['staffing-approvers'], exact: false })

const busy = ref(false)

// ── add ────────────────────────────────────────────────────────────────────
const adding = ref(false)
const form = ref<{ name: string; pin: string; pin2: string; image: string | null }>({ name: '', pin: '', pin2: '', image: null })
const resetForm = () => { adding.value = false; form.value = { name: '', pin: '', pin2: '', image: null } }

const formProblem = computed(() => {
  if (form.value.pin && !isValidPin(form.value.pin)) return 'El PIN debe tener de 4 a 8 números.'
  if (form.value.pin2 && form.value.pin !== form.value.pin2) return 'Los PIN no coinciden.'
  if (!form.value.pin || !form.value.pin2) return 'Elige un PIN y repítelo.'
  return ''
})

const add = async () => {
  busy.value = true
  try {
    await createApprover({ name: form.value.name.trim(), pin: form.value.pin, image: form.value.image })
    await refresh()
    success('Firmante agregado')
    resetForm()
  } catch (err) {
    showError(translateError(err, 'No se pudo guardar el firmante.'))
  } finally {
    busy.value = false
  }
}

// ── manage one (always needs that boss's current PIN) ──────────────────────
const managing = ref<string | null>(null)
const managePin = ref('')
const manageError = ref('')
const redrawing = ref(false)
const redrawn = ref<string | null>(null)

const openManage = (id: string) => {
  managing.value = managing.value === id ? null : id
  managePin.value = ''
  manageError.value = ''
  redrawing.value = false
  redrawn.value = null
}

const saveSignature = async (id: string) => {
  busy.value = true
  manageError.value = ''
  try {
    await updateApprover(id, { pin: managePin.value, image: redrawn.value })
    await refresh()
    success('Firma actualizada')
    openManage(id)
  } catch (err) {
    manageError.value = translateError(err, 'No se pudo actualizar la firma.')
  } finally {
    busy.value = false
  }
}

const remove = async (a: StaffingApprover) => {
  if (!window.confirm(`¿Eliminar a ${a.name} como firmante? Las nóminas que ya aprobó conservan su nombre y firma.`)) return
  busy.value = true
  manageError.value = ''
  try {
    await deleteApprover(a.id, managePin.value)
    await refresh()
    success('Firmante eliminado')
    managing.value = null
  } catch (err) {
    manageError.value = translateError(err, 'No se pudo eliminar el firmante.')
  } finally {
    busy.value = false
  }
}
</script>
