<template>
  <ModalBase
    :is-open="isOpen"
    title="Agregar factura de compra"
    subtitle="Registra la mercancía que entra y genera el PDF para verificarla contra la factura física"
    size="xl"
    :is-loading="isSaving"
    confirm-text="Guardar e imprimir"
    loading-text="Guardando..."
    :is-confirm-disabled="!canSubmit"
    @close="handleClose"
    @confirm="handleSubmit"
    @cancel="handleClose"
  >
    <div class="space-y-5">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormInput v-model="form.invoiceNumber" label="N° de factura" placeholder="Ej: 1042" required />
        <FormInput v-model="form.invoiceDate" label="Fecha" type="date" required />
        <FormSearchSelect
          v-model="form.supplierId"
          label="Proveedor (opcional)"
          placeholder="Sin proveedor"
          :options="supplierOptions"
        />
      </div>

      <div v-if="selectedSupplier" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-primary">Proveedor:</span>
          <span class="font-medium text-text">{{ selectedSupplier.company || selectedSupplier.fullName }}</span>
          <span v-if="selectedSupplier.totalDebt > 0" class="rounded px-1.5 py-0.5 text-[10px] font-bold bg-warning/15 text-warning">
            Deuda actual: {{ formatUSD(selectedSupplier.totalDebt) }}
          </span>
          <span v-else class="rounded px-1.5 py-0.5 text-[10px] font-bold bg-success/15 text-success">
            Al día
          </span>
        </div>
        <p class="text-text-muted">
          El total de <strong class="text-text font-semibold">{{ formatUSD(invoiceTotal) }}</strong> se asignará a la deuda del proveedor
        </p>
      </div>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-semibold text-text">Mercancía</p>
          <div class="flex items-center gap-2">
            <button type="button" @click="addNewProductLine"
              class="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-theme hover:bg-primary/20">
              <AddCircleIcon class="h-3.5 w-3.5" />
              Crear producto nuevo
            </button>
            <button type="button" @click="addLine"
              class="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-bold text-text-secondary transition-theme hover:bg-bg-secondary">
              <AddCircleIcon class="h-3.5 w-3.5" />
              Agregar línea
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <div v-for="(line, idx) in lines" :key="line.key" class="rounded-xl border border-border bg-bg-secondary/40 p-3">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
              <div class="sm:col-span-4">
                <FormSearchSelect
                  :model-value="line.productId"
                  @update:model-value="onProductSelect(line, $event as string)"
                  label="Producto"
                  placeholder="Buscar producto..."
                  :options="productOptions"
                />
              </div>
              <div class="sm:col-span-2">
                <FormInput v-model.number="line.quantity" label="Cantidad" type="number" min="0.01" step="0.01" />
              </div>
              <div class="sm:col-span-2">
                <FormInput v-model.number="line.unitCost" label="Costo unitario" type="number" min="0" step="0.01" />
              </div>
              <div class="sm:col-span-3">
                <p class="mb-1.5 text-sm font-medium text-text-secondary">Subtotal</p>
                <p class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text tabular-nums">
                  {{ formatUSD(lineSubtotal(line)) }}
                </p>
              </div>
              <div class="sm:col-span-1 flex sm:justify-end">
                <button type="button" title="Quitar línea" :disabled="lines.length === 1"
                  @click="removeLine(idx)"
                  class="rounded-lg p-2 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40">
                  <TrashBin2Icon class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div v-if="line.productId === NEW_PRODUCT_VALUE" class="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-3">
              <FormInput v-model="line.newProductName" label="Nombre del producto nuevo" required />
              <FormInput v-model="line.newProductSku" label="SKU (opcional)" />
              <FormInput v-model="line.newProductUnit" label="Unidad" placeholder="unidad" />
            </div>
          </div>
        </div>
      </div>

      <FormTextarea v-model="form.notes" label="Notas (opcional)" :rows="2" />

      <div class="flex items-center justify-end gap-2 rounded-xl bg-bg-secondary px-4 py-3">
        <span class="text-sm text-text-secondary">Total de la factura</span>
        <span class="text-lg font-bold tabular-nums text-text">{{ formatUSD(invoiceTotal) }}</span>
      </div>
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { AddCircleIcon, TrashBin2Icon } from '@solar-icons/vue/linear'
import { useModal } from '../../composables/common/useModal'
import { useNotification } from '../../composables/common/useNotification'
import { useCurrency } from '../../composables/common/useCurrency'
import { useAuth } from '../../composables/common/useAuth'
import { useBusinessStore } from '../../store/business'
import ModalBase from '../common/ModalBase.vue'
import { FormInput, FormSearchSelect, FormTextarea } from '../forms'
import { listProductos, productosKeys } from '../../services/productosService'
import { listSuppliers, supplierKeys } from '../../services/suppliersService'
import { createPurchaseInvoice, purchaseInvoiceKeys, type PurchaseInvoiceLineInput } from '../../services/purchaseInvoiceService'
import { inventarioKeys } from '../../services/inventarioService'
import { printPurchaseInvoice } from '../../lib/purchaseInvoicePrint'

const MODAL_ID = 'purchase-invoice-modal'
const { isOpen, close } = useModal(MODAL_ID)
const { success, error: showError } = useNotification()
const { formatUSD } = useCurrency()
const { authStore } = useAuth()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()

const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const NEW_PRODUCT_VALUE = '__new__'

const { data: productos } = useQuery({
  queryKey: computed(() => productosKeys.all(businessId.value, branchId.value)),
  queryFn: () => listProductos(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value && isOpen.value),
})

