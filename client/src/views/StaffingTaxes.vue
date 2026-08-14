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
      Sin empleados registrados.
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
              <th v-for="entity in report.entities.value" :key="entity.id" class="px-3 py-2.5 text-right">
                {{ entity.name }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="employee in report.employees.value" :key="employee.employeeId">
              <td class="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2.5 font-medium text-text">
                {{ employee.name }}
              </td>
              <td class="px-3 py-2.5">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  :class="employee.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'">
                  {{ employee.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ employee.companyName || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ employee.phone || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ employee.address || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">
                {{ employee.ssnLast4 ? `•••-••-${employee.ssnLast4}` : '—' }}
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
                <button type="button" class="font-semibold text-primary hover:underline" @click="downloadExisting">
                  Descargar
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
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { FeatureGate } from '../components/common'
import { useAnnualTaxReport } from '../composables/staffing/useAnnualTaxReport'
import { useStaffingTaxEntities } from '../composables/staffing/useStaffingTaxEntities'
import { useCurrency } from '../composables/common/useCurrency'
import type { StaffingAnnualTaxEmployeeRow, StaffingTaxEntityRow } from '../services/staffing/staffingService'
import { DocumentIcon, ArrowLeftIcon, ArrowRightIcon, CloseCircleIcon, PaperclipIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
const { formatUSD } = useCurrency()

const year = ref(new Date().getFullYear())
const showEntities = ref(false)

const report = useAnnualTaxReport(businessId, year)
const entitiesCtx = useStaffingTaxEntities(businessId)

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

const downloadExisting = () => {
  const entry = existingEntry.value
  if (entry) report.downloadFile(entry.entryId, entry.fileName ?? 'documento')
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
</script>
