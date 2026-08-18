<template>
  <SuperadminLayout>
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-lg font-bold text-text">Features por nicho</h1>
          <p class="text-xs text-text-muted">Qué tiene activado cada negocio, agrupado por nicho — para detectar configuraciones que se desviaron.</p>
        </div>
        <label class="flex items-center gap-2 text-xs font-medium text-text-secondary">
          <input v-model="onlyInconsistent" type="checkbox" class="h-4 w-4 rounded border-border accent-primary" />
          Solo mostrar inconsistencias
        </label>
      </div>

      <div v-if="isLoading" class="py-12 text-center text-sm text-text-muted">Cargando...</div>

      <div v-else-if="visibleGroups.length === 0" class="rounded-2xl border border-border bg-surface py-12 text-center text-sm text-text-muted">
        {{ onlyInconsistent ? 'Ningún nicho tiene features inconsistentes entre sus negocios.' : 'Sin negocios registrados.' }}
      </div>

      <div v-for="group in visibleGroups" :key="group.niche" class="rounded-2xl border border-border bg-surface p-5">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-bold text-text">{{ nicheLabel(group.niche) }}</h2>
          <span class="text-xs text-text-muted">{{ group.businesses.length }} negocio{{ group.businesses.length === 1 ? '' : 's' }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
                <th class="sticky left-0 z-10 bg-surface pb-2 pr-3">Negocio</th>
                <th v-for="feature in group.columns" :key="feature" class="px-2 pb-2 text-center">
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="whitespace-nowrap">{{ featureLabel(feature) }}</span>
                    <span class="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      :class="isInconsistent(group, feature) ? 'bg-warning/10 text-warning' : 'bg-bg-secondary text-text-muted'">
                      {{ onCount(group, feature) }}/{{ group.businesses.length }}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="business in group.businesses" :key="business.id">
                <td class="sticky left-0 z-10 whitespace-nowrap bg-surface py-2 pr-3 font-medium text-text">
                  <router-link :to="`/superadmin/business/${business.id}`" class="hover:text-primary transition-colors">
                    {{ business.name }}
                  </router-link>
                  <span v-if="!business.active" class="ml-1.5 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold text-danger">Inactivo</span>
                </td>
                <td v-for="feature in group.columns" :key="feature" class="px-2 py-2 text-center">
                  <CheckCircleIcon v-if="business.features[feature]" class="mx-auto h-4 w-4 text-success" />
                  <CloseCircleIcon v-else class="mx-auto h-4 w-4 text-text-muted/40" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </SuperadminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import SuperadminLayout from '../components/layout/SuperadminLayout.vue'
import { getNiche } from '../config/niches'
import { getFeaturesMatrix, type FeatureMatrixNiche } from '../services/superadminService'
import { CheckCircleIcon, CloseCircleIcon } from '@solar-icons/vue/linear'

const { data, isLoading } = useQuery({
  queryKey: ['superadmin', 'features-matrix'] as const,
  queryFn: getFeaturesMatrix,
})

const onlyInconsistent = ref(true)

function onCount(group: FeatureMatrixNiche, feature: string): number {
  return group.businesses.filter(b => b.features[feature]).length
}

function isInconsistent(group: FeatureMatrixNiche, feature: string): boolean {
  const count = onCount(group, feature)
  return count > 0 && count < group.businesses.length
}

/** Each group with its columns narrowed to inconsistent-only when the toggle is on. */
const visibleGroups = computed(() => {
  const groups = data.value ?? []
  return groups
    .filter(g => g.businesses.length > 0)
    .map(g => ({
      ...g,
      columns: onlyInconsistent.value ? g.features.filter(f => isInconsistent(g, f)) : g.features,
    }))
    .filter(g => g.columns.length > 0)
})

function nicheLabel(niche: string): string {
  if (niche === 'sin_nicho') return 'Sin nicho asignado'
  return getNiche(niche).label ?? niche
}

const FEATURE_LABELS: Record<string, string> = {
  pos: 'POS',
  inventario: 'Inventario',
  productos: 'Productos',
  proveedores: 'Proveedores',
  agenda: 'Agenda',
  calendario: 'Calendario',
  servicios: 'Servicios',
  multi_branch: 'Multi-sucursal',
  employees_create_clients: 'Empleados crean clientes',
  employees_see_clients: 'Empleados ven clientes',
  gift_cards: 'Gift cards',
  disable_manager_inventory_edit: 'Encargado sin editar inventario',
  encargados_change_exchange_rate: 'Encargado cambia tasa',
  encargados_change_employee_rate: 'Encargado cambia tarifa empleado',
  disable_employee_commission_edit: 'Sin editar comisión empleado',
  manual_reports: 'Reportes manuales',
  daily_report_autofill_from_pos: 'Autocompletar reporte diario',
  pos_direct_service_sale: 'Venta directa en POS',
  enable_public_booking: 'Reservas públicas',
  hide_client_phone_from_employees: 'Ocultar teléfono a empleados',
  whatsapp_available: 'WhatsApp disponible',
  whatsapp_reminders_enabled: 'Recordatorios WhatsApp',
  reminder_24h_enabled: 'Recordatorios internos',
}

function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key
}
</script>
