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
            <div class="text-xs text-text-muted">{{ expense.currency === 'VES' ? formatUSD(expense.amount) : formatVESInline(expense.amount, expense.exchangeRateUsed) + ' Bs' }}</div>
          </td>
          <td class="py-3 text-center"><button @click="expensesCtx.handleDelete(expense.id)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
        </tr>
      </template>
      <template #mobile-cards="{ items }">
        <div v-for="expense in items" :key="expense.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
          <div class="flex items-center justify-between"><span class="text-xs text-text-muted">{{ expense.date }}</span><button @click="expensesCtx.handleDelete(expense.id)" class="rounded-lg p-1 text-text-muted hover:bg-danger/10 hover:text-danger"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
          <div class="font-medium text-text">{{ expense.name }}</div>
          <div class="flex items-center justify-between text-xs"><span class="text-text-muted">{{ expense.category }}</span><div class="text-right"><span class="font-semibold text-danger">{{ expense.currency === 'VES' ? formatVESEs(expense.originalAmount) : formatUSD(expense.amount) }}</span><span class="text-text-muted ml-1">{{ expense.currency === 'VES' ? formatUSD(expense.amount) : formatVESInline(expense.amount, expense.exchangeRateUsed) + ' Bs' }}</span></div></div>
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
            <tr v-for="ep in paymentsCtx.paymentsMade.value" :key="ep.id" class="text-sm transition-theme hover:bg-bg-secondary/50"><td class="py-3 text-text-secondary whitespace-nowrap">{{ fmtDate(ep.paymentDate) }}</td><td class="py-3 font-medium text-text">{{ ep.employeeName }}</td><td class="py-3 text-text-secondary">{{ formatMethod(ep.paymentMethod) }}</td><td class="py-3 text-right"><div class="font-medium text-danger">{{ ep.currency === 'VES' ? formatVESEs(ep.originalAmount) : formatUSD(ep.amount) }}</div><div class="text-xs text-text-muted">{{ ep.currency === 'VES' ? formatUSD(ep.amount) : formatEmployeeVESInline(ep.amount, ep.exchangeRateUsed) + ' Bs' }}</div></td>
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
        <tr v-for="row in items" :key="row.id" class="text-sm transition-theme hover:bg-bg-secondary/50"><td class="py-3 text-text-secondary whitespace-nowrap">{{ row.date }}</td><td class="py-3 font-medium text-text">{{ row.client }}</td><td class="py-3 text-text">{{ row.employee }}</td><td class="py-3 text-text-secondary">{{ row.service }}</td><td class="py-3 text-text-secondary hidden md:table-cell max-w-[160px]"><span v-if="row.notes" class="truncate block" :title="row.notes">{{ row.notes }}</span><span v-else class="text-text-muted/40">—</span></td><td class="py-3 text-text-secondary">{{ row.method }}</td><td class="py-3 text-right"><div class="font-medium text-success">{{ row.primaryCurrency === 'VES' ? formatVESEs(row.primaryAmount) : formatUSD(row.amount) }}</div><div class="text-[10px] text-text-muted mt-0.5">{{ row.primaryCurrency === 'VES' ? formatUSD(row.amount) : formatVESInline(row.amount, row.exchangeRateUsed) + ' Bs' }}</div><span v-if="(row.tipAmount ?? 0) > 0" class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mt-1">+${{ (row.tipAmount ?? 0).toFixed(2) }} propina</span></td>
          <td class="py-3 text-right"><div class="flex items-center gap-1 justify-end"><button @click="summaryCtx.startEdit(row)" :disabled="summaryCtx.editTransactionMutation.isPending.value || summaryCtx.deleteTransactionMutation.isPending.value" class="rounded-md bg-primary/10 p-1.5 text-primary transition-theme hover:bg-primary/20" title="Editar"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button @click="summaryCtx.confirmDeleteTransaction(row.id)" :disabled="summaryCtx.editTransactionMutation.isPending.value || summaryCtx.deleteTransactionMutation.isPending.value" class="rounded-md bg-danger/10 p-1.5 text-danger transition-theme hover:bg-danger/20" title="Eliminar"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></td></tr>
      </template>
      <template #mobile-cards="{ items }">
        <div v-for="row in items" :key="row.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
          <div class="flex items-center justify-between"><span class="text-xs text-text-muted">{{ row.date }}</span><div class="flex items-center gap-1"><button @click="summaryCtx.startEdit(row)" class="rounded-md bg-primary/10 p-1 text-primary"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button @click="summaryCtx.confirmDeleteTransaction(row.id)" class="rounded-md bg-danger/10 p-1 text-danger"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></div>
          <div class="font-medium text-text">{{ row.client }}</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><span class="text-text-muted">Empleado</span><span class="text-text text-right">{{ row.employee }}</span><span class="text-text-muted">Servicio</span><span class="text-text text-right">{{ row.service }}</span><span class="text-text-muted">Método</span><span class="text-text text-right">{{ row.method }}</span><template v-if="row.notes"><span class="text-text-muted">Notas</span><span class="text-text text-right truncate max-w-[180px]" :title="row.notes">{{ row.notes }}</span></template><span class="text-text-muted">Monto</span><span class="text-right"><span class="font-semibold text-success">{{ row.primaryCurrency === 'VES' ? formatVESEs(row.primaryAmount) : formatUSD(row.amount) }}</span><span class="text-text-muted ml-1">{{ row.primaryCurrency === 'VES' ? formatUSD(row.amount) : formatVESInline(row.amount, row.exchangeRateUsed) + ' Bs' }}</span></span><template v-if="(row.tipAmount ?? 0) > 0"><span class="text-text-muted">Propina</span><span class="text-right font-semibold text-primary">${{ (row.tipAmount ?? 0).toFixed(2) }}</span></template></div>
        </div>
      </template>
    </RecordSection>

    <!-- Ventas productos -->
    <RecordSection v-else-if="tipo === 'ventas-productos'" title="Ventas de productos del periodo" :items="paginatedVentas" :total-count="summaryCtx.productSalesDetails.value.length" empty-message="No hay ventas de productos en este periodo." :pages="ventasPages" :page-size="pageSize" @prev="prevPage" @next="nextPage">
      <template #desktop-thead><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Fecha</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted hidden sm:table-cell">Cliente</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Producto</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Cantidad</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Precio unit.</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Método</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Total</th><th class="pb-3 text-center text-xs font-semibold uppercase text-text-muted w-10"></th></template>
      <template #desktop-tbody="{ items }">
        <tr v-for="row in items" :key="row.id" class="text-sm transition-theme hover:bg-bg-secondary/50"><td class="py-3 text-text-secondary whitespace-nowrap">{{ row.date }}</td><td class="py-3 text-text-secondary hidden sm:table-cell">{{ row.clientName || '—' }}</td><td class="py-3 font-medium text-text">{{ row.product }}</td><td class="py-3 text-right text-text">{{ row.quantity }}</td><td class="py-3 text-right text-text whitespace-nowrap">{{ formatUSD(row.unitPrice) }}</td><td class="py-3 text-text-secondary"><span v-if="row.paymentMethod === 'mixed'" class="font-medium text-warning">Mixto</span><span v-else>{{ formatMethod(row.paymentMethod) }}</span><div v-if="row.paymentMethod === 'mixed' && row.breakdown && row.breakdown.length > 1" class="text-[10px] text-text-muted mt-0.5"><span v-for="(b, bi) in row.breakdown" :key="bi">{{ formatMethod(b.method) }} {{ b.currency === 'VES' ? b.inputAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' Bs' : '$' + b.inputAmount.toFixed(2) }}<span v-if="bi < row.breakdown.length - 1"> / </span></span></div></td><td class="py-3 text-right font-medium text-success whitespace-nowrap"><div>{{ row.currency === 'VES' ? formatVESEs(row.originalAmount) : formatUSD(row.total) }}</div><div class="text-[10px] text-text-muted mt-0.5">{{ row.currency === 'VES' ? formatUSD(row.total) : formatVESInline(row.total, row.exchangeRateUsed) + ' Bs' }}</div></td>
        <td class="py-3 text-center"><button @click="summaryCtx.handleDeleteProductSale(row.id, row.product)" class="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-danger/10 hover:text-danger transition-colors" title="Eliminar venta"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td></tr>
      </template>
      <template #mobile-cards="{ items }">
        <div v-for="row in items" :key="row.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
          <div class="flex items-center justify-between"><span class="text-xs text-text-muted">{{ row.date }}</span><span class="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">{{ row.currency === 'VES' ? formatVESEs(row.originalAmount) : formatUSD(row.total) }}</span></div>
          <div v-if="row.clientName" class="text-xs text-text-muted">{{ row.clientName }}</div>
          <div class="font-medium text-text">{{ row.product }}</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><span class="text-text-muted">Cantidad</span><span class="text-text text-right">{{ row.quantity }}</span><span class="text-text-muted">Precio unit.</span><span class="text-text text-right">{{ formatUSD(row.unitPrice) }}</span><span class="text-text-muted">Método</span><span class="text-text text-right"><span v-if="row.paymentMethod === 'mixed'" class="font-medium text-warning">Mixto</span><span v-else>{{ formatMethod(row.paymentMethod) }}</span></span></div>
          <div v-if="row.paymentMethod === 'mixed' && row.breakdown && row.breakdown.length > 1" class="text-[10px] text-text-muted"><span v-for="(b, bi) in row.breakdown" :key="bi">{{ formatMethod(b.method) }} {{ b.currency === 'VES' ? b.inputAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' Bs' : '$' + b.inputAmount.toFixed(2) }}<span v-if="bi < row.breakdown.length - 1"> / </span></span></div>
          <button @click="summaryCtx.handleDeleteProductSale(row.id, row.product)" class="flex items-center justify-center gap-1 w-full rounded-lg py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors mt-1"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Eliminar venta</button>
        </div>
      </template>
    </RecordSection>

    <!-- Transacciones -->
    <RecordSection v-else title="Transacciones del periodo" :items="paginatedTransacciones" :total-count="summaryCtx.allTransactions.value.length" empty-message="No hay transacciones en este periodo." :pages="transaccionesPages" :page-size="pageSize" @prev="prevPage" @next="nextPage">
      <template #desktop-thead><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Fecha</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Descripción</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Empleado</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Tipo</th><th class="pb-3 text-left text-xs font-semibold uppercase text-text-muted">Método</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Monto</th><th class="pb-3 text-right text-xs font-semibold uppercase text-text-muted">Acciones</th></template>
      <template #desktop-tbody="{ items }">
        <tr v-for="tx in items" :key="tx.id" class="text-sm transition-theme hover:bg-bg-secondary/50"><td class="py-3 text-text-secondary whitespace-nowrap">{{ tx.date }}</td><td class="py-3 font-medium text-text"><div>{{ tx.description }}</div><div class="text-[11px] text-text-muted mt-0.5">{{ tx.sourceLabel }}</div></td><td class="py-3 text-text-secondary">{{ tx.employee || '—' }}</td><td class="py-3"><span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', tx.type === 'ingreso' ? 'bg-success/10 text-success' : tx.type === 'nomina' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger']">{{ tx.type === 'ingreso' ? (tx.source === 'product_sale' ? 'Venta' : 'Ingreso') : tx.type === 'nomina' ? 'Nomina' : 'Gasto' }}</span></td><td class="py-3 text-text-secondary">{{ tx.method }}</td><td class="py-3 text-right" :class="tx.type === 'ingreso' ? 'text-success' : 'text-danger'"><div class="font-medium">{{ tx.type === 'ingreso' ? '' : '-' }}{{ tx._currency === 'VES' ? formatVESEs(tx._originalAmount ?? tx.amount) : formatUSD(tx.amount) }}</div><div class="text-[10px] text-text-muted mt-0.5">{{ tx._currency === 'VES' ? formatUSD(tx.amount) : formatVESInline(tx.amount, tx.exchangeRateUsed) + ' Bs' }}</div><span v-if="tx.type === 'ingreso' && (tx.tipAmount ?? 0) > 0" class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mt-1">+${{ (tx.tipAmount ?? 0).toFixed(2) }} propina</span></td>
        <td class="py-3 text-right"><div v-if="tx.type === 'ingreso'" class="flex items-center gap-1 justify-end"><button @click="editCobroFromTx(tx)" class="rounded-md bg-primary/10 p-1.5 text-primary transition-theme hover:bg-primary/20"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button @click="summaryCtx.confirmDeleteTransaction(tx.id)" class="rounded-md bg-danger/10 p-1.5 text-danger transition-theme hover:bg-danger/20"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div><span v-else class="text-xs text-text-muted">—</span></td></tr>
      </template>
      <template #mobile-cards="{ items }">
        <div v-for="tx in items" :key="tx.id" class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
          <div class="flex items-center justify-between"><span class="text-xs text-text-muted">{{ tx.date }}</span><span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', tx.type === 'ingreso' ? 'bg-success/10 text-success' : tx.type === 'nomina' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger']">{{ tx.type === 'ingreso' ? 'Ingreso' : tx.type === 'nomina' ? 'Nomina' : 'Gasto' }}</span></div>
          <div class="font-medium text-text">{{ tx.description }}</div>
          <div class="text-[11px] text-text-muted">{{ tx.sourceLabel }}</div>
          <div class="flex items-center justify-between text-xs"><span class="text-text-muted">{{ tx.method }}</span><div class="text-right"><span class="font-semibold" :class="tx.type === 'ingreso' ? 'text-success' : 'text-danger'">{{ tx.type === 'ingreso' ? '' : '-' }}{{ tx._currency === 'VES' ? formatVESEs(tx._originalAmount ?? tx.amount) : formatUSD(tx.amount) }}</span><span class="text-text-muted ml-1">{{ tx._currency === 'VES' ? formatUSD(tx.amount) : formatVESInline(tx.amount, tx.exchangeRateUsed) + ' Bs' }}</span></div></div>
          <div v-if="tx.type === 'ingreso' && (tx.tipAmount ?? 0) > 0" class="text-right"><span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">+${{ (tx.tipAmount ?? 0).toFixed(2) }} propina</span></div>
          <div v-if="tx.type === 'ingreso'" class="flex items-center justify-end gap-1 pt-1 border-t border-border-subtle"><button @click="editCobroFromTx(tx)" class="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">Editar</button><button @click="summaryCtx.confirmDeleteTransaction(tx.id)" class="rounded-md bg-danger/10 px-2 py-1 text-xs text-danger">Eliminar</button></div>
        </div>
      </template>
    </RecordSection>
  </section>

  <EditCobroModal :show="summaryCtx.showEditModal.value" :summary-ctx="summaryCtx" @close="summaryCtx.cancelEdit()" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/common/useAuth'
