<template>
  <SuperadminLayout>
    <!-- Stats -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
      <div class="rounded-xl border border-border bg-surface p-4">
        <p class="text-2xl font-extrabold text-text tabular-nums">{{ businessesCount }}</p>
        <p class="text-xs text-text-muted mt-1">Total negocios</p>
      </div>
      <div class="rounded-xl border border-border bg-surface p-4">
        <p class="text-2xl font-extrabold text-success tabular-nums">{{ activeCount }}</p>
        <p class="text-xs text-text-muted mt-1">Activos</p>
      </div>
      <div class="rounded-xl border border-border bg-surface p-4">
        <p class="text-2xl font-extrabold text-danger tabular-nums">{{ inactiveCount }}</p>
        <p class="text-xs text-text-muted mt-1">Inactivos</p>
      </div>
      <div class="rounded-xl border border-border bg-surface p-4">
        <p class="text-2xl font-extrabold text-primary tabular-nums">{{ nichesCount }}</p>
        <p class="text-xs text-text-muted mt-1">Nichos</p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <!-- Create Form -->
      <div class="rounded-2xl border border-border bg-surface p-6">
        <h2 class="text-base font-bold text-text mb-1">Registrar nuevo negocio</h2>
        <p class="text-xs text-text-muted mb-5">Crea el negocio, su admin y las funcionalidades base</p>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-xs font-semibold text-text mb-1">Nombre del negocio</label>
            <input v-model="form.businessName" type="text" placeholder="Ej: Spa Mimosa"
              class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-text mb-1">Email del dueño</label>
              <input v-model="form.ownerEmail" type="email" placeholder="dueno@spa.com"
                class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-text mb-1">Contraseña</label>
              <input v-model="form.ownerPassword" type="password" placeholder="Mínimo 6 caracteres"
                class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-text mb-1">Nicho</label>
            <select v-model="form.nicheType"
              class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
              <option value="" disabled selected>Selecciona un nicho</option>
              <option v-for="n in registeredNiches" :key="n.id" :value="n.id">{{ n.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-text mb-1">
              Vincular a un dueño existente <span class="font-normal text-text-muted">(opcional)</span>
            </label>
            <select v-model="linkedBusinessId"
              class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
              <option value="">Ninguno — negocio independiente</option>
              <option v-for="b in liveBusinesses" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <p class="mt-1 text-[11px] text-text-muted">
              El dueño de ese negocio podrá cambiar a este nuevo negocio con un selector, sin
              volver a iniciar sesión. Los datos de ambos siguen 100% separados.
            </p>
            <select v-if="linkedBusinessId" v-model="form.linkedUserId"
              class="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
              <option value="">{{ linkedAdminsLoading ? 'Cargando...' : 'Selecciona un administrador' }}</option>
              <option v-for="a in linkedAdmins" :key="a.id" :value="a.id">{{ a.full_name }} ({{ a.email }})</option>
            </select>
          </div>

          <p v-if="formError" class="text-xs text-danger flex items-center gap-1">
            <InfoCircleIcon class="h-3.5 w-3.5 shrink-0" />
            {{ formError }}
          </p>

          <button type="submit" :disabled="isCreating"
            class="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isCreating ? 'Creando...' : 'Crear negocio e invitar admin' }}
          </button>
        </form>
      </div>

      <!-- Business List -->
      <div class="rounded-2xl border border-border bg-surface p-6">
        <div class="flex items-center justify-between mb-4 gap-3">
          <div>
            <h2 class="text-base font-bold text-text">Negocios registrados</h2>
            <p class="text-xs text-text-muted">{{ filteredBusinesses.length }} de {{ businessesCount }}</p>
          </div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-1.5 text-xs font-medium text-text-secondary cursor-pointer select-none">
              <input v-model="showDeleted" type="checkbox" class="rounded border-border" />
              Ver eliminados
            </label>
            <input v-model="search" type="search" placeholder="Buscar..."
              class="w-44 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
          </div>
        </div>

        <div class="space-y-2 max-h-[440px] overflow-y-auto -mx-2 px-2">
          <router-link
            v-for="biz in filteredBusinesses"
            :key="biz.id"
            :to="`/superadmin/business/${biz.id}`"
            class="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-secondary/40 p-3.5 hover:border-primary/30 hover:bg-primary/3 transition-all group"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-text group-hover:text-primary transition-colors truncate">{{ biz.name }}</h3>
                <span v-if="biz.deleted_at" class="shrink-0 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-danger">
                  Eliminado
                </span>
                <span v-else class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                  :class="biz.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'">
                  {{ biz.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                <span>{{ biz.slug }}</span>
                <span>·</span>
                <span class="capitalize">{{ biz.niche_type?.replace(/_/g, ' ') || 'Sin nicho' }}</span>
                <span>·</span>
                <span>{{ formatDate(biz.created_at) }}</span>
              </div>
            </div>
            <ArrowRightIcon class="h-4 w-4 shrink-0 text-text-muted/40 group-hover:text-primary/60 transition-colors" />
          </router-link>

          <div v-if="!filteredBusinesses.length && !businessesCount" class="py-12 text-center">
            <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary">
              <BuildingsIcon class="h-6 w-6 text-text-muted" />
            </div>
            <p class="text-sm font-semibold text-text mb-1">Sin negocios</p>
            <p class="text-xs text-text-muted">Crea el primer negocio usando el formulario</p>
          </div>
          <div v-else-if="!filteredBusinesses.length" class="py-8 text-center text-sm text-text-muted">
            Sin resultados para "{{ search }}"
          </div>
        </div>
      </div>
    </div>
  </SuperadminLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { formatDate } from '../lib/formatters'
import { useNotification } from '../composables/common/useNotification'
import { createBusinessWithOwner, listBusinessAdmins, listBusinesses, superadminKeys } from '../services/superadminService'
import { translateError } from '../lib/errors'
import SuperadminLayout from '../components/layout/SuperadminLayout.vue'
import type { Business } from '../types/database'
import { creatableNiches } from '../config/niches'
import { InfoCircleIcon, ArrowRightIcon, BuildingsIcon } from '@solar-icons/vue/linear'

const { success, error: showError } = useNotification()
const queryClient = useQueryClient()

const registeredNiches = creatableNiches()

const form = ref({ businessName: '', ownerEmail: '', ownerPassword: '', nicheType: '', linkedUserId: '' })
const linkedBusinessId = ref('')
const search = ref('')
const formError = ref('')
const showDeleted = ref(false)

const { data: businessesData } = useQuery({
  queryKey: computed(() => [...superadminKeys.businesses(), showDeleted.value] as const),
  queryFn: () => listBusinesses(showDeleted.value),
})

const businesses = computed<Business[]>(() => businessesData.value ?? [])
// Stats are always about live (non-deleted) businesses, regardless of the "Ver eliminados" toggle.
const liveBusinesses = computed(() => businesses.value.filter(b => !b.deleted_at))
const businessesCount = computed(() => liveBusinesses.value.length)
const activeCount = computed(() => liveBusinesses.value.filter(b => b.active).length)
const inactiveCount = computed(() => liveBusinesses.value.filter(b => !b.active).length)
const nichesCount = computed(() => new Set(liveBusinesses.value.map(b => b.niche_type).filter(Boolean)).size)

const { data: linkedAdminsData, isLoading: linkedAdminsLoading } = useQuery({
  queryKey: computed(() => superadminKeys.businessAdmins(linkedBusinessId.value)),
  queryFn: () => listBusinessAdmins(linkedBusinessId.value),
  enabled: computed(() => !!linkedBusinessId.value),
})
const linkedAdmins = computed(() => linkedAdminsData.value ?? [])

// Un solo administrador es el caso normal — preselecciónalo en vez de obligar a un clic extra.
watch(linkedAdmins, (list) => {
  form.value.linkedUserId = list.length === 1 ? list[0].id : ''
})
watch(linkedBusinessId, () => {
  form.value.linkedUserId = ''
})

const { mutateAsync: createBusiness, isPending: isCreating } = useMutation({
  mutationFn: createBusinessWithOwner,
  onSuccess: () => {
    success('Negocio creado correctamente')
    form.value = { businessName: '', ownerEmail: '', ownerPassword: '', nicheType: '', linkedUserId: '' }
    linkedBusinessId.value = ''
    formError.value = ''
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
  },
  onError: (err: unknown) => {
    showError(translateError(err, 'No fue posible crear el negocio'))
  },
})

const filteredBusinesses = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return businesses.value
  return businesses.value.filter(b =>
    b.name.toLowerCase().includes(term) ||
    b.slug.toLowerCase().includes(term) ||
    (b.niche_type || '').toLowerCase().includes(term)
  )
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
