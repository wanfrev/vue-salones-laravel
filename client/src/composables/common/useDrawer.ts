import { ref, computed } from 'vue'

export type DrawerPosition = 'left' | 'right'

const activeDrawers = ref<Map<string, boolean>>(new Map())

export function useDrawer(drawerId: string) {
  const isOpen = computed(() => activeDrawers.value.get(drawerId) ?? false)

  const open = () => {
    activeDrawers.value.set(drawerId, true)
  }

  const close = () => {
    activeDrawers.value.delete(drawerId)
  }

  const toggle = () => {
    if (isOpen.value) {
      close()
    } else {
      open()
    }
  }

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}

export function useGlobalDrawer() {
  const closeAll = () => {
    activeDrawers.value.clear()
  }

  return {
    closeAll,
  }
}
