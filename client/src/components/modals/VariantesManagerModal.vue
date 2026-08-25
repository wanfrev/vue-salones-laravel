<template>
  <ModalBase
    :is-open="isOpen"
    title="Variantes del producto"
    :subtitle="producto ? `Talla, color u otras variantes de ${producto.name}` : ''"
    icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    size="xl"
    :show-footer="false"
    @close="close"
  >
    <div class="space-y-6">
      <!-- Atributos del negocio -->
      <div>
        <h4 class="mb-2 text-sm font-semibold text-text">Atributos disponibles</h4>
        <p class="mb-3 text-xs text-text-muted">Se comparten entre todos los productos (ej: Talla, Color).</p>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="attr in attributes"
            :key="attr.id"
            class="rounded-lg border border-border bg-bg-secondary px-3 py-2"
          >
            <p class="text-xs font-semibold text-text">{{ attr.name }}</p>
            <div class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="val in attr.values"
                :key="val.id"
                class="rounded-full bg-surface px-2 py-0.5 text-[11px] text-text-secondary border border-border-subtle"
              >
                {{ val.value }}
              </span>
              <button
                type="button"
                class="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-text-muted hover:border-primary hover:text-primary"
                @click="startAddValue(attr.id)"
              >
                + valor
              </button>
            </div>
            <div v-if="addingValueFor === attr.id" class="mt-2 flex gap-1">
              <input
                v-model="newValueText"
                type="text"
                placeholder="Ej: Rojo"
                class="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
                @keyup.enter="confirmAddValue(attr.id)"
              />
              <button type="button" class="text-xs font-medium text-primary" @click="confirmAddValue(attr.id)">Guardar</button>
            </div>
          </div>

          <div class="rounded-lg border border-dashed border-border px-3 py-2">
            <div v-if="!addingAttribute" class="flex h-full items-center">
              <button type="button" class="text-xs font-medium text-primary" @click="addingAttribute = true">+ Nuevo atributo</button>
            </div>
            <div v-else class="flex gap-1">
              <input
                v-model="newAttributeName"
                type="text"
                placeholder="Ej: Talla"
                class="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
                @keyup.enter="confirmAddAttribute"
              />
              <button type="button" class="text-xs font-medium text-primary" @click="confirmAddAttribute">Guardar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Variantes existentes -->
      <div>
        <h4 class="mb-2 text-sm font-semibold text-text">Variantes de este producto</h4>
        <div v-if="variants.length === 0" class="rounded-lg border border-dashed border-border p-4 text-center text-sm text-text-muted">
          Este producto todavía no tiene variantes.
        </div>
        <div v-else class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-bg-secondary/50 text-xs uppercase tracking-wider text-text-muted">
                <th class="px-3 py-2 text-left">Variante</th>
                <th class="px-3 py-2 text-left">SKU</th>
                <th class="px-3 py-2 text-right">Costo</th>
                <th class="px-3 py-2 text-right">Precio</th>
                <th class="px-3 py-2 text-right">Stock</th>
                <th class="px-3 py-2 text-center">Activa</th>
                <th class="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr v-for="v in variants" :key="v.id">
                <td class="px-3 py-2 font-medium text-text">{{ v.name }}</td>
                <td class="px-3 py-2 font-mono text-xs text-text-muted">{{ v.sku || '—' }}</td>
                <td class="px-3 py-2 text-right tabular-nums">${{ v.unitCost.toFixed(2) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">${{ v.unitPrice.toFixed(2) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ v.availableQty }}</td>
                <td class="px-3 py-2 text-center">
                  <span :class="['inline-block h-2 w-2 rounded-full', v.active ? 'bg-success' : 'bg-text-muted']" />
                </td>
                <td class="px-3 py-2 text-right">
                  <button type="button" class="text-text-muted hover:text-danger" title="Eliminar variante" @click="handleDeleteVariant(v)">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Agregar variante -->
      <div class="rounded-xl border border-border bg-bg-secondary/40 p-4">
        <h4 class="mb-3 text-sm font-semibold text-text">Agregar variante</h4>
        <div v-if="attributes.length === 0" class="text-sm text-text-muted">
          Primero crea al menos un atributo (ej: Talla o Color) arriba.
        </div>
        <div v-else class="space-y-3">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FormDropdown
              v-for="attr in attributes"
              :key="attr.id"
              v-model="newVariant.valueByAttribute[attr.id]"
              :label="attr.name"
              placeholder="Sin definir"
              :options="attr.values.map(v => ({ value: v.id, label: v.value }))"
            />
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <FormInput v-model="newVariant.sku" label="SKU" placeholder="Opcional" />
            <FormInput v-model="newVariant.barcode" label="Código de barras" placeholder="Opcional" />
            <FormInput v-model.number="newVariant.unitCost" label="Costo ($)" type="number" placeholder="0.00" />
            <FormInput v-model.number="newVariant.unitPrice" label="Precio ($)" type="number" placeholder="0.00" />
            <FormInput v-model.number="newVariant.initialStock" label="Stock inicial" type="number" placeholder="0" />
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isCreatingVariant"
              @click="handleCreateVariant"
            >
              {{ isCreatingVariant ? 'Agregando...' : 'Agregar variante' }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-end border-t border-border pt-4">
        <button type="button" class="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary" @click="close">
          Cerrar
        </button>
      </div>
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useModal } from '../../composables/common/useModal'
import { useNotification } from '../../composables/common/useNotification'
import { useAuth } from '../../composables/common/useAuth'
import { useBusinessStore } from '../../store/business'
import {
  listProductAttributes, createProductAttribute, createProductAttributeValue,
  listProductVariants, createProductVariant, deleteProductVariant,
  productVariantsKeys,
} from '../../services/productVariantsService'
import { confirmAction } from '../../lib/confirmDialog'
import ModalBase from '../common/ModalBase.vue'
import { FormInput, FormDropdown } from '../forms'
import type { Producto, ProductVariant } from '../../types/producto'

const MODAL_ID = 'variantes-manager-modal'

const { isOpen, modalData, close } = useModal(MODAL_ID)
const { success, error: showError } = useNotification()
const { authStore } = useAuth()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()

const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)
const producto = computed<Producto | null>(() => modalData.value?.producto ?? null)

const { data: attributesData } = useQuery({
  queryKey: computed(() => productVariantsKeys.attributes(businessId.value)),
  queryFn: () => listProductAttributes(businessId.value!),
  enabled: computed(() => !!businessId.value && isOpen.value),
})
const attributes = computed(() => attributesData.value ?? [])

const { data: variantsData } = useQuery({
  queryKey: computed(() => productVariantsKeys.variants(producto.value?.id)),
  queryFn: () => listProductVariants(businessId.value!, producto.value!.id),
  enabled: computed(() => !!businessId.value && !!producto.value?.id && isOpen.value),
})
const variants = computed<ProductVariant[]>(() => variantsData.value ?? [])

const addingAttribute = ref(false)
const newAttributeName = ref('')
const addingValueFor = ref<string | null>(null)
const newValueText = ref('')

const confirmAddAttribute = async () => {
  const name = newAttributeName.value.trim()
  if (!name) return
  try {
    await createProductAttribute(name)
    await queryClient.invalidateQueries({ queryKey: productVariantsKeys.attributes(businessId.value) })
    newAttributeName.value = ''
    addingAttribute.value = false
  } catch (err) {
    console.error('Error creating attribute:', err)
    showError('No se pudo crear el atributo')
  }
}

const startAddValue = (attributeId: string) => {
  addingValueFor.value = attributeId
  newValueText.value = ''
}

const confirmAddValue = async (attributeId: string) => {
  const value = newValueText.value.trim()
  if (!value) return
  try {
    await createProductAttributeValue(attributeId, value)
    await queryClient.invalidateQueries({ queryKey: productVariantsKeys.attributes(businessId.value) })
    addingValueFor.value = null
    newValueText.value = ''
  } catch (err) {
    console.error('Error creating attribute value:', err)
    showError('No se pudo crear el valor')
  }
}

const defaultNewVariant = () => ({
  valueByAttribute: {} as Record<string, string>,
  sku: '',
  barcode: '',
  unitCost: 0,
  unitPrice: 0,
  initialStock: 0,
})

const newVariant = reactive(defaultNewVariant())
const isCreatingVariant = ref(false)

watch(isOpen, (open) => {
  if (!open) return
  Object.assign(newVariant, defaultNewVariant())
  addingAttribute.value = false
  addingValueFor.value = null
})

const handleCreateVariant = async () => {
  if (!producto.value || !businessId.value) return
  const attributeValueIds = Object.values(newVariant.valueByAttribute).filter((v): v is string => !!v)
  if (attributeValueIds.length === 0) {
    showError('Elige al menos un valor de atributo para la variante')
    return
  }

  isCreatingVariant.value = true
  try {
    await createProductVariant(businessId.value, producto.value.id, {
      sku: newVariant.sku,
      barcode: newVariant.barcode,
      unitCost: newVariant.unitCost,
      unitPrice: newVariant.unitPrice,
      active: true,
      initialStock: newVariant.initialStock,
      attributeValueIds,
    }, branchId.value)

    await queryClient.invalidateQueries({ queryKey: productVariantsKeys.variants(producto.value.id) })
    Object.assign(newVariant, defaultNewVariant())
    success('Variante agregada')
  } catch (err) {
    console.error('Error creating variant:', err)
    showError('No se pudo crear la variante')
  } finally {
    isCreatingVariant.value = false
  }
}

const handleDeleteVariant = async (variant: ProductVariant) => {
  const confirmed = await confirmAction(`¿Eliminar la variante "${variant.name}"?`)
  if (!confirmed) return
  try {
    await deleteProductVariant(variant.id)
    await queryClient.invalidateQueries({ queryKey: productVariantsKeys.variants(producto.value?.id) })
    success('Variante eliminada')
  } catch (err) {
    console.error('Error deleting variant:', err)
    showError('No se pudo eliminar la variante')
  }
}

const open = (p: Producto) => {
  useModal(MODAL_ID).open({ producto: p })
}

defineExpose({ open, close, isOpen })
</script>
