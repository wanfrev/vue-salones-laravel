<template>
  <section class="space-y-4">
    <header class="rounded-xl border border-border bg-surface p-4">
      <div class="flex items-center gap-3">
        <button type="button" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text" @click="goBack" title="Volver">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7 7"/></svg>
        </button>
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-primary">Finanzas</p>
          <h1 class="text-xl font-bold text-text">{{ title }}</h1>
          <p class="text-sm text-text-muted">Vista completa de registros del periodo {{ periodLabel }}</p>
        </div>
      </div>
    </header>

    <!-- Gastos -->
    <RecordSection v-if="tipo === 'gastos'" title="Gastos del periodo" :items="paginatedGastos" :total-count="expensesCtx.expenses.value.length" empty-message="No hay gastos para este periodo." :pages="gastosPages" :page-size="pageSize" @prev="prevPage" @next="nextPage">
      <template #desktop-thead>
        <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Fecha</th>
        <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Concepto</th>
        <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Categoría</th>
        <th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Monto</th>
      </template>
      <template #desktop-tbody="{ items }">
        <tr v-for="expense in items" :key="expense.id" class="text-sm transition-theme hover:bg-bg-secondary/50">
          <td class="py-3 text-text-secondary">{{ expense.date }}</td>
          <td class="py-3 font-medium text-text">{{ expense.name }}</td>
          <td class="py-3 text-text-secondary">{{ expense.category }}</td>
          <td class="py-3 text-right">
            <div class="font-medium text-text">{{ expense.currency === 'VES' ? formatVESEs(expense.originalAmount) : formatUSD(expense.amount) }}</div>
            <div class="text-xs text-text-muted">{{ expense.currency === 'VES' ? formatUSD(expense.amount) : formatSecondary(expense.amount, expense.exchangeRateUsed) }}</div>
          </td>
          <td class="py-3 text-center"><button @click="expensesCtx.handleDelete(expense.id)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
        </tr>
      </template>
      <template #mobile-cards="{ items }">
        <div v-for="expense in items" :key="expense.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
          <div class="flex items-center justify-between"><span class="text-xs text-text-muted">{{ expense.date }}</span><button @click="expensesCtx.handleDelete(expense.id)" class="rounded-lg p-1 text-text-muted hover:bg-danger/10 hover:text-danger"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
          <div class="font-medium text-text">{{ expense.name }}</div>
          <div class="flex items-center justify-between text-xs"><span class="text-text-muted">{{ expense.category }}</span><div class="text-right"><span class="font-semibold text-danger">{{ expense.currency === 'VES' ? formatVESEs(expense.originalAmount) : formatUSD(expense.amount) }}</span><span class="text-text-muted ml-1">{{ expense.currency === 'VES' ? formatUSD(expense.amount) : formatSecondary(expense.amount, expense.exchangeRateUsed) }}</span></div></div>
        </div>
      </template>
    </RecordSection>

    <!-- Pagos -->
    <div v-else-if="tipo === 'pagos'" class="space-y-4">
      <div class="rounded-xl border border-border bg-surface p-4">
        <h2 class="mb-3 text-base font-semibold text-text">Servicios y comisiones por empleado</h2>
        <div class="overflow-x-auto">
          <table class="w-full"><thead><tr class="border-b border-border-subtle"><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">{{ terminology.employee }}</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">{{ terminology.service }}</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Costo</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">% {{ terminology.employee }}</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Comisión</th></tr></thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="payment in summaryCtx.employeePayments.value" :key="payment.id" class="text-sm transition-theme hover:bg-bg-secondary/50"><td class="py-3 font-medium text-text">{{ payment.employee }}</td><td class="py-3 text-text-secondary">{{ payment.service }}</td><td class="py-3 text-right">{{ formatUSD(payment.amount) }}</td><td class="py-3 text-right text-text-secondary">{{ payment.percentage }}%</td><td class="py-3 text-right font-semibold text-success">{{ formatUSD(payment.earnings) }}</td></tr>
            <tr v-if="summaryCtx.employeePayments.value.length === 0"><td colspan="5" class="py-6 text-center text-sm text-text-muted">No hay servicios con comisión en este periodo.</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="rounded-xl border border-border bg-surface p-4">
        <h2 class="mb-3 text-base font-semibold text-text">Pagos realizados</h2>
        <div class="overflow-x-auto">
          <table class="w-full"><thead><tr class="border-b border-border-subtle"><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Fecha</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">{{ terminology.employee }}</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Método</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Monto</th><th class="pb-3 text-center text-xs font-semibold uppercase text-text-muted">Acciones</th></tr></thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="ep in paymentsCtx.paymentsMade.value" :key="ep.id" class="text-sm transition-theme hover:bg-bg-secondary/50"><td class="py-3 text-text-secondary whitespace-nowrap">{{ fmtDate(ep.paymentDate) }}</td><td class="py-3 font-medium text-text">{{ ep.employeeName }}</td><td class="py-3 text-text-secondary">{{ formatMethod(ep.paymentMethod) }}</td><td class="py-3 text-right"><div class="font-medium text-danger">{{ ep.currency === 'VES' ? formatVESEs(ep.originalAmount) : formatUSD(ep.amount) }}</div><div class="text-xs text-text-muted">{{ ep.currency === 'VES' ? formatUSD(ep.amount) : formatEmployeeSecondary(ep.amount, ep.exchangeRateUsed) }}</div></td>
            <td class="py-3 text-center"><div class="flex items-center justify-center gap-1"><button @click="openEditPayment(ep)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-primary/10 hover:text-primary"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button @click="handleDeletePayment(ep.id)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></td></tr>
            <tr v-if="paymentsCtx.paymentsMade.value.length === 0"><td colspan="5" class="py-6 text-center text-sm text-text-muted">No hay pagos registrados en este periodo.</td></tr>
          </tbody></table>
        </div>
      </div>
    </div>

    <!-- Cobros -->
    <RecordSection v-else-if="tipo === 'cobros'" title="Cobros de citas del periodo" :items="paginatedCobros" :total-count="summaryCtx.appointmentIncomeDetails.value.length" empty-message="No hay cobros de citas en este periodo." :pages="cobrosPages" :page-size="pageSize" @prev="prevPage" @next="nextPage">
      <template #desktop-thead><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Fecha</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Cliente</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Empleado</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Servicio</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted hidden md:table-cell">Notas</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Método</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Monto</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Acciones</th></template>
      <template #desktop-tbody="{ items }">
        <tr v-for="row in items" :key="row.id" class="text-sm transition-theme hover:bg-bg-secondary/50"><td class="py-3 text-text-secondary whitespace-nowrap">{{ row.date }}</td><td class="py-3 font-medium text-text">{{ row.client }}</td><td class="py-3 text-text">{{ row.employee }}</td><td class="py-3 text-text-secondary">{{ row.service }}</td><td class="py-3 text-text-secondary hidden md:table-cell max-w-[160px]"><span v-if="row.notes" class="truncate block" :title="row.notes">{{ row.notes }}</span><span v-else class="text-text-muted/40">—</span></td><td class="py-3 text-text-secondary">{{ row.method }}</td><td class="py-3 text-right"><div class="font-medium text-success">{{ row.primaryCurrency === 'VES' ? formatVESEs(row.primaryAmount) : formatUSD(row.amount) }}</div><div class="text-[10px] text-text-muted mt-0.5">{{ row.primaryCurrency === 'VES' ? formatUSD(row.amount) : formatSecondary(row.amount, row.exchangeRateUsed) }}</div><span v-if="(row.tipAmount ?? 0) > 0" class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mt-1">+${{ (row.tipAmount ?? 0).toFixed(2) }} propina</span></td>
          <td class="py-3 text-right"><div class="flex items-center gap-1 justify-end"><button @click="summaryCtx.startEdit(row)" :disabled="summaryCtx.editTransactionMutation.isPending.value || summaryCtx.deleteTransactionMutation.isPending.value" class="rounded-md bg-primary/10 p-1.5 text-primary transition-theme hover:bg-primary/20" title="Editar"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button @click="summaryCtx.confirmDeleteTransaction(row.id)" :disabled="summaryCtx.editTransactionMutation.isPending.value || summaryCtx.deleteTransactionMutation.isPending.value" class="rounded-md bg-danger/10 p-1.5 text-danger transition-theme hover:bg-danger/20" title="Eliminar"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></td></tr>
      </template>
      <template #mobile-cards="{ items }">
        <div v-for="row in items" :key="row.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
          <div class="flex items-center justify-between"><span class="text-xs text-text-muted">{{ row.date }}</span><div class="flex items-center gap-1"><button @click="summaryCtx.startEdit(row)" class="rounded-md bg-primary/10 p-1 text-primary"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button @click="summaryCtx.confirmDeleteTransaction(row.id)" class="rounded-md bg-danger/10 p-1 text-danger"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></div>
          <div class="font-medium text-text">{{ row.client }}</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><span class="text-text-muted">Empleado</span><span class="text-text text-right">{{ row.employee }}</span><span class="text-text-muted">Servicio</span><span class="text-text text-right">{{ row.service }}</span><span class="text-text-muted">Método</span><span class="text-text text-right">{{ row.method }}</span><template v-if="row.notes"><span class="text-text-muted">Notas</span><span class="text-text text-right truncate max-w-[180px]" :title="row.notes">{{ row.notes }}</span></template><span class="text-text-muted">Monto</span><span class="text-right"><span class="font-semibold text-success">{{ row.primaryCurrency === 'VES' ? formatVESEs(row.primaryAmount) : formatUSD(row.amount) }}</span><span class="text-text-muted ml-1">{{ row.primaryCurrency === 'VES' ? formatUSD(row.amount) : formatSecondary(row.amount, row.exchangeRateUsed) }}</span></span><template v-if="(row.tipAmount ?? 0) > 0"><span class="text-text-muted">Propina</span><span class="text-right font-semibold text-primary">${{ (row.tipAmount ?? 0).toFixed(2) }}</span></template></div>
        </div>
      </template>
    </RecordSection>

    <!-- Ventas productos -->
    <RecordSection v-else-if="tipo === 'ventas-productos'" title="Ventas de productos del periodo" :items="paginatedVentas" :total-count="activeVentasData.length" empty-message="No hay ventas de productos en este periodo." :pages="ventasPages" :page-size="pageSize" @prev="prevPage" @next="nextPage">
      <template #desktop-thead>
        <template v-if="isTienda">
          <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Fecha</th>
          <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted hidden sm:table-cell">Cliente</th>
          <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted hidden md:table-cell">Empleado</th>
          <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Factura</th>
          <th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Cant. Prod.</th>
          <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Método</th>
          <th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Total</th>
        </template>
        <template v-else>
          <th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Fecha</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted hidden sm:table-cell">Cliente</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Producto</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Cantidad</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Precio unit.</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Método</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Total</th><th class="pb-3 text-center text-xs font-semibold uppercase text-text-muted w-10"></th>
        </template>
      </template>
      <template #desktop-tbody="{ items }">
        <template v-if="isTienda">
          <template v-for="inv in items" :key="inv.id">
            <tr class="text-sm transition-theme hover:bg-bg-secondary/60 cursor-pointer" @click="toggleExpand(inv.id)">
              <td class="py-3 text-text-secondary whitespace-nowrap">{{ inv.date }}</td>
              <td class="py-3 text-text font-medium hidden sm:table-cell">{{ inv.clientName || 'Venta directa' }}</td>
              <td class="py-3 text-text-secondary hidden md:table-cell font-medium">
                <span v-if="inv.employeeName" class="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-primary text-xs">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {{ inv.employeeName }}
                </span>
                <span v-else class="text-text-muted">—</span>
              </td>
              <td class="py-3 font-medium text-text">
                <div class="flex items-center gap-1.5">
                  <span class="text-primary font-semibold">Factura</span>
                  <span class="text-text-muted text-xs">({{ inv.items.length }} {{ inv.items.length === 1 ? 'prod.' : 'prods.' }})</span>
                  <svg :class="['h-4 w-4 text-text-muted transition-transform duration-200 ml-1', expandedIds.has(inv.id) ? 'rotate-180 text-primary' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </td>
              <td class="py-3 text-right text-text font-medium">{{ inv.totalQuantity }}</td>
              <td class="py-3 text-text-secondary"><span v-if="inv.paymentMethod === 'mixed'" class="font-medium text-warning">Mixto</span><span v-else>{{ formatMethod(inv.paymentMethod) }}</span></td>
              <td class="py-3 text-right font-semibold text-success whitespace-nowrap"><div>{{ inv.currency === 'VES' ? formatVESEs(inv.originalAmount) : formatUSD(inv.total) }}</div><div class="text-[10px] text-text-muted mt-0.5">{{ inv.currency === 'VES' ? formatUSD(inv.total) : formatSecondary(inv.total, inv.exchangeRateUsed) }}</div></td>
              <td class="py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button @click.stop="toggleExpand(inv.id)" class="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-bg-secondary transition-colors" title="Ver detalle">
                    <svg :class="['h-4 w-4 transition-transform duration-200', expandedIds.has(inv.id) ? 'rotate-180 text-primary' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <button @click.stop="summaryCtx.confirmDeleteTransaction(inv.id)" class="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-danger/10 hover:text-danger transition-colors" title="Eliminar factura">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="expandedIds.has(inv.id)" :key="inv.id + '-expanded'" class="bg-bg-secondary/40">
              <td colspan="7" class="px-6 py-3">
                <div class="rounded-lg border border-border-subtle bg-surface p-3 space-y-2">
                  <div class="text-xs font-semibold text-text-secondary flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2">
                    <span class="flex items-center gap-1.5">
                      <svg class="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                      Factura · Cliente: <strong class="text-text">{{ inv.clientName || 'Venta directa' }}</strong>
                      <span v-if="inv.employeeName" class="text-text-muted font-normal ml-2">(Vendido por: <strong class="text-primary font-medium">{{ inv.employeeName }}</strong>)</span>
                    </span>
                    <span class="text-text-muted font-normal">{{ inv.items.length }} {{ inv.items.length === 1 ? 'ítem' : 'ítems' }}</span>
                  </div>
                  <div class="divide-y divide-border-subtle/50">
                    <div v-for="item in inv.items" :key="item.id" class="flex items-center justify-between py-1.5 text-xs">
                      <span class="font-medium text-text">{{ item.product }}</span>
                      <div class="flex items-center gap-4 text-text-secondary tabular-nums">
                        <span>Cant: <strong class="text-text">{{ item.quantity }}</strong></span>
                        <span>Precio unit: <strong class="text-text">{{ formatUSD(item.unitPrice) }}</strong></span>
                        <span>Subtotal: <strong class="text-success font-semibold">{{ formatUSD(item.total) }}</strong></span>
                        <button @click.stop="summaryCtx.handleDeleteProductSale(item.id, item.product)" class="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-danger/10 hover:text-danger transition-colors ml-2" title="Eliminar producto"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </template>
        <template v-else>
          <tr v-for="row in items" :key="row.id" class="text-sm transition-theme hover:bg-bg-secondary/50"><td class="py-3 text-text-secondary whitespace-nowrap">{{ row.date }}</td><td class="py-3 text-text-secondary hidden sm:table-cell">{{ row.clientName || '—' }}</td><td class="py-3 font-medium text-text">{{ row.product }}</td><td class="py-3 text-right text-text">{{ row.quantity }}</td><td class="py-3 text-right text-text whitespace-nowrap">{{ formatUSD(row.unitPrice) }}</td><td class="py-3 text-text-secondary"><span v-if="row.paymentMethod === 'mixed'" class="font-medium text-warning">Mixto</span><span v-else>{{ formatMethod(row.paymentMethod) }}</span><div v-if="row.paymentMethod === 'mixed' && row.breakdown && row.breakdown.length > 1" class="text-[10px] text-text-muted mt-0.5"><span v-for="(b, bi) in row.breakdown" :key="bi">{{ formatMethod(b.method) }} {{ b.currency === 'VES' ? b.inputAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' Bs' : '$' + b.inputAmount.toFixed(2) }}<span v-if="bi < row.breakdown.length - 1"> / </span></span></div></td><td class="py-3 text-right font-medium text-success whitespace-nowrap"><div>{{ row.currency === 'VES' ? formatVESEs(row.originalAmount) : formatUSD(row.total) }}</div><div class="text-[10px] text-text-muted mt-0.5">{{ row.currency === 'VES' ? formatUSD(row.total) : formatSecondary(row.total, row.exchangeRateUsed) }}</div></td>
          <td class="py-3 text-center"><button @click="summaryCtx.handleDeleteProductSale(row.id, row.product)" class="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-danger/10 hover:text-danger transition-colors" title="Eliminar venta"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td></tr>
        </template>
      </template>
      <template #mobile-cards="{ items }">
        <template v-if="isTienda">
          <div v-for="inv in items" :key="inv.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm cursor-pointer hover:border-primary/40" @click="toggleExpand(inv.id)">
            <div class="flex items-center justify-between">
              <span class="text-xs text-text-muted">{{ inv.date }}</span>
              <span class="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">{{ inv.currency === 'VES' ? formatVESEs(inv.originalAmount) : formatUSD(inv.total) }}</span>
            </div>
            <div class="font-medium text-text flex items-center justify-between">
              <span>{{ inv.clientName || 'Venta directa' }}</span>
              <span class="text-xs text-primary font-medium">Factura ({{ inv.items.length }} {{ inv.items.length === 1 ? 'prod.' : 'prods.' }})</span>
            </div>
            <div v-if="inv.employeeName" class="text-xs text-primary flex items-center gap-1 font-medium">
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Vendido por: {{ inv.employeeName }}
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-text-muted">Método: {{ formatMethod(inv.paymentMethod) }}</span>
              <span class="text-text-muted flex items-center gap-1">Ver productos <svg :class="['h-3.5 w-3.5 transition-transform duration-200', expandedIds.has(inv.id) ? 'rotate-180 text-primary' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg></span>
            </div>
            <button @click.stop="summaryCtx.confirmDeleteTransaction(inv.id)" class="flex items-center justify-center gap-1 w-full rounded-lg py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors mt-1 border border-danger/10">
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Eliminar factura
            </button>
            <div v-if="expandedIds.has(inv.id)" class="mt-2 pt-2 border-t border-border-subtle space-y-1.5 bg-surface/50 p-2 rounded-lg">
              <div v-for="item in inv.items" :key="item.id" class="flex items-center justify-between text-xs py-1 border-b border-border-subtle/30 last:border-0">
                <span class="font-medium text-text">{{ item.product }}</span>
                <div class="text-right">
                  <span class="text-text-muted mr-2">{{ item.quantity }} x {{ formatUSD(item.unitPrice) }}</span>
                  <span class="font-semibold text-success tabular-nums">{{ formatUSD(item.total) }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-for="row in items" :key="row.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
            <div class="flex items-center justify-between"><span class="text-xs text-text-muted">{{ row.date }}</span><span class="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">{{ row.currency === 'VES' ? formatVESEs(row.originalAmount) : formatUSD(row.total) }}</span></div>
            <div v-if="row.clientName" class="text-xs text-text-muted">{{ row.clientName }}</div>
            <div class="font-medium text-text">{{ row.product }}</div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><span class="text-text-muted">Cantidad</span><span class="text-text text-right">{{ row.quantity }}</span><span class="text-text-muted">Precio unit.</span><span class="text-text text-right">{{ formatUSD(row.unitPrice) }}</span><span class="text-text-muted">Método</span><span class="text-text text-right"><span v-if="row.paymentMethod === 'mixed'" class="font-medium text-warning">Mixto</span><span v-else>{{ formatMethod(row.paymentMethod) }}</span></span></div>
            <div v-if="row.paymentMethod === 'mixed' && row.breakdown && row.breakdown.length > 1" class="text-[10px] text-text-muted"><span v-for="(b, bi) in row.breakdown" :key="bi">{{ formatMethod(b.method) }} {{ b.currency === 'VES' ? b.inputAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' Bs' : '$' + b.inputAmount.toFixed(2) }}<span v-if="bi < row.breakdown.length - 1"> / </span></span></div>
            <button @click="summaryCtx.handleDeleteProductSale(row.id, row.product)" class="flex items-center justify-center gap-1 w-full rounded-lg py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors mt-1"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Eliminar venta</button>
          </div>
        </template>
      </template>
    </RecordSection>

    <!-- Transacciones -->
    <RecordSection v-else title="Transacciones del periodo" :items="paginatedTransacciones" :total-count="summaryCtx.allTransactions.value.length" empty-message="No hay transacciones en este periodo." :pages="transaccionesPages" :page-size="pageSize" @prev="prevPage" @next="nextPage">
      <template #desktop-thead><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Fecha</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Descripción</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Empleado</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Tipo</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Método</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Monto</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Acciones</th></template>
      <template #desktop-tbody="{ items }">
        <template v-for="tx in items" :key="tx.id">
          <tr
            :class="[
              'text-sm transition-theme',
              tx.items && tx.items.length > 0 ? 'cursor-pointer hover:bg-bg-secondary/60' : 'hover:bg-bg-secondary/50'
            ]"
            @click="tx.items && tx.items.length > 0 && toggleExpand(tx.id)"
          >
            <td class="py-3 text-text-secondary whitespace-nowrap">{{ tx.date }}</td>
            <td class="py-3 font-medium text-text">
              <div class="flex items-center gap-1.5">
                <span>{{ tx.description }}</span>
                <svg v-if="tx.items && tx.items.length > 0" :class="['h-3.5 w-3.5 text-text-muted transition-transform duration-200 ml-1', expandedIds.has(tx.id) ? 'rotate-180 text-primary' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
              <div class="text-[11px] text-text-muted mt-0.5">{{ tx.sourceLabel }}</div>
            </td>
            <td class="py-3 text-text-secondary">{{ tx.employee || '—' }}</td>
            <td class="py-3"><span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', tx.type === 'ingreso' ? 'bg-success/10 text-success' : tx.type === 'nomina' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger']">{{ tx.type === 'ingreso' ? (tx.items ? 'Factura' : tx.source === 'product_sale' ? 'Venta' : 'Ingreso') : tx.type === 'nomina' ? 'Nomina' : 'Gasto' }}</span></td>
            <td class="py-3 text-text-secondary">{{ tx.method }}</td>
            <td class="py-3 text-right" :class="tx.type === 'ingreso' ? 'text-success' : 'text-danger'"><div class="font-medium">{{ tx.type === 'ingreso' ? '' : '-' }}{{ tx._currency === 'VES' ? formatVESEs(tx._originalAmount ?? tx.amount) : formatUSD(tx.amount) }}</div><div class="text-[10px] text-text-muted mt-0.5">{{ tx._currency === 'VES' ? formatUSD(tx.amount) : formatSecondary(tx.amount, tx.exchangeRateUsed) }}</div><span v-if="tx.type === 'ingreso' && (tx.tipAmount ?? 0) > 0" class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mt-1">+${{ (tx.tipAmount ?? 0).toFixed(2) }} propina</span></td>
            <td class="py-3 text-right"><div v-if="tx.type === 'ingreso' && !tx.items" class="flex items-center gap-1 justify-end"><button @click="editCobroFromTx(tx)" class="rounded-md bg-primary/10 p-1.5 text-primary transition-theme hover:bg-primary/20"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button @click="summaryCtx.confirmDeleteTransaction(tx.id)" class="rounded-md bg-danger/10 p-1.5 text-danger transition-theme hover:bg-danger/20"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div><span v-else class="text-xs text-text-muted">—</span></td>
          </tr>
          <tr v-if="tx.items && tx.items.length > 0 && expandedIds.has(tx.id)" :key="tx.id + '-expanded'" class="bg-bg-secondary/40">
            <td colspan="7" class="px-6 py-3">
              <div class="rounded-lg border border-border-subtle bg-surface p-3 space-y-2">
                <div class="text-xs font-semibold text-text-secondary flex items-center justify-between">
                  <span class="flex items-center gap-1.5"><svg class="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>Productos incluidos en la factura</span>
                  <span class="text-text-muted font-normal">{{ tx.items.length }} {{ tx.items.length === 1 ? 'producto' : 'productos' }}</span>
                </div>
                <div class="divide-y divide-border-subtle/50">
                  <div v-for="item in tx.items" :key="item.id" class="flex items-center justify-between py-1.5 text-xs">
                    <span class="font-medium text-text">{{ item.product }}</span>
                    <div class="flex items-center gap-5 text-text-secondary tabular-nums">
                      <span>Cantidad: <strong class="text-text">{{ item.quantity }}</strong></span>
                      <span>Precio unit.: <strong class="text-text">{{ formatUSD(item.unitPrice) }}</strong></span>
                      <span>Total: <strong class="text-success font-semibold">{{ formatUSD(item.total) }}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </template>
      <template #mobile-cards="{ items }">
        <div v-for="tx in items" :key="tx.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm" @click="tx.items && tx.items.length > 0 && toggleExpand(tx.id)">
          <div class="flex items-center justify-between"><span class="text-xs text-text-muted">{{ tx.date }}</span><span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', tx.type === 'ingreso' ? 'bg-success/10 text-success' : tx.type === 'nomina' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger']">{{ tx.type === 'ingreso' ? (tx.items ? 'Factura' : 'Ingreso') : tx.type === 'nomina' ? 'Nomina' : 'Gasto' }}</span></div>
          <div class="font-medium text-text flex items-center justify-between">
            <span>{{ tx.description }}</span>
            <svg v-if="tx.items && tx.items.length > 0" :class="['h-3.5 w-3.5 text-text-muted transition-transform duration-200', expandedIds.has(tx.id) ? 'rotate-180 text-primary' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div class="text-[11px] text-text-muted">{{ tx.sourceLabel }}</div>
          <div class="flex items-center justify-between text-xs"><span class="text-text-muted">{{ tx.method }}</span><div class="text-right"><span class="font-semibold" :class="tx.type === 'ingreso' ? 'text-success' : 'text-danger'">{{ tx.type === 'ingreso' ? '' : '-' }}{{ tx._currency === 'VES' ? formatVESEs(tx._originalAmount ?? tx.amount) : formatUSD(tx.amount) }}</span><span class="text-text-muted ml-1">{{ tx._currency === 'VES' ? formatUSD(tx.amount) : formatSecondary(tx.amount, tx.exchangeRateUsed) }}</span></div></div>
          <div v-if="tx.items && tx.items.length > 0 && expandedIds.has(tx.id)" class="mt-2 pt-2 border-t border-border-subtle space-y-1.5 bg-surface/50 p-2 rounded-lg">
            <div v-for="item in tx.items" :key="item.id" class="flex items-center justify-between text-xs py-1 border-b border-border-subtle/30 last:border-0">
              <span class="font-medium text-text">{{ item.product }}</span>
              <div class="text-right">
                <span class="text-text-muted mr-2">{{ item.quantity }} x {{ formatUSD(item.unitPrice) }}</span>
                <span class="font-semibold text-success tabular-nums">{{ formatUSD(item.total) }}</span>
              </div>
            </div>
          </div>
          <div v-if="tx.type === 'ingreso' && !tx.items" class="flex items-center justify-end gap-1 pt-1 border-t border-border-subtle"><button @click="editCobroFromTx(tx)" class="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">Editar</button><button @click="summaryCtx.confirmDeleteTransaction(tx.id)" class="rounded-md bg-danger/10 px-2 py-1 text-xs text-danger">Eliminar</button></div>
        </div>
      </template>
    </RecordSection>
  </section>

  <EditCobroModal :show="summaryCtx.showEditModal.value" :summary-ctx="summaryCtx" @close="summaryCtx.cancelEdit()" />

  <CobroActionsModal
    :show="cobroActionsShow"
    :cita="cobroActionsCita"
    :payment-data="cobroActionsPayment"
    :transaction-ids="cobroActionsTxIds"
    @close="cobroActionsShow = false"
    @rollback="handleRollbackCobro"
    @delete="handleDeleteCobroAction"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/common/useAuth'
