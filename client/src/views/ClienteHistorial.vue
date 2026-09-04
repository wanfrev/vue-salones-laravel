<template>
  <header class="mb-4 lg:mb-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-sm text-primary mb-0.5">
          <ListIcon class="h-4 w-4" />
          <span class="font-medium uppercase tracking-wider">{{ businessStore.terminology.clientPlural || 'Clientes' }}</span>
        </div>
        <p class="text-sm font-semibold text-text sm:text-base">{{ cliente?.name || businessStore.terminology.client || 'Cliente' }}</p>
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
          v-if="cliente?.phone"
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
          <ClipboardIcon class="h-4 w-4" />
          Ver {{ businessStore.terminology.historyPlural || 'Historias clínicas' }}
        </button>
        <button
          v-if="isDentalNiche"
          @click="goToHistoriaClinica"
          class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5"
        >
          <ClipboardIcon class="h-4 w-4" />
          Historia clínica
        </button>
        <button
          v-if="isDentalNiche"
          @click="goToOdontograma"
          class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5"
        >
          <ClipboardIcon class="h-4 w-4" />
          Ver odontograma
        </button>
        <button
          v-if="isDentalNiche"
          @click="goToAnexoEndodoncia"
          class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5"
        >
          <ClipboardIcon class="h-4 w-4" />
          Anexo de endodoncia
        </button>
        <button
          v-if="isDentalNiche"
          @click="goToAnexoPeriodoncia"
          class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5"
        >
          <ClipboardIcon class="h-4 w-4" />
          Anexo de periodoncia
        </button>
      </div>
    </div>
  </header>

  <section class="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div class="rounded-xl border border-border bg-surface p-4 shadow-sm lg:col-span-2">
       <h3 class="mb-4 text-base font-semibold text-text">{{ businessStore.terminology.servicePlural || 'Servicios' }} realizados</h3>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-subtle">
              <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Fecha</th>
               <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">{{ businessStore.terminology.service || 'Servicio' }}</th>
               <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">{{ businessStore.terminology.employee || 'Empleado' }}</th>
              <th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Monto</th>
              <th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="item in historial" :key="item.id" class="text-sm">
              <td class="py-3 text-text-secondary">{{ item.date }}</td>
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
           <p class="text-xs text-text-muted">Total {{ (businessStore.terminology.appointmentPlural || 'Citas').toLowerCase() }}</p>
          <p class="text-lg font-bold text-text">{{ historial.length }}</p>
        </div>
        <div class="rounded-lg bg-bg-secondary p-3">
          <p class="text-xs text-text-muted">Gasto total</p>
          <p class="text-lg font-bold text-text">${{ totalGasto }}</p>
        </div>
        <div class="rounded-lg bg-bg-secondary p-3">
           <p class="text-xs text-text-muted">Última {{ (businessStore.terminology.appointment || 'cita').toLowerCase() }}</p>
           <p class="text-lg font-bold text-text">{{ ultimaVisita || `Sin ${(businessStore.terminology.appointmentPlural || 'citas').toLowerCase()}` }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { sanitizePhone } from '../lib/formatters'
import { useAuth } from '../composables/common/useAuth'
import { useBusinessStore } from '../store/business'
import { listCitas } from '../services/agendaService'
import { getClienteById } from '../services/clientesService'
import { isPetNiche as checkPetNiche } from '../config/nicheFields'
import { isDentalNiche as checkDentalNiche } from '../config/niches'
import { ListIcon, ArrowLeftIcon, CheckCircleIcon, ClipboardIcon } from '@solar-icons/vue/linear'
import type { Cliente } from '../types/cliente'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const route = useRoute()
const router = useRouter()

const clienteId = computed(() => route.params.id as string)
const businessId = computed(() => authStore.businessId)
const isPetNiche = computed(() => checkPetNiche(businessStore.nicheType))
const isDentalNiche = computed(() => checkDentalNiche(businessStore.nicheType))

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
const ultimaVisita = computed(() => historial.value[0]?.date || '')

const goBack = () => {
  router.push('/admin/clientes')
}

const goToConsultorio = () => {
  if (cliente.value) {
    router.push(`/admin/consultorio?q=${encodeURIComponent(cliente.value.name)}`)
  } else {
    router.push('/admin/consultorio')
  }
}

const goToOdontograma = () => {
  router.push(`/admin/clientes/${clienteId.value}/odontograma`)
}

const goToHistoriaClinica = () => {
  router.push(`/admin/clientes/${clienteId.value}/historia-clinica`)
}

const goToAnexoEndodoncia = () => {
  router.push(`/admin/clientes/${clienteId.value}/anexo-endodoncia`)
}

const goToAnexoPeriodoncia = () => {
  router.push(`/admin/clientes/${clienteId.value}/anexo-periodoncia`)
}

const handleWhatsApp = () => {
  const phone = sanitizePhone(cliente.value?.phone ?? '')
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}
</script>
