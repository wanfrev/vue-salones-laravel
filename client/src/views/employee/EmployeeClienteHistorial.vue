<template>
  <AppLayout>
    <header class="mb-4 lg:mb-6">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2 text-sm text-primary mb-0.5">
            <DocumentIcon class="h-4 w-4" />
            <span class="font-medium uppercase tracking-wider">{{ t.client || 'Cliente' }}s</span>
          </div>
          <h1 class="text-xl font-bold text-text lg:text-2xl">Historial de {{ cliente?.name || t.client || 'Cliente' }}</h1>
          <p class="text-sm text-text-muted">Servicios y visitas anteriores</p>
        </div>
        <div class="flex gap-2">
          <button
            @click="goBack"
            class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
          >
            <ArrowLeftIcon class="h-4 w-4" />
            Volver
          </button>
          <button
            v-if="!hidePhoneFromEmployee && cliente?.phone"
            @click="handleWhatsApp"
            class="flex items-center gap-2 rounded-xl bg-success px-3 py-2 text-sm font-medium text-text-inverse shadow-lg shadow-success/25 transition-theme hover:bg-success/90"
          >
            <CheckCircleIcon class="h-4 w-4" />
            WhatsApp
          </button>
          <button
            v-if="isPetNiche"
            @click="goToConsultorio"
            class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5"
          >
            <DocumentIcon class="h-4 w-4" />
            Ver Historias ClÃ­nicas
          </button>
        </div>
      </div>
    </header>

    <!-- Client Info Card -->
    <div v-if="cliente" class="mb-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div class="flex items-center gap-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {{ getInitials(cliente.name) }}
        </div>
        <div class="min-w-0">
          <p class="text-lg font-semibold text-text">{{ cliente.name }}</p>
          <p v-if="!hidePhoneFromEmployee" class="text-sm text-text-secondary">{{ cliente.phone }}</p>
          <p v-if="!hidePhoneFromEmployee && cliente.email" class="text-sm text-text-muted truncate">{{ cliente.email }}</p>
        </div>
      </div>
      <div v-if="cliente.notes" class="mt-3 border-t border-border pt-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">Notas / Preferencias</p>
        <p class="text-sm text-text-secondary whitespace-pre-wrap">{{ cliente.notes }}</p>
      </div>
    </div>

    <section class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="rounded-xl border border-border bg-surface p-4 shadow-sm lg:col-span-2">
        <h3 class="mb-4 text-base font-semibold text-text">Servicios realizados</h3>
        <div v-if="historial.length === 0" class="py-8 text-center text-sm text-text-muted">
          Este cliente no tiene servicios registrados.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border-subtle">
                <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Fecha</th>
                <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">{{ t.service || 'Servicio' }}</th>
                <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">{{ t.employee || 'Empleado' }}</th>
                <th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Monto</th>
                <th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr v-for="item in historial" :key="item.id" class="text-sm">
                <td class="py-3 text-text-secondary">{{ formatDate(item.date) }}</td>
                <td class="py-3 font-medium text-text">{{ item.service }}</td>
                <td class="py-3 text-text-secondary">{{ item.employee }}</td>
                <td class="py-3 text-right text-text">${{ item.amount }}</td>
                <td class="py-3 text-right">
                  <span class="inline-flex items-center gap-2 rounded-full bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text">
                    <span class="h-2 w-2 rounded-full" :style="{ background: item.statusColor }"></span>
                    {{ item.statusLabel }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h3 class="mb-4 text-base font-semibold text-text">Resumen</h3>
        <div class="space-y-3">
          <div class="rounded-lg bg-bg-secondary p-3">
            <p class="text-xs text-text-muted">Total {{ (t.appointment || 'cita').toLowerCase() }}s</p>
            <p class="text-lg font-bold text-text">{{ historial.length }}</p>
          </div>
          <div class="rounded-lg bg-bg-secondary p-3">
            <p class="text-xs text-text-muted">Gasto total</p>
            <p class="text-lg font-bold text-text">${{ totalGasto }}</p>
          </div>
          <div class="rounded-lg bg-bg-secondary p-3">
            <p class="text-xs text-text-muted">Ãšltima visita</p>
            <p class="text-lg font-bold text-text">{{ ultimaVisita || 'Sin visitas' }}</p>
          </div>
        </div>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { sanitizePhone, getInitials, formatDate } from '../../lib/formatters'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { listCitas } from '../../services/agendaService'
import { getClienteById } from '../../services/clientesService'
import { isPetNiche as checkPetNiche } from '../../config/nicheFields'
import AppLayout from '../../components/layout/AppLayout.vue'
import type { Cliente } from '../../types/cliente'
import { DocumentIcon, ArrowLeftIcon, CheckCircleIcon } from '@solar-icons/vue/linear'

const authStore = useAuthStore()
const businessStore = useBusinessStore()
const route = useRoute()
const router = useRouter()

const clienteId = computed(() => route.params.id as string)
const businessId = computed(() => authStore.businessId)
const isPetNiche = computed(() => checkPetNiche(businessStore.nicheType))
const t = computed(() => businessStore.terminology)
const hidePhoneFromEmployee = computed(() => authStore.role === 'empleado' && businessStore.hasFeature('hide_client_phone_from_employees'))

const { data: clienteData } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})

const { data: citasData } = useQuery({
  queryKey: computed(() => ['cliente-historial', businessId.value, clienteId.value]),
  queryFn: () => listCitas(businessId.value!, undefined, 'all'),
  enabled: computed(() => !!businessId.value),
})

const cliente = computed<Cliente | null>(() => clienteData.value ?? null)

const historial = computed(() => (citasData.value || [])
  .filter(c => c.clientId === clienteId.value)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .map(c => ({
    id: c.id,
    date: c.date,
    service: c.service,
    employee: c.employee,
    amount: c.price.toLocaleString(),
    statusLabel: c.statusLabel || c.status,
    statusColor: c.statusColor || 'var(--color-primary)',
  }))
)

const totalGasto = computed(() => historial.value.reduce((sum, item) => sum + Number(item.amount.toString().replace(/,/g, '')), 0).toLocaleString())
const ultimaVisita = computed(() => {
  const d = historial.value[0]?.date
  return d ? formatDate(d) : ''
})

const goBack = () => {
  router.push('/dashboard/clientes')
}

const goToConsultorio = () => {
  if (cliente.value) {
    router.push(`/dashboard/consultorio?q=${encodeURIComponent(cliente.value.name)}`)
  } else {
    router.push('/dashboard/consultorio')
  }
}

const handleWhatsApp = () => {
  const phone = sanitizePhone(cliente.value?.phone ?? '')
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}
</script>
