<template>
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-300 ease-out" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="isOpen" class="fixed inset-0 z-50" @click.self="handleBackdropClick">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        <!-- Drawer Panel -->
        <Transition :enter-active-class="enterActiveClass" :enter-from-class="enterFromClass"
          :enter-to-class="enterToClass" :leave-active-class="leaveActiveClass" :leave-from-class="leaveFromClass"
          :leave-to-class="leaveToClass">
          <div v-if="isOpen" class="fixed top-0 h-full w-full overflow-hidden bg-surface shadow-2xl sm:w-96" style="overflow: clip;"
            :class="positionClasses[position]">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 class="text-lg font-semibold text-text">{{ title }}</h3>
                <p v-if="subtitle" class="text-sm text-text-muted">{{ subtitle }}</p>
              </div>
              <button @click="close"
                class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text-secondary">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="h-[calc(100%-140px)] overflow-y-auto px-6 py-4 touch-pan-y overscroll-contain" style="-webkit-overflow-scrolling: touch;">
              <slot />
            </div>

            <!-- Footer -->
            <div v-if="showFooter"
              class="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-3 border-t border-border bg-surface px-6 py-4">
              <slot name="footer">
                <button @click="handleCancel"
                  class="rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-surface">
                  {{ cancelText }}
                </button>
                <button @click="handleConfirm"
                  class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-theme hover:bg-primary-hover shadow-lg shadow-primary/25">
                  {{ confirmText }}
                </button>
              </slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type DrawerPosition = 'left' | 'right'

interface Props {
  isOpen: boolean
  title: string
  subtitle?: string
  position?: DrawerPosition
  showFooter?: boolean
  cancelText?: string
  confirmText?: string
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  position: 'right',
  showFooter: true,
  cancelText: 'Limpiar',
  confirmText: 'Aplicar',
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  close: []
  confirm: []
  cancel: []
}>()

const positionClasses: Record<DrawerPosition, string> = {
  left: 'left-0',
  right: 'right-0',
}

const enterActiveClass = 'transition-transform duration-300 ease-out'
const leaveActiveClass = 'transition-transform duration-200 ease-in'

const enterFromClass = computed(() =>
  props.position === 'left' ? '-translate-x-full' : 'translate-x-full'
)
const enterToClass = 'translate-x-0'
const leaveFromClass = 'translate-x-0'
const leaveToClass = computed(() =>
  props.position === 'left' ? '-translate-x-full' : 'translate-x-full'
)

const close = () => emit('close')

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
  }
}

const handleCancel = () => {
  emit('cancel')
}

const handleConfirm = () => {
  emit('confirm')
  close()
}
</script>
