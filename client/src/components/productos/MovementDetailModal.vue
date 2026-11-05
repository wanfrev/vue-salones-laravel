<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4" data-testid="movement-detail" @click.self="emit('close')">
      <div role="dialog" aria-modal="true" :aria-label="`Detalle del movimiento de ${movement.product_name}`"
        class="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl">
        <header class="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wider" :class="typeTone(movement.type).text">{{ formatMovementType(movement.type) }}</p>
            <h2 class="truncate text-lg font-semibold text-text">{{ movement.product_name }}<span v-if="movement.variant_name" class="ml-1.5 text-sm font-normal text-text-muted">({{ movement.variant_name }})</span></h2>
            <p class="text-xs text-text-muted">{{ formatDateTime(movement.date) }}</p>
          </div>
          <p class="shrink-0 text-2xl font-bold tabular-nums" :class="movement.quantity < 0 ? 'text-danger' : 'text-success'" data-testid="detail-quantity">{{ signedQty(movement.quantity) }}</p>
        </header>

        <div class="scroll-thin flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div v-for="row in facts" :key="row.label" :class="row.wide ? 'col-span-2' : ''">
              <dt class="text-[11px] font-bold uppercase tracking-wider text-text-muted">{{ row.label }}</dt>
              <dd class="mt-0.5 break-words text-text">{{ row.value }}</dd>
            </div>
          </dl>

          <section v-if="movement.notes" data-testid="detail-notes">
            <h3 class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Nota</h3>
            <p class="mt-0.5 whitespace-pre-line text-sm text-text">{{ movement.notes }}</p>
          </section>

          <section data-testid="detail-origin">
            <h3 class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Origen · {{ originLabel(movement.reference_type) }}</h3>
            <div v-if="isLoading" class="mt-2 h-4 w-48 animate-pulse rounded bg-bg-secondary" aria-busy="true" />
            <p v-else-if="error" class="mt-1 text-sm text-danger" role="alert">No se pudo cargar el origen. <button type="button" class="font-semibold text-primary" @click="refetch()">Reintentar</button></p>
            <p v-else-if="source?.missing" class="mt-1 text-sm text-text-muted">El registro de origen ya no existe (se eliminó después).</p>
            <dl v-else-if="sourceFacts.length" class="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div v-for="row in sourceFacts" :key="row.label">
                <dt class="text-xs text-text-muted">{{ row.label }}</dt>
                <dd class="text-text">{{ row.value }}</dd>
              </div>
            </dl>
            <p v-else class="mt-1 text-sm text-text-muted">Se registró a mano, sin una venta o compra detrás.</p>
          </section>

          <section v-if="related.length" data-testid="detail-related">
            <h3 class="text-[11px] font-bold uppercase tracking-wider text-text-muted">Otros movimientos de la misma operación</h3>
            <ul class="mt-1.5 divide-y divide-border-subtle rounded-lg border border-border-subtle text-sm">
              <li v-for="r in related" :key="r.id" class="flex items-center justify-between gap-3 px-3 py-2">
                <span class="min-w-0 truncate text-text">{{ r.product_name }}<span v-if="r.variant_name" class="text-text-muted"> ({{ r.variant_name }})</span>
                  <span class="block text-xs text-text-muted">{{ formatMovementType(r.type) }}<template v-if="r.branch_name"> · {{ r.branch_name }}</template></span></span>
                <span class="shrink-0 font-medium tabular-nums" :class="r.quantity < 0 ? 'text-danger' : 'text-success'">{{ signedQty(r.quantity) }}</span>
              </li>
            </ul>
          </section>
        </div>

        <footer class="flex flex-wrap justify-end gap-2 border-t border-border-subtle px-5 py-3">
          <button type="button" data-testid="detail-filter-product"
            class="rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-secondary"
            @click="emit('filter-product', movement.product_id, movement.product_name)">Ver solo este producto</button>
          <button type="button" class="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-text-inverse hover:bg-primary-hover" @click="emit('close')">Cerrar</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { formatDate, formatDateTime, formatMethod, formatMovementType, getStatusLabel } from '../../lib/formatters'
import { useMovementDetail, type MovementRow } from '../../composables/inventory/useInventoryMovements'
import { originLabel, personLabel, signedQty, typeTone } from './inventoryMovements'

const props = defineProps<{ movement: MovementRow }>()
const emit = defineEmits<{ close: []; 'filter-product': [productId: string, name: string] }>()

const { data, isLoading, error, refetch } = useMovementDetail(computed(() => props.movement.id))
const source = computed(() => data.value?.source ?? null)
const related = computed(() => data.value?.related ?? [])

const money = (n: number) => `$${n.toFixed(2)}`
type Fact = { label: string; value: string; wide?: boolean }

// Lo que ya se sabe de la fila (sin esperar al servidor).
const facts = computed<Fact[]>(() => {
  const m = props.movement
  const rows: (Fact | null)[] = [
    { label: 'Costo unitario', value: money(m.unit_cost) },
    { label: 'Costo total', value: money(m.total_cost) },
    { label: 'Registrado por', value: m.user_name ?? 'No se sabe' },
    m.person_name ? { label: `${personLabel(m.person_role)} al que afecta`, value: m.person_name } : null,
    m.category_name ? { label: 'Categoría', value: m.category_name } : null,
    m.product_sku ? { label: 'SKU', value: m.product_sku } : null,
    m.branch_name ? { label: 'Sucursal', value: m.branch_name } : null,
    m.location_name ? { label: 'Ubicación', value: m.location_name } : null,
  ]
  return rows.filter((r): r is Fact => r !== null)
})

// El origen, según de dónde viene (cita, venta directa, pago al empleado, factura de compra).
const sourceFacts = computed<Fact[]>(() => {
  const s = source.value
  if (!s || s.missing) return []
  const rows: (Fact | null)[] = []
  if (s.kind === 'appointment') {
    rows.push(
      s.service ? { label: 'Servicio', value: s.service } : null,
      s.client ? { label: 'Cliente', value: s.client } : null,
      s.employee ? { label: 'Profesional', value: s.employee } : null,
      s.date ? { label: 'Fecha de la cita', value: formatDateTime(s.date) } : null,
      s.status ? { label: 'Estado', value: getStatusLabel(s.status) } : null,
    )
  } else if (s.kind === 'sale') {
    rows.push(
      { label: 'Método de pago', value: formatMethod(s.method) },
      { label: 'Total cobrado', value: money(s.total) },
      s.date ? { label: 'Fecha de la venta', value: formatDateTime(s.date) } : null,
    )
  } else if (s.kind === 'employee_payment') {
    rows.push(
      s.employee ? { label: 'Empleado', value: s.employee } : null,
      { label: 'Tipo', value: s.type === 'consumption' ? 'Consumo' : 'Pago' },
      s.concept ? { label: 'Concepto', value: s.concept } : null,
      { label: 'Monto', value: money(s.amount) },
      s.date ? { label: 'Fecha', value: formatDate(s.date) } : null,
      s.notes ? { label: 'Notas', value: s.notes } : null,
    )
  } else if (s.kind === 'purchase_invoice') {
    rows.push(
      s.supplier ? { label: 'Proveedor', value: s.supplier } : null,
      s.invoice_number ? { label: 'N.º de factura', value: s.invoice_number } : null,
      s.date ? { label: 'Fecha de la factura', value: formatDate(s.date) } : null,
      { label: 'Total de la factura', value: money(s.total) },
    )
  }
  return rows.filter((r): r is Fact => r !== null)
})

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