import { useCurrency } from '../composables/common/useCurrency'
import { useBusinessStore } from '../store/business'
import { isTiendaNiche } from '../config/niches'
import { isAdminPanelRole } from '../constants/roles'
import { useFinancialSummary } from '../composables/finanzas/useFinancialSummary'
import { db } from '../lib/api'
import { APPOINTMENT_SELECT } from '../services/agendaService'
import { mapAppointmentToCita } from '../mappers/agendaMapper'
import { type Cita, type PaymentEditContext } from '../types/cita'
import { useQueryClient } from '@tanstack/vue-query'
import { translateError } from '../lib/errors'
import { useNotification } from '../composables/common/useNotification'

const fmtDate = (d: string) => formatDate(d)
import { useExpenses } from '../composables/finanzas/useExpenses'
import { useEmployeePayments } from '../composables/empleados/useEmployeePayments'
import { formatMethod, formatDate } from '../lib/formatters'
import RecordSection from '../components/finanzas/RecordSection.vue'
import EditCobroModal from '../components/finanzas/EditCobroModal.vue'
import CobroActionsModal from '../components/finanzas/CobroActionsModal.vue'

type PeriodValue = 'day' | 'custom' | 'week' | 'month' | 'quarter' | 'year'
type TipoRegistros = 'gastos' | 'pagos' | 'transacciones' | 'cobros' | 'ventas-productos'

