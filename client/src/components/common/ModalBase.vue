<template>
  <Teleport to="body">
    <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        @click.self="handleBackdropClick">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

        <!-- Modal Container -->
        <Transition enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 translate-y-4">
          <div v-if="isOpen"
            class="relative w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl" style="overflow: clip;"
            :class="sizeClasses[size]">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-border px-6 py-4">
              <div class="flex items-center gap-3">
                <div v-if="icon" :class="['flex h-10 w-10 items-center justify-center rounded-xl', iconBgClass]">
                  <svg class="h-5 w-5" :class="iconColorClass" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-text">{{ title }}</h3>
                  <p v-if="subtitle" class="text-sm text-text-muted">{{ subtitle }}</p>
                </div>
              </div>
              <button v-if="showCloseButton" @click="close"
                class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text-secondary">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-4 touch-pan-y overscroll-contain" :class="{ 'max-h-[60vh] overflow-y-auto': scrollable }" style="-webkit-overflow-scrolling: touch;">
              <slot />
            </div>

            <!-- Footer -->
            <div v-if="showFooter"
              class="flex items-center justify-end gap-3 border-t border-border bg-bg-secondary px-6 py-4">
              <slot name="footer">
                <button v-if="showCancelButton" @click="handleCancel"
                  class="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
                  :disabled="isLoading">
                  {{ cancelText }}
                </button>
                <button v-if="showConfirmButton" @click="handleConfirm"
                  class="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-text-inverse transition-theme disabled:opacity-50"
                  :class="confirmButtonClass" :disabled="isLoading || isConfirmDisabled">
                  <svg v-if="isLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                  </svg>
                  {{ isLoading ? loadingText : confirmText }}
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

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type ModalVariant = 'default' | 'danger' | 'warning' | 'success'

interface Props {
  isOpen: boolean
  title: string
  subtitle?: string
  size?: ModalSize
  variant?: ModalVariant
  icon?: string
  showCloseButton?: boolean
  showFooter?: boolean
  showCancelButton?: boolean
  showConfirmButton?: boolean
  cancelText?: string
  confirmText?: string
  loadingText?: string
  isLoading?: boolean
  isConfirmDisabled?: boolean
  scrollable?: boolean
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'default',
  showCloseButton: true,
  showFooter: true,
  showCancelButton: true,
  showConfirmButton: true,
  cancelText: 'Cancelar',
  confirmText: 'Guardar',
  loadingText: 'Guardando...',
  isLoading: false,
  isConfirmDisabled: false,
  scrollable: true,
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  close: []
  confirm: []
  cancel: []
}>()

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
}

const variantClasses: Record<ModalVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-primary-light', text: 'text-primary' },
  danger: { bg: 'bg-danger-light', text: 'text-danger' },
  warning: { bg: 'bg-warning-light', text: 'text-warning' },
  success: { bg: 'bg-success-light', text: 'text-success' },
}

const confirmButtonClasses: Record<ModalVariant, string> = {
  default: 'bg-primary hover:bg-primary-hover shadow-lg shadow-primary/25',
  danger: 'bg-danger hover:bg-danger-hover shadow-lg shadow-danger/25',
  warning: 'bg-warning hover:bg-warning-hover shadow-lg shadow-warning/25',
  success: 'bg-success hover:bg-success-hover shadow-lg shadow-success/25',
}

const iconBgClass = computed(() => {
  if (!props.icon) return ''
  return variantClasses[props.variant].bg
})

const iconColorClass = computed(() => {
  if (!props.icon) return ''
  return variantClasses[props.variant].text
})

const confirmButtonClass = computed(() => confirmButtonClasses[props.variant])

const close = () => emit('close')

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
  }
}

const handleCancel = () => {
  emit('cancel')
  close()
}

const handleConfirm = () => {
  emit('confirm')
}
</script>
