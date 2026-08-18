<template>
  <SuperadminLayout>
    <div class="space-y-4">
      <div>
        <h1 class="text-lg font-bold text-text">Superadmins</h1>
        <p class="text-xs text-text-muted">Quién más tiene acceso al panel de control. Revocar corta su acceso al instante.</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <!-- Create form -->
        <div class="rounded-2xl border border-border bg-surface p-6">
          <h2 class="text-base font-bold text-text mb-1">Agregar superadmin</h2>
          <p class="text-xs text-text-muted mb-5">Tendrá acceso completo a todos los negocios.</p>

          <form class="space-y-4" @submit.prevent="handleCreate">
            <div>
              <label class="block text-xs font-semibold text-text mb-1">Nombre completo</label>
              <input v-model="form.fullName" type="text" placeholder="Ej: María Pérez" :class="inputClass" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-text mb-1">Email</label>
              <input v-model="form.email" type="email" placeholder="maria@luma.app" :class="inputClass" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-text mb-1">Contraseña</label>
              <div class="flex gap-2">
                <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Mínimo 6 caracteres"
                  autocomplete="new-password" :class="inputClass" />
                <button type="button" @click="generatePassword"
                  class="shrink-0 rounded-xl border border-border px-3 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
                  Generar
                </button>
              </div>
              <p v-if="showPassword && form.password" class="mt-1 text-[11px] text-text-muted">
                Copiala ahora — no se puede volver a ver.
              </p>
            </div>

            <p v-if="formError" class="text-xs text-danger flex items-center gap-1">
              <InfoCircleIcon class="h-3.5 w-3.5 shrink-0" />
              {{ formError }}
            </p>

            <button type="submit" :disabled="isCreating"
              class="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isCreating ? 'Creando...' : 'Crear superadmin' }}
            </button>
          </form>
        </div>

        <!-- List -->
        <div class="rounded-2xl border border-border bg-surface p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-text">Cuentas existentes</h2>
            <span class="text-xs text-text-muted">{{ superadmins.length }}</span>
          </div>

          <div v-if="isLoading" class="py-8 text-center text-sm text-text-muted">Cargando...</div>

          <div v-else class="divide-y divide-border-subtle">
            <div v-for="admin in superadmins" :key="admin.id" class="flex items-center gap-3 py-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {{ getInitials(admin.full_name) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-text truncate">
                  {{ admin.full_name }}
                  <span v-if="admin.id === myProfileId" class="text-xs font-normal text-text-muted">(tú)</span>
                </p>
                <p class="text-xs text-text-muted truncate">{{ admin.email }}</p>
              </div>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                :class="admin.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'">
                {{ admin.active ? 'Activo' : 'Revocado' }}
              </span>
              <button v-if="admin.active" type="button" :disabled="admin.id === myProfileId || actingId === admin.id"
                title="Revocar acceso"
                class="shrink-0 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
                @click="handleRevoke(admin)">
                Revocar
              </button>
              <button v-else type="button" :disabled="actingId === admin.id"
                class="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                @click="handleRestore(admin)">
                Restaurar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </SuperadminLayout>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import SuperadminLayout from '../components/layout/SuperadminLayout.vue'
import { useAuth } from '../composables/common/useAuth'
import { useNotification } from '../composables/common/useNotification'
import { getInitials } from '../lib/formatters'
import {
  createSuperadmin, listSuperadmins, restoreSuperadmin, revokeSuperadmin, superadminKeys,
  type SuperadminAccount,
} from '../services/superadminService'
import { InfoCircleIcon } from '@solar-icons/vue/linear'

const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

const { authStore } = useAuth()
const myProfileId = computed(() => authStore.profile?.id ?? null)
const { success: showSuccess, error: showError } = useNotification()
const queryClient = useQueryClient()

const { data, isLoading } = useQuery({
  queryKey: superadminKeys.superadmins(),
  queryFn: listSuperadmins,
})
const superadmins = computed(() => data.value ?? [])

const invalidate = () => queryClient.invalidateQueries({ queryKey: superadminKeys.superadmins() })

// ── Create ──

const form = reactive({ fullName: '', email: '', password: '' })
const showPassword = ref(false)
const isCreating = ref(false)
const formError = ref('')

const generatePassword = () => {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(14)
  crypto.getRandomValues(bytes)
  form.password = Array.from(bytes, n => alphabet[n % alphabet.length]).join('')
  showPassword.value = true
}

const handleCreate = async () => {
  formError.value = ''
  if (!form.fullName.trim() || !form.email.trim() || form.password.length < 6) {
    formError.value = 'Completa nombre, email y una contraseña de al menos 6 caracteres.'
    return
  }

  isCreating.value = true
  try {
    await createSuperadmin(form)
    showSuccess(`Superadmin creado: ${form.fullName}`)
    form.fullName = ''
    form.email = ''
    form.password = ''
    showPassword.value = false
    await invalidate()
  } catch (err) {
    formError.value = (err as Error)?.message || 'No fue posible crear el superadmin.'
  } finally {
    isCreating.value = false
  }
}

// ── Revoke / restore ──

const actingId = ref<string | null>(null)

const handleRevoke = async (admin: SuperadminAccount) => {
  const ok = window.confirm(`¿Revocar el acceso de ${admin.full_name}? Se cerrará su sesión de inmediato.`)
  if (!ok) return

  actingId.value = admin.id
  try {
    await revokeSuperadmin(admin.id)
    showSuccess(`Acceso revocado para ${admin.full_name}.`)
    await invalidate()
  } catch (err) {
    showError((err as Error)?.message || 'No fue posible revocar el acceso.')
  } finally {
    actingId.value = null
  }
}

const handleRestore = async (admin: SuperadminAccount) => {
  actingId.value = admin.id
  try {
    await restoreSuperadmin(admin.id)
    showSuccess(`Acceso restaurado para ${admin.full_name}.`)
    await invalidate()
  } catch (err) {
    showError((err as Error)?.message || 'No fue posible restaurar el acceso.')
  } finally {
    actingId.value = null
  }
}
</script>