const route = useRoute()
const router = useRouter()
const { authStore } = useAuth()
const businessStore = useBusinessStore()
const { formatUSD, formatSecondary, formatVESEs, formatEmployeeSecondary } = useCurrency()
const terminology = businessStore.terminology
const isTienda = computed(() => isTiendaNiche(businessStore.nicheType))
const isTiendaEmployee = computed(() => isTienda.value && !isAdminPanelRole(authStore.role ?? undefined))

const selectedPeriod = ref<PeriodValue>('month')
const selectedMonth = ref<string>(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)

watch(() => route.query.period, (value) => { if (value === 'quarter' || value === 'year' || value === 'month') selectedPeriod.value = value; else selectedPeriod.value = 'month' }, { immediate: true })
watch(() => route.query.month, (value) => { if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) selectedMonth.value = value }, { immediate: true })

const tipo = computed<TipoRegistros>(() => {
  const raw = route.params.tipo; if (raw === 'gastos' || raw === 'pagos' || raw === 'transacciones' || raw === 'cobros' || raw === 'ventas-productos') return raw; return 'transacciones'
})

watch(
  [tipo, isTiendaEmployee],
  ([currentTipo, hideEgresos]) => {
    if (hideEgresos && (currentTipo === 'gastos' || currentTipo === 'pagos')) {
      router.replace({ name: 'admin-finanzas' })
    }
  },
  { immediate: true },
)

