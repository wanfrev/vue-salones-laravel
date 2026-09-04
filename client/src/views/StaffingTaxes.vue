<template>
  <FeatureGate :gate="{ capability: 'staffing.reports' }">
    <header class="mb-5 lg:mb-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <DocumentIcon class="h-3.5 w-3.5" />
          <span>Taxes</span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button"
            class="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover"
            @click="openAddInfo">
            + Agregar información
          </button>
          <button type="button"
            class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
            @click="showEntities = !showEntities">
            {{ showEntities ? 'Ocultar entidades' : 'Gestionar entidades' }}
          </button>
          <div class="flex items-center gap-1">
            <button type="button" title="Año anterior"
              class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
              @click="year -= 1">
              <ArrowLeftIcon class="h-4 w-4" />
            </button>
            <span class="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-text">{{ year }}</span>
            <button type="button" title="Año siguiente"
              class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
              @click="year += 1">
              <ArrowRightIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <div v-if="showEntities" class="mb-5 rounded-xl border border-border bg-surface p-4">
      <p class="mb-1 text-sm font-semibold text-text">Entidades de tax</p>
      <p class="mb-3 text-xs text-text-muted">
        Las columnas $ de la tabla — agrega o quita según lo que el negocio necesite reportar.
      </p>

      <div v-if="entitiesCtx.entities.value.length" class="mb-3 flex flex-wrap gap-2">
        <span v-for="entity in entitiesCtx.entities.value" :key="entity.id"
          class="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-3 py-1 text-xs font-medium text-text">
          {{ entity.name }}
          <button type="button" title="Eliminar" class="text-text-muted hover:text-danger" @click="removeEntity(entity.id)">
            <CloseCircleIcon class="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <p v-else class="mb-3 text-xs text-text-muted">Sin entidades todavía.</p>

      <form class="flex flex-wrap items-end gap-2" @submit.prevent="submitNewEntity">
        <div class="min-w-[200px] flex-1">
          <label class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" for="new-entity-name">Nombre</label>
          <input id="new-entity-name" v-model="newEntityName" type="text" required placeholder="Ej: COSMOS"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
        </div>
        <button type="submit" :disabled="entitiesCtx.isSaving.value"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
          Agregar
        </button>
      </form>
    </div>

    <div v-if="report.isLoading.value" class="py-16 text-center text-sm text-text-muted">Cargando...</div>

    <p v-else-if="report.employees.value.length === 0" class="py-16 text-center text-sm text-text-muted">
      Aún no hay información de impuestos para {{ year }}. Usa "+ Agregar información" para empezar.
    </p>

    <div v-else class="overflow-hidden rounded-xl border border-border bg-surface">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-bg-secondary text-left text-[10px] uppercase tracking-wider text-text-muted">
              <th class="sticky left-0 z-10 bg-bg-secondary px-3 py-2.5">Nombre</th>
              <th class="px-3 py-2.5">Estado</th>
              <th class="px-3 py-2.5">Compañía</th>
              <th class="px-3 py-2.5">Teléfono</th>
              <th class="px-3 py-2.5">Dirección</th>
              <th class="px-3 py-2.5">SSN</th>
              <th class="px-3 py-2.5">Archivo</th>
              <th class="px-3 py-2.5">Fecha</th>
              <th v-for="entity in report.entities.value" :key="entity.id" class="px-3 py-2.5 text-right">
                {{ entity.name }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="employee in report.employees.value" :key="employee.employeeId" class="hover:bg-bg-secondary/30 transition-theme group">
              <td class="sticky left-0 z-10 whitespace-nowrap bg-surface group-hover:bg-bg-secondary/30 transition-theme px-3 py-2.5 font-medium text-text">
                {{ employee.name }}
              </td>
              <td class="px-3 py-2.5">
                <select :value="employee.status"
                  @change="updateStatus(employee, $event)"
                  class="rounded-md px-2 py-1 text-[10px] font-semibold outline-none cursor-pointer appearance-none text-center min-w-[120px]"
                  :class="statusColors[employee.status]">
                  <option value="BLANK">EN BLANCO</option>
                  <option value="SENT_TO_EMPLOYEE">ENVIADO A EMPLEADO</option>
                  <option value="SENT_TO_ACCOUNTANT">ENVIADO A CONTADOR</option>
                  <option value="PENDING_TO_SEND">POR ENVIAR</option>
                </select>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary cursor-pointer hover:bg-bg-secondary transition-theme" title="Editar" @click="openEditProfile(employee)">
                <span v-if="employee.companyName" class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {{ employee.companyName }}
                </span>
                <span v-else>—</span>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary cursor-pointer hover:bg-bg-secondary transition-theme" title="Editar" @click="openEditProfile(employee)">
                {{ employee.phone || '—' }}
              </td>
              <td class="px-3 py-2.5 text-text-secondary cursor-pointer hover:bg-bg-secondary transition-theme max-w-[200px] truncate" title="Editar" @click="openEditProfile(employee)">
                {{ employee.address || '—' }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary cursor-pointer hover:bg-bg-secondary transition-theme" title="Editar" @click="openEditProfile(employee)">
                {{ employee.ssnLast4 ? `•••-••-${employee.ssnLast4}` : '—' }}
              </td>
              
              <td class="whitespace-nowrap px-3 py-2.5 text-center">
                <button type="button" @click="openGlobalFileModal(employee)" class="text-text-muted hover:text-primary transition-theme inline-flex items-center gap-1 p-1 rounded hover:bg-bg-secondary">
                  <PaperclipIcon v-if="employee.globalFilePath" class="h-4 w-4 text-primary" />
                  <span v-else class="text-[10px] font-medium uppercase">Subir</span>
                </button>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary text-xs">
                {{ employee.globalFileDate || '—' }}
              </td>

              <td v-for="entity in report.entities.value" :key="entity.id" class="px-3 py-2.5 text-right">
                <button type="button"
                  class="inline-flex items-center gap-1 rounded-lg px-2 py-1 tabular-nums text-text-secondary transition-theme hover:bg-bg-secondary hover:text-primary"
                  @click="openCellModal(employee, entity)">
                  {{ formatUSD(employee.entriesByEntity[entity.id]?.amount ?? 0) }}
                  <PaperclipIcon v-if="employee.entriesByEntity[entity.id]?.hasFile" class="h-3.5 w-3.5 text-primary" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit Profile Modal -->
    <Teleport to="body">
      <div v-if="editProfileModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="editProfileModal = null">
        <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-text">Editar Datos del Empleado</h2>
            <p class="text-sm text-text-muted">{{ editProfileModal.employee.name }}</p>
          </div>

          <form class="space-y-4" @submit.prevent="submitEditProfile">
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Compañía</label>
              <select v-model="editProfileForm.staffing_company_id"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option :value="null">Ninguna</option>
                <option v-for="c in companiesCtx.companies.value" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">SSN</label>
              <input v-model="editProfileForm.ssn" type="text"
                placeholder="Dejar vacío para mantener el actual"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Teléfono</label>
              <input v-model="editProfileForm.phone" type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Dirección</label>
              <input v-model="editProfileForm.address" type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>

            <div class="mt-6 flex items-center justify-end gap-3">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="editProfileModal = null">
                Cancelar
              </button>
              <button type="submit"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover">
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Global File Modal -->
    <Teleport to="body">
      <div v-if="globalFileModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="globalFileModal = null">
        <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-text">Archivo de Impuestos</h2>
            <p class="text-sm text-text-muted">{{ globalFileModal.employee.name }} · {{ year }}</p>
          </div>

          <form class="space-y-4" @submit.prevent="submitGlobalFile">
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Fecha</label>
              <input v-model="globalFileForm.fileDate" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Archivo</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" class="w-full text-sm text-text-secondary"
                @change="onGlobalFileChange" />
              <p v-if="globalFileModal.employee.globalFilePath" class="mt-1 flex items-center gap-2 text-xs text-text-muted">
                <PaperclipIcon class="h-3.5 w-3.5" />
                {{ globalFileModal.employee.globalFileName }}
                <button type="button" class="font-semibold text-primary hover:underline" @click="viewGlobalExisting">
                  Ver
                </button>
                <button type="button" class="font-semibold text-danger hover:underline" @click="removeGlobalExisting">
                  Eliminar
                </button>
              </p>
            </div>

            <div class="mt-6 flex items-center justify-end gap-3">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="globalFileModal = null">
                Cancelar
              </button>
              <button type="submit"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover">
                Guardar Archivo
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Cell Modal -->
    <Teleport to="body">
      <div v-if="cellModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="cellModal = null">
        <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-text">{{ cellModal.entity.name }}</h2>
            <p class="text-sm text-text-muted">{{ cellModal.employee.name }} · {{ year }}</p>
          </div>

          <form class="space-y-4" @submit.prevent="submitCell">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="cell-amount">Monto</label>
              <input id="cell-amount" v-model.number="cellForm.amount" type="number" min="0" step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="cell-date">Fecha</label>
              <input id="cell-date" v-model="cellForm.entryDate" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="cell-file">Archivo</label>
              <input id="cell-file" type="file" accept=".pdf,.jpg,.jpeg,.png" class="w-full text-sm text-text-secondary"
                @change="onFileChange" />
              <p v-if="existingFileName" class="mt-1 flex items-center gap-2 text-xs text-text-muted">
                <PaperclipIcon class="h-3.5 w-3.5" />
                {{ existingFileName }}
                <button type="button" class="font-semibold text-primary hover:underline" @click="viewExisting">
                  Ver
                </button>
                <button type="button" class="font-semibold text-danger hover:underline" @click="removeExisting">
                  Eliminar
                </button>
              </p>
            </div>

            <p v-if="report.saveError.value" class="text-sm text-danger">{{ report.saveError.value }}</p>

            <div class="flex items-center justify-end gap-3">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="cellModal = null">
                Cancelar
              </button>
              <button type="submit" :disabled="report.saveMutation.isPending.value"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                {{ report.saveMutation.isPending.value ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Add Info Modal — the only way a new employee row enters the (otherwise empty) grid -->
    <Teleport to="body">
      <div v-if="addInfoModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="closeAddInfo">
        <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-text">Agregar información</h2>
            <p class="text-sm text-text-muted">Empleado · {{ year }}</p>
          </div>

          <form class="space-y-4" @submit.prevent="submitAddInfo">
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Empleado</label>
              <FormSearchSelect
                v-model="addInfoForm.employeeId"
                :options="availableEmployeeOptions"
                placeholder="Selecciona un empleado"
                search-placeholder="Buscar empleado..."
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Compañía</label>
              <select v-model="addInfoForm.staffing_company_id"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option :value="null">Ninguna</option>
                <option v-for="c in companiesCtx.companies.value" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-text">Teléfono</label>
                <input v-model="addInfoForm.phone" type="text"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text">SSN</label>
                <input v-model="addInfoForm.ssn" type="text"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Dirección</label>
              <input v-model="addInfoForm.address" type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Estado</label>
              <select v-model="addInfoForm.status"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="BLANK">EN BLANCO</option>
                <option value="SENT_TO_EMPLOYEE">ENVIADO A EMPLEADO</option>
                <option value="SENT_TO_ACCOUNTANT">ENVIADO A CONTADOR</option>
                <option value="PENDING_TO_SEND">POR ENVIAR</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Fecha del archivo</label>
              <input v-model="addInfoForm.fileDate" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Archivo</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" class="w-full text-sm text-text-secondary"
                @change="onAddInfoFileChange" />
            </div>

            <div v-if="report.entities.value.length" class="space-y-3 rounded-xl border border-border p-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Montos por entidad (opcional)</p>
              <div v-for="entity in report.entities.value" :key="entity.id" class="grid grid-cols-2 gap-2">
                <div>
                  <label class="mb-1 block text-xs text-text-muted">{{ entity.name }} — Monto</label>
                  <input v-model.number="addInfoEntities[entity.id].amount" type="number" min="0" step="0.01"
                    class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label class="mb-1 block text-xs text-text-muted">{{ entity.name }} — Archivo</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" class="w-full text-xs text-text-secondary"
                    @change="onAddInfoEntityFileChange(entity.id, $event)" />
                </div>
              </div>
            </div>

            <p v-if="addInfoError" class="text-sm text-danger">{{ addInfoError }}</p>

            <div class="mt-2 flex items-center justify-end gap-3">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="closeAddInfo">
                Cancelar
              </button>
              <button type="submit" :disabled="isSavingAddInfo || !addInfoForm.employeeId"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                {{ isSavingAddInfo ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuth } from '../composables/common/useAuth'
import { FeatureGate } from '../components/common'
import { FormSearchSelect } from '../components/forms'
import { useAnnualTaxReport } from '../composables/staffing/useAnnualTaxReport'
import { useStaffingTaxEntities } from '../composables/staffing/useStaffingTaxEntities'
import { useEmpresas } from '../composables/staffing/useEmpresas'
import { useCurrency } from '../composables/common/useCurrency'
import { useNotification } from '../composables/common/useNotification'
import { translateError } from '../lib/errors'
import { equipoKeys, listEquipo } from '../services/equipoService'
import type { StaffingAnnualTaxEmployeeRow, StaffingTaxEntityRow, StaffingAnnualTaxStatus } from '../services/staffing/staffingService'
import { DocumentIcon, ArrowLeftIcon, ArrowRightIcon, CloseCircleIcon, PaperclipIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
const { formatUSD } = useCurrency()
const { error: showError } = useNotification()

const year = ref(new Date().getFullYear())
const showEntities = ref(false)

const report = useAnnualTaxReport(businessId, year)
const entitiesCtx = useStaffingTaxEntities(businessId)
const companiesCtx = useEmpresas(businessId)

const { data: allEmployees } = useQuery({
  queryKey: computed(() => equipoKeys.all(businessId.value)),
  queryFn: () => listEquipo(businessId.value!),
  enabled: computed(() => !!businessId.value),
})

const statusColors: Record<StaffingAnnualTaxStatus, string> = {
  BLANK: 'bg-bg-secondary text-text-muted',
  SENT_TO_EMPLOYEE: 'bg-success text-white',
  SENT_TO_ACCOUNTANT: 'bg-warning text-white',
  PENDING_TO_SEND: 'bg-danger text-white'
}

const updateStatus = async (employee: StaffingAnnualTaxEmployeeRow, event: Event) => {
  const newStatus = (event.target as HTMLSelectElement).value as StaffingAnnualTaxStatus
  await report.saveGlobalEntry({
    employeeId: employee.employeeId,
    year: year.value,
    status: newStatus
  })
}

// Edit Profile Modal
const editProfileModal = ref<{ employee: StaffingAnnualTaxEmployeeRow } | null>(null)
const editProfileForm = ref({
  staffing_company_id: null as string | null,
  ssn: '',
  phone: '',
  address: ''
})

const openEditProfile = (employee: StaffingAnnualTaxEmployeeRow) => {
  editProfileForm.value = {
    staffing_company_id: employee.companyId || null,
    ssn: '',
    phone: employee.phone || '',
    address: employee.address || ''
  }
  editProfileModal.value = { employee }
}

const submitEditProfile = async () => {
  if (!editProfileModal.value) return
  await report.updateEmployee(editProfileModal.value.employee.employeeId, editProfileForm.value)
  editProfileModal.value = null
}

// Global File Modal
const globalFileModal = ref<{ employee: StaffingAnnualTaxEmployeeRow } | null>(null)
const globalFileForm = ref({ fileDate: '' })
const globalFile = ref<File | null>(null)

const openGlobalFileModal = (employee: StaffingAnnualTaxEmployeeRow) => {
  globalFileForm.value = { fileDate: employee.globalFileDate || '' }
  globalFile.value = null
  globalFileModal.value = { employee }
}

const onGlobalFileChange = (event: Event) => {
  globalFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

const submitGlobalFile = async () => {
  if (!globalFileModal.value) return
  await report.saveGlobalEntry({
    employeeId: globalFileModal.value.employee.employeeId,
    year: year.value,
    fileDate: globalFileForm.value.fileDate || undefined,
    file: globalFile.value
  })
  globalFileModal.value = null
}

const viewGlobalExisting = () => {
  if (globalFileModal.value?.employee.employeeId) {
    report.viewGlobalFile(globalFileModal.value.employee.employeeId)
  }
}

const removeGlobalExisting = () => {
  if (!globalFileModal.value) return
  if (window.confirm('¿Eliminar este archivo?')) {
    report.removeGlobalFile(globalFileModal.value.employee.employeeId)
    globalFileModal.value = null
  }
}

// Entities Logic
const newEntityName = ref('')
const submitNewEntity = async () => {
  const name = newEntityName.value.trim()
  if (!name) return
  await entitiesCtx.handleSave({ name, active: true })
  newEntityName.value = ''
}
const removeEntity = (id: string) => {
  if (window.confirm('¿Eliminar esta entidad? Se perderán sus montos y archivos registrados.')) {
    entitiesCtx.handleDelete(id)
  }
}

// Cell Modal (Amounts per entity)
const cellModal = ref<{ employee: StaffingAnnualTaxEmployeeRow; entity: StaffingTaxEntityRow } | null>(null)
const cellForm = ref<{ amount: number; entryDate: string }>({ amount: 0, entryDate: '' })
const cellFile = ref<File | null>(null)

const existingEntry = computed(() =>
  cellModal.value ? cellModal.value.employee.entriesByEntity[cellModal.value.entity.id] : null,
)
const existingFileName = computed(() => existingEntry.value?.fileName ?? null)

const openCellModal = (employee: StaffingAnnualTaxEmployeeRow, entity: StaffingTaxEntityRow) => {
  const entry = employee.entriesByEntity[entity.id]
  cellForm.value = { amount: entry?.amount ?? 0, entryDate: entry?.entryDate ?? '' }
  cellFile.value = null
  cellModal.value = { employee, entity }
}

const onFileChange = (event: Event) => {
  cellFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

const viewExisting = () => {
  const entry = existingEntry.value
  if (entry) report.viewFile(entry.entryId)
}

const removeExisting = () => {
  const entry = existingEntry.value
  if (!entry) return
  if (window.confirm('¿Eliminar este archivo?')) {
    report.removeFile(entry.entryId)
    cellModal.value = null
  }
}

const submitCell = async () => {
  if (!cellModal.value) return
  const ok = await report.saveEntry({
    employeeId: cellModal.value.employee.employeeId,
    taxEntityId: cellModal.value.entity.id,
    year: year.value,
    amount: cellForm.value.amount || 0,
    entryDate: cellForm.value.entryDate || undefined,
    file: cellFile.value,
  })
  if (ok) cellModal.value = null
}

// Add Info Modal — creates the employee's row for this year (see StaffingReportService::
// annualTaxReport, which now only lists employees who already have a record) and, in the same
// form, fills in the same fields the click-to-edit cells already expose.
const addInfoModal = ref(false)
const addInfoError = ref('')
const isSavingAddInfo = ref(false)

const addedEmployeeIds = computed(() => new Set(report.employees.value.map(e => e.employeeId)))
const availableEmployeeOptions = computed(() =>
  (allEmployees.value ?? [])
    .filter(e => !addedEmployeeIds.value.has(e.id))
    .map(e => ({ value: e.id, label: e.name })),
)

const addInfoForm = ref({
  employeeId: '',
  staffing_company_id: null as string | null,
  phone: '',
  address: '',
  ssn: '',
  status: 'BLANK' as StaffingAnnualTaxStatus,
  fileDate: '',
})
const addInfoFile = ref<File | null>(null)
const addInfoEntities = reactive<Record<string, { amount: number; file: File | null }>>({})

// Rebuilt whenever the entity columns change so a newly-added column is fillable too, even if
// the modal was already open (Gestionar entidades can be toggled without closing this one).
watch(() => report.entities.value, (entities) => {
  for (const entity of entities) {
    if (!(entity.id in addInfoEntities)) addInfoEntities[entity.id] = { amount: 0, file: null }
  }
}, { immediate: true })

const openAddInfo = () => {
  addInfoForm.value = {
    employeeId: '', staffing_company_id: null, phone: '', address: '', ssn: '',
    status: 'BLANK', fileDate: '',
  }
  addInfoFile.value = null
  for (const entity of report.entities.value) {
    addInfoEntities[entity.id] = { amount: 0, file: null }
  }
  addInfoError.value = ''
  addInfoModal.value = true
}

const closeAddInfo = () => { addInfoModal.value = false }

const onAddInfoFileChange = (event: Event) => {
  addInfoFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

const onAddInfoEntityFileChange = (entityId: string, event: Event) => {
  addInfoEntities[entityId].file = (event.target as HTMLInputElement).files?.[0] ?? null
}

const submitAddInfo = async () => {
  const employeeId = addInfoForm.value.employeeId
  if (!employeeId) return

  addInfoError.value = ''
  isSavingAddInfo.value = true
  try {
    await report.updateEmployee(employeeId, {
      staffing_company_id: addInfoForm.value.staffing_company_id,
      phone: addInfoForm.value.phone,
      address: addInfoForm.value.address,
      ssn: addInfoForm.value.ssn,
    })

    await report.saveGlobalEntry({
      employeeId,
      year: year.value,
      status: addInfoForm.value.status,
      fileDate: addInfoForm.value.fileDate || undefined,
      file: addInfoFile.value,
    })

    for (const entity of report.entities.value) {
      const cell = addInfoEntities[entity.id]
      if (!cell || (!cell.amount && !cell.file)) continue
      await report.saveEntry({
        employeeId,
        taxEntityId: entity.id,
        year: year.value,
        amount: cell.amount || 0,
        file: cell.file,
      })
    }

    addInfoModal.value = false
  } catch (err) {
    addInfoError.value = translateError(err)
    showError(addInfoError.value)
  } finally {
    isSavingAddInfo.value = false
  }
}
</script>
