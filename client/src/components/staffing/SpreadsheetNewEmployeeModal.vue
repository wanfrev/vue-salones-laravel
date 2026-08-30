<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" @click.self="emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-text">Agregar empleado</h2>
          <p class="text-sm text-text-muted">Queda asignado a {{ companyName }} — sin acceso de inicio de sesión.</p>
        </div>

        <form class="space-y-3" @submit.prevent="submit">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="new-emp-name">Nombre completo</label>
            <input id="new-emp-name" v-model="form.name" type="text" required :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="new-emp-phone">Teléfono</label>
            <input id="new-emp-phone" v-model="form.phone" type="text" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="new-emp-role">Rol / Puesto</label>
            <select id="new-emp-role" v-model="form.role" required :class="inputClass">
              <option value="" disabled>Selecciona un rol</option>
              <option v-for="r in roleOptions" :key="r" :value="r">{{ r }}</option>
            </select>
            <p v-if="roleOptions.length === 0" class="mt-1 text-xs text-warning">
              Esta empresa no tiene roles/tarifas configurados todavía — agrégalos en Empresas primero.
            </p>
          </div>
          <div v-if="shiftOptions.length > 0">
            <label class="mb-1 block text-sm font-medium text-text" for="new-emp-shift">Turno</label>
            <select id="new-emp-shift" v-model="form.shift" required :class="inputClass">
              <option value="" disabled>Selecciona un turno</option>
              <option v-for="s in shiftOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="new-emp-payment">Método de pago</label>
            <select id="new-emp-payment" v-model="form.paymentMethod" :class="inputClass">
              <option value="">Sin definir</option>
              <option value="direct_deposit">Depósito directo</option>
              <option value="payroll_card">Tarjeta de pago</option>
            </select>
          </div>
          <div v-if="form.paymentMethod === 'direct_deposit'">
            <label class="mb-1 block text-sm font-medium text-text" for="new-emp-holder">Titular de la cuenta</label>
            <input id="new-emp-holder" v-model="form.bankAccountHolder" type="text" placeholder="Nombre en la cuenta" :class="inputClass" />
          </div>

          <p v-if="error" class="text-sm text-danger">{{ error }}</p>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')">
              Cancelar
            </button>
            <button type="submit" :disabled="saving || roleOptions.length === 0"
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
import { computed, reactive, ref } from 'vue'
import { adminCreateEmployee } from '../../services/adminService'
import { useNotification } from '../../composables/common/useNotification'
import { translateError } from '../../lib/errors'
import { SHIFT_OPTIONS, type StaffingRateRow } from '../../services/staffing/staffingService'

const props = defineProps<{
  businessId: string | null
  companyId: string
  companyName: string
  rates: StaffingRateRow[]
}>()

const emit = defineEmits<{ close: []; created: [] }>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const { success, error: showError } = useNotification()

const form = reactive({ name: '', phone: '', role: '', shift: '', paymentMethod: '', bankAccountHolder: '' })
const saving = ref(false)
const error = ref('')

// One entry per distinct role on this company's rate card — a role with several shift-specific
// rows (see shiftOptions below) still only needs to appear once here.
const roleOptions = computed(() => [...new Set(props.rates.map(r => r.role))])

const shiftOptions = computed(() => {
  if (!form.role) return []
  const shifts = props.rates.filter(r => r.role === form.role && r.shift)
  return shifts.map(r => ({ value: r.shift as string, label: SHIFT_OPTIONS.find(o => o.value === r.shift)?.label ?? (r.shift as string) }))
})

const submit = async () => {
  error.value = ''
  saving.value = true
  try {
    await adminCreateEmployee({
      full_name: form.name.trim(),
      email: '',
      phone: form.phone.trim() || undefined,
      role: 'empleado',
      disable_agenda: true,
      disable_inventory_edit: true,
      can_create_appointments: false,
      can_create_clients: false,
      can_access_consultorio: false,
      staffing_assignments: [{ company_id: props.companyId, role: form.role, shift: form.shift || null }],
      payment_method: form.paymentMethod || null,
      bank_account_holder: form.bankAccountHolder.trim() || null,
    })
    success('Empleado creado')
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
