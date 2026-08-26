<template>
  <SuperadminLayout>
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <router-link to="/superadmin" class="text-xs font-medium text-text-muted hover:text-text transition-colors">
          Negocios
        </router-link>
        <span class="text-text-muted/40 text-xs">/</span>
        <router-link :to="`/superadmin/business/${businessId}`" class="text-xs font-medium text-text-muted hover:text-text transition-colors">
          {{ business?.name || '...' }}
        </router-link>
        <span class="text-text-muted/40 text-xs">/</span>
        <span class="text-xs font-semibold text-text">Administradores</span>
      </div>

      <div class="rounded-2xl border border-border bg-surface p-5">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-lg font-bold text-text">Administradores</h1>
          <span class="rounded-full bg-bg-secondary px-2.5 py-0.5 text-xs font-semibold text-text-muted">{{ admins.length }}</span>
        </div>
        <div v-if="admins.length === 0" class="py-12 text-center text-sm text-text-muted">
          No hay administradores registrados para este negocio.
        </div>
        <div v-else class="divide-y divide-border-subtle">
          <div v-for="admin in admins" :key="admin.id"
            class="flex flex-wrap items-center gap-4 px-1 py-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
              {{ getInitials(admin.full_name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text">{{ admin.full_name }}</p>
              <p class="text-xs text-text-muted">{{ admin.email }}</p>
              <p v-if="admin.linked_businesses?.length" class="mt-1 text-[11px] text-text-muted">
                Vinculado con: {{ admin.linked_businesses.map(b => b.business_name).join(', ') }}
                <button type="button" @click="handleUnlink(admin)" class="ml-1 font-semibold text-danger hover:underline">Desvincular</button>
              </p>
            </div>
            <span class="rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 text-[10px] font-bold uppercase">{{ admin.role }}</span>
            <button
              type="button"
              :disabled="isImpersonatingId === admin.id"
              @click="handleImpersonate(admin)"
              class="shrink-0 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/10 disabled:opacity-60"
            >
              {{ isImpersonatingId === admin.id ? 'Entrando...' : 'Entrar como' }}
            </button>
            <button
              type="button"
              @click="openPasswordModal(admin)"
              class="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text"
            >
              Cambiar contraseña
            </button>
            <button
              type="button"
              @click="openLinkModal(admin)"
              class="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text"
            >
              Vincular negocio
            </button>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-surface p-5">
        <h2 class="text-sm font-bold text-text mb-3">Actividad reciente</h2>
        <div v-if="auditLogs.length === 0" class="py-6 text-center text-sm text-text-muted">
          Sin actividad registrada para este negocio.
        </div>
        <div v-else class="space-y-2">
          <div v-for="log in auditLogs" :key="log.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-secondary/30 px-3 py-2">
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-text">{{ describeAuditAction(log) }}</p>
              <p v-if="describeAuditChanges(log)" class="text-[11px] text-text-muted truncate">{{ describeAuditChanges(log) }}</p>
              <p v-else-if="log.metadata?.admin_name" class="text-[11px] text-text-muted truncate">{{ log.metadata.admin_name }}</p>
            </div>
            <span class="shrink-0 text-[11px] text-text-muted whitespace-nowrap">{{ formatDate(log.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <ModalBase
      :is-open="showPasswordModal"
      title="Cambiar contraseña"
      :subtitle="targetAdmin ? `${targetAdmin.full_name} · ${targetAdmin.email}` : ''"
      icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      size="md"
      variant="warning"
      :is-loading="isSaving"
      :is-confirm-disabled="!isPasswordValid"
      confirm-text="Cambiar contraseña"
      loading-text="Cambiando..."
      @close="closePasswordModal"
      @confirm="handleResetPassword"
    >
      <div class="space-y-4">
        <div class="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
          <p class="text-xs text-text-secondary">
            La contraseña actual no se puede consultar: se guarda cifrada en un solo sentido.
            Al confirmar se reemplaza por la nueva y se cierran las sesiones abiertas de este
            administrador.
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1.5">Nueva contraseña</label>
          <div class="flex gap-2">
            <input
              v-model="newPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Mínimo 6 caracteres"
              autocomplete="new-password"
              class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="shrink-0 rounded-lg border border-border px-3 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
            >
              {{ showPassword ? 'Ocultar' : 'Ver' }}
            </button>
            <button
              type="button"
              @click="generatePassword"
              class="shrink-0 rounded-lg border border-border px-3 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
            >
              Generar
            </button>
          </div>
          <p v-if="newPassword && newPassword.length < 6" class="mt-1 text-xs text-danger">
            Debe tener al menos 6 caracteres.
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1.5">Confirmar contraseña</label>
          <input
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Repite la contraseña"
            autocomplete="new-password"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary"
          />
          <p v-if="confirmPassword && newPassword !== confirmPassword" class="mt-1 text-xs text-danger">
            Las contraseñas no coinciden.
          </p>
        </div>

        <p class="text-xs text-text-muted">
          Anota o copia esta contraseña antes de confirmar — no podrás volver a verla después.
          Pídele al administrador que la cambie tras iniciar sesión.
        </p>
      </div>
    </ModalBase>

    <ModalBase
      :is-open="showLinkModal"
      title="Vincular con otro negocio"
      :subtitle="targetAdmin ? `${targetAdmin.full_name} · ${business?.name}` : ''"
      icon="M3 21h18M4 21V8l8-5 8 5v13M9 21v-6h6v6"
      size="md"
      :is-loading="isLinking"
      :is-confirm-disabled="!linkTargetAdminId"
      confirm-text="Vincular"
      loading-text="Vinculando..."
      @close="closeLinkModal"
      @confirm="handleLink"
    >
      <div class="space-y-4">
        <p class="text-xs text-text-secondary">
          El dueño de este negocio podrá cambiar entre este negocio y el que elijas aquí, con un
          selector, sin volver a iniciar sesión. Los datos de ambos negocios siguen totalmente
          separados.
        </p>

        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1.5">Negocio a vincular</label>
          <select
            v-model="linkTargetBusinessId"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
          >
            <option value="">Selecciona un negocio</option>
            <option v-for="b in otherBusinesses" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>

        <div v-if="linkTargetBusinessId">
          <label class="block text-sm font-medium text-text-secondary mb-1.5">Administrador</label>
          <select
            v-model="linkTargetAdminId"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
          >
            <option value="">{{ linkTargetAdminsLoading ? 'Cargando...' : 'Selecciona un administrador' }}</option>
            <option v-for="a in linkTargetAdmins" :key="a.id" :value="a.id">{{ a.full_name }} ({{ a.email }})</option>
          </select>
        </div>
      </div>
    </ModalBase>
  </SuperadminLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import SuperadminLayout from '../components/layout/SuperadminLayout.vue'
import ModalBase from '../components/common/ModalBase.vue'
import { useNotification } from '../composables/common/useNotification'
import { formatDate } from '../lib/formatters'
import { startImpersonation } from '../composables/superadmin/useImpersonation'
import {
  describeAuditAction,
  describeAuditChanges,
  linkBusinessOwner,
  listAuditLogs,
  listBusinessAdmins,
  listBusinesses,
  resetBusinessAdminPassword,
  superadminKeys,
  unlinkBusinessOwner,
} from '../services/superadminService'
import type { Business } from '../types/database'
import type { AuthProfile } from '../types/auth'

const queryClient = useQueryClient()

const route = useRoute()
const businessId = computed(() => route.params.id as string)
const { success: showSuccess, error: showError } = useNotification()

const { data: businessesData } = useQuery({
  queryKey: superadminKeys.businesses(),
  queryFn: () => listBusinesses(),
})
const business = computed<Business | undefined>(() =>
  businessesData.value?.find((b: Business) => b.id === businessId.value)
)

const { data: adminsData } = useQuery({
  queryKey: computed(() => superadminKeys.businessAdmins(businessId.value)),
  queryFn: () => listBusinessAdmins(businessId.value),
})
const admins = computed(() => adminsData.value ?? [])

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}

// ── Impersonation ──

const isImpersonatingId = ref<string | null>(null)

const handleImpersonate = async (admin: AuthProfile) => {
  if (isImpersonatingId.value) return
  const ok = window.confirm(
    `Vas a entrar como ${admin.full_name}. Podrás volver a tu sesión de superadmin en ` +
    `cualquier momento desde el aviso que aparecerá arriba. ¿Continuar?`
  )
  if (!ok) return

  isImpersonatingId.value = admin.id
  try {
    await startImpersonation(businessId.value, admin.id)
    // startImpersonation navigates away (window.location.href) on success — nothing left to do here.
  } catch (err) {
    showError((err as Error)?.message || 'No fue posible iniciar la sesión de soporte.')
    isImpersonatingId.value = null
  }
}

// ── Audit log ──

const { data: auditLogsData } = useQuery({
  queryKey: computed(() => ['superadmin', 'audit-logs', businessId.value] as const),
  queryFn: () => listAuditLogs(businessId.value),
})
const auditLogs = computed(() => auditLogsData.value ?? [])

// ── Password reset ──

const showPasswordModal = ref(false)
const targetAdmin = ref<AuthProfile | null>(null)
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isSaving = ref(false)

const isPasswordValid = computed(() =>
  newPassword.value.length >= 6 && newPassword.value === confirmPassword.value
)

const openPasswordModal = (admin: AuthProfile) => {
  targetAdmin.value = admin
  newPassword.value = ''
  confirmPassword.value = ''
  showPassword.value = false
  showPasswordModal.value = true
}

const closePasswordModal = () => {
  showPasswordModal.value = false
  targetAdmin.value = null
  newPassword.value = ''
  confirmPassword.value = ''
  showPassword.value = false
}

/** crypto.getRandomValues rather than Math.random — this value guards a live admin account. */
const generatePassword = () => {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(14)
  crypto.getRandomValues(bytes)
  const generated = Array.from(bytes, n => alphabet[n % alphabet.length]).join('')
  newPassword.value = generated
  confirmPassword.value = generated
  showPassword.value = true
}

const handleResetPassword = async () => {
  if (!targetAdmin.value || !isPasswordValid.value || isSaving.value) return

  isSaving.value = true
  try {
    await resetBusinessAdminPassword(businessId.value, targetAdmin.value.id, newPassword.value)
    showSuccess(`Contraseña actualizada para ${targetAdmin.value.full_name}.`)
    closePasswordModal()
  } catch (err) {
    showError((err as Error)?.message || 'No fue posible cambiar la contraseña.')
  } finally {
    isSaving.value = false
  }
}

// ── Vincular negocio (mismo dueño, sesiones separadas) ──

const showLinkModal = ref(false)
const linkTargetBusinessId = ref('')
const linkTargetAdminId = ref('')
const isLinking = ref(false)

const otherBusinesses = computed<Business[]>(() =>
  (businessesData.value ?? []).filter((b: Business) => b.id !== businessId.value && !b.deleted_at)
)

const { data: linkTargetAdminsData, isLoading: linkTargetAdminsLoading } = useQuery({
  queryKey: computed(() => superadminKeys.businessAdmins(linkTargetBusinessId.value)),
  queryFn: () => listBusinessAdmins(linkTargetBusinessId.value),
  enabled: computed(() => !!linkTargetBusinessId.value),
})
const linkTargetAdmins = computed(() => linkTargetAdminsData.value ?? [])

// Un solo administrador es el caso normal — preselecciónalo en vez de obligar a un clic extra.
watch(linkTargetAdmins, (list) => {
  linkTargetAdminId.value = list.length === 1 ? list[0].id : ''
})

const openLinkModal = (admin: AuthProfile) => {
  targetAdmin.value = admin
  linkTargetBusinessId.value = ''
  linkTargetAdminId.value = ''
  showLinkModal.value = true
}

const closeLinkModal = () => {
  showLinkModal.value = false
  targetAdmin.value = null
  linkTargetBusinessId.value = ''
  linkTargetAdminId.value = ''
}

const handleLink = async () => {
  if (!targetAdmin.value || !linkTargetAdminId.value || isLinking.value) return

  isLinking.value = true
  try {
    await linkBusinessOwner(targetAdmin.value.id, linkTargetAdminId.value)
    showSuccess('Negocios vinculados correctamente.')
    await queryClient.invalidateQueries({ queryKey: superadminKeys.businessAdmins(businessId.value) })
    closeLinkModal()
  } catch (err) {
    showError((err as Error)?.message || 'No fue posible vincular los negocios.')
  } finally {
    isLinking.value = false
  }
}

const handleUnlink = async (admin: AuthProfile) => {
  const ok = window.confirm(
    `${admin.full_name} dejará de poder cambiar entre sus negocios vinculados. ¿Continuar?`
  )
  if (!ok) return

  try {
    await unlinkBusinessOwner(admin.id)
    showSuccess('Negocio desvinculado.')
    await queryClient.invalidateQueries({ queryKey: superadminKeys.businessAdmins(businessId.value) })
  } catch (err) {
    showError((err as Error)?.message || 'No fue posible desvincular el negocio.')
  }
}
</script>
