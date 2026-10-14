<template>
  <SuperadminLayout>
    <div v-if="business" class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <nav class="mb-1 flex items-center gap-1 text-xs text-text-muted" aria-label="Ruta">
            <router-link to="/superadmin" class="flex items-center gap-1 font-medium transition-colors hover:text-text">
              <ArrowLeftIcon class="h-3.5 w-3.5" />
              Negocios
            </router-link>
            <span class="text-text-muted/40">/</span>
            <span class="truncate">{{ business.name }}</span>
          </nav>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl font-bold text-text">{{ business.name }}</h1>
            <span v-if="business.deleted_at" class="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold uppercase text-danger">Eliminado</span>
            <span v-else class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" :class="business.active ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'">
              {{ business.active ? 'Activo' : 'Suspendido' }}
            </span>
            <span class="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-text-secondary">{{ nicheLabel }}</span>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <template v-if="business.deleted_at">
            <button @click="confirmRestore" :disabled="isRestoring"
              class="rounded-xl bg-success/10 px-3 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/20 disabled:opacity-50">
              {{ isRestoring ? 'Restaurando...' : 'Restaurar negocio' }}
            </button>
            <button @click="openPurge"
              class="rounded-xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10">
              Purgar permanentemente
            </button>
          </template>
          <button v-else @click="openEdit" class="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-secondary">
            Editar datos
          </button>
        </div>
      </div>

      <div v-if="business.deleted_at" class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-xs leading-relaxed text-text-secondary">
        <b class="text-danger">Este negocio está eliminado.</b> Sus usuarios están desactivados y no aparece en la lista normal, pero sus datos siguen guardados:
        puedes restaurarlo o purgarlo (borrado definitivo).
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 overflow-x-auto border-b border-border" role="tablist">
        <button v-for="t in TABS" :key="t.id" type="button" role="tab" :aria-selected="tab === t.id"
          class="relative shrink-0 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors"
          :class="tab === t.id ? 'text-primary' : 'text-text-muted hover:text-text'"
          @click="selectTab(t.id)">
          {{ t.label }}
          <span v-if="t.badge" class="ml-1.5 rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-text-muted">{{ t.badge }}</span>
          <span v-if="tab === t.id" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
        </button>
      </div>

      <!-- RESUMEN -->
      <div v-if="tab === 'resumen'" class="space-y-6">
        <section>
          <h2 class="mb-2 text-sm font-bold text-text">Datos del negocio</h2>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div v-for="item in infoItems" :key="item.label" class="rounded-xl border border-border bg-surface p-3">
              <p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{{ item.label }}</p>
              <p class="truncate text-sm font-semibold text-text" :title="item.value">{{ item.value }}</p>
            </div>
          </div>
        </section>

        <!-- Nomenclatura -->
        <section class="rounded-2xl border border-border bg-surface p-5">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-text">Nomenclatura</h2>
              <p class="text-[11px] text-text-muted">Cómo se llaman las cosas en este negocio (cliente, empleado, cita…).</p>
            </div>
            <span v-if="hasTerminologyOverride" class="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">Personalizada</span>
          </div>
          <p v-if="!hasTerminologyOverride" class="py-2 text-sm text-text-muted">
            Usa los términos por defecto del nicho «{{ nicheLabel }}» (ej. Paciente/Odontólogo para odontología). Sin personalización guardada.
          </p>
          <template v-else>
            <p class="mb-3 text-[11px] text-text-muted">
              Este negocio tiene términos guardados que <strong>reemplazan</strong> los del nicho — esto puede ser la causa de que veas "Cliente/Empleado" en vez de la nomenclatura del nicho en producción.
            </p>
            <div class="mb-3 flex flex-wrap gap-1.5">
              <span v-for="(value, key) in storedTerminology" :key="key" class="rounded-lg border border-border-subtle bg-bg-secondary/50 px-2 py-1 text-[11px] text-text-secondary">
                <span class="font-semibold text-text">{{ key }}</span>: {{ value }}
              </span>
            </div>
            <button type="button" :disabled="isResettingTerminology" @click="confirmResetTerminology"
              class="w-full rounded-xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50">
              {{ isResettingTerminology ? 'Restableciendo...' : 'Restablecer al nicho (borrar personalización)' }}
            </button>
          </template>
        </section>

        <!-- Zona de riesgo -->
        <section v-if="!business.deleted_at" class="rounded-2xl border border-danger/20 bg-surface p-5">
          <h2 class="text-base font-bold text-text">Zona de riesgo</h2>
          <p class="mb-4 text-[11px] text-text-muted">Acciones que afectan el acceso de todo el negocio. Piden confirmación antes de ejecutarse.</p>
          <div class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
            <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div class="min-w-0 max-w-xl">
                <p class="text-sm font-medium text-text">{{ business.active ? 'Suspender el servicio' : 'Reactivar el servicio' }}</p>
                <p class="text-[11px] leading-relaxed text-text-muted">
                  {{ business.active
                    ? 'El negocio y sus usuarios pierden el acceso hasta que lo reactives. No se borra ningún dato.'
                    : 'El negocio está suspendido. Al reactivarlo, sus usuarios vuelven a entrar normalmente.' }}
                </p>
              </div>
              <button v-if="business.active" @click="confirmSuspend" :disabled="isSuspending"
                class="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 disabled:opacity-50">
                {{ isSuspending ? 'Suspendiendo...' : 'Suspender' }}
              </button>
              <button v-else @click="confirmResume" :disabled="isResuming"
                class="rounded-xl bg-success/10 px-3 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/20 disabled:opacity-50">
                {{ isResuming ? 'Reactivando...' : 'Reactivar' }}
              </button>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div class="min-w-0 max-w-xl">
                <p class="text-sm font-medium text-text">Eliminar el negocio</p>
                <p class="text-[11px] leading-relaxed text-text-muted">
                  Se oculta de la lista y sus usuarios se desactivan, pero los datos no se borran todavía: podrás restaurarlo o purgarlo permanentemente después.
                </p>
              </div>
              <button @click="confirmDelete" :disabled="isDeleting"
                class="rounded-xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50">
                {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </section>
      </div>

      <!-- FUNCIONES -->
      <FeaturesPanel v-else-if="tab === 'funciones'"
        :groups="flagGroups" :features="features" :niche-defaults="nicheDefaults" :locked-keys="lockedFeatureKeys"
        :busy="isTogglingFeature" :niche-label="nicheLabel" @toggle="toggleFeature" />

      <!-- EQUIPO Y SUCURSALES -->
      <div v-else class="grid gap-6 lg:grid-cols-2">
        <section class="rounded-2xl border border-border bg-surface p-5">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-text">Administradores</h2>
              <p class="text-[11px] text-text-muted">Quienes manejan este negocio. Desde «Ver todos» puedes restablecer contraseñas o entrar como ellos.</p>
            </div>
            <span class="rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-semibold text-text-muted">{{ admins.length }}</span>
          </div>
          <div v-if="admins.length === 0" class="py-6 text-center text-sm text-text-muted">Sin administradores</div>
          <div v-else class="max-h-72 space-y-2 overflow-y-auto">
            <div v-for="admin in admins" :key="admin.id" class="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-secondary/30 px-4 py-2.5">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{{ getInitials(admin.full_name) }}</div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-text">{{ admin.full_name }}</p>
                <p class="truncate text-[11px] text-text-muted">{{ admin.email }}</p>
              </div>
            </div>
          </div>
          <router-link :to="`/superadmin/business/${business.id}/admins`"
            class="mt-3 inline-block text-xs font-semibold text-primary hover:text-primary-hover">
            Administrar administradores →
          </router-link>
        </section>

        <section class="rounded-2xl border border-border bg-surface p-5">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-text">Sucursales</h2>
              <p class="text-[11px] text-text-muted">Las ubicaciones físicas del negocio.</p>
            </div>
            <span class="rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-semibold text-text-muted">{{ branches.length }}</span>
          </div>
          <div v-if="branches.length === 0" class="py-6 text-center text-sm text-text-muted">Sin sucursales</div>
          <div v-else class="space-y-2">
            <div v-for="branch in branches" :key="branch.id" class="rounded-xl border border-border-subtle bg-bg-secondary/30 px-4 py-3">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-text">{{ branch.name }}</p>
                <span v-if="branch.is_default" class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">Principal</span>
                <span :class="['rounded-full px-1.5 py-0.5 text-[9px] font-bold', branch.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger']">
                  {{ branch.active ? 'Activa' : 'Inactiva' }}
                </span>
              </div>
              <div v-if="branch.address || branch.phone" class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
                <span v-if="branch.address" class="max-w-[220px] truncate">{{ branch.address }}</span>
                <span v-if="branch.phone">{{ branch.phone }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-else class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" @click.self="closeEdit">
          <div class="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl" @click.stop>
            <h2 class="mb-4 text-base font-bold text-text">Editar {{ business?.name }}</h2>
            <form class="space-y-3" @submit.prevent="handleEditSubmit">
              <div>
                <label class="mb-1 block text-xs font-semibold text-text">Nombre</label>
                <input v-model="editForm.name" type="text" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-text">Teléfono</label>
                  <input v-model="editForm.phone" type="text" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-text">Zona horaria</label>
                  <input v-model="editForm.timezone" type="text" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-text">Moneda</label>
                  <select v-model="editForm.currency" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10">
                    <option value="USD">USD</option>
                    <option value="DOP">DOP</option>
                    <option value="EUR">EUR</option>
                    <option value="MXN">MXN</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-text">Nicho</label>
                  <select v-model="editForm.niche_type" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10">
                    <option v-for="n in registeredNiches" :key="n.id" :value="n.id">{{ n.label }}</option>
                    <option v-if="isUnregisteredNiche" :value="business?.niche_type" disabled>{{ business?.niche_type }} — sin configurar</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-text">Dirección</label>
                <input v-model="editForm.address" type="text" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <p v-if="editFormError" class="text-xs text-danger">{{ editFormError }}</p>
              <div class="flex justify-end gap-2 pt-2">
                <button type="button" @click="closeEdit" class="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-secondary">Cancelar</button>
                <button type="submit" :disabled="isUpdating" class="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-50">
                  {{ isUpdating ? 'Guardando...' : 'Guardar cambios' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Purge Modal -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showPurgeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" @click.self="closePurge">
          <div class="w-full max-w-md rounded-2xl border border-danger/30 bg-surface p-6 shadow-2xl" @click.stop>
            <h2 class="mb-1 text-base font-bold text-danger">Purgar "{{ business?.name }}" permanentemente</h2>
            <p class="mb-4 text-xs leading-relaxed text-text-muted">
              Esto borra el negocio y absolutamente todos sus datos — clientes, citas, transacciones,
              empleados, inventario, facturas, todo. <b class="text-text">No se puede deshacer.</b>
            </p>
            <label class="mb-1 block text-xs font-semibold text-text">
              Escribe <span class="font-mono text-danger">{{ business?.name }}</span> para confirmar
            </label>
            <input v-model="purgeConfirmInput" type="text" autocomplete="off"
              class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-all focus:border-danger focus:ring-2 focus:ring-danger/10" />
            <p v-if="purgeError" class="mt-2 text-xs text-danger">{{ purgeError }}</p>
            <div class="flex justify-end gap-2 pt-4">
              <button type="button" @click="closePurge" class="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-secondary">Cancelar</button>
              <button type="button" :disabled="isPurging || purgeConfirmInput !== business?.name" @click="handlePurge"
                class="rounded-xl bg-danger px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-40">
                {{ isPurging ? 'Purgando...' : 'Purgar permanentemente' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </SuperadminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { formatDate } from '../lib/formatters'
import { useNotification } from '../composables/common/useNotification'
import {
  deleteBusiness, listBusinessAdmins, listBusinesses, purgeBusiness, restoreBusiness,
  resumeBusiness, suspendBusiness, updateBusiness, superadminKeys,
} from '../services/superadminService'
import { listBranches, branchesKeys } from '../services/branchesService'
import { translateError } from '../lib/errors'
import SuperadminLayout from '../components/layout/SuperadminLayout.vue'
import FeaturesPanel from '../components/superadmin/FeaturesPanel.vue'
import { groupsForNiche, flagStats } from '../components/superadmin/featureCatalog'
import type { AuthProfile } from '../types/auth'
import type { Business } from '../types/database'
import { creatableNiches, resolveFeatures, getNiche } from '../config/niches'
import { ArrowLeftIcon } from '@solar-icons/vue/linear'

const { success, error: showError } = useNotification()
const queryClient = useQueryClient()
const route = useRoute()
const router = useRouter()
const businessId = computed(() => route.params.id as string)

const { data: businessesData } = useQuery({
  queryKey: [...superadminKeys.businesses(), true] as const,
  queryFn: () => listBusinesses(true),
})

const business = computed<Business | undefined>(() =>
  businessesData.value?.find((b: Business) => b.id === businessId.value)
)

// Raw stored value — the sparse merge base for toggleFeature's PUT payload, so flipping one
// switch only ever persists the keys already in the DB plus the one changed (no accidental
// backfill of the other ~20 resolved keys).
const rawFeatures = computed(() => (business.value as any)?.features ?? {})
// Resolved (DEFAULT_FEATURES -> niche defaults -> stored -> niche locks) — what the toggles
// should actually render as on/off, since most keys are never written to the DB at all.
const features = computed(() =>
  (business.value as any)?.resolved_features
  ?? resolveFeatures(business.value?.niche_type, rawFeatures.value)
)

// Locked keys win over any stored/superadmin choice in resolveFeatures — toggling them
// silently reverts, which reads as "broken" unless the UI explains why up front.
const lockedFeatureKeys = computed(() => new Set(Object.keys(getNiche(business.value?.niche_type).featureLocks ?? {})))
const isLocked = (key: string) => lockedFeatureKeys.value.has(key)

const registeredNiches = creatableNiches()
const isUnregisteredNiche = computed(() =>
  !!business.value?.niche_type && !registeredNiches.some(n => n.id === business.value!.niche_type)
)
const nicheLabel = computed(() => {
  const id = business.value?.niche_type
  if (!id) return 'Sin nicho'
  return registeredNiches.find(n => n.id === id)?.label ?? id.replace(/_/g, ' ')
})

const { data: adminsData } = useQuery({
  queryKey: computed(() => superadminKeys.businessAdmins(businessId.value)),
  queryFn: () => listBusinessAdmins(businessId.value),
})
const admins = computed<AuthProfile[]>(() => adminsData.value ?? [])

const { data: branchesData } = useQuery({
  queryKey: computed(() => branchesKeys.all(businessId.value)),
  queryFn: () => listBranches(businessId.value),
  enabled: computed(() => !!businessId.value),
})
const branches = computed(() => branchesData.value ?? [])

// ── Presentation only: tabs, summary cards and the switch groups ────────────
const flagGroups = computed(() => groupsForNiche(business.value?.niche_type))
// What a business of this niche gets with nothing stored — used only to mark the switches that were changed.
const nicheDefaults = computed(() => resolveFeatures(business.value?.niche_type, {}))
const flagSummary = computed(() => flagStats(flagGroups.value, features.value, nicheDefaults.value))

type TabId = 'resumen' | 'funciones' | 'equipo'
const tab = ref<TabId>((['resumen', 'funciones', 'equipo'] as const).find(t => t === route.query.tab) ?? 'resumen')
const selectTab = (id: TabId) => {
  tab.value = id
  router.replace({ query: { ...route.query, tab: id === 'resumen' ? undefined : id } })
}
const TABS = computed(() => [
  { id: 'resumen' as const, label: 'Resumen', badge: '' },
  { id: 'funciones' as const, label: 'Funciones', badge: `${flagSummary.value.on}/${flagSummary.value.total}` },
  { id: 'equipo' as const, label: 'Equipo y sucursales', badge: '' },
])

const infoItems = computed(() => [
  { label: 'Identificador', value: business.value?.slug ?? '—' },
  { label: 'Nicho', value: nicheLabel.value },
  { label: 'Creado', value: business.value ? formatDate(business.value.created_at) : '—' },
  { label: 'Zona horaria', value: business.value?.timezone || '—' },
  { label: 'Moneda', value: business.value?.currency || '—' },
  { label: 'Teléfono', value: business.value?.phone || '—' },
])

const isTogglingFeature = ref(false)
const toggleFeature = async (key: string) => {
  if (!business.value || isLocked(key)) return
  // Merge base is the RAW stored object (sparse) — only the flipped key gets written on top
  // of whatever was already explicitly persisted. The new value inverts the RESOLVED
  // (effective) state, so a flag that's currently on via a niche default correctly flips off.
  const stored = rawFeatures.value
  const effective = features.value
  isTogglingFeature.value = true
  try {
    await updateBusiness({ business_id: business.value.id, features: { ...stored, [key]: !effective[key] } })
    success(effective[key] ? 'Función desactivada' : 'Función activada')
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
  } catch (err: unknown) {
    showError(translateError(err, 'Error al cambiar'))
  } finally {
    isTogglingFeature.value = false
  }
}

// resolveTerminology.ts precedence: DEFAULT_TERMINOLOGY -> niche.terminologyDefaults -> stored
// (this column) — whatever is saved here always wins over the niche's own labels, with no UI
// anywhere else in the app to edit or clear it (there's no owner-facing terminology editor).
// A business that picked up stray generic values (e.g. from before the niche system existed)
// stays stuck showing "Cliente/Empleado" forever unless cleared from here.
const storedTerminology = computed<Record<string, string>>(() => (business.value as any)?.terminology ?? {})
const hasTerminologyOverride = computed(() => Object.keys(storedTerminology.value).length > 0)

const isResettingTerminology = ref(false)
const confirmResetTerminology = async () => {
  if (!business.value) return
  if (!window.confirm(`¿Restablecer la nomenclatura de "${business.value.name}" a la del nicho "${business.value.niche_type}"? Se perderán los términos personalizados guardados.`)) return
  isResettingTerminology.value = true
  try {
    // {} rather than null — resolveTerminology treats both as "no override" identically, but
    // the businesses.terminology column may be NOT NULL (its original migration predates this
    // repo's Laravel migration history), so an explicit null risks a DB-level 500 on save.
    await updateBusiness({ business_id: business.value.id, terminology: {} })
    success('Nomenclatura restablecida al nicho')
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
  } catch (err: unknown) {
    showError(translateError(err, 'Error al restablecer la nomenclatura'))
  } finally {
    isResettingTerminology.value = false
  }
}

const showEditModal = ref(false)
const editFormError = ref('')
const editForm = ref({ name: '', phone: '', address: '', timezone: '', currency: 'USD', niche_type: 'salon' })
const openEdit = () => {
  if (!business.value) return
  editForm.value = {
    name: business.value.name,
    phone: business.value.phone ?? '',
    address: business.value.address ?? '',
    timezone: business.value.timezone,
    currency: business.value.currency,
    niche_type: business.value.niche_type,
  }
  showEditModal.value = true
}
const closeEdit = () => { editFormError.value = ''; showEditModal.value = false }

const { mutateAsync: updateBiz, isPending: isUpdating } = useMutation({
  mutationFn: (input: any) => updateBusiness(input),
  onSuccess: () => { success('Negocio actualizado'); closeEdit(); queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {}) },
  onError: (err) => showError(translateError(err, 'No fue posible actualizar')),
})
const handleEditSubmit = () => {
  if (!business.value || !editForm.value.name.trim()) { editFormError.value = 'El nombre es requerido'; return }
  updateBiz({ business_id: business.value.id, ...editForm.value, name: editForm.value.name.trim(), phone: editForm.value.phone.trim() || null, address: editForm.value.address.trim() || null })
}

const { mutateAsync: suspendBiz, isPending: isSuspending } = useMutation({
  mutationFn: suspendBusiness,
  onSuccess: () => { success('Servicio suspendido'); queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {}) },
  onError: (err) => showError(translateError(err, 'Error al suspender')),
})
const { mutateAsync: resumeBiz, isPending: isResuming } = useMutation({
  mutationFn: resumeBusiness,
  onSuccess: () => { success('Servicio reactivado'); queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {}) },
  onError: (err) => showError(translateError(err, 'Error al reactivar')),
})
const { mutateAsync: deleteBiz, isPending: isDeleting } = useMutation({
  mutationFn: deleteBusiness,
  onSuccess: () => {
    success('Negocio eliminado')
    // The list query caches for 5min (queryClient.ts) — without this, landing back on
    // /superadmin right after would show the pre-delete list, active/inactive badge and all,
    // until the cache happened to expire on its own.
    queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})
    router.push('/superadmin')
  },
  onError: (err) => showError(translateError(err, 'Error al eliminar')),
})
const { mutateAsync: restoreBiz, isPending: isRestoring } = useMutation({
  mutationFn: restoreBusiness,
  onSuccess: () => { success('Negocio restaurado'); queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {}) },
  onError: (err) => showError(translateError(err, 'Error al restaurar')),
})