const { data: suppliers } = useQuery({
  queryKey: computed(() => supplierKeys.all(businessId.value, branchId.value)),
  queryFn: () => listSuppliers(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value && isOpen.value),
})

const productOptions = computed(() => [
  { value: NEW_PRODUCT_VALUE, label: '+ Producto nuevo' },
  ...(productos.value ?? []).map(p => ({ value: p.id, label: p.sku ? `${p.name} (${p.sku})` : p.name })),
])

const supplierOptions = computed(() => [
  { value: '', label: 'Sin proveedor' },
  ...(suppliers.value ?? []).map(s => ({ value: s.id, label: s.company || s.fullName })),
])

const selectedSupplier = computed(() =>
  form.value.supplierId ? (suppliers.value ?? []).find(s => s.id === form.value.supplierId) : null
)

interface LineDraft {
  key: string
  productId: string
  newProductName: string
  newProductSku: string
  newProductUnit: string
  quantity: number | null
  unitCost: number | null
}

let lineKeyCounter = 0
const emptyLine = (): LineDraft => ({
  key: `line-${++lineKeyCounter}`,
  productId: '',
  newProductName: '',
  newProductSku: '',
  newProductUnit: 'unidad',
  quantity: null,
  unitCost: null,
})

const form = ref({
  supplierId: '',
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  notes: '',
})

const lines = ref<LineDraft[]>([emptyLine()])
const isSaving = ref(false)

watch(isOpen, (open) => {
  if (open) {
    form.value = {
      supplierId: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      notes: '',
    }
    lines.value = [emptyLine()]
  }
})

const addLine = () => { lines.value.push(emptyLine()) }
const addNewProductLine = () => {
  const line = emptyLine()
  line.productId = NEW_PRODUCT_VALUE
  lines.value.push(line)
}
const removeLine = (idx: number) => {
  if (lines.value.length === 1) return
  lines.value.splice(idx, 1)
}

// Selecting a product prefills its current cost so the admin isn't retyping it every time — but
// it stays a plain editable number afterward, since this invoice's actual cost can differ from
// the product's last recorded one.
const onProductSelect = (line: LineDraft, value: string) => {
  line.productId = value
  if (value && value !== NEW_PRODUCT_VALUE) {
    const product = (productos.value ?? []).find(p => p.id === value)
    if (product) line.unitCost = product.unitCost
  }
}

const lineSubtotal = (line: LineDraft) => (Number(line.quantity) || 0) * (Number(line.unitCost) || 0)
const invoiceTotal = computed(() => lines.value.reduce((sum, l) => sum + lineSubtotal(l), 0))

const isLineValid = (line: LineDraft) => {
  if (!line.quantity || line.quantity <= 0) return false
  if (line.productId === NEW_PRODUCT_VALUE) return line.newProductName.trim().length > 0
  return !!line.productId
}

const canSubmit = computed(() =>
  form.value.invoiceNumber.trim().length > 0 &&
  form.value.invoiceDate.length > 0 &&
  lines.value.length > 0 &&
  lines.value.every(isLineValid),
)

const handleClose = () => {
  if (isSaving.value) return
  close()
}

const handleSubmit = async () => {
  if (!canSubmit.value || isSaving.value) return
  isSaving.value = true

  try {
    const markup1 = businessStore.business?.product_price1_markup ?? 50
    const markup2 = businessStore.business?.product_price2_markup ?? 70

    const items: PurchaseInvoiceLineInput[] = lines.value.map(line => {
      const unitCost = Number(line.unitCost) || 0
      if (line.productId === NEW_PRODUCT_VALUE) {
        return {
          newProduct: {
            name: line.newProductName.trim(),
            sku: line.newProductSku.trim() || null,
            unit: line.newProductUnit.trim() || 'unidad',
            unitPrice: Number((unitCost * (1 + markup1 / 100)).toFixed(2)),
            unitPrice2: Number((unitCost * (1 + markup2 / 100)).toFixed(2)),
          },
          quantity: Number(line.quantity),
          unitCost,
        }
      }
      return {
        productId: line.productId,
        quantity: Number(line.quantity),
        unitCost,
      }
    })

    const invoice = await createPurchaseInvoice({
      supplierId: form.value.supplierId || null,
      invoiceNumber: form.value.invoiceNumber.trim(),
      invoiceDate: form.value.invoiceDate,
      branchId: branchId.value,
      notes: form.value.notes.trim() || null,
      items,
    })

    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: productosKeys.all(businessId.value, branchId.value) }),
      queryClient.invalidateQueries({ queryKey: inventarioKeys.all(businessId.value, branchId.value) }),
      queryClient.invalidateQueries({ queryKey: inventarioKeys.movements(businessId.value, branchId.value) }),
      queryClient.invalidateQueries({ queryKey: purchaseInvoiceKeys.all(businessId.value), exact: false }),
      queryClient.invalidateQueries({ queryKey: supplierKeys.all(businessId.value, branchId.value), exact: false }),
      queryClient.invalidateQueries({ queryKey: ['suppliers'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'], exact: false }),
    ])

    printPurchaseInvoice(invoice, businessStore.business?.name || 'Negocio')
    if (form.value.supplierId) {
      success(`Factura #${invoice.invoiceNumber} registrada y asignada a la deuda del proveedor`)
    } else {
      success(`Factura #${invoice.invoiceNumber} registrada`)
    }
    close()
  } catch (err: any) {
    showError(err?.message || 'Error al registrar la factura')
  } finally {
    isSaving.value = false
  }
}

const open = () => {
  useModal(MODAL_ID).open()
}

defineExpose({ open, close, isOpen })
</script>
