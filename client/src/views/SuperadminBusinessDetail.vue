<template>
  <SuperadminLayout>
    <div v-if="business" class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <router-link to="/superadmin" class="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text transition-colors">
            <ArrowLeftIcon class="h-3.5 w-3.5" />
            Negocios
          </router-link>
          <span class="text-text-muted/40">/</span>
          <h1 class="text-lg font-bold text-text">{{ business.name }}</h1>
          <span v-if="business.deleted_at" class="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold uppercase text-danger">
            Eliminado
          </span>
          <span v-else class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
            :class="business.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'">
            {{ business.active ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <template v-if="business.deleted_at">
            <button @click="confirmRestore" :disabled="isRestoring"
              class="rounded-xl bg-success/10 px-3 py-2 text-xs font-semibold text-success hover:bg-success/20 transition-colors disabled:opacity-50">
              {{ isRestoring ? '...' : 'Restaurar' }}
            </button>
            <button @click="openPurge"
              class="rounded-xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors">
              Purgar permanentemente
            </button>
          </template>
          <template v-else>
            <button @click="openEdit" class="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-secondary transition-colors">
              Editar datos
            </button>
            <button v-if="business.active" @click="confirmSuspend" :disabled="isSuspending"
              class="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors disabled:opacity-50">
              {{ isSuspending ? '...' : 'Suspender' }}
            </button>
            <button v-else @click="confirmResume" :disabled="isResuming"
              class="rounded-xl bg-success/10 px-3 py-2 text-xs font-semibold text-success hover:bg-success/20 transition-colors disabled:opacity-50">
              {{ isResuming ? '...' : 'Reactivar' }}
            </button>
            <button @click="confirmDelete" :disabled="isDeleting"
              class="rounded-xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors">
              Eliminar
            </button>
          </template>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div class="rounded-xl border border-border bg-surface p-3">
          <p class="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Slug</p>
          <p class="text-sm font-semibold text-text truncate">{{ business.slug }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3">
          <p class="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Nicho</p>
          <p class="text-sm font-semibold text-text capitalize">{{ (business.niche_type || '—').replace(/_/g, ' ') }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3">
          <p class="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Creado</p>
          <p class="text-sm font-semibold text-text">{{ formatDate(business.created_at) }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3">
          <p class="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Zona horaria</p>
          <p class="text-sm font-semibold text-text truncate">{{ business.timezone }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3">
          <p class="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Moneda</p>
          <p class="text-sm font-semibold text-text">{{ business.currency }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-3">
          <p class="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Teléfono</p>
          <p class="text-sm font-semibold text-text truncate">{{ business.phone || '—' }}</p>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <!-- LEFT: Funcionalidades -->
        <div class="rounded-2xl border border-border bg-surface p-5">
          <h2 class="text-base font-bold text-text mb-4">Funcionalidades</h2>

          <!-- Agenda y catálogo -->
          <div class="mb-4">
            <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-1">Agenda y catálogo</p>
            <div class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
              <label v-for="ft in scheduleFlags" :key="ft.key" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-secondary/30 transition-colors" :class="isLocked(ft.key) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'">
                <div>
                  <p class="text-sm font-medium text-text">{{ ft.label }}</p>
                  <p class="text-[11px] text-text-muted">{{ ft.description }}</p>
                  <p v-if="isLocked(ft.key)" class="text-[10px] font-semibold text-warning mt-0.5">No disponible para el nicho "{{ business.niche_type }}"</p>
                </div>
                <button type="button" :disabled="isTogglingFeature || isLocked(ft.key)" :title="isLocked(ft.key) ? `No disponible para el nicho ${business.niche_type}` : undefined" @click="toggleFeature(ft.key)"
                  :class="['relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', isLocked(ft.key) ? 'cursor-not-allowed' : '', features[ft.key] ? 'bg-primary' : 'bg-border']">
                  <span :class="['inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform', features[ft.key] ? 'translate-x-4.5' : 'translate-x-0.5']" />
                </button>
              </label>
            </div>
          </div>

          <!-- Módulos principales -->
          <div class="mb-4">
            <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-1">Módulos</p>
            <div class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
              <label v-for="ft in coreModules" :key="ft.key" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-secondary/30 transition-colors" :class="isLocked(ft.key) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'">
                <div>
                  <p class="text-sm font-medium text-text">{{ ft.label }}</p>
                  <p class="text-[11px] text-text-muted">{{ ft.description }}</p>
                  <p v-if="isLocked(ft.key)" class="text-[10px] font-semibold text-warning mt-0.5">No disponible para el nicho "{{ business.niche_type }}"</p>
                </div>
                <button type="button" :disabled="isTogglingFeature || isLocked(ft.key)" :title="isLocked(ft.key) ? `No disponible para el nicho ${business.niche_type}` : undefined" @click="toggleFeature(ft.key)"
                  :class="['relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', isLocked(ft.key) ? 'cursor-not-allowed' : '', features[ft.key] ? 'bg-primary' : 'bg-border']">
                  <span :class="['inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform', features[ft.key] ? 'translate-x-4.5' : 'translate-x-0.5']" />
                </button>
              </label>
            </div>
          </div>

          <!-- Gestión y equipos -->
          <div class="mb-4">
            <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-1">Gestión y equipos</p>
            <div class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
              <label v-for="ft in managementFlags" :key="ft.key" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-secondary/30 transition-colors" :class="isLocked(ft.key) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'">
                <div>
                  <p class="text-sm font-medium text-text">{{ ft.label }}</p>
                  <p class="text-[11px] text-text-muted">{{ ft.description }}</p>
                  <p v-if="isLocked(ft.key)" class="text-[10px] font-semibold text-warning mt-0.5">No disponible para el nicho "{{ business.niche_type }}"</p>
                </div>
                <button type="button" :disabled="isTogglingFeature || isLocked(ft.key)" :title="isLocked(ft.key) ? `No disponible para el nicho ${business.niche_type}` : undefined" @click="toggleFeature(ft.key)"
                  :class="['relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', isLocked(ft.key) ? 'cursor-not-allowed' : '', features[ft.key] ? 'bg-primary' : 'bg-border']">
                  <span :class="['inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform', features[ft.key] ? 'translate-x-4.5' : 'translate-x-0.5']" />
                </button>
              </label>
            </div>
          </div>

          <!-- Comunicación y reservas -->
          <div>
            <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-1">Comunicación y reservas</p>
            <div class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
              <label v-for="ft in commFlags" :key="ft.key" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-secondary/30 transition-colors" :class="isLocked(ft.key) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'">
                <div>
                  <p class="text-sm font-medium text-text">{{ ft.label }}</p>
                  <p class="text-[11px] text-text-muted">{{ ft.description }}</p>
                  <p v-if="isLocked(ft.key)" class="text-[10px] font-semibold text-warning mt-0.5">No disponible para el nicho "{{ business.niche_type }}"</p>
                </div>
                <button type="button" :disabled="isTogglingFeature || isLocked(ft.key)" :title="isLocked(ft.key) ? `No disponible para el nicho ${business.niche_type}` : undefined" @click="toggleFeature(ft.key)"
                  :class="['relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', isLocked(ft.key) ? 'cursor-not-allowed' : '', features[ft.key] ? 'bg-primary' : 'bg-border']">
                  <span :class="['inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform', features[ft.key] ? 'translate-x-4.5' : 'translate-x-0.5']" />
                </button>
              </label>
            </div>
          </div>
        </div>

        <!-- RIGHT: Sucursales + Admins -->
        <div class="space-y-6">
          <!-- Sucursales -->
          <div class="rounded-2xl border border-border bg-surface p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-base font-bold text-text">Sucursales</h2>
              <span class="rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-semibold text-text-muted">{{ branches.length }}</span>
            </div>
            <div v-if="branches.length === 0" class="py-6 text-center text-sm text-text-muted">
              Sin sucursales
            </div>
            <div v-else class="space-y-2">
              <div v-for="branch in branches" :key="branch.id"
                class="rounded-xl border border-border-subtle bg-bg-secondary/30 px-4 py-3">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-semibold text-text">{{ branch.name }}</p>
                  <span v-if="branch.is_default" class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">Principal</span>
                  <span :class="['rounded-full px-1.5 py-0.5 text-[9px] font-bold', branch.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger']">
                    {{ branch.active ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>
                <div v-if="branch.address || branch.phone" class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
                  <span v-if="branch.address" class="truncate max-w-[200px]">{{ branch.address }}</span>
                  <span v-if="branch.phone">{{ branch.phone }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Administradores -->
          <div class="rounded-2xl border border-border bg-surface p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-base font-bold text-text">Administradores</h2>
              <span class="rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-semibold text-text-muted">{{ admins.length }}</span>
            </div>
            <div v-if="admins.length === 0" class="py-6 text-center text-sm text-text-muted">
              Sin administradores
            </div>
            <div v-else class="space-y-2 max-h-64 overflow-y-auto">
              <div v-for="admin in admins" :key="admin.id"
                class="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-secondary/30 px-4 py-2.5">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                  {{ getInitials(admin.full_name) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-text truncate">{{ admin.full_name }}</p>
                  <p class="text-[11px] text-text-muted truncate">{{ admin.email }}</p>
                </div>
                <router-link
                  :to="`/superadmin/business/${business.id}/admins`"
                  class="text-[11px] font-medium text-primary hover:text-primary-hover shrink-0">
                  Ver todos
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex items-center justify-center py-20">
      <div class="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" @click.self="closeEdit">
          <div class="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl" @click.stop>
            <h2 class="text-base font-bold text-text mb-4">Editar {{ business?.name }}</h2>
            <form class="space-y-3" @submit.prevent="handleEditSubmit">
              <div>
                <label class="block text-xs font-semibold text-text mb-1">Nombre</label>
                <input v-model="editForm.name" type="text" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-text mb-1">Teléfono</label>
                  <input v-model="editForm.phone" type="text" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-text mb-1">Zona horaria</label>
                  <input v-model="editForm.timezone" type="text" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-text mb-1">Moneda</label>
                  <select v-model="editForm.currency" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                    <option value="USD">USD</option>
                    <option value="DOP">DOP</option>
                    <option value="EUR">EUR</option>
                    <option value="MXN">MXN</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-text mb-1">Nicho</label>
                  <select v-model="editForm.niche_type" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                    <option v-for="n in registeredNiches" :key="n.id" :value="n.id">{{ n.label }}</option>
                    <option v-if="isUnregisteredNiche" :value="business?.niche_type" disabled>{{ business?.niche_type }} — sin configurar</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-text mb-1">Dirección</label>
                <input v-model="editForm.address" type="text" class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
              </div>
              <p v-if="editFormError" class="text-xs text-danger">{{ editFormError }}</p>
              <div class="flex justify-end gap-2 pt-2">
                <button type="button" @click="closeEdit" class="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-bg-secondary transition-colors">Cancelar</button>
                <button type="submit" :disabled="isUpdating" class="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover transition-colors disabled:opacity-50">
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
        <div v-if="showPurgeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" @click.self="closePurge">
          <div class="w-full max-w-md rounded-2xl border border-danger/30 bg-surface p-6 shadow-2xl" @click.stop>
            <h2 class="text-base font-bold text-danger mb-1">Purgar "{{ business?.name }}" permanentemente</h2>
            <p class="text-xs text-text-muted mb-4 leading-relaxed">
              Esto borra el negocio y absolutamente todos sus datos — clientes, citas, transacciones,
              empleados, inventario, facturas, todo. <b class="text-text">No se puede deshacer.</b>
            </p>
            <label class="block text-xs font-semibold text-text mb-1">
              Escribe <span class="font-mono text-danger">{{ business?.name }}</span> para confirmar
            </label>
            <input v-model="purgeConfirmInput" type="text" autocomplete="off"
              class="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-danger focus:ring-2 focus:ring-danger/10 transition-all" />
            <p v-if="purgeError" class="mt-2 text-xs text-danger">{{ purgeError }}</p>
            <div class="flex justify-end gap-2 pt-4">
              <button type="button" @click="closePurge" class="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-bg-secondary transition-colors">Cancelar</button>
              <button type="button" :disabled="isPurging || purgeConfirmInput !== business?.name" @click="handlePurge"
                class="rounded-xl bg-danger px-4 py-2.5 text-xs font-bold text-white hover:bg-danger/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
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

const allFlags = [
  { key: 'agenda', label: 'Agenda', description: 'Vista de agenda de citas del día' },
  { key: 'calendario', label: 'Calendario', description: 'Vista de calendario de citas' },
  { key: 'servicios', label: 'Servicios', description: 'Catálogo de servicios agendables' },
  { key: 'pos', label: 'Punto de Venta', description: 'Cobro de citas con productos y método de pago' },
  { key: 'inventario', label: 'Inventario', description: 'Control de stock, entradas y salidas' },
  { key: 'productos', label: 'Productos', description: 'Catálogo de productos vendibles' },
  { key: 'proveedores', label: 'Proveedores', description: 'Gestión de proveedores, deudas y pagos' },
  { key: 'employees_create_clients', label: 'Empleados crean clientes', description: 'Los empleados pueden agregar clientes desde la agenda' },
  { key: 'employees_see_clients', label: 'Empleados ven clientes', description: 'Acceso al módulo de Clientes en el menú lateral' },
  { key: 'gift_cards', label: 'Gift Cards', description: 'Sistema de tarjetas de regalo' },
  { key: 'manual_reports', label: 'Reporte Diario', description: 'Generación y control de reportes diarios' },
  { key: 'multi_branch', label: 'Múltiples sucursales', description: 'Gestionar varias ubicaciones físicas' },
  { key: 'enable_public_booking', label: 'Reservas públicas', description: 'Links de reserva e invitaciones para clientes' },
  { key: 'whatsapp_available', label: 'WhatsApp', description: 'Configurar WhatsApp via Evolution API con QR' },
  { key: 'hide_client_phone_from_employees', label: 'Ocultar datos a empleados', description: 'Empleados no ven teléfono ni email de clientes' },
]

const scheduleFlags = computed(() => allFlags.filter(f => ['agenda', 'calendario', 'servicios'].includes(f.key)))
const coreModules = computed(() => allFlags.filter(f => ['pos', 'inventario', 'productos', 'proveedores'].includes(f.key)))
const managementFlags = computed(() => allFlags.filter(f => ['employees_create_clients', 'employees_see_clients', 'gift_cards', 'manual_reports', 'multi_branch'].includes(f.key)))
const commFlags = computed(() => allFlags.filter(f => ['enable_public_booking', 'whatsapp_available', 'hide_client_phone_from_employees'].includes(f.key)))

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
