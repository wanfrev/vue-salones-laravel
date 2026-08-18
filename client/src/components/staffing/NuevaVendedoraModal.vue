<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" @click.self="emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-text">Agregar vendedor</h2>
          <p class="text-sm text-text-muted">Queda con acceso propio al CRM — solo ve sus propios leads.</p>
        </div>

        <form class="space-y-3" @submit.prevent="submit">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="vend-name">Nombre</label>
            <input id="vend-name" v-model="form.name" type="text" required :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="vend-phone">Teléfono</label>
            <input id="vend-phone" v-model="form.phone" type="text" required :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="vend-email">Correo electrónico</label>
            <input id="vend-email" v-model="form.email" type="email" required :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="vend-password">Contraseña</label>
            <input id="vend-password" v-model="form.password" type="password" required minlength="6" :class="inputClass" />
          </div>

          <p v-if="error" class="text-sm text-danger">{{ error }}</p>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')">
              Cancelar
            </button>
            <button type="submit" :disabled="saving"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { adminCreateEmployee } from '../../services/adminService'
import { useNotification } from '../../composables/common/useNotification'
import { translateError } from '../../lib/errors'

defineProps<{ businessId: string | null }>()

const emit = defineEmits<{ close: []; created: [] }>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const { success, error: showError } = useNotification()

const form = reactive({ name: '', phone: '', email: '', password: '' })
const saving = ref(false)
const error = ref('')

// A vendedora is a plain employee with a real login but none of the salon-side surface — no
// agenda, inventory edit, or client management. Not `staffing_company_id`: that FK is what
// marks a profile as a staffing WORKER (no login, paid via a company rate card), the opposite
// of what's being created here.
const submit = async () => {
  error.value = ''
  saving.value = true
  try {
    await adminCreateEmployee({
      full_name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim() || undefined,
      role: 'empleado',
      disable_agenda: true,
      disable_inventory_edit: true,
      can_create_appointments: false,
      can_create_clients: false,
      can_access_consultorio: false,
    })
    success('Vendedor creado')
    emit('created')
    emit('close')
  } catch (err) {
    error.value = translateError(err)
    showError(error.value)
  } finally {
    saving.value = false
  }
}
</script>