import { useCurrency } from '../composables/common/useCurrency'
import { useBusinessStore } from '../store/business'
import { useFinancialSummary } from '../composables/finanzas/useFinancialSummary'

const fmtDate = (d: string) => {
  try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}` } catch { return d }
}
import { useExpenses } from '../composables/finanzas/useExpenses'
import { useEmployeePayments } from '../composables/empleados/useEmployeePayments'
import { formatMethod } from '../lib/formatters'
import RecordSection from '../components/finanzas/RecordSection.vue'
import EditCobroModal from '../components/finanzas/EditCobroModal.vue'

type PeriodValue = 'month' | 'quarter' | 'year'
type TipoRegistros = 'gastos' | 'pagos' | 'transacciones' | 'cobros' | 'ventas-productos'

const route = useRoute()
const router = useRouter()
const { authStore } = useAuth()
const businessStore = useBusinessStore()
const { formatUSD, formatVESInline, formatVESEs, formatEmployeeVESInline } = useCurrency()
const terminology = businessStore.terminology

const selectedPeriod = ref<PeriodValue>('month')
const selectedMonth = ref<string>(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)

watch(() => route.query.period, (value) => { if (value === 'quarter' || value === 'year' || value === 'month') selectedPeriod.value = value; else selectedPeriod.value = 'month' }, { immediate: true })
watch(() => route.query.month, (value) => { if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) selectedMonth.value = value }, { immediate: true })

const tipo = computed<TipoRegistros>(() => {
  const raw = route.params.tipo; if (raw === 'gastos' || raw === 'pagos' || raw === 'transacciones' || raw === 'cobros' || raw === 'ventas-productos') return raw; return 'transacciones'
})

const businessId = computed(() => authStore.businessId)
const periodDates = computed(() => {
  const today = new Date()
  const toYmd = (d: Date) => { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${dd}` }
  return { start: toYmd(new Date(today.getFullYear(), 0, 1)), end: toYmd(today) }
})

