<template>
  <div>
    <button
      ref="trigger"
      type="button"
      class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text"
      aria-label="Más acciones"
      title="Más acciones"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
      </svg>
    </button>

    <!-- Flotante en el body: la tarjeta de la lista recorta lo que se salga de ella (overflow-hidden). -->
    <Teleport to="body">
      <template v-if="open">
        <!-- Cierra al tocar fuera sin bloquear el resto de la pantalla. -->
        <div class="fixed inset-0 z-[60]" @click="open = false" />
        <div
          role="menu"
          :style="{ top: pos.top + 'px', left: pos.left + 'px', width: MENU_WIDTH + 'px' }"
          class="fixed z-[61] overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          <button type="button" role="menuitem" :class="itemClass" data-testid="credit-menu-edit" @click="pick('edit')">
            Corregir monto
            <span :class="hintClass">Si se cargó mal; no crea ingreso</span>
          </button>
          <button v-if="hasPayments" type="button" role="menuitem" :class="itemClass" data-testid="credit-menu-close" @click="pick('close')">
            Cerrar crédito
            <span :class="hintClass">Da por cobrado el saldo; no crea ingreso</span>
          </button>
          <button type="button" role="menuitem" title="Eliminar crédito" :class="[itemClass, 'text-danger hover:bg-danger/10']" data-testid="credit-menu-delete" @click="pick('delete')">
            Eliminar crédito
            <span :class="hintClass">{{ hasPayments ? 'Lo cobrado se queda en Finanzas' : 'Revierte la venta' }}</span>
          </button>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

defineProps<{
  /** Con abonos ya registrados aparece «Cerrar crédito» (sin abonos, lo que corresponde es eliminarlo). */
  hasPayments: boolean
}>()

const emit = defineEmits<{ edit: []; close: []; delete: [] }>()

const MENU_WIDTH = 256
const MENU_HEIGHT = 190 // alto aproximado con las 3 opciones, para decidir si cabe debajo del botón
const MARGIN = 8

const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const pos = ref({ top: 0, left: 0 })

// Debajo del botón y pegado a su borde derecho; si no cabe, se corre dentro de la pantalla o se abre hacia arriba.
const place = () => {
  const r = trigger.value?.getBoundingClientRect()
  if (!r) return
  const left = Math.min(Math.max(MARGIN, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - MARGIN)
  const fitsBelow = r.bottom + 4 + MENU_HEIGHT <= window.innerHeight - MARGIN
  pos.value = { left: Math.max(MARGIN, left), top: fitsBelow ? r.bottom + 4 : Math.max(MARGIN, r.top - 4 - MENU_HEIGHT) }
}

const toggle = () => {
  if (!open.value) place()
  open.value = !open.value
}

// Con el menú abierto, mover la pantalla lo deja en un lugar equivocado: se cierra.
const close = () => { open.value = false }
watch(open, (isOpen) => {
  const fn = isOpen ? 'addEventListener' : 'removeEventListener'
  window[fn]('scroll', close, true)
  window[fn]('resize', close)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
})

const pick = (action: 'edit' | 'close' | 'delete') => {
  open.value = false
  if (action === 'edit') emit('edit')
  else if (action === 'close') emit('close')
  else emit('delete')
}

const itemClass = 'flex w-full flex-col items-start px-3 py-2 text-left text-sm font-medium text-text transition-colors hover:bg-bg-secondary'
const hintClass = 'text-[11px] font-normal text-text-muted'
</script>