const showPurgeModal = ref(false)
const purgeConfirmInput = ref('')
const purgeError = ref('')
const openPurge = () => { purgeConfirmInput.value = ''; purgeError.value = ''; showPurgeModal.value = true }
const closePurge = () => { showPurgeModal.value = false }

const { mutateAsync: purgeBiz, isPending: isPurging } = useMutation({
  mutationFn: () => purgeBusiness(business.value!.id, purgeConfirmInput.value),
  onSuccess: () => { success('Negocio purgado permanentemente'); router.push('/superadmin') },
  onError: (err) => { purgeError.value = translateError(err, 'Error al purgar') },
})
const handlePurge = () => {
  if (!business.value || purgeConfirmInput.value !== business.value.name) return
  purgeBiz()
}

const confirmSuspend = () => { if (business.value) window.confirm(`¿Suspender "${business.value.name}"?`) && suspendBiz(business.value.id) }
const confirmResume = () => { if (business.value) window.confirm(`¿Reactivar "${business.value.name}"?`) && resumeBiz(business.value.id) }
const confirmDelete = () => { if (business.value) window.confirm(`¿Eliminar "${business.value.name}"?\n\nEl negocio se ocultará y sus usuarios se desactivarán, pero sus datos NO se borran todavía — podrás restaurarlo, o purgarlo permanentemente después.`) && deleteBiz(business.value.id) }
const confirmRestore = () => { if (business.value) window.confirm(`¿Restaurar "${business.value.name}"? Volverá a aparecer en la lista de negocios.`) && restoreBiz(business.value.id) }

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}
</script>
