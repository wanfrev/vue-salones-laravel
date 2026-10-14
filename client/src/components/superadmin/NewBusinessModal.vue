<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm" @click.self="close">
        <div class="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl" @click.stop>
          <div class="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-text">Registrar nuevo negocio</h2>
              <p class="mt-0.5 text-xs text-text-muted">Se crea el negocio con su dueño (administrador) y las funciones que trae su nicho por defecto. Después puedes ajustar las funciones desde su ficha.</p>
            </div>
            <button type="button" class="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text" aria-label="Cerrar" @click="close">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <form class="space-y-5" @submit.prevent="handleSubmit">
            <fieldset class="space-y-3">
              <legend class="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">Negocio</legend>
              <div>
                <label class="mb-1 block text-xs font-semibold text-text" for="nb-name">Nombre del negocio</label>
                <input id="nb-name" v-model="form.businessName" type="text" placeholder="Ej: Spa Mimosa" :class="inputClass" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-text" for="nb-niche">Nicho (tipo de negocio)</label>
                <select id="nb-niche" v-model="form.nicheType" :class="inputClass">
                  <option value="" disabled>Selecciona un nicho</option>
                  <option v-for="n in registeredNiches" :key="n.id" :value="n.id">{{ n.label }}</option>
                </select>
                <p class="mt-1 text-[11px] text-text-muted">Define qué módulos, nomenclatura y funciones trae el negocio al empezar.</p>
              </div>
            </fieldset>

            <fieldset class="space-y-3">
              <legend class="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">Acceso del dueño</legend>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-text" for="nb-email">Email del dueño</label>
                  <input id="nb-email" v-model="form.ownerEmail" type="email" placeholder="dueno@spa.com" :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-text" for="nb-pass">Contraseña inicial</label>
                  <input id="nb-pass" v-model="form.ownerPassword" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres" :class="inputClass" />
                </div>
              </div>
            </fieldset>

            <fieldset class="space-y-2">
              <legend class="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">Opcional</legend>
              <label class="mb-1 block text-xs font-semibold text-text" for="nb-link">Vincular a un dueño que ya tiene otro negocio</label>
              <select id="nb-link" v-model="linkedBusinessId" :class="inputClass">
                <option value="">Ninguno — negocio independiente</option>
                <option v-for="b in liveBusinesses" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
              <p class="text-[11px] text-text-muted">
                Ese dueño podrá cambiar entre sus negocios con un selector, sin volver a iniciar sesión.
                Los datos de cada negocio siguen 100% separados.
              </p>
              <select v-if="linkedBusinessId" v-model="form.linkedUserId" :class="inputClass" aria-label="Administrador a vincular">
                <option value="">{{ linkedAdminsLoading ? 'Cargando...' : 'Selecciona un administrador' }}</option>
                <option v-for="a in linkedAdmins" :key="a.id" :value="a.id">{{ a.full_name }} ({{ a.email }})</option>
              </select>
            </fieldset>

            <p v-if="formError" class="flex items-center gap-1 text-xs text-danger">
              <InfoCircleIcon class="h-3.5 w-3.5 shrink-0" />
              {{ formError }}
            </p>

            <div class="flex justify-end gap-2 pt-1">
              <button type="button" class="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-secondary" @click="close">Cancelar</button>
              <button type="submit" :disabled="isCreating"
                class="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                {{ isCreating ? 'Creando...' : 'Crear negocio e invitar admin' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { InfoCircleIcon } from '@solar-icons/vue/linear'
import { useNotification } from '../../composables/common/useNotification'
import { createBusinessWithOwner, listBusinessAdmins, superadminKeys } from '../../services/superadminService'
import { translateError } from '../../lib/errors'
import { creatableNiches } from '../../config/niches'

const props = defineProps<{
  open: boolean
  /** Existing (non-deleted) businesses, for the "link to an existing owner" option. */
  liveBusinesses: { id: string; name: string }[]
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>()

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10'

const { success, error: showError } = useNotification()
const queryClient = useQueryClient()
const registeredNiches = creatableNiches()

const emptyForm = () => ({ businessName: '', ownerEmail: '', ownerPassword: '', nicheType: '', linkedUserId: '' })
const form = ref(emptyForm())
const linkedBusinessId = ref('')
const formError = ref('')

const reset = () => { form.value = emptyForm(); linkedBusinessId.value = ''; formError.value = '' }
const close = () => { reset(); emit('close') }

const { data: linkedAdminsData, isLoading: linkedAdminsLoading } = useQuery({
  queryKey: computed(() => superadminKeys.businessAdmins(linkedBusinessId.value)),
  queryFn: () => listBusinessAdmins(linkedBusinessId.value),
  enabled: computed(() => props.open && !!linkedBusinessId.value),
})
const linkedAdmins = computed(() => linkedAdminsData.value ?? [])

// Un solo administrador es el caso normal — preselecciónalo en vez de obligar a un clic extra.
watch(linkedAdmins, (list) => { form.value.linkedUserId = list.length === 1 ? list[0].id : '' })
watch(linkedBusinessId, () => { form.value.linkedUserId = '' })

const { mutateAsync: createBusiness, isPending: isCreating } = useMutation({
  mutationFn: createBusinessWithOwner,
  onSuccess: () => {
    success('Negocio creado correctamente')
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
    reset()
    emit('created')
  },
  onError: (err: unknown) => showError(translateError(err, 'No fue posible crear el negocio')),
})

const handleSubmit = async () => {
  formError.value = ''
  if (!form.value.businessName.trim() || !form.value.ownerEmail.trim() || !form.value.ownerPassword.trim()) {
    formError.value = 'Todos los campos son requeridos.'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.ownerEmail.trim())) {
    formError.value = 'El formato del email no es válido.'
    return
  }
  if (form.value.ownerPassword.trim().length < 6) {
    formError.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }
  if (linkedBusinessId.value && !form.value.linkedUserId) {
    formError.value = 'Selecciona el administrador del negocio a vincular.'
    return
  }
  await createBusiness({
    businessName: form.value.businessName,
    ownerEmail: form.value.ownerEmail,
    ownerPassword: form.value.ownerPassword,
    nicheType: form.value.nicheType.trim() || undefined,
    linkedUserId: form.value.linkedUserId || undefined,
  })
}
</script>
