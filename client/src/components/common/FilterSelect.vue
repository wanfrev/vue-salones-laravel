<template>
  <div ref="root" class="relative" @keydown.esc="close">
    <button
      ref="trigger"
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm text-text outline-none transition-theme hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/15"
      :class="open ? 'border-primary ring-2 ring-primary/15' : ''"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="ariaLabel"
      @click="toggle"
    >
      <span class="truncate" :class="isDefault ? 'text-text-secondary' : 'font-medium text-text'">{{ selectedLabel }}</span>
      <svg class="h-4 w-4 shrink-0 text-text-muted transition-transform" :class="open ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- El menú va en <body> con posición fija: ninguna tarjeta con overflow lo recorta ni se sale de la pantalla -->
    <Teleport to="body">
      <template v-if="open">
        <div class="fixed inset-0 z-[90]" @click="close" />
        <ul
          role="listbox"
          :style="menuStyle"
          class="fixed z-[91] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-1 shadow-xl"
        >
          <li v-for="o in options" :key="o.value" role="option" :aria-selected="o.value === modelValue">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary"
              :class="o.value === modelValue ? 'bg-primary/10 font-semibold text-primary' : 'text-text'"
              @click="pick(o.value)"
            >
              <span class="truncate">{{ o.label }}</span>
              <svg v-if="o.value === modelValue" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </li>
        </ul>
      </template>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
  ariaLabel?: string
  /** Valor «sin filtro» (primera opción): se muestra en gris. */
  defaultValue?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const open = ref(false)
const menuStyle = ref<Record<string, string>>({})

const selectedLabel = computed(() => props.options.find(o => o.value === props.modelValue)?.label ?? '')
const isDefault = computed(() => props.modelValue === (props.defaultValue ?? props.options[0]?.value))

const MENU_MAX = 288 // 18rem
const GAP = 6
const MARGIN = 12

function place() {
  const el = trigger.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const below = vh - r.bottom - MARGIN
  const above = r.top - MARGIN
  // Abre hacia abajo salvo que no quepa y haya más sitio arriba.
  const goUp = below < 180 && above > below
  const maxHeight = Math.max(120, Math.min(MENU_MAX, goUp ? above : below) - GAP)
  const width = Math.min(Math.max(r.width, 224), vw - MARGIN * 2)
  const left = Math.min(Math.max(MARGIN, r.left), vw - width - MARGIN)
  menuStyle.value = {
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
    ...(goUp ? { bottom: `${vh - r.top + GAP}px` } : { top: `${r.bottom + GAP}px` }),
  }
}

function toggle() {
  if (open.value) return close()
  place()
  open.value = true
}
function close() { open.value = false }
function pick(value: string) {
  emit('update:modelValue', value)
  close()
}

const onViewportChange = () => { if (open.value) place() }
watch(open, (v) => {
  if (v) {
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
  } else {
    window.removeEventListener('resize', onViewportChange)
    window.removeEventListener('scroll', onViewportChange, true)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>
