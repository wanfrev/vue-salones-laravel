<template>
  <div class="rounded-xl border border-border bg-surface h-full flex flex-col">
    <div class="mb-3 flex items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5 shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-text">Pagos a Empleados</h3>
          <p class="text-xs text-text-secondary">Servicios realizados y comisión aplicada</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="openPaymentModal" class="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Registrar pago</span>
        </button>
        <button @click="paymentsCtx.openConsumptionModal()" class="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-warning transition-theme hover:bg-warning/10 hover:border-warning/30">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
          </svg>
          <span class="hidden sm:inline">Debitar consumo</span>
        </button>
      </div>
    </div>
    <div class="lg:hidden space-y-2 mb-3 px-4 sm:px-5">
      <div v-for="payment in visibleEmployeePayments" :key="payment.id" class="rounded-lg border border-border-subtle bg-bg-secondary p-3">
        <div class="font-medium text-text text-sm mb-1">{{ payment.employee }}</div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-text-muted">{{ payment.service }}</span>
          <span class="text-xs text-text-secondary">{{ payment.percentage }}%</span>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-text text-sm">{{ formatUSD(payment.earnings) }}</div>
              <div class="text-xs text-text-muted">{{ formatVESInline(payment.earnings) }} Bs</div>
              <span v-if="payment.tipAmount > 0" class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">+${{ payment.tipAmount.toFixed(2) }} propina</span>
          </div>
          <div class="text-right">
            <div class="text-text text-sm">{{ formatUSD(payment.amount) }}</div>
              <div class="text-xs text-text-muted">{{ formatVESInline(payment.amount) }} Bs</div>
          </div>
        </div>
      </div>
    </div>
    <div class="overflow-x-auto hidden lg:block px-4 sm:px-5 flex-1">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border-subtle">
            <th class="pb-3 text-left text-xs font-semibold uppercase text-text-secondary">{{ terminology.employee || 'Empleado' }}</th>
            <th class="pb-3 text-left text-xs font-semibold uppercase text-text-secondary">{{ terminology.service || 'Servicio' }}</th>
            <th class="pb-3 text-right text-xs font-semibold uppercase text-text-secondary">Costo</th>
            <th class="pb-3 text-right text-xs font-semibold uppercase text-text-secondary">% {{ terminology.employee || 'Empleado' }}</th>
            <th class="pb-3 text-right text-xs font-semibold uppercase text-text-secondary">Comisión</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle">
          <tr v-for="payment in visibleEmployeePayments" :key="payment.id" class="text-sm transition-theme hover:bg-bg-secondary/50">
            <td class="py-3 font-medium text-text">{{ payment.employee }}</td>
            <td class="py-3 text-text-secondary">{{ payment.service }}</td>
            <td class="py-3 text-right">
              <div class="text-text">{{ formatUSD(payment.amount) }}</div>
            <div class="text-xs text-text-muted">{{ formatVESInline(payment.amount) }} Bs</div>
            </td>
            <td class="py-3 text-right text-text-secondary">{{ payment.percentage }}%</td>
            <td class="py-3 text-right">
              <div class="font-semibold text-success">{{ formatUSD(payment.earnings) }}</div>
            <div class="text-xs text-text-muted">{{ formatVESInline(payment.earnings) }} Bs</div>
            <span v-if="payment.tipAmount > 0" class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mt-1">+${{ payment.tipAmount.toFixed(2) }} propina</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="paymentsMade.length > 0" class="mt-4 border-t border-border-subtle px-4 sm:px-5 pt-4 shrink-0">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="text-sm font-semibold text-text">Pago de nómina</h4>
        <span class="text-xs text-text-muted">{{ paymentsMade.length }} pago(s)</span>
      </div>
       <div class="lg:hidden space-y-2 mb-3">
        <div v-for="ep in visiblePaymentsMade" :key="ep.id" class="rounded-lg border border-border-subtle bg-bg-secondary p-3">
          <div class="flex items-start justify-between mb-1">
            <div>
              <div class="text-xs text-text-muted">{{ ep.paymentDate }}</div>
              <div class="font-medium text-text text-sm">{{ ep.employeeName }}</div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <span v-if="(ep as any).type === 'consumption'" class="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-warning/10 text-warning">Consumo</span>
              <span v-else class="text-xs text-text-muted">{{ formatMethod(ep.paymentMethod) }}</span>
              <button @click="openEditPaymentModal(ep)" class="rounded-md p-1 text-text-muted transition-theme hover:bg-primary/10 hover:text-primary" title="Editar pago">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button @click="handleDeletePayment(ep.id)" class="rounded-md p-1 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar pago">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-muted">Monto</span>
            <div class="text-right">
              <div class="font-medium text-danger text-sm">{{ ep.currency === 'VES' ? formatVESEs(ep.originalAmount) : formatUSD(ep.amount) }}</div>
              <div class="text-xs text-text-muted">{{ ep.currency === 'VES' ? formatUSD(ep.amount) : formatVESInline(ep.amount, ep.exchangeRateUsed) + ' Bs' }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="overflow-x-auto hidden lg:block">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-subtle">
              <th class="pb-2 text-left text-xs font-semibold uppercase text-text-secondary">Fecha</th>
              <th class="pb-2 text-left text-xs font-semibold uppercase text-text-secondary">{{ terminology.employee || 'Empleado' }}</th>
              <th class="pb-2 text-left text-xs font-semibold uppercase text-text-secondary">Detalle</th>
              <th class="pb-2 text-right text-xs font-semibold uppercase text-text-secondary">Monto</th>
              <th class="pb-2 text-center text-xs font-semibold uppercase text-text-secondary w-10">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="ep in visiblePaymentsMade" :key="ep.id" class="text-sm transition-theme hover:bg-bg-secondary/50">
              <td class="py-2 text-text-secondary whitespace-nowrap">{{ ep.paymentDate }}</td>
              <td class="py-2 font-medium text-text">{{ ep.employeeName }}</td>
              <td class="py-2 text-text-secondary">
                <div class="flex items-center gap-1.5">
                  <span v-if="(ep as any).type === 'consumption'" class="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-warning/10 text-warning">Consumo</span>
                  <span v-else class="text-xs">{{ formatMethod(ep.paymentMethod) }}</span>
                </div>
                <p v-if="(ep as any).concept" class="text-[10px] text-text-muted mt-0.5 max-w-[140px] truncate">{{ (ep as any).concept }}</p>
              </td>
              <td class="py-2 text-right">
                <div class="font-medium text-danger">{{ ep.currency === 'VES' ? formatVESEs(ep.originalAmount) : formatUSD(ep.amount) }}</div>
                <div class="text-xs text-text-muted">{{ ep.currency === 'VES' ? formatUSD(ep.amount) : formatVESInline(ep.amount, ep.exchangeRateUsed) + ' Bs' }}</div>
              </td>
              <td class="py-2 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button @click="openEditPaymentModal(ep)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-primary/10 hover:text-primary" title="Editar pago">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button @click="handleDeletePayment(ep.id)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar pago">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="employeeDebtSummary.length > 0" class="mt-4 border-t border-border-subtle px-4 sm:px-5 pt-4 shrink-0">
      <h4 class="mb-3 text-sm font-semibold text-text">Deuda por {{ terminology.employee || 'empleado' }}</h4>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-subtle">
              <th class="pb-2 text-left text-xs font-semibold uppercase text-text-secondary">{{ terminology.employee || 'Empleado' }}</th>
              <th class="pb-2 text-left text-xs font-semibold uppercase text-text-secondary">Tipo</th>
              <th class="pb-2 text-right text-xs font-semibold uppercase text-text-secondary">Comisión</th>
              <th class="pb-2 text-right text-xs font-semibold uppercase text-text-secondary">Sueldo base</th>
              <th class="pb-2 text-right text-xs font-semibold uppercase text-text-secondary">Total</th>
              <th class="pb-2 text-right text-xs font-semibold uppercase text-text-secondary">Pagado</th>
              <th class="pb-2 text-right text-xs font-semibold uppercase text-text-secondary">Consumo</th>
              <th class="pb-2 text-right text-xs font-semibold uppercase text-text-secondary">Pendiente</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="row in employeeDebtSummary" :key="row.employeeId" class="text-sm transition-theme hover:bg-bg-secondary/50">
              <td class="py-2 font-medium text-text">{{ row.employeeName }}</td>
              <td class="py-2 text-text-secondary text-xs">
                <span v-if="row.payType === 'salary'">Sueldo base</span>
                <span v-else-if="row.payType === 'mixed'">Sueldo + {{ row.payPercentage }}%</span>
                <span v-else-if="row.payType === 'percentage'">{{ row.payPercentage }}%</span>
                <span v-else>—</span>
              </td>
              <td class="py-2 text-right text-text">{{ formatUSD(row.commissionTotal) }}</td>
              <td class="py-2 text-right text-text">{{ formatUSD(row.baseSalary) }}</td>
              <td class="py-2 text-right font-semibold text-text">{{ formatUSD(row.totalEarned) }}</td>
              <td class="py-2 text-right">
                <div class="font-medium text-danger">{{ formatUSD(row.totalPaid) }}</div>
                <div class="text-xs text-text-muted">{{ formatVESInline(row.totalPaid) }} Bs</div>
              </td>
              <td class="py-2 text-right">
                <div class="font-medium text-warning">{{ formatUSD((row as any).totalConsumed ?? 0) }}</div>
                <div class="text-xs text-text-muted">{{ formatVESInline((row as any).totalConsumed ?? 0) }} Bs</div>
              </td>
              <td class="py-2 text-right">
                <span class="font-bold" :class="row.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">
                  {{ formatUSD(row.pendingBalance) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="canViewAllPayments" class="mt-auto shrink-0 flex justify-center border-t border-border-subtle px-4 sm:px-5 py-3">
      <button
        type="button"
        class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary transition-theme hover:bg-bg-secondary"
        @click="emit('view-all')"
      >
        Ver todos
      </button>
    </div>
  </div>

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
          <div v-if="paymentsCtx.paymentError.value" class="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <p class="font-medium">{{ paymentsCtx.editingPaymentId.value ? 'Error al actualizar' : 'Error al registrar' }}</p>
            <p class="mt-0.5">{{ paymentsCtx.paymentError.value }}</p>
          </div>
          <div v-if="!paymentsCtx.editingPaymentId.value">
            <label class="mb-1 block text-sm font-medium text-text">{{ terminology.employee || 'Empleado' }}</label>
            <select v-model="paymentsCtx.paymentForm.value.employeeId" required @change="onEmployeeChange"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
              <option value="" disabled>Seleccionar {{ (terminology.employee || 'empleado').toLowerCase() }}</option>
              <option v-for="emp in paymentsCtx.employeeList.value" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
            </select>
          </div>

          <div v-if="selectedBalance" class="rounded-lg bg-bg-secondary p-3 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-muted">Tipo de pago</span>
              <span class="font-medium text-text">{{ payTypeLabel() }}</span>
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
          <p v-if="paymentsCtx.paymentError.value" class="hidden">{{ paymentsCtx.paymentError.value }}</p>
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

  <Teleport to="body">
    <div v-if="paymentsCtx.showConsumptionModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="paymentsCtx.closeConsumptionModal()"
    >
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Debitar consumo</h2>
          <p class="text-sm text-text-muted">Registra un producto o servicio consumido por el empleado</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSubmitConsumption">
          <div v-if="paymentsCtx.consumptionError.value" class="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <p class="font-medium">Error al registrar</p>
            <p class="mt-0.5">{{ paymentsCtx.consumptionError.value }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">{{ terminology.employee || 'Empleado' }}</label>
            <select v-model="paymentsCtx.consumptionForm.value.employeeId" required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
              <option value="" disabled>Seleccionar {{ (terminology.employee || 'empleado').toLowerCase() }}</option>
              <option v-for="emp in paymentsCtx.employeeList.value" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Concepto</label>
            <input v-model="paymentsCtx.consumptionForm.value.concept" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Ej: Café, Producto X, Servicio Y..." required />
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
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="paymentsCtx.closeConsumptionModal()">Cancelar</button>
            <button type="submit" :disabled="paymentsCtx.consumeMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-warning px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-warning-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ paymentsCtx.consumeMutation.isPending.value ? 'Guardando...' : 'Debitar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatMethod } from '../../lib/formatters'
import { useCurrency } from '../../composables/useCurrency'
import { useEmployeePayments } from '../../composables/useEmployeePayments'
import { getEmployeeBalance, type EmployeeBalance, type EmployeePaymentRecord } from '../../services/employeePaymentsService'
import type { EmployeeEarningSummary } from '../../composables/useFinancialSummary'

interface PaymentRow {
  id: string; employee: string; service: string; amount: number; percentage: number; earnings: number; tipAmount: number
}

const props = defineProps<{
  employeePayments: PaymentRow[]
  employeeEarningsByEmployee?: EmployeeEarningSummary[]
  paymentsMade: EmployeePaymentRecord[]
  terminology: Record<string, string>
  businessId: string | null
}>()

const emit = defineEmits<{
  'saved': []
  'view-all': []
}>()

const { formatUSD, formatVESInline, formatVESEs } = useCurrency()

const paymentsCtx = useEmployeePayments(computed(() => props.businessId))

const selectedBalance = ref<EmployeeBalance | null>(null)

const visibleEmployeePayments = computed(() => props.employeePayments.slice(0, 5))
const visiblePaymentsMade = computed(() => props.paymentsMade.slice(0, 5))
const canViewAllPayments = computed(() => props.employeePayments.length > 5 || props.paymentsMade.length > 5)

const employeeDebtSummary = computed(() => {
  const summaries = props.employeeEarningsByEmployee ?? []
  return summaries.map(s => {
    const employeeRecords = props.paymentsMade.filter(p => p.employeeId === s.employeeId)
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

const buildBalanceFromSummary = (employeeId: string): EmployeeBalance | null => {
  const summary = employeeDebtSummary.value.find(row => row.employeeId === employeeId)
  if (!summary) return null
  return {
    employeeId: summary.employeeId,
    employeeName: summary.employeeName,
    payType: summary.payType === 'unknown' ? null : summary.payType,
    payPercentage: Number(summary.payPercentage ?? 0),
    baseSalary: Number(summary.baseSalary ?? 0),
    totalEarned: Number(summary.totalEarned ?? 0),
    totalPaid: Number(summary.totalPaid ?? 0),
    pendingBalance: Number(summary.pendingBalance ?? 0),
  }
}

function payTypeLabel(): string {
  if (!selectedBalance.value) return '—'
  const b = selectedBalance.value
  if (b.payType === 'salary') return `Sueldo base ($${b.baseSalary})`
  if (b.payType === 'mixed') return `Sueldo + % ($${b.baseSalary} + ${b.payPercentage}%)`
  if (b.payType === 'percentage') return `${b.payPercentage}% por servicio`
  return 'Por servicio'
}

const openPaymentModal = () => {
  paymentsCtx.openModal()
  selectedBalance.value = null
}

const closePaymentModal = () => {
  paymentsCtx.closeModal()
  selectedBalance.value = null
}

const onEmployeeChange = async () => {
  const employeeId = paymentsCtx.paymentForm.value.employeeId
  if (!employeeId) {
    selectedBalance.value = null
    return
  }
  const balanceFromSummary = buildBalanceFromSummary(employeeId)
  if (balanceFromSummary) {
    selectedBalance.value = balanceFromSummary
    return
  }
  if (!props.businessId) {
    selectedBalance.value = null
    return
  }
  try {
    selectedBalance.value = await getEmployeeBalance(props.businessId, employeeId)
  } catch {
    selectedBalance.value = null
  }
}

const handleSavePayment = async () => {
  try {
    await paymentsCtx.handleSave()
    closePaymentModal()
    emit('saved')
  } catch {
    // Error handled by composable
  }
}

const openEditPaymentModal = (payment: EmployeePaymentRecord) => {
  paymentsCtx.openEditModal(payment)
  selectedBalance.value = null
}

const handleSubmitPayment = async () => {
  if (paymentsCtx.editingPaymentId.value) {
    try {
      await paymentsCtx.handleUpdate()
      closePaymentModal()
      emit('saved')
    } catch {
      // Error handled by composable
    }
  } else {
    await handleSavePayment()
  }
}

const handleDeletePayment = (id: string) => {
  paymentsCtx.handleDelete(id)
}

const handleSubmitConsumption = async () => {
  try {
    await paymentsCtx.handleSaveConsumption()
    emit('saved')
  } catch {
    // Error handled by composable
  }
}
</script>