const businessId = computed(() => authStore.businessId)
const periodDates = computed(() => {
  const today = new Date()
  const toYmd = (d: Date) => { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${dd}` }
  return { start: toYmd(new Date(today.getFullYear(), 0, 1)), end: toYmd(today) }
})

const expensesCtx = useExpenses(businessId, selectedPeriod, selectedMonth)
const summaryCtx = useFinancialSummary(businessId, selectedPeriod, expensesCtx.expenses, selectedMonth)

const expandedIds = ref<Set<string>>(new Set())
const toggleExpand = (id: string) => {
  const s = new Set(expandedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedIds.value = s
}

const originalStartEdit = summaryCtx.startEdit
summaryCtx.startEdit = (tx: any) => {
  if (tx.appointmentId || tx.appointment_id || tx.source === 'product_sale' || tx.items) {
    openCobroActions(tx)
  } else {
    originalStartEdit(tx)
  }
}

const cobroActionsShow = ref(false)
const cobroActionsCita = ref<Cita | null>(null)
const cobroActionsPayment = ref<PaymentEditContext | null>(null)
const cobroActionsTxIds = ref<string[]>([])

const queryClient = useQueryClient()
const { success, error: showError } = useNotification()

const openCobroActions = async (tx: any) => {
  const appointmentId = tx.appointmentId || tx.appointment_id
  let cita = null
  if (appointmentId) {
    const { data: citaRaw } = await db
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .eq('id', appointmentId)
      .maybeSingle()
    if (citaRaw) {
      cita = mapAppointmentToCita(citaRaw)
    }
  }
  const hasMixed = tx.breakdown && tx.breakdown.length > 1
  const paymentData: PaymentEditContext = {
    transactionId: tx.id,
    method: hasMixed ? 'mixed' : (tx.rawMethod || tx.method),
    amount: tx.amount,
    currency: hasMixed ? 'USD' : (tx.primaryCurrency || 'USD'),
    exchangeRate: tx.exchangeRateUsed || 1,
    tipAmount: tx.tipAmount || 0,
    notes: tx.notes || undefined,
    breakdown: tx.breakdown || undefined,
    appointmentId,
  }

  cobroActionsCita.value = cita
  cobroActionsPayment.value = paymentData
  cobroActionsTxIds.value = tx.transactionIds && tx.transactionIds.length > 0 ? tx.transactionIds : [tx.id]
  cobroActionsShow.value = true
}

const handleRollbackCobro = async (payload: { transactionIds: string[]; appointmentId?: string; prefill: any }) => {
  cobroActionsShow.value = false
  try {
    await Promise.all(payload.transactionIds.map(id =>
      summaryCtx.deleteTransactionMutation.mutateAsync({ transactionId: id }),
    ))
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['pos-pending'], exact: false }),
    ])
    if (payload.prefill) {
      sessionStorage.setItem('posPrefill', JSON.stringify(payload.prefill))
    }
    const queryParams: any = {}
    if (payload.appointmentId) queryParams.appointmentId = payload.appointmentId
    router.push({ name: 'admin-pos', query: queryParams })
  } catch (err) {
    showError(translateError(err, 'Error al eliminar cobro'))
  }
}

const handleDeleteCobroAction = async (transactionIds: string[]) => {
  cobroActionsShow.value = false
  try {
    await Promise.all(transactionIds.map(id =>
      summaryCtx.deleteTransactionMutation.mutateAsync({ transactionId: id }),
    ))
  } catch (err) {
    showError(translateError(err, 'Error al eliminar cobro'))
  }
}

const paymentsCtx = useEmployeePayments(businessId, periodDates)

const title = computed(() => {
  if (tipo.value === 'gastos') return 'Todos los gastos'; if (tipo.value === 'pagos') return 'Todos los pagos a empleados'
  if (tipo.value === 'cobros') return 'Todos los cobros de citas'; if (tipo.value === 'ventas-productos') return 'Todas las ventas de productos'
  return 'Todas las transacciones'
})
const periodLabel = computed(() => {
  if (selectedPeriod.value === 'quarter') return 'trimestral'; if (selectedPeriod.value === 'year') return 'anual'; return `mensual (${selectedMonth.value})`
})
const goBack = () => router.push({ name: 'admin-finanzas', query: { period: selectedPeriod.value, month: selectedMonth.value } })

const activeVentasData = computed(() => isTienda.value ? summaryCtx.productSalesInvoices.value : summaryCtx.productSalesDetails.value)

const pageSize = 10; const currentPage = ref(1)
watch(tipo, () => { currentPage.value = 1 })
const paginate = <T>(data: T[]): T[] => data.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
const paginateProps = <T>(data: T[]) => { const t = data.length; const tp = Math.ceil(t / pageSize); return { total: t, totalPages: tp, start: t ? (currentPage.value - 1) * pageSize + 1 : 0, end: Math.min(currentPage.value * pageSize, t), hasPrev: currentPage.value > 1, hasNext: currentPage.value < tp } }
const nextPage = () => { if (currentPage.value < Math.ceil(getActiveData().length / pageSize)) currentPage.value++ }
const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const getActiveData = (): any[] => { if (tipo.value === 'gastos') return expensesCtx.expenses.value; if (tipo.value === 'cobros') return summaryCtx.appointmentIncomeDetails.value; if (tipo.value === 'ventas-productos') return activeVentasData.value; if (tipo.value === 'pagos') return summaryCtx.employeePayments.value; return summaryCtx.allTransactions.value }

const paginatedGastos = computed(() => paginate(expensesCtx.expenses.value)); const paginatedCobros = computed(() => paginate(summaryCtx.appointmentIncomeDetails.value))
const paginatedVentas = computed(() => paginate(activeVentasData.value)); const paginatedTransacciones = computed(() => paginate(summaryCtx.allTransactions.value))
const gastosPages = computed(() => paginateProps(expensesCtx.expenses.value)); const cobrosPages = computed(() => paginateProps(summaryCtx.appointmentIncomeDetails.value))
const ventasPages = computed(() => paginateProps(activeVentasData.value)); const transaccionesPages = computed(() => paginateProps(summaryCtx.allTransactions.value))

const handleDeletePayment = (_id: string) => {}
const openEditPayment = (_p: any) => {}
const editCobroFromTx = (_tx: any) => { summaryCtx.startEdit(_tx) }
</script>

