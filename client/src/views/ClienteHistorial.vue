<template>
  <header class="relative mb-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
    <div class="absolute inset-x-0 top-0 h-1 bg-primary"></div>
    <div class="p-5 sm:p-7">
      <div class="mb-6 flex items-center justify-between gap-3">
        <button @click="goBack" class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
          <ArrowLeftIcon class="h-4 w-4" />
          Volver al directorio
        </button>
        <span class="hidden text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted sm:block">Expediente clínico</span>
      </div>
      <div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div class="flex min-w-0 items-start gap-4">
          <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary ring-1 ring-primary/15 sm:h-20 sm:w-20 sm:text-2xl">
            {{ getInitials(cliente?.name || '') }}
          </div>
          <div class="min-w-0">
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Expediente del paciente</span>
              <span v-if="cliente?.code" class="rounded-md bg-bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">ID {{ cliente.code }}</span>
            </div>
            <h1 class="truncate text-2xl font-bold tracking-tight text-text sm:text-3xl">{{ cliente?.name || businessStore.terminology.client || 'Paciente' }}</h1>
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
              <span v-if="cliente?.phone">{{ cliente.phone }}</span>
              <span v-if="cliente?.email">{{ cliente.email }}</span>
              <span v-if="cliente?.documentId">Documento {{ cliente.documentId }}</span>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 xl:justify-end">
          <button v-if="isDentalNiche" @click="goToHistoriaClinica" class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover">
            <ClipboardIcon class="h-4 w-4" />
            Historia clínica
          </button>
          <button v-if="isDentalNiche" @click="goToOdontograma" class="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-theme hover:bg-primary/10">
            <ClipboardIcon class="h-4 w-4" />
            Odontograma
          </button>
          <button v-if="isPetNiche" @click="goToConsultorio" class="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-theme hover:bg-primary/10">
            <ClipboardIcon class="h-4 w-4" />
            {{ businessStore.terminology.historyPlural || 'Historias clínicas' }}
          </button>
          <button v-if="cliente?.phone" @click="handleWhatsApp" class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-text-secondary transition-theme hover:border-success/40 hover:bg-success/5 hover:text-success" title="Contactar por WhatsApp">
            <ChatRoundLineIcon class="h-4 w-4" />
            Contactar
          </button>
        </div>
      </div>
    </div>
  </header>

  <section v-if="isDentalNiche" class="mb-6">
    <div class="mb-3 flex items-end justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Atención odontológica</p>
        <h2 class="mt-1 text-lg font-bold text-text">Herramientas clínicas</h2>
      </div>
      <span class="hidden text-xs text-text-muted sm:block">Accesos rápidos del expediente</span>
    </div>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <button @click="goToHistoriaClinica" class="group rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left transition-theme hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:shadow-sm">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-text-inverse"><ClipboardIcon class="h-4 w-4" /></span>
        <span class="mt-3 block text-sm font-semibold text-text">Historia clínica</span>
        <span class="mt-1 block text-[11px] leading-4 text-text-muted">Antecedentes y evolución</span>
      </button>
      <button @click="goToOdontograma" class="group rounded-2xl border border-border bg-surface p-4 text-left transition-theme hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-secondary text-primary"><ClipboardIcon class="h-4 w-4" /></span>
        <span class="mt-3 block text-sm font-semibold text-text">Odontograma</span>
        <span class="mt-1 block text-[11px] leading-4 text-text-muted">Estado de cada pieza</span>
      </button>
      <button @click="goToPeriodontograma" class="group rounded-2xl border border-border bg-surface p-4 text-left transition-theme hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-secondary text-primary"><ClipboardIcon class="h-4 w-4" /></span>
        <span class="mt-3 block text-sm font-semibold text-text">Periodontograma</span>
        <span class="mt-1 block text-[11px] leading-4 text-text-muted">Registro periodontal</span>
      </button>
      <button @click="goToAnexoEndodoncia" class="group rounded-2xl border border-border bg-surface p-4 text-left transition-theme hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-secondary text-primary"><ClipboardIcon class="h-4 w-4" /></span>
        <span class="mt-3 block text-sm font-semibold text-text">Endodoncia</span>
        <span class="mt-1 block text-[11px] leading-4 text-text-muted">Anexo del tratamiento</span>
      </button>
      <button @click="goToAnexoPeriodoncia" class="group rounded-2xl border border-border bg-surface p-4 text-left transition-theme hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-secondary text-primary"><ClipboardIcon class="h-4 w-4" /></span>
        <span class="mt-3 block text-sm font-semibold text-text">Periodoncia</span>
        <span class="mt-1 block text-[11px] leading-4 text-text-muted">Anexo periodontal</span>
      </button>
      <button @click="goToConsentimiento" class="group rounded-2xl border border-border bg-surface p-4 text-left transition-theme hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-secondary text-primary"><ClipboardIcon class="h-4 w-4" /></span>
        <span class="mt-3 block text-sm font-semibold text-text">Consentimientos</span>
        <span class="mt-1 block text-[11px] leading-4 text-text-muted">Documentos firmados</span>
      </button>
    </div>
  </section>

  <section class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
    <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Resumen del paciente</p>
      <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div><p class="text-xs text-text-muted">{{ businessStore.terminology.appointmentPlural || 'Consultas' }}</p><p class="mt-1 text-xl font-bold text-text">{{ historial.length }}</p></div>
        <div><p class="text-xs text-text-muted">Última atención</p><p class="mt-1 truncate text-sm font-semibold text-text">{{ ultimaVisita || 'Sin registros' }}</p></div>
        <div><p class="text-xs text-text-muted">Seguro / HCM</p><p class="mt-1 truncate text-sm font-semibold text-text">{{ cliente?.medicalInsurance || 'No registrado' }}</p></div>
        <div><p class="text-xs text-text-muted">Contacto de emergencia</p><p class="mt-1 truncate text-sm font-semibold text-text">{{ cliente?.emergencyPhone || 'No registrado' }}</p></div>
      </div>
    </div>
    <div class="rounded-2xl border border-border bg-bg-secondary/35 p-5">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Notas de seguimiento</p>
      <p class="mt-3 line-clamp-3 text-sm leading-6 text-text-secondary">{{ cliente?.notes || 'No hay notas generales registradas para este paciente.' }}</p>
    </div>
  </section>

  <section class="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div class="rounded-xl border border-border bg-surface p-4 shadow-sm lg:col-span-2">
       <div class="mb-4 flex items-center justify-between gap-3">
         <div>
           <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Actividad del expediente</p>
           <h3 class="mt-1 text-base font-semibold text-text">{{ businessStore.terminology.servicePlural || 'Tratamientos' }} y consultas</h3>
         </div>
         <span class="rounded-lg bg-bg-secondary px-2.5 py-1.5 text-xs font-semibold text-text-muted">{{ historial.length }} registros</span>
       </div>
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
           <p class="text-xs text-text-muted">Total facturado</p>
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
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { sanitizePhone, getInitials } from '../lib/formatters'
import { useAuth } from '../composables/common/useAuth'
import { useBusinessStore } from '../store/business'
import { listCitas } from '../services/agendaService'
import { getClienteById } from '../services/clientesService'
import { isPetNiche as checkPetNiche } from '../config/nicheFields'
import { isDentalNiche as checkDentalNiche } from '../config/niches'
import { ArrowLeftIcon, ChatRoundLineIcon, ClipboardIcon } from '@solar-icons/vue/linear'
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

const goToPeriodontograma = () => {
  router.push(`/admin/clientes/${clienteId.value}/periodontograma`)
}

const goToConsentimiento = () => {
  router.push(`/admin/clientes/${clienteId.value}/consentimiento`)
}

const handleWhatsApp = () => {
  const phone = sanitizePhone(cliente.value?.phone ?? '')
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}
</script>
