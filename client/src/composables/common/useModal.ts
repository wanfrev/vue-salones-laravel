import { ref, computed } from 'vue'

export interface ModalState {
  isOpen: boolean
  data?: any
  onConfirm?: (data: any) => void
  onCancel?: () => void
}

const activeModals = ref<Map<string, ModalState>>(new Map())

export function useModal(modalId: string) {
  const isOpen = computed(() => activeModals.value.get(modalId)?.isOpen ?? false)
  const modalData = computed(() => activeModals.value.get(modalId)?.data)

  const open = (data?: any, callbacks?: { onConfirm?: (data: any) => void; onCancel?: () => void }) => {
    activeModals.value.set(modalId, {
      isOpen: true,
      data,
      onConfirm: callbacks?.onConfirm,
      onCancel: callbacks?.onCancel,
    })
  }

  const close = () => {
    const modal = activeModals.value.get(modalId)
    if (modal?.onCancel) {
      modal.onCancel()
    }
    activeModals.value.delete(modalId)
  }

  const confirm = (data: any) => {
    const modal = activeModals.value.get(modalId)
    if (modal?.onConfirm) {
      modal.onConfirm(data)
    }
    close()
  }

  return {
    isOpen,
    modalData,
    open,
    close,
    confirm,
  }
}

export function useGlobalModal() {
  const closeAll = () => {
    activeModals.value.clear()
  }

  const getActiveModalCount = computed(() => activeModals.value.size)

  return {
    closeAll,
    getActiveModalCount,
  }
}
