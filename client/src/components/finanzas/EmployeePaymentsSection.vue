<template>
  <div class="@container flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <div class="flex shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-text">Pagos a Empleados</h3>
        <p class="text-xs text-text-secondary">Servicios realizados y comisión aplicada</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="openPaymentModal" title="Registrar pago" aria-label="Registrar pago"
          class="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden @lg:inline">Registrar pago</span>
        </button>
        <button @click="paymentsCtx.openConsumptionModal()" title="Debitar consumo" aria-label="Debitar consumo"
          class="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-warning ring-1 ring-warning/30 transition-theme hover:bg-warning/10">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
          </svg>
          <span class="hidden @lg:inline">Debitar consumo</span>
        </button>
      </div>
    </div>

    <!-- Servicios realizados y comisión -->
    <div>
      <div :class="[gServices, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 @2xl:grid']">
        <span :class="headClass">{{ terminology.employee || 'Empleado' }}</span>
        <span :class="headClass">{{ terminology.service || 'Servicio' }}</span>
        <span :class="[headClass, 'text-right']">Costo</span>
        <span :class="[headClass, 'text-right']">% {{ terminology.employee || 'Empleado' }}</span>
        <span :class="[headClass, 'text-right']">Comisión</span>
      </div>
      <ul class="divide-y divide-border-subtle">
        <li v-for="payment in visibleEmployeePayments" :key="payment.id" data-testid="earning-row"
          :class="[gServices, 'px-4 py-3 text-sm transition-colors hover:bg-bg-secondary/40']">
          <p class="font-medium text-text">{{ payment.employee }}</p>
          <p class="flex items-center justify-between gap-2 text-text-secondary">
            <span class="min-w-0 truncate text-xs @2xl:text-sm">{{ payment.service }}</span>
            <span class="shrink-0 text-xs @2xl:hidden">{{ payment.percentage }}%</span>
          </p>
          <div class="mt-1 grid grid-cols-2 gap-3 @2xl:contents">
            <div class="@2xl:text-right">
              <p class="text-[10px] uppercase tracking-wider text-text-muted @2xl:hidden">Costo</p>
              <div class="tabular-nums text-text">{{ formatUSD(payment.amount) }}</div>
              <div class="text-xs tabular-nums text-text-muted">{{ formatEmployeeSecondary(payment.amount) }}</div>
            </div>
            <p class="hidden text-right text-text-secondary @2xl:block">{{ payment.percentage }}%</p>
            <div class="text-right">
              <p class="text-[10px] uppercase tracking-wider text-text-muted @2xl:hidden">Comisión</p>
              <div class="font-semibold tabular-nums text-success">{{ formatUSD(payment.earnings) }}</div>
              <div class="text-xs tabular-nums text-text-muted">{{ formatEmployeeSecondary(payment.earnings) }}</div>
              <span v-if="payment.tipAmount > 0" class="mt-0.5 inline-block text-[10px] font-semibold text-primary">+${{
                payment.tipAmount.toFixed(2) }} propina</span>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Pago de nómina -->
    <div v-if="paymentsMade.length > 0" class="mt-2 shrink-0 border-t border-border-subtle">
      <div class="flex items-center justify-between px-4 pb-1 pt-3">
        <h4 class="text-sm font-semibold text-text">Pago de nómina</h4>
        <span class="text-xs text-text-muted">{{ paymentsMade.length }} pago(s)</span>
      </div>
      <div :class="[gPayroll, 'hidden border-y border-border-subtle bg-bg-secondary/30 px-4 py-2 @2xl:grid']">
        <span :class="headClass">Fecha</span>
        <span :class="headClass">{{ terminology.employee || 'Empleado' }}</span>
        <span :class="headClass">Detalle</span>
        <span :class="[headClass, 'text-right']">Monto</span>
        <span :class="[headClass, 'text-center']">Acciones</span>
      </div>
      <ul class="divide-y divide-border-subtle">
        <li v-for="ep in visiblePaymentsMade" :key="ep.id" data-testid="payroll-row"
          :class="[gPayroll, 'relative px-4 py-3 text-sm transition-colors hover:bg-bg-secondary/40']">
          <p class="whitespace-nowrap text-xs text-text-muted @2xl:text-sm @2xl:text-text-secondary">{{ fmtDate(ep.paymentDate) }}</p>
          <p class="pr-16 font-medium text-text @2xl:pr-0">{{ ep.employeeName }}</p>
          <div class="text-text-secondary">
            <span v-if="(ep as any).type === 'consumption'" class="text-[11px] font-semibold text-warning">Consumo</span>
            <span v-else class="text-xs">{{ formatMethod(ep.paymentMethod) }}</span>
            <p v-if="(ep as any).concept" class="mt-0.5 max-w-[140px] truncate text-[10px] text-text-muted">{{ (ep as any).concept }}</p>
          </div>
          <div class="mt-1 flex items-start justify-between gap-3 @2xl:mt-0 @2xl:block @2xl:text-right">
            <span class="text-xs text-text-muted @2xl:hidden">Monto</span>
            <div class="text-right">
              <div class="font-medium tabular-nums text-danger">{{ ep.currency === 'VES' ? formatVESEs(ep.originalAmount) :
                formatUSD(ep.amount) }}</div>
              <div class="text-xs tabular-nums text-text-muted">{{ ep.currency === 'VES' ? formatUSD(ep.amount) :
                formatEmployeeSecondary(ep.amount, ep.employeeVesRate ?? undefined) }}</div>
            </div>
          </div>
          <div class="absolute right-2 top-2 flex items-center @2xl:static @2xl:justify-center">
            <button @click="openEditPaymentModal(ep)"
              class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-primary/10 hover:text-primary"
              title="Editar pago" aria-label="Editar pago">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button @click="handleDeletePayment(ep.id)"
              class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
              title="Eliminar pago" aria-label="Eliminar pago">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Deuda por empleado -->
    <div v-if="employeeDebtSummary.length > 0" class="mt-2 shrink-0 border-t border-border-subtle">
      <h4 class="px-4 pb-2 pt-3 text-sm font-semibold text-text">Deuda por {{ terminology.employee || 'empleado' }}</h4>
      <ul class="divide-y divide-border-subtle border-t border-border-subtle">
        <li v-for="row in employeeDebtSummary" :key="row.employeeId" data-testid="debt-row" class="px-4 py-3 text-sm transition-colors hover:bg-bg-secondary/40">
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <span class="font-medium text-text">{{ row.employeeName }}</span>
              <span class="ml-2 text-xs text-text-secondary">
                <span v-if="row.payType === 'salary'">Sueldo base</span>
                <span v-else-if="row.payType === 'mixed'">Sueldo + {{ row.payPercentage }}%</span>
                <span v-else-if="row.payType === 'percentage'">{{ row.payPercentage }}%</span>
                <span v-else>—</span>
              </span>
            </div>
            <div class="shrink-0 text-right">
              <span class="mr-1.5 text-[10px] uppercase tracking-wider text-text-muted">Pendiente</span>
              <span class="font-bold tabular-nums" :class="row.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">{{ formatUSD(row.pendingBalance) }}</span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-x-3 gap-y-2 text-xs @lg:grid-cols-5">
            <div>
              <p :class="miniLabel">Comisión</p>
              <p class="tabular-nums text-text">{{ formatUSD(row.commissionTotal) }}</p>
            </div>
            <div>
              <p :class="miniLabel">Sueldo base</p>
              <p class="tabular-nums text-text">{{ formatUSD(row.baseSalary) }}</p>
            </div>
            <div>
              <p :class="miniLabel">Total</p>
              <p class="font-semibold tabular-nums text-text">{{ formatUSD(row.totalEarned) }}</p>
            </div>
            <div>
              <p :class="miniLabel">Pagado</p>
              <p class="font-medium tabular-nums text-danger">{{ formatUSD(row.totalPaid) }}</p>
              <p class="tabular-nums text-text-muted">{{ formatEmployeeSecondary(row.totalPaid) }}</p>
            </div>
            <div>
              <p :class="miniLabel">Consumo</p>
              <p class="font-medium tabular-nums text-warning">{{ formatUSD((row as any).totalConsumed ?? 0) }}</p>
              <p class="tabular-nums text-text-muted">{{ formatEmployeeSecondary((row as any).totalConsumed ?? 0) }}</p>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="canViewAllPayments"
      class="mt-auto flex shrink-0 justify-center border-t border-border-subtle px-4 py-3">
      <button type="button"
        class="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/10"
        @click="emit('view-all')">
        Ver todos
      </button>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="paymentsCtx.showPaymentModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="closePaymentModal">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">{{ paymentsCtx.editingPaymentId.value ? 'Editar pago' : 'Registrar pago' }}</h2>
          <p class="text-sm text-text-muted">{{ paymentsCtx.editingPaymentId.value ? 'Modifica los datos del pago' : 'Registra un adelanto, sueldo o comisión pagada' }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSubmitPayment">
          <div v-if="paymentsCtx.saveError.value"
            class="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <p class="font-medium">{{ paymentsCtx.editingPaymentId.value ? 'Error al actualizar' : 'Error al registrar'
              }}</p>
            <p class="mt-0.5">{{ paymentsCtx.saveError.value }}</p>
          </div>
          <div v-if="!paymentsCtx.editingPaymentId.value">
            <label class="mb-1 block text-sm font-medium text-text">{{ terminology.employee || 'Empleado' }}</label>
            <select v-model="paymentsCtx.paymentForm.value.employeeId" required @change="onEmployeeChange"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
              <option value="" disabled>Seleccionar {{ (terminology.employee || 'empleado').toLowerCase() }}</option>
              <option v-for="emp in paymentsCtx.employeeList.value" :key="emp.id" :value="emp.id">{{ emp.name }}
              </option>
            </select>
          </div>

          <div v-if="!paymentsCtx.editingPaymentId.value" class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-text-muted">Servicios desde</label>
              <input v-model="earningsStartDate" type="date" @change="onEmployeeChange"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-text-muted">Servicios hasta</label>
              <input v-model="earningsEndDate" type="date" @change="onEmployeeChange"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

            <div v-if="selectedBalance" class="rounded-lg bg-bg-secondary p-3 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Tipo de pago</span>
              <span class="font-medium text-text">{{ payTypeLabel() }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Generado en servicios</span>
              <span class="font-medium text-success">{{ formatUSD(selectedBalance.total_earned) }}</span>
            </div>
            <div v-if="selectedBalance.tips > 0" class="flex items-center justify-between text-xs">
              <span class="text-text-muted/70 pl-2">Propina</span>
              <span class="font-medium text-primary">{{ formatUSD(selectedBalance.tips) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Pagado hasta ahora</span>
              <span class="font-medium text-danger">{{ formatUSD(selectedBalance.total_paid) }}</span>
            </div>
            <div class="flex items-center justify-between border-t border-border pt-2">
              <span class="text-sm font-semibold text-text">Saldo pendiente</span>
              <span class="text-base font-bold"
                :class="selectedBalance.pending > 0 ? 'text-primary' : 'text-text-muted'">
                {{ formatUSD(selectedBalance.pending) }}
              </span>
            </div>
            <button v-if="selectedBalance.pending > 0" type="button"
              @click="paymentsCtx.paymentForm.value.amount = selectedBalance.pending"
              class="w-full mt-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-theme hover:bg-primary/10">
              Pagar saldo pendiente
            </button>

            <div v-if="businessStore.features.payroll_locked_exchange_rate"
              class="mt-2 rounded-lg border border-dashed border-border bg-surface p-2.5 space-y-1.5">
              <p class="text-xs font-medium text-text-secondary">Desglose en Bs (tasa del día de cada servicio)</p>
              <div class="flex items-center justify-between text-xs">
                <span class="text-text-muted">Comisión</span>
                <span class="font-medium text-text">{{ formatVESEs(selectedBalance.commission_bs ?? 0) }}</span>
              </div>
              <div v-if="(selectedBalance.tips_bs ?? 0) > 0 && !(selectedBalance.tips_usd ?? 0) && !(selectedBalance.tips_ves ?? 0) && !(selectedBalance.tips_unspecified ?? 0)"
                class="flex items-center justify-between text-xs">
                <span class="text-text-muted">Propina</span>
                <span class="font-medium text-text">{{ formatVESEs(selectedBalance.tips_bs ?? 0) }}</span>
              </div>
              <div v-if="(selectedBalance.tips_usd ?? 0) > 0 || (selectedBalance.tips_ves ?? 0) > 0 || (selectedBalance.tips_unspecified ?? 0) > 0"
                class="pl-2 space-y-1 border-l-2 border-border-subtle">
                <p class="text-[11px] text-text-muted">Propinas recibidas por moneda:</p>
                <div v-if="(selectedBalance.tips_usd ?? 0) > 0" class="flex items-center justify-between text-[11px]">
                  <span class="text-text-muted">En dólares</span>
                  <span class="font-medium text-text">{{ formatUSD(selectedBalance.tips_usd ?? 0) }}</span>
                </div>
                <div v-if="(selectedBalance.tips_ves ?? 0) > 0" class="flex items-center justify-between text-[11px]">
                  <span class="text-text-muted">En bolívares</span>
                  <span class="font-medium text-text">{{ formatVESEs(selectedBalance.tips_ves ?? 0) }}</span>
                </div>
                <div v-if="(selectedBalance.tips_unspecified ?? 0) > 0" class="flex items-center justify-between text-[11px]">
                  <span class="text-text-muted">Sin moneda especificada</span>
                  <span class="font-medium text-text">{{ formatUSD(selectedBalance.tips_unspecified ?? 0) }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between text-xs border-t border-border-subtle pt-1.5">
                <span class="text-text-muted">Saldo pendiente (estimado)</span>
                <span class="font-medium text-text">{{ formatVESEs(selectedBalance.pending_bs_estimated ?? 0) }}</span>
              </div>
            </div>

            <div v-if="businessStore.features.payroll_currency_breakdown_enabled"
              class="mt-2 rounded-lg border border-dashed border-border bg-surface p-2.5 space-y-1.5">
              <p class="text-xs font-medium text-text-secondary">Generó según moneda de cobro</p>
              <div class="flex items-center justify-between text-xs">
                <span class="text-text-muted">En dólares</span>
                <span class="text-right">
                  <span class="font-medium text-text">{{ formatUSD(selectedBalance.commission_usd_actual ?? 0) }}</span>
                  <span class="block text-[10px] text-text-muted/70">≈ {{ formatSecondary(selectedBalance.commission_usd_actual ?? 0, effectiveRate) }}</span>
                </span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-text-muted">En bolívares</span>
                <span class="text-right">
                  <span class="font-medium text-text">{{ formatVESEs(selectedBalance.commission_ves_actual_bs ?? 0) }}</span>
                  <span class="block text-[10px] text-text-muted/70">≈ {{ formatUSD((selectedBalance.commission_ves_actual_bs ?? 0) / effectiveRate) }}</span>
                </span>
              </div>
              <div v-if="(selectedBalance.commission_unspecified_actual ?? 0) > 0" class="flex items-center justify-between text-xs">
                <span class="text-text-muted">Sin moneda especificada</span>
                <span class="font-medium text-text">{{ formatUSD(selectedBalance.commission_unspecified_actual ?? 0) }}</span>
              </div>
            </div>
          </div>

          <template v-if="isDayRateMode">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-text">Divisas a pagar ($)</label>
                <input v-model.number="paymentsCtx.dayRateForm.value.divisas" type="number" min="0" step="0.01" placeholder="0.00"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text">Tasa (Bs por $)</label>
                <input v-model.number="paymentsCtx.dayRateForm.value.tasa" type="number" min="0.01" step="0.01" placeholder="0.00"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Bolívares a pagar (Bs)</label>
              <input v-model.number="paymentsCtx.dayRateForm.value.bolivares" type="number" min="0" step="0.01" placeholder="0.00"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div class="rounded-lg border border-dashed border-border bg-surface p-2.5 space-y-1.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-text-muted">Pendiente actual</span>
                <span class="font-medium text-text">{{ formatUSD(dayRatePreview.pendingUsd) }} · {{ formatVESEs(dayRatePreview.pendingBs) }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-border-subtle pt-1.5 font-semibold">
                <span class="text-text">Restante</span>
                <span class="text-text">{{ formatUSD(dayRatePreview.remainingUsd) }} · {{ formatVESEs(dayRatePreview.remainingBs) }}</span>
              </div>
            </div>
          </template>
          <div v-else class="grid grid-cols-3 gap-3">
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
              <select v-model="paymentsCtx.paymentForm.value.paymentMethod"
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
            <input v-model="paymentsCtx.paymentForm.value.paymentDate" type="date"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              required />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Notas</label>
            <input v-model="paymentsCtx.paymentForm.value.notes" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Ej: Comisión servicios, adelanto..." />
          </div>
          <p v-if="paymentsCtx.saveError.value" class="hidden">{{ paymentsCtx.saveError.value }}</p>
          <p v-if="paymentsCtx.formErrors.value?.employeeId" class="text-xs text-danger mt-1">{{ paymentsCtx.formErrors.value.employeeId }}</p>
          <p v-if="paymentsCtx.formErrors.value?.amount" class="text-xs text-danger mt-1">{{ paymentsCtx.formErrors.value.amount }}</p>
          <p v-if="paymentsCtx.formErrors.value?.paymentMethod" class="text-xs text-danger mt-1">{{ paymentsCtx.formErrors.value.paymentMethod }}</p>
          <p v-if="paymentsCtx.formErrors.value?.paymentDate" class="text-xs text-danger mt-1">{{ paymentsCtx.formErrors.value.paymentDate }}</p>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="closePaymentModal">Cancelar</button>
            <button type="submit"
              :disabled="paymentsCtx.isSaving.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ paymentsCtx.isSaving.value ?
                'Guardando...' : (paymentsCtx.editingPaymentId.value ? 'Actualizar pago' : 'Guardar pago') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <EmployeeConsumptionModal
    :payments-ctx="paymentsCtx"
    :business-id="props.businessId"
    :branch-id="branchId"
    :employees="paymentsCtx.employeeList.value"
    @close="paymentsCtx.closeConsumptionModal()"
    @consumption-saved="emit('saved')"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatMethod } from '../../lib/formatters'
import { useCurrency } from '../../composables/common/useCurrency'
import { useEmployeePayments } from '../../composables/empleados/useEmployeePayments'
import { useBusinessStore } from '../../store/business'
import { getEmployeeBalance, type EmployeeBalance, type EmployeePaymentRecord } from '../../services/employeePaymentsService'
import type { EmployeeEarningSummary } from '../../composables/finanzas/useFinancialSummary'
import EmployeeConsumptionModal from '../equipo/EmployeeConsumptionModal.vue'

const fmtDate = (d: string) => {
  try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}` } catch { return d }
}

interface PaymentRow {
  id: string; employee: string; service: string; amount: number; percentage: number; earnings: number; tipAmount: number
}

const props = defineProps<{
  employeePayments: PaymentRow[]
  employeeEarningsByEmployee?: EmployeeEarningSummary[]
  terminology: Record<string, string>
  businessId: string | null
  /** The same date range every other Finanzas tab is scoped to — without this, the nómina list
   *  below silently fell back to the whole current year regardless of what was selected up top. */
  periodDates: { start: string; end: string }
}>()

const emit = defineEmits<{
  'saved': []
  'view-all': []
}>()

const { formatUSD, formatVESEs, formatEmployeeSecondary, formatSecondary, employeeRate } = useCurrency()
const businessStore = useBusinessStore()
const branchId = computed(() => businessStore.currentBranchId)
const terminology = computed(() => props.terminology)

const paymentsCtx = useEmployeePayments(computed(() => props.businessId), computed(() => props.periodDates))
const paymentsMade = computed(() => paymentsCtx.paymentsMade.value)

const selectedBalance = ref<EmployeeBalance | null>(null)

const effectiveRate = computed(() => {
  if (selectedBalance.value?.employee_ves_rate && selectedBalance.value.employee_ves_rate > 0) {
    return selectedBalance.value.employee_ves_rate
  }
  return employeeRate.value
})

const toYmd = (d: Date) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const nowDate = new Date()
const earningsStartDate = ref(toYmd(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)))
const earningsEndDate = ref(toYmd(nowDate))

// La tarjeta ocupa media pantalla: las columnas aparecen según el ancho de la propia tarjeta (@2xl), no de la ventana.
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
const miniLabel = 'text-[10px] uppercase tracking-wider text-text-muted'
const gServices = '@2xl:grid @2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_6.5rem_4.5rem_7rem] @2xl:items-center @2xl:gap-3'
const gPayroll = '@2xl:grid @2xl:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)_7.5rem_4.5rem] @2xl:items-center @2xl:gap-3'

const visibleEmployeePayments = computed(() => props.employeePayments.slice(0, 5))
const visiblePaymentsMade = computed(() => paymentsMade.value.slice(0, 5))
const canViewAllPayments = computed(() => props.employeePayments.length > 5 || paymentsMade.value.length > 5)

const employeeDebtSummary = computed(() => {
  const summaries = props.employeeEarningsByEmployee ?? []
  return summaries.map(s => {
    const employeeRecords = paymentsMade.value.filter(p => p.employeeId === s.employeeId)
    const totalPaid = employeeRecords
      .filter(p => (p as any).type !== 'consumption')
      .reduce((sum, p) => sum + p.amount, 0)
    const totalConsumed = employeeRecords
      .filter(p => (p as any).type === 'consumption')
      .reduce((sum, p) => sum + p.amount, 0)
    return {
      ...s,
      totalPaid,
      totalConsumed,
      pendingBalance: s.totalEarned - totalPaid - totalConsumed,
    }
  }).filter(s => s.totalEarned > 0 || s.totalPaid > 0 || s.totalConsumed > 0)
})

function payTypeLabel(): string {
  if (!selectedBalance.value) return '—'
  const b = selectedBalance.value
  if (b.pay_type === 'salary') return `Sueldo base ($${b.base_salary})`
  if (b.pay_type === 'mixed') return `Sueldo + % ($${b.base_salary} + ${b.pay_percentage}%)`
  if (b.pay_type === 'percentage') return `${b.pay_percentage}% por servicio`
  return 'Por servicio'
}

const openPaymentModal = () => {
  paymentsCtx.openPaymentModal()
  selectedBalance.value = null
  const now = new Date()
  earningsStartDate.value = toYmd(new Date(now.getFullYear(), now.getMonth(), 1))
  earningsEndDate.value = toYmd(now)
}

const closePaymentModal = () => {
  paymentsCtx.closePaymentModal()
  selectedBalance.value = null
}

const onEmployeeChange = async () => {
  const employeeId = paymentsCtx.paymentForm.value.employeeId
  if (!employeeId) {
    selectedBalance.value = null
    return
  }
  if (!props.businessId) {
    selectedBalance.value = null
    return
  }
  try {
    selectedBalance.value = await getEmployeeBalance(props.businessId, employeeId, branchId.value, earningsStartDate.value || undefined, earningsEndDate.value || undefined)
  } catch {
    selectedBalance.value = null
  }
}

const isDayRateMode = computed(() =>
  !!businessStore.features.payroll_day_average_rate_enabled && !paymentsCtx.editingPaymentId.value
)

watch(selectedBalance, (b) => {
  if (b && !paymentsCtx.dayRateForm.value.tasa) {
    paymentsCtx.dayRateForm.value.tasa = effectiveRate.value
  }
})

const dayRatePreview = computed(() => {
  const pendingUsd = selectedBalance.value?.pending ?? 0
  const { divisas, tasa, bolivares } = paymentsCtx.dayRateForm.value
  const rate = tasa || effectiveRate.value
  const pendingBs = pendingUsd * rate
  const paidUsdEquivalent = divisas + (tasa > 0 ? bolivares / tasa : 0)
  const paidBs = divisas * tasa + bolivares
  return {
    pendingUsd,
    pendingBs,
    remainingUsd: pendingUsd - paidUsdEquivalent,
    remainingBs: pendingBs - paidBs,
  }
})

const handleSavePayment = async () => {
  try {
    if (isDayRateMode.value) {
      await paymentsCtx.handleSaveDayRatePayment()
    } else {
      await paymentsCtx.handleSavePayment()
    }
    closePaymentModal()
    emit('saved')
  } catch {
    // Error handled by composable
  }
}

const openEditPaymentModal = (payment: EmployeePaymentRecord | (typeof paymentsCtx.paymentsMade.value)[number]) => {
  paymentsCtx.openEditPayment(payment)
  selectedBalance.value = null
}

const handleSubmitPayment = async () => {
  await handleSavePayment()
}

const handleDeletePayment = (id: string) => {
  paymentsCtx.handleDelete(id)
}
</script>