const expensesCtx = useExpenses(businessId, selectedPeriod, selectedMonth)
const summaryCtx = useFinancialSummary(businessId, selectedPeriod, expensesCtx.expenses, selectedMonth)
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

const pageSize = 10; const currentPage = ref(1)
watch(tipo, () => { currentPage.value = 1 })
const paginate = <T>(data: T[]): T[] => data.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
const paginateProps = <T>(data: T[]) => { const t = data.length; const tp = Math.ceil(t / pageSize); return { total: t, totalPages: tp, start: t ? (currentPage.value - 1) * pageSize + 1 : 0, end: Math.min(currentPage.value * pageSize, t), hasPrev: currentPage.value > 1, hasNext: currentPage.value < tp } }
const nextPage = () => { if (currentPage.value < Math.ceil(getActiveData().length / pageSize)) currentPage.value++ }
const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const getActiveData = (): any[] => { if (tipo.value === 'gastos') return expensesCtx.expenses.value; if (tipo.value === 'cobros') return summaryCtx.appointmentIncomeDetails.value; if (tipo.value === 'ventas-productos') return summaryCtx.productSalesDetails.value; if (tipo.value === 'pagos') return summaryCtx.employeePayments.value; return summaryCtx.allTransactions.value }

const paginatedGastos = computed(() => paginate(expensesCtx.expenses.value)); const paginatedCobros = computed(() => paginate(summaryCtx.appointmentIncomeDetails.value))
const paginatedVentas = computed(() => paginate(summaryCtx.productSalesDetails.value)); const paginatedTransacciones = computed(() => paginate(summaryCtx.allTransactions.value))
const gastosPages = computed(() => paginateProps(expensesCtx.expenses.value)); const cobrosPages = computed(() => paginateProps(summaryCtx.appointmentIncomeDetails.value))
const ventasPages = computed(() => paginateProps(summaryCtx.productSalesDetails.value)); const transaccionesPages = computed(() => paginateProps(summaryCtx.allTransactions.value))

const handleDeletePayment = (_id: string) => {}
const openEditPayment = (_p: any) => {}
const editCobroFromTx = (_tx: any) => { if (summaryCtx.startEdit) summaryCtx.startEdit(_tx) }
</script>
