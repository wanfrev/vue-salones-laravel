<template>
  <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
    <h2 class="text-lg font-semibold text-text mb-4">Funcionalidades</h2>
    <div class="space-y-3">
      <label
        v-for="ft in toggles"
        :key="ft.key"
        class="flex items-center justify-between gap-3"
      >
        <div>
          <p class="text-sm font-medium text-text">{{ ft.label }}</p>
          <p class="text-xs text-text-muted">{{ ft.description }}</p>
        </div>
        <button
          type="button"
          :disabled="isToggling"
          @click="$emit('toggle', ft.key)"
          :class="[
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
            features[ft.key] ? 'bg-primary' : 'bg-border'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              features[ft.key] ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  features: Record<string, boolean>
  isToggling: boolean
}>()

defineEmits<{ toggle: [key: string] }>()

const toggles = [
  { key: 'pos', label: 'Punto de Venta', description: 'Cobro de citas con productos y método de pago' },
  { key: 'inventario', label: 'Inventario', description: 'Control de stock, entradas y salidas' },
  { key: 'productos', label: 'Productos', description: 'Catálogo de productos vendibles' },
  { key: 'proveedores', label: 'Proveedores', description: 'Gestión de proveedores, deudas y pagos' },
  { key: 'multi_branch', label: 'Múltiples sucursales', description: 'Gestionar varias ubicaciones físicas' },
  { key: 'employees_create_clients', label: 'Empleados crean clientes', description: 'Permitir que empleados agreguen nuevos clientes desde la agenda' },
]
</script>
