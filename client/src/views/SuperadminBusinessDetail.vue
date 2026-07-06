<template>
  <div class="min-h-screen bg-bg">
    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div class="flex items-center gap-4">
          <router-link
            to="/superadmin"
            class="flex items-center gap-1 text-sm font-semibold text-text-muted transition-theme hover:text-text"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </router-link>
          <img :src="lumaLogo" alt="Luma" class="h-7 w-auto object-contain" />
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-text">{{ business?.name ?? 'Cargando...' }}</h1>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="business?.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'"
          >
            {{ business?.active ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div v-if="business" class="space-y-6">
        <!-- Info + Actions -->
        <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-text">Información del negocio</h2>
              <p class="text-sm text-text-muted">Slug: {{ business.slug }}</p>
              <p class="text-sm text-text-muted">Nicho: {{ business.niche_type }}</p>
              <p class="text-sm text-text-muted">Creado: {{ formatDate(business.created_at) }}</p>
              <p class="text-sm text-text-muted">Zona horaria: {{ business.timezone }}</p>
              <p class="text-sm text-text-muted">Moneda: {{ business.currency }}</p>
              <p v-if="business.phone" class="text-sm text-text-muted">Teléfono: {{ business.phone }}</p>
              <p v-if="business.address" class="text-sm text-text-muted">Dirección: {{ business.address }}</p>
            </div>
            <div class="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="openEdit"
              >
                Editar
              </button>
              <button
                v-if="business.active"
                type="button"
                :disabled="isSuspending"
                class="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white shadow-sm transition-theme hover:bg-danger/80 disabled:cursor-not-allowed disabled:opacity-60"
                @click="confirmSuspend"
              >
                {{ isSuspending ? 'Suspendiendo...' : 'Suspender servicio' }}
              </button>
              <button
                v-else
                type="button"
                :disabled="isResuming"
                class="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition-theme hover:bg-success/80 disabled:cursor-not-allowed disabled:opacity-60"
                @click="confirmResume"
              >
                {{ isResuming ? 'Reactivando...' : 'Reactivar servicio' }}
              </button>
              <button
                type="button"
                :disabled="isDeleting"
                class="rounded-lg border border-danger/30 px-4 py-2 text-sm font-semibold text-danger transition-theme hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                @click="confirmDelete"
              >
                {{ isDeleting ? 'Eliminando...' : 'Eliminar negocio' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Feature Flags -->
        <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 class="text-lg font-semibold text-text mb-4">Funcionalidades</h2>
          <div class="space-y-3">
            <label
              v-for="ft in featureToggles"
              :key="ft.key"
              class="flex items-center justify-between gap-3"
            >
              <div>
                <p class="text-sm font-medium text-text">{{ ft.label }}</p>
                <p class="text-xs text-text-muted">{{ ft.description }}</p>
              </div>
              <button
                type="button"
                :disabled="isTogglingFeature"
                @click="toggleFeature(ft.key)"
                :class="[
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                  (business as any).features?.[ft.key] ? 'bg-primary' : 'bg-border'
                ]"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    (business as any).features?.[ft.key] ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
            </label>
          </div>
        </div>

        <!-- Sucursales -->
        <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-text">Sucursales ({{ branches.length }})</h2>
          </div>
          <div v-if="branches.length === 0" class="py-4 text-center text-sm text-text-muted">
            No hay sucursales registradas.
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="branch in branches"
              :key="branch.id"
              class="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary/30 px-4 py-3"
            >
              <div>
                <div class="flex items-center gap-2">
                  <p class="text-sm font-semibold text-text">{{ branch.name }}</p>
                  <span v-if="branch.is_default" class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Principal</span>
                  <span :class="['rounded-full px-2 py-0.5 text-[10px] font-semibold', branch.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger']">
                    {{ branch.active ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>
                <div v-if="branch.address || branch.phone" class="mt-1 flex items-center gap-3 text-xs text-text-muted">
                  <span v-if="branch.address">{{ branch.address }}</span>
                  <span v-if="branch.phone">{{ branch.phone }}</span>
                  <span v-if="branch.ves_exchange_rate">Tasa: {{ branch.ves_exchange_rate }} Bs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Admins -->
        <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-text">Administradores ({{ admins.length }})</h2>
            <router-link
              :to="`/superadmin/business/${business.id}/admins`"
              class="text-sm font-semibold text-primary transition-theme hover:text-primary-hover"
            >
              Ver todos
            </router-link>
          </div>

          <div v-if="admins.length" class="space-y-2">
            <div
              v-for="admin in admins.slice(0, 5)"
              :key="admin.id"
              class="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary p-3"
            >
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                {{ admin.full_name.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-text">{{ admin.full_name }}</p>
                <p class="text-xs text-text-muted truncate">{{ admin.id }}</p>
              </div>
              <span class="rounded-full bg-primary-light/50 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {{ admin.role }}
              </span>
            </div>
          </div>

          <div v-else class="rounded-xl border border-dashed border-border bg-bg-secondary p-6 text-center text-sm text-text-muted">
            No hay administradores para este negocio.
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-else class="flex items-center justify-center py-20">
        <p class="text-sm text-text-muted">Cargando información del negocio...</p>
      </div>
    </main>

    <!-- Edit modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="closeEdit"
    >
      <div class="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Editar negocio</h2>
          <p class="text-sm text-text-muted">{{ business?.name }}</p>
        </div>

        <form class="grid gap-3" @submit.prevent="handleEditSubmit">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="edit-name">Nombre</label>
            <input
              id="edit-name"
              v-model="editForm.name"
              type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="edit-phone">Teléfono</label>
              <input
                id="edit-phone"
                v-model="editForm.phone"
                type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="edit-timezone">Zona horaria</label>
              <input
                id="edit-timezone"
                v-model="editForm.timezone"
                type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="edit-address">Dirección</label>
            <input
              id="edit-address"
              v-model="editForm.address"
              type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="edit-currency">Moneda</label>
              <select
                id="edit-currency"
                v-model="editForm.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="USD">USD</option>
                <option value="DOP">DOP</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="edit-niche">Nicho</label>
              <select
                id="edit-niche"
                v-model="editForm.niche_type"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="salon">Salón de belleza</option>
                <option value="barberia">Barbería</option>
                <option value="spa">Spa (humano)</option>
                <option value="mixto">Mixto (Barbería + Salón + Spa)</option>
                <option value="dog_spa">Spa canino / Veterinaria</option>
                <option value="nail_bar">Barra de uñas</option>
                <option value="centro_estetico">Centro estético</option>
              </select>
            </div>
          </div>

          <p v-if="editFormError" class="text-sm text-danger">{{ editFormError }}</p>

          <div class="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="closeEdit"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isUpdating"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isUpdating ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { formatDate } from '../lib/formatters'
import { useNotification } from '../composables/useNotification'
import { useThemeStore } from '../store/theme'
import {
  deleteBusiness,
  listBusinessAdmins,
  listBusinesses,
  resumeBusiness,
  suspendBusiness,
  updateBusiness,
  superadminKeys,
} from '../services/superadminService'
import { listBranches, branchesKeys } from '../services/branchesService'
import type { AuthProfile } from '../types/auth'
import type { Business } from '../types/database'
import lumaLogoLight from '../assets/Luma.svg'
import lumaLogoDark from '../assets/Luma blanco.svg'

const themeStore = useThemeStore()
const lumaLogo = computed(() => (themeStore.isDark ? lumaLogoDark : lumaLogoLight))

const { success, error } = useNotification()
const queryClient = useQueryClient()
const route = useRoute()
const router = useRouter()

const businessId = route.params.id as string

const { data: businessesData } = useQuery({
  queryKey: superadminKeys.businesses(),
  queryFn: listBusinesses,
})

const business = computed<Business | undefined>(() =>
  businessesData.value?.find((b: Business) => b.id === businessId)
)

const { data: adminsData } = useQuery({
  queryKey: superadminKeys.businessAdmins(businessId),
  queryFn: () => listBusinessAdmins(businessId),
})

const admins = computed<AuthProfile[]>(() => adminsData.value ?? [])

const { data: branchesData } = useQuery({
  queryKey: branchesKeys.all(businessId),
  queryFn: () => listBranches(businessId),
  enabled: computed(() => !!businessId),
})

const branches = computed(() => branchesData.value ?? [])

// ─── Edit ────────────────────────────────────────────────────
const showEditModal = ref(false)
const editFormError = ref('')
const editForm = ref({
  name: '',
  phone: '',
  address: '',
  timezone: '',
  currency: 'USD',
  niche_type: 'salon',
})

const openEdit = () => {
  if (!business.value) return
  editFormError.value = ''
  showEditModal.value = true
  editForm.value = {
    name: business.value.name,
    phone: business.value.phone ?? '',
    address: business.value.address ?? '',
    timezone: business.value.timezone,
    currency: business.value.currency,
    niche_type: business.value.niche_type,
  }
}

const closeEdit = () => {
  editFormError.value = ''
  showEditModal.value = false
}

const { mutateAsync: updateBiz, isPending: isUpdating } = useMutation({
  mutationFn: (input: {
    business_id: string
    name: string
    phone: string | null
    address: string | null
    timezone: string
    currency: string
    niche_type: string
  }) => updateBusiness(input),
  onSuccess: async () => {
    success('Negocio actualizado correctamente.')
    closeEdit()
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
  },
  onError: (err: unknown) => {
    const message = err instanceof Error ? err.message : 'No fue posible actualizar el negocio.'
    error(message)
  },
})

const handleEditSubmit = () => {
  if (!business.value) return
  const f = editForm.value
  if (!f.name.trim()) {
    editFormError.value = 'El nombre es requerido.'
    return
  }
  updateBiz({
    business_id: business.value.id,
    name: f.name.trim(),
    phone: f.phone.trim() || null,
    address: f.address.trim() || null,
    timezone: f.timezone.trim(),
    currency: f.currency,
    niche_type: f.niche_type,
  })
}

// ─── Suspend / Resume ────────────────────────────────────────
const { mutateAsync: suspendBiz, isPending: isSuspending } = useMutation({
  mutationFn: suspendBusiness,
  onSuccess: async () => {
    success('Servicio suspendido. Los usuarios de este negocio ya no pueden acceder.')
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
  },
  onError: (err: unknown) => {
    const message = err instanceof Error ? err.message : 'No fue posible suspender el servicio.'
    error(message)
  },
})

const { mutateAsync: resumeBiz, isPending: isResuming } = useMutation({
  mutationFn: resumeBusiness,
  onSuccess: async () => {
    success('Servicio reactivado. Los usuarios ya pueden acceder nuevamente.')
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
  },
  onError: (err: unknown) => {
    const message = err instanceof Error ? err.message : 'No fue posible reactivar el servicio.'
    error(message)
  },
})

  const featureToggles = [
    { key: 'pos', label: 'Punto de Venta', description: 'Cobro de citas con productos y método de pago' },
    { key: 'inventario', label: 'Inventario', description: 'Control de stock, entradas y salidas' },
    { key: 'productos', label: 'Productos', description: 'Catálogo de productos vendibles' },
    { key: 'proveedores', label: 'Proveedores', description: 'Gestión de proveedores, deudas y pagos' },
    { key: 'multi_branch', label: 'Múltiples sucursales', description: 'Gestionar varias ubicaciones físicas' },
    { key: 'employees_create_clients', label: 'Empleados crean clientes', description: 'Permitir que empleados agreguen nuevos clientes desde la agenda' },
  ]

const isTogglingFeature = ref(false)
const toggleFeature = async (key: string) => {
  const biz = business.value
  if (!biz) return
  const current = (biz as any).features ?? {}
  const enabled = !current[key]
  isTogglingFeature.value = true
  try {
    await updateBusiness({ business_id: biz.id, features: { ...current, [key]: enabled } })
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
    success(enabled ? 'Funcionalidad activada' : 'Funcionalidad desactivada')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al cambiar la configuración'
    error(message)
  } finally {
    isTogglingFeature.value = false
  }
}

const confirmSuspend = () => {
  if (!business.value || isSuspending.value) return
  const msg = `¿Suspender servicio de "${business.value.name}"?\n\nLos usuarios de este negocio no podrán acceder al sistema hasta que se reactive el servicio.`
  if (window.confirm(msg)) {
    suspendBiz(business.value.id)
  }
}

const confirmResume = () => {
  if (!business.value || isResuming.value) return
  const msg = `¿Reactivar servicio de "${business.value.name}"?\n\nLos usuarios volverán a tener acceso al sistema.`
  if (window.confirm(msg)) {
    resumeBiz(business.value.id)
  }
}

// ─── Delete ──────────────────────────────────────────────────
const { mutateAsync: deleteBiz, isPending: isDeleting } = useMutation({
  mutationFn: deleteBusiness,
  onSuccess: async () => {
    success('Negocio eliminado completamente.')
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
    router.push('/superadmin')
  },
  onError: (err: unknown) => {
    const message = err instanceof Error ? err.message : 'No fue posible eliminar el negocio.'
    error(message)
  },
})

const confirmDelete = () => {
  if (!business.value || isDeleting.value) return
  const msg = `¿Eliminar "${business.value.name}"?\n\nSe borrará TODO: usuarios, empleados, clientes, citas, servicios, productos, inventario, transacciones, gastos...\n\nEsta acción NO se puede deshacer.`
  if (window.confirm(msg)) {
    deleteBiz(business.value.id)
  }
}


</script>
