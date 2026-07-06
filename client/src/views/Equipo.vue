<template>
  <header class="mb-5 lg:mb-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>{{ businessStore.terminology.employee || 'Empleado' }}s</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">Gestión de {{ (businessStore.terminology.employee || 'Empleado').toLowerCase() }}s</h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="showEmployeeRateModal = true"
          class="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text shadow-sm transition-theme hover:bg-bg-secondary"
          :title="businessStore.employeeExchangeRate ? `Tasa empleados: 1 USD = ${businessStore.employeeExchangeRate} Bs` : 'Configurar tasa de pago a empleados'"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="hidden sm:inline">Tasa empleados</span>
          <span v-if="businessStore.employeeExchangeRate" class="ml-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning tabular-nums">{{ businessStore.employeeExchangeRate }}</span>
        </button>
        <button
          @click="handleNewEmpleado"
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Nuevo {{ businessStore.terminology.employee || 'Empleado' }}</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Stats -->
  <div class="mb-5 grid grid-cols-2 gap-2 sm:gap-3 lg:mb-8 lg:grid-cols-4">
    <StatCard
      icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      icon-color="primary"
      :value="totalEmpleados"
      label="Total"
    />
    <StatCard
      icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      icon-color="info"
      :value="empleadosPorcentaje"
      label="Con %"
    />
    <StatCard
      icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      icon-color="warning"
      :value="empleadosSueldoBase"
      label="Sueldo base"
    />
    <StatCard
      icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      icon-color="success"
      :value="empleadosMixto"
      label="Sueldo + %"
    />
  </div>

  <EmployeeGrid
    :employees="visibleTeam"
    :show-all="showAll"
    :has-more="hasMoreThanDefault"
    :total-count="team.length"
    :get-initials="getInitials"
    @edit="handleEditEmpleado"
    @view-agenda="handleViewAgenda"
    @toggle-show-all="showAll = !showAll"
  />

  <!-- Pagos, Nómina, Deuda y Horarios — Tabs -->
  <div class="mb-5 lg:mb-6 rounded-xl border border-border bg-surface shadow-sm">
    <!-- Header -->
    <div class="flex flex-col gap-3 border-b border-border-subtle px-3 sm:px-5 py-3 sm:py-4">
      <div>
        <h3 class="text-sm sm:text-base font-semibold text-text flex items-center gap-2">
          <svg class="h-4 w-4 sm:h-4.5 sm:w-4.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Gestión de Pagos y Horarios
        </h3>
        <p class="text-xs text-text-muted mt-0.5">Comisiones, nómina, deuda y horarios del equipo</p>
      </div>

      <!-- Month Selector -->
      <div class="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 shadow-sm self-start sm:self-auto"
        v-show="activeTab !== 'horarios'">
        <label for="equipo-month-picker" class="text-xs font-medium text-text-muted hidden sm:inline">Mes</label>
        <input
          id="equipo-month-picker"
          v-model="selectedMonth"
          type="month"
          class="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text outline-none transition-theme focus:border-primary w-full sm:w-auto"
          @change="selectedPeriod = 'month'"
        />
        <button
          type="button"
          class="rounded-md border border-border px-2 py-1 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text whitespace-nowrap"
          @click="resetToCurrentMonth"
        >
          Ahora
        </button>
      </div>

      <!-- Segmented Control -->
      <div class="bg-bg-secondary p-1 rounded-xl border border-border-subtle flex items-center gap-0.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shrink-0',
            activeTab === tab.key
              ? 'bg-surface text-text shadow-sm shadow-black/5 border border-border font-semibold'
              : 'text-text-secondary hover:text-text hover:bg-surface/40'
          ]"
        >
          <svg v-if="tab.key === 'pagos'" class="h-3.5 w-3.5" :class="activeTab === 'pagos' ? 'text-success' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="tab.key === 'nomina'" class="h-3.5 w-3.5" :class="activeTab === 'nomina' ? 'text-danger' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <svg v-else-if="tab.key === 'deuda'" class="h-3.5 w-3.5" :class="activeTab === 'deuda' ? 'text-warning' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <svg v-else class="h-3.5 w-3.5" :class="activeTab === 'horarios' ? 'text-primary' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span class="hidden sm:inline">{{ tab.label }}</span>
          <span class="sm:hidden">{{ tab.shortLabel }}</span>
        </button>
      </div>
    </div>

    <!-- KPI Banners -->
    <KpiBanner v-if="activeTab === 'pagos'" variant="success"
      icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      label="Total Comisiones" :value="formatUSD(totalComisiones)"
      :sublabel="`${summaryCtx.employeePayments.value.length} servicio(s)`">
      <template #actions>
        <button @click="openPaymentModal" class="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shrink-0"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg><span class="hidden sm:inline">Registrar pago</span><span class="sm:hidden">+ Pago</span></button>
        <button @click="openConsumptionModal" class="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger transition-theme hover:bg-danger/20 shrink-0 border border-danger/20"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg><span class="hidden sm:inline">Debitar consumo</span><span class="sm:hidden">Debitar</span></button>
      </template>
    </KpiBanner>
    <KpiBanner v-if="activeTab === 'nomina'" variant="danger"
      icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      label="Total Pagado + Consumido" :value="formatUSD(totalNominaPagada + totalConsumido)"
      :sublabel="`${paymentsCtx.paymentsMade.value.length} registro(s)`">
      <template #actions>
        <button @click="openPaymentModal" class="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shrink-0"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg><span class="hidden sm:inline">Registrar pago</span><span class="sm:hidden">+ Pago</span></button>
        <button @click="openConsumptionModal" class="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger transition-theme hover:bg-danger/20 shrink-0 border border-danger/20"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg><span class="hidden sm:inline">Debitar consumo</span><span class="sm:hidden">Debitar</span></button>
      </template>
    </KpiBanner>
    <KpiBanner v-if="activeTab === 'deuda'" variant="warning"
      icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      label="Deuda Pendiente Total" :value="formatUSD(totalDeudaPendiente)"
      :sublabel="`${deudaConSaldo.length} empleado(s) con saldo`" />
    <KpiBanner v-if="activeTab === 'horarios'" variant="primary"
      icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
      label="Horarios del Equipo" :value="teamSchedule.length"
      :sublabel="`empleado(s) con horario registrado`" />

    <!-- Tab Content -->
    <div class="p-3 sm:p-5">
      <!-- Tab: Pagos a Empleados -->
      <div v-if="activeTab === 'pagos'">
        <RecordSection
          title=""
          :items="paginatedServicios" :total-count="summaryCtx.employeePayments.value.length"
          empty-message="No hay comisiones registradas en este período"
          :pages="serviciosP" :page-size="pageSize"
          @prev="tabPage--" @next="tabPage++"
        >
          <template #desktop-thead>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{ businessStore.terminology.employee || 'Empleado' }}</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{ businessStore.terminology.service || 'Servicio' }}</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">Costo</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">% {{ businessStore.terminology.employee || 'Empleado' }}</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Comisión</th>
          </template>
          <template #desktop-tbody="{ items }">
            <tr v-for="payment in items" :key="payment.id" class="text-xs transition-theme hover:bg-bg-secondary/40">
              <td class="px-3 py-3 font-medium text-text">{{ payment.employee }}</td>
              <td class="px-3 py-3 text-text-secondary">{{ payment.service }}</td>
              <td class="px-3 py-3 text-right hidden sm:table-cell"><div class="text-text">{{ formatUSD(payment.amount) }}</div><div class="text-[10px] text-text-muted">{{ formatVESInline(payment.amount) }} Bs</div></td>
              <td class="px-3 py-3 text-right text-text-secondary">{{ payment.percentage }}%</td>
              <td class="px-3 py-3 text-right"><div class="font-semibold text-success">{{ formatUSD(payment.earnings) }}</div><div class="text-[10px] text-text-muted">{{ formatVESInline(payment.earnings) }} Bs</div></td>
            </tr>
          </template>
          <template #mobile-cards="{ items }">
            <div v-for="payment in items" :key="payment.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="font-medium text-text">{{ payment.employee }}</span>
                <span class="text-xs font-semibold text-text-secondary">{{ payment.percentage }}% Empleado</span>
              </div>
              <div class="text-xs text-text-secondary">{{ payment.service }}</div>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span class="text-text-muted">Costo</span>
                <span class="text-right">
                  <span class="text-text">{{ formatUSD(payment.amount) }}</span>
                  <span class="text-text-muted ml-1">{{ formatVESInline(payment.amount) }} Bs</span>
                </span>
                <span class="text-text-muted">Comisión</span>
                <span class="text-right">
                  <span class="font-semibold text-success">{{ formatUSD(payment.earnings) }}</span>
                  <span class="text-text-muted ml-1">{{ formatVESInline(payment.earnings) }} Bs</span>
                </span>
              </div>
            </div>
          </template>
        </RecordSection>
      </div>

      <!-- Tab: Pago de Nómina -->
      <div v-if="activeTab === 'nomina'">
        <RecordSection
          title=""
          :items="paginatedNomina" :total-count="paymentsCtx.paymentsMade.value.length"
          empty-message="No hay pagos de nómina registrados"
          :pages="nominaP" :page-size="pageSize"
          @prev="tabPage--" @next="tabPage++"
        >
          <template #desktop-thead>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Fecha</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{ businessStore.terminology.employee || 'Empleado' }}</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">Método</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Monto</th>
            <th class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Acción</th>
          </template>
          <template #desktop-tbody="{ items }">
            <tr v-for="ep in items" :key="ep.id" class="text-xs transition-theme hover:bg-bg-secondary/40">
              <td class="px-3 py-3 whitespace-nowrap text-text-secondary">{{ ep.paymentDate }}</td>
              <td class="px-3 py-3 font-medium text-text">{{ ep.employeeName }}</td>
              <td class="px-3 py-3 text-text-secondary hidden sm:table-cell">
                <span v-if="ep.type === 'consumption'" class="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">{{ ep.concept || 'Consumo' }}</span>
                <span v-else>{{ formatMethod(ep.paymentMethod) }}</span>
              </td>
              <td class="px-3 py-3 text-right">
                <div :class="['font-medium', ep.type === 'consumption' ? 'text-danger' : 'text-danger']">{{ ep.currency === 'VES' ? formatVESEs(ep.originalAmount) : formatUSD(ep.amount) }}</div>
                <div class="text-[10px] text-text-muted">{{ ep.currency === 'VES' ? formatUSD(ep.amount) : formatVESInline(ep.amount, ep.exchangeRateUsed) + ' Bs' }}</div>
              </td>
              <td class="px-3 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button @click="openEditPaymentModal(ep)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-primary/10 hover:text-primary" title="Editar pago"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                  <button @click="handleDeletePayment(ep.id)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar pago"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </td>
            </tr>
          </template>
          <template #mobile-cards="{ items }">
            <div v-for="ep in items" :key="ep.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="font-medium text-text">{{ ep.employeeName }}</span>
                <span class="text-xs text-text-muted">{{ ep.paymentDate }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-text-muted">{{ ep.type === 'consumption' ? (ep.concept || 'Consumo') : formatMethod(ep.paymentMethod) }}</span>
                <span class="text-right">
                  <span class="font-semibold text-danger">{{ ep.currency === 'VES' ? formatVESEs(ep.originalAmount) : formatUSD(ep.amount) }}</span>
                  <span class="text-text-muted ml-1">{{ ep.currency === 'VES' ? formatUSD(ep.amount) : formatVESInline(ep.amount, ep.exchangeRateUsed) + ' Bs' }}</span>
                </span>
              </div>
              <div class="flex items-center justify-end gap-1 pt-1 border-t border-border-subtle">
                <button @click="openEditPaymentModal(ep)" class="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">Editar</button>
                <button @click="handleDeletePayment(ep.id)" class="rounded-md bg-danger/10 px-2 py-1 text-xs text-danger">Eliminar</button>
              </div>
            </div>
          </template>
        </RecordSection>
      </div>

      <!-- Tab: Deuda por Empleado -->
      <div v-if="activeTab === 'deuda'">
        <RecordSection title="" :items="paginatedDeuda" :total-count="deudaConSaldo.length" empty-message="No hay deuda pendiente" :pages="deudaP" :page-size="pageSize" @prev="tabPage--" @next="tabPage++">
          <template #desktop-thead>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{ businessStore.terminology.employee || 'Empleado' }}</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">Tipo</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">Comisión</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">Sueldo base</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Total</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">Pagado</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Pendiente</th>
          </template>
          <template #desktop-tbody="{ items }">
            <tr v-for="row in items" :key="row.employeeId" class="text-xs transition-theme hover:bg-bg-secondary/40">
              <td class="px-3 py-3 font-medium text-text">{{ row.employeeName }}</td>
              <td class="px-3 py-3 text-text-secondary text-xs hidden sm:table-cell"><span v-if="row.payType === 'salary'">Sueldo base</span><span v-else-if="row.payType === 'mixed'">Sueldo + {{ row.payPercentage }}%</span><span v-else-if="row.payType === 'percentage'">{{ row.payPercentage }}%</span><span v-else>—</span></td>
              <td class="px-3 py-3 text-right text-text hidden sm:table-cell">{{ formatUSD(row.commissionTotal) }}</td>
              <td class="px-3 py-3 text-right text-text hidden sm:table-cell">{{ formatUSD(row.baseSalary) }}</td>
              <td class="px-3 py-3 text-right font-semibold text-text">{{ formatUSD(row.totalEarned) }}</td>
              <td class="px-3 py-3 text-right hidden sm:table-cell"><div class="font-medium text-danger">{{ formatUSD(row.totalPaid) }}</div><div class="text-[10px] text-text-muted">{{ formatEmployeeVESInline(row.totalPaid) }} Bs</div></td>
              <td class="px-3 py-3 text-right"><span class="font-bold" :class="row.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">{{ formatUSD(row.pendingBalance) }}</span></td>
            </tr>
          </template>
          <template #mobile-cards="{ items }">
            <div v-for="row in items" :key="row.employeeId" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
              <div class="flex items-center justify-between"><span class="font-medium text-text">{{ row.employeeName }}</span><span class="text-xs text-text-muted" v-if="row.payType === 'salary'">Sueldo base</span><span class="text-xs text-text-muted" v-else-if="row.payType === 'mixed'">Sueldo + {{ row.payPercentage }}%</span><span class="text-xs text-text-muted" v-else-if="row.payType === 'percentage'">{{ row.payPercentage }}% Empleado</span></div>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span class="text-text-muted">Total Ganado</span><span class="text-right"><span class="text-text">{{ formatUSD(row.totalEarned) }}</span><span class="text-text-muted ml-1">{{ formatEmployeeVESInline(row.totalEarned) }} Bs</span></span>
                <span class="text-text-muted">Pagado</span><span class="text-right"><span class="text-danger">{{ formatUSD(row.totalPaid) }}</span><span class="text-text-muted ml-1">{{ formatEmployeeVESInline(row.totalPaid) }} Bs</span></span>
                <span class="text-text-muted">Pendiente</span><span class="text-right font-bold" :class="row.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">{{ formatUSD(row.pendingBalance) }}</span>
              </div>
            </div>
          </template>
        </RecordSection>
      </div>

      <!-- Tab: Horarios del Equipo -->
      <div v-if="activeTab === 'horarios'">
        <RecordSection title="" :items="paginatedHorarios" :total-count="teamSchedule.length" empty-message="No hay horarios registrados" :pages="horariosP" :page-size="pageSize" @prev="tabPage--" @next="tabPage++">
          <template #desktop-thead>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{ businessStore.terminology.employee || 'Empleado' }}</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Entrada</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Salida</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">Descanso</th>
            <th class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Estado</th>
          </template>
          <template #desktop-tbody="{ items }">
            <tr v-for="schedule in items" :key="schedule.id" class="text-xs transition-theme hover:bg-bg-secondary/40">
              <td class="px-3 py-3 font-medium text-text">{{ schedule.name }}</td>
              <td class="px-3 py-3 tabular-nums text-text-secondary">{{ formatTime24to12(schedule.start) }}</td>
              <td class="px-3 py-3 tabular-nums text-text-secondary">{{ formatTime24to12(schedule.end) }}</td>
              <td class="px-3 py-3 text-text-secondary hidden sm:table-cell">{{ schedule.break }}</td>
              <td class="px-3 py-3 text-center"><span :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', schedule.available ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger']"><span :class="['h-1.5 w-1.5 rounded-full', schedule.available ? 'bg-success' : 'bg-danger']"></span>{{ schedule.available ? 'Disponible' : 'No disponible' }}</span></td>
            </tr>
          </template>
          <template #mobile-cards="{ items }">
            <div v-for="schedule in items" :key="schedule.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
              <div class="flex items-center justify-between"><span class="font-medium text-text">{{ schedule.name }}</span><span :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', schedule.available ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger']"><span :class="['h-1.5 w-1.5 rounded-full', schedule.available ? 'bg-success' : 'bg-danger']"></span>{{ schedule.available ? 'Disponible' : 'No disponible' }}</span></div>
              <div class="flex items-center justify-between text-xs"><span class="text-text-muted">{{ formatTime24to12(schedule.start) }} - {{ formatTime24to12(schedule.end) }}</span><span class="text-text-secondary">{{ schedule.break }}</span></div>
            </div>
          </template>
        </RecordSection>
      </div>
    </div>
  </div>

  <!-- Payment Modal -->
  <Teleport to="body">
    <div v-if="paymentsCtx.showPaymentModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="closePaymentModal"
    >
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">{{ paymentsCtx.editingPaymentId.value ? 'Editar pago' : 'Registrar pago' }}</h2>
          <p class="text-sm text-text-muted">{{ paymentsCtx.editingPaymentId.value ? 'Modifica los datos del pago' : 'Registra un adelanto, sueldo o comisión pagada' }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSubmitPayment">
          <div v-if="!paymentsCtx.editingPaymentId.value">
            <label class="mb-1 block text-sm font-medium text-text">{{ businessStore.terminology.employee || 'Empleado' }}</label>
            <select v-model="paymentsCtx.paymentForm.value.employeeId" required @change="onEmployeeChange"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
              <option value="" disabled>Seleccionar {{ (businessStore.terminology.employee || 'empleado').toLowerCase() }}</option>
              <option v-for="emp in paymentsCtx.employeeList.value" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
            </select>
          </div>

          <div v-if="selectedBalance" class="rounded-lg bg-bg-secondary p-3 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Tipo de pago</span>
              <span class="font-medium text-text">{{ formatPayType(selectedBalance.payType, selectedBalance.baseSalary, selectedBalance.payPercentage) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Generado en servicios</span>
              <span class="font-medium text-success">{{ formatUSD(selectedBalance.totalEarned) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Pagado hasta ahora</span>
              <span class="font-medium text-danger">{{ formatUSD(selectedBalance.totalPaid) }}</span>
            </div>
            <div class="flex items-center justify-between border-t border-border pt-2">
              <span class="text-sm font-semibold text-text">Saldo pendiente</span>
              <span class="text-base font-bold" :class="selectedBalance.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">
                {{ formatUSD(selectedBalance.pendingBalance) }}
              </span>
            </div>
            <button
              v-if="selectedBalance.pendingBalance > 0"
              type="button"
              @click="paymentsCtx.paymentForm.value.amount = selectedBalance.pendingBalance"
              class="w-full mt-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-theme hover:bg-primary/10"
            >
              Pagar saldo pendiente
            </button>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Monto</label>
              <input v-model.number="paymentsCtx.paymentForm.value.amount" type="number" min="0.01" step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="0.00" required />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Moneda</label>
              <select v-model="paymentsCtx.paymentForm.value.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Método</label>
              <select v-model="paymentsCtx.paymentForm.value.method"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="zelle">Zelle</option>
                <option value="pago_movil">Pago Móvil</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Fecha</label>
            <input v-model="paymentsCtx.paymentForm.value.date" type="date"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" required />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Notas</label>
            <input v-model="paymentsCtx.paymentForm.value.notes" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Ej: Comisión servicios, adelanto..." />
          </div>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="closePaymentModal">Cancelar</button>
            <button type="submit" :disabled="paymentsCtx.createMutation.isPending.value || paymentsCtx.updateMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ paymentsCtx.createMutation.isPending.value || paymentsCtx.updateMutation.isPending.value ? 'Guardando...' : (paymentsCtx.editingPaymentId.value ? 'Actualizar pago' : 'Guardar pago') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Consumption Modal -->
  <Teleport to="body">
    <div v-if="paymentsCtx.showConsumptionModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="closeConsumptionModal"
    >
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Debitar consumo</h2>
          <p class="text-sm text-text-muted">Registra un servicio o producto consumido por el empleado. Se descontará de su saldo.</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSubmitConsumption">
          <div>
            <label class="mb-1 block text-sm font-medium text-text">{{ businessStore.terminology.employee || 'Empleado' }}</label>
            <select v-model="paymentsCtx.consumptionForm.value.employeeId" required @change="onEmployeeConsumptionChange"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
              <option value="" disabled>Seleccionar {{ (businessStore.terminology.employee || 'empleado').toLowerCase() }}</option>
              <option v-for="emp in paymentsCtx.employeeList.value" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
            </select>
          </div>

          <div v-if="consumptionBalance" class="rounded-lg bg-bg-secondary p-3 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Tipo de pago</span>
              <span class="font-medium text-text">{{ formatPayType(consumptionBalance.payType, consumptionBalance.baseSalary, consumptionBalance.payPercentage) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Generado en servicios</span>
              <span class="font-medium text-success">{{ formatUSD(consumptionBalance.totalEarned) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Pagado + Consumido</span>
              <span class="font-medium text-danger">{{ formatUSD(consumptionBalance.totalPaid) }}</span>
            </div>
            <div class="flex items-center justify-between border-t border-border pt-2">
              <span class="text-sm font-semibold text-text">Saldo pendiente</span>
              <span class="text-base font-bold" :class="consumptionBalance.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">
                {{ formatUSD(consumptionBalance.pendingBalance) }}
              </span>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-text">Servicio / Producto consumido</label>
            <input v-model="paymentsCtx.consumptionForm.value.concept" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Ej: Corte de cabello, Shampoo..." required />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Monto</label>
              <input v-model.number="paymentsCtx.consumptionForm.value.amount" type="number" min="0.01" step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="0.00" required />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Moneda</label>
              <select v-model="paymentsCtx.consumptionForm.value.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Fecha</label>
            <input v-model="paymentsCtx.consumptionForm.value.date" type="date"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" required />
          </div>
          <p v-if="paymentsCtx.consumptionError.value" class="text-sm text-danger">{{ paymentsCtx.consumptionError.value }}</p>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="closeConsumptionModal">Cancelar</button>
            <button type="submit" :disabled="paymentsCtx.consumeMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-danger-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ paymentsCtx.consumeMutation.isPending.value ? 'Guardando...' : 'Debitar consumo' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Modals -->
  <EmpleadoFormModal
    ref="empleadoModalRef"
    :is-saving="isSaving"
    @save="handleSaveEmpleado"
    @delete="handleDeleteEmpleado"
  />

  <!-- Employee Exchange Rate Modal -->
  <Teleport to="body">
    <div v-if="showEmployeeRateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="showEmployeeRateModal = false">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Tasa para empleados</h2>
          <p class="text-sm text-text-muted">Esta tasa se usará SOLO para pagos de nómina, consumos/deuda y recibos de empleados. Si no la configuras, se usa la tasa global del negocio.</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSaveEmployeeRate">
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Tasa (Bs por 1 USD)</label>
            <input
              v-model.number="employeeRateInput"
              type="number"
              min="0"
              step="0.01"
              placeholder="Dejar vacío para usar la tasa global"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <p class="mt-1 text-xs text-text-muted">Actual: {{ exchangeRate }} Bs (tasa global). {{ businessStore.employeeExchangeRate ? `Tasa empleados actual: ${businessStore.employeeExchangeRate} Bs.` : 'No hay tasa de empleados configurada.' }}</p>
          </div>
          <div v-if="employeeRateError" class="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{{ employeeRateError }}</div>
          <div class="flex items-center justify-end gap-2">
            <button
              v-if="businessStore.employeeExchangeRate"
              type="button"
              @click="handleClearEmployeeRate"
              class="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
            >Restablecer (usar global)</button>
            <button
              type="button"
              @click="showEmployeeRateModal = false"
              class="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
            >Cancelar</button>
            <button
              type="submit"
              :disabled="isSavingEmployeeRate"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:opacity-60"
            >{{ isSavingEmployeeRate ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCrud } from '../composables/useCrud'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useNotification } from '../composables/useNotification'
import { useCurrency } from '../composables/useCurrency'
import { mutate } from '../lib/typedSupabase'
import { usePeriodSelection } from '../composables/usePeriodSelection'
import { deleteEmpleado, equipoKeys, listEquipo, saveEmpleado } from '../services/equipoService'
import { useBusinessStore } from '../store/business'
import { getInitials, formatMethod, formatPayType, formatTime24to12 } from '../lib/formatters'
import { resolvePeriodDates } from '../lib/periodUtils'
import { EmpleadoFormModal } from '../components/modals'
import { useFinancialSummary } from '../composables/useFinancialSummary'
import { useEmployeePayments } from '../composables/useEmployeePayments'
import { useQueryClient } from '@tanstack/vue-query'
import { employeePaymentKeys, getEmployeeBalance, type EmployeeBalance, type EmployeePaymentRecord } from '../services/employeePaymentsService'
import { StatCard } from '../components/common'
import EmployeeGrid from '../components/common/EmployeeGrid.vue'
import KpiBanner from '../components/finanzas/KpiBanner.vue'
import RecordSection from '../components/finanzas/RecordSection.vue'
import type { Empleado, EmpleadoFormData } from '../types/empleado'

const router = useRouter()
const { authStore } = useAuth()
const businessStore = useBusinessStore()
const { info } = useNotification()
const queryClient = useQueryClient()
const empleadoModalRef = ref<InstanceType<typeof EmpleadoFormModal> | null>(null)

const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

// Period for employee payments summary
const { selectedPeriod, selectedMonth, resetToCurrentMonth } = usePeriodSelection()

const periodDates = computed(() => resolvePeriodDates(selectedPeriod.value, selectedMonth.value))

const emptyExpenses = ref<{ date: string; amount: number }[]>([])
const summaryCtx = useFinancialSummary(businessId, selectedPeriod, emptyExpenses, selectedMonth)
const paymentsCtx = useEmployeePayments(businessId, periodDates)

const onPaymentSaved = () => {
  Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: employeePaymentKeys.all(businessId.value) }),
    queryClient.invalidateQueries({ queryKey: ['financial-summary', businessId.value] }),
  ])
}

const {
  items: team,
  handleSave: handleSaveEmpleado,
  handleDelete: handleDeleteEmpleado,
  isSaving,
} = useCrud<Empleado, EmpleadoFormData>({
  businessId,
  branchId,
  queryKey: (id, brId) => equipoKeys.all(id, brId),
  queryFn: (id, brId) => listEquipo(id, brId),
  saveFn: (id, data, brId) => saveEmpleado(data, id, brId),
  deleteFn: (id) => deleteEmpleado(id),
  entityName: 'Empleado',
  modalRef: empleadoModalRef,
  extraInvalidations: [
    (id) => ['appointments', id, branchId.value],
    (id) => ['dashboard-services', id],
    (id) => ['dashboard-payments', id],
    (id) => ['dashboard-history', id],
  ],
})

// ---- Employee exchange rate (per-business, separate from global) ----
const showEmployeeRateModal = ref(false)
const employeeRateInput = ref<number | null>(null)
const isSavingEmployeeRate = ref(false)
const employeeRateError = ref('')

watch(showEmployeeRateModal, (open) => {
  if (open) {
    employeeRateInput.value = businessStore.employeeExchangeRate ?? null
    employeeRateError.value = ''
  }
})

const handleSaveEmployeeRate = async () => {
  const bid = businessStore.business?.id
  if (!bid) return
  if (employeeRateInput.value != null && (employeeRateInput.value <= 0 || !Number.isFinite(employeeRateInput.value))) {
    employeeRateError.value = 'Ingresa una tasa válida mayor a 0'
    return
  }
  isSavingEmployeeRate.value = true
  try {
    const value = employeeRateInput.value == null ? null : employeeRateInput.value
    const { error } = await mutate
      .from('businesses')
      .update({ employee_ves_rate: value })
      .eq('id', bid)
    if (error) throw error
    businessStore.updateBusiness({ employee_ves_rate: value } as any)
    showEmployeeRateModal.value = false
    info(value == null ? 'Tasa de empleados desactivada (se usará la global)' : `Tasa de empleados actualizada a ${value} Bs`)
  } catch (err) {
    employeeRateError.value = err instanceof Error ? err.message : 'Error al guardar'
  } finally {
    isSavingEmployeeRate.value = false
  }
}

const handleClearEmployeeRate = async () => {
  const bid = businessStore.business?.id
  if (!bid) return
  if (!window.confirm('¿Restablecer la tasa de empleados? Se volverá a usar la tasa global.')) return
  isSavingEmployeeRate.value = true
  try {
    const { error } = await mutate
      .from('businesses')
      .update({ employee_ves_rate: null })
      .eq('id', bid)
    if (error) throw error
    businessStore.updateBusiness({ employee_ves_rate: null } as any)
    employeeRateInput.value = null
    showEmployeeRateModal.value = false
    info('Tasa de empleados desactivada')
  } catch (err) {
    employeeRateError.value = err instanceof Error ? err.message : 'Error al guardar'
  } finally {
    isSavingEmployeeRate.value = false
  }
}

const DEFAULT_VISIBLE_EMPLOYEES = 4
const showAll = ref(false)

const hasMoreThanDefault = computed(() => team.value.length > DEFAULT_VISIBLE_EMPLOYEES)

const visibleTeam = computed(() => {
  if (showAll.value) return team.value
  return team.value.slice(0, DEFAULT_VISIBLE_EMPLOYEES)
})

const teamSchedule = computed(() => team.value
  .filter(member => member.schedule)
  .map(member => ({
    id: member.id,
    name: member.name,
    start: member.schedule?.start ?? '',
    end: member.schedule?.end ?? '',
    break: member.schedule?.break || 'Sin descanso registrado',
    appointments: 0,
    available: true,
  }))
)

// Stats
const totalEmpleados = computed(() => team.value.length)
const empleadosPorcentaje = computed(() => team.value.filter(e => e.payType === 'percentage' || e.payType === 'mixed').length)
const empleadosSueldoBase = computed(() => team.value.filter(e => e.payType === 'salary' || e.payType === 'mixed').length)
const empleadosMixto = computed(() => team.value.filter(e => e.payType === 'mixed').length)

// Paginated data
const paginatedServicios = computed(() => paginate(summaryCtx.employeePayments.value))
const paginatedNomina = computed(() => paginate(paymentsCtx.paymentsMade.value))
const paginatedDeuda = computed(() => paginate(deudaConSaldo.value))
const paginatedHorarios = computed(() => paginate(teamSchedule.value))

const serviciosP = computed(() => pageProps(summaryCtx.employeePayments.value))
const nominaP = computed(() => pageProps(paymentsCtx.paymentsMade.value))
const deudaP = computed(() => pageProps(deudaConSaldo.value))
const horariosP = computed(() => pageProps(teamSchedule.value))

// Actions
const handleNewEmpleado = () => {
  empleadoModalRef.value?.open()
}

const handleEditEmpleado = (empleado: Empleado) => {
  empleadoModalRef.value?.open(empleado)
}

const handleViewAgenda = (empleado: Empleado) => {
  router.push('/admin?employee=' + empleado.id)
  info(`Mostrando agenda de ${empleado.name}`)
}

// ---- Tabs ----
const tabs = [
  { key: 'pagos' as const, label: 'Servicios Realizados', shortLabel: 'Servicios' },
  { key: 'nomina' as const, label: 'Pago de Nómina', shortLabel: 'Nómina' },
  { key: 'deuda' as const, label: 'Deuda por Empleado', shortLabel: 'Deuda' },
  { key: 'horarios' as const, label: 'Horarios del Equipo', shortLabel: 'Horarios' },
]
const activeTab = ref<'pagos' | 'nomina' | 'deuda' | 'horarios'>('pagos')

// ---- Currency ----
const { formatUSD, formatVESInline, formatVESEs, exchangeRate } = useCurrency()
const formatEmployeeVESInline = (usdAmount: number, rate?: number): string => {
  const employeeRate = businessStore.employeeExchangeRate
  return formatVESInline(usdAmount, rate ?? employeeRate ?? undefined)
}

// ---- Payment Modal ----
const selectedBalance = ref<EmployeeBalance | null>(null)

const employeeDebtSummary = computed(() => {
  const summaries = summaryCtx.employeeEarningsByEmployee.value ?? []
  return summaries.map(s => {
    const employeePayments = paymentsCtx.paymentsMade.value.filter(p => p.employeeId === s.employeeId)
    const totalPaid = employeePayments
      .filter(p => p.type !== 'consumption')
      .reduce((sum, p) => sum + p.amount, 0)
    const totalConsumed = employeePayments
      .filter(p => p.type === 'consumption')
      .reduce((sum, p) => sum + p.amount, 0)
    return {
      ...s,
      totalPaid,
      totalConsumed,
      pendingBalance: Math.max(0, s.totalEarned - totalPaid - totalConsumed),
    }
  }).filter(s => s.totalEarned > 0 || s.totalPaid > 0 || (s as any).totalConsumed > 0)
})

const deudaConSaldo = computed(() => employeeDebtSummary.value.filter(r => r.pendingBalance > 0))

const totalComisiones = computed(() =>
  summaryCtx.employeePayments.value.reduce((acc, p) => acc + p.earnings, 0)
)

const totalNominaPagada = computed(() =>
  paymentsCtx.paymentsMade.value
    .filter(p => p.type !== 'consumption')
    .reduce((acc, p) => acc + p.amount, 0)
)

const totalConsumido = computed(() =>
  paymentsCtx.paymentsMade.value
    .filter(p => p.type === 'consumption')
    .reduce((acc, p) => acc + p.amount, 0)
)

const totalDeudaPendiente = computed(() =>
  deudaConSaldo.value.reduce((acc, r) => acc + r.pendingBalance, 0)
)

const buildBalanceFromSummary = (employeeId: string): EmployeeBalance | null => {
  const summary = employeeDebtSummary.value.find(row => row.employeeId === employeeId)
  if (!summary) return null
  const totalConsumed = (summary as any).totalConsumed ?? 0
  return {
    employeeId: summary.employeeId,
    employeeName: summary.employeeName,
    payType: summary.payType === 'unknown' ? null : summary.payType,
    payPercentage: Number(summary.payPercentage ?? 0),
    baseSalary: Number(summary.baseSalary ?? 0),
    totalEarned: Number(summary.totalEarned ?? 0),
    totalPaid: Number(summary.totalPaid ?? 0) + totalConsumed,
    pendingBalance: Number(summary.pendingBalance ?? 0),
  }
}

const onEmployeeChange = async () => {
  const employeeId = paymentsCtx.paymentForm.value.employeeId
  if (!employeeId) { selectedBalance.value = null; return }
  const balanceFromSummary = buildBalanceFromSummary(employeeId)
  if (balanceFromSummary) { selectedBalance.value = balanceFromSummary; return }
  if (!authStore.businessId) { selectedBalance.value = null; return }
  try { selectedBalance.value = await getEmployeeBalance(authStore.businessId, employeeId, branchId.value) } catch { selectedBalance.value = null }
}

const openPaymentModal = () => { paymentsCtx.openModal(); selectedBalance.value = null }
const closePaymentModal = () => { paymentsCtx.closeModal(); selectedBalance.value = null }

const consumptionBalance = ref<EmployeeBalance | null>(null)

const openConsumptionModal = () => { paymentsCtx.openConsumptionModal(); consumptionBalance.value = null }
const closeConsumptionModal = () => { paymentsCtx.closeConsumptionModal(); consumptionBalance.value = null }

const onEmployeeConsumptionChange = async () => {
  const employeeId = paymentsCtx.consumptionForm.value.employeeId
  if (!employeeId) { consumptionBalance.value = null; return }
  const balanceFromSummary = buildBalanceFromSummary(employeeId)
  if (balanceFromSummary) { consumptionBalance.value = balanceFromSummary; return }
  if (!authStore.businessId) { consumptionBalance.value = null; return }
  try { consumptionBalance.value = await getEmployeeBalance(authStore.businessId, employeeId, branchId.value) } catch { consumptionBalance.value = null }
}

const handleSubmitConsumption = async () => {
  try { await paymentsCtx.handleSaveConsumption(); closeConsumptionModal(); onPaymentSaved() } catch {}
}

const openEditPaymentModal = (payment: EmployeePaymentRecord) => { paymentsCtx.openEditModal(payment); selectedBalance.value = null }

const handleSavePayment = async () => {
  try { await paymentsCtx.handleSave(); closePaymentModal(); onPaymentSaved() } catch {}
}

const handleSubmitPayment = async () => {
  if (paymentsCtx.editingPaymentId.value) {
    try { await paymentsCtx.handleUpdate(); closePaymentModal(); onPaymentSaved() } catch {}
  } else { await handleSavePayment() }
}

const handleDeletePayment = (id: string) => { paymentsCtx.handleDelete(id) }

// Pagination
const pageSize = 10
const tabPage = ref(1)
watch(activeTab, () => { tabPage.value = 1 })
const paginate = <T>(data: T[]): T[] => data.slice((tabPage.value - 1) * pageSize, tabPage.value * pageSize)
const pageProps = <T>(data: T[]) => {
  const t = data.length; const tp = Math.ceil(t / pageSize)
  return { total: t, start: t ? (tabPage.value - 1) * pageSize + 1 : 0, end: Math.min(tabPage.value * pageSize, t), hasPrev: tabPage.value > 1, hasNext: tabPage.value < tp }
}

</script>
