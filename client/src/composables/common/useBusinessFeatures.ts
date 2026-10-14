import { computed, ref } from 'vue'
import { useAuth } from './useAuth'
import { useNotification } from './useNotification'
import { useBusinessStore } from '../../store/business'
import { apiRequest } from '../../lib/api'

// Shared by every switch on the screen so that all of them lock while any one is saving.
const updating = ref(false)

/**
 * Saves the business's own on/off settings (`businesses.features`). One place instead of one
 * near-identical handler per switch: it sends the whole feature set with a single key changed —
 * the same request every handler on the Configuración screen used to make by hand.
 */
export function useBusinessFeatures() {
  const { authStore } = useAuth()
  const businessStore = useBusinessStore()
  const { success, error: showError } = useNotification()

  const businessId = computed(() => authStore.businessId)

  const isOn = (key: string): boolean => !!businessStore.features[key]

  /** Merges `patch` into the stored features and saves. Returns whether it worked. */
  async function save(patch: Record<string, unknown>, successMessage: string, errorMessage = 'No se pudo guardar el cambio.'): Promise<boolean> {
    if (!businessId.value) return false
    updating.value = true
    try {
      const res = await apiRequest('PUT', `/businesses/${businessId.value}`, {
        features: { ...businessStore.features, ...patch },
      })
      businessStore.updateBusiness(res as any)
      success(successMessage)
      return true
    } catch (err: any) {
      showError(err?.message ?? errorMessage)
      return false
    } finally {
      updating.value = false
    }
  }

  /** Sets one switch and reports it with its own "on"/"off" message. */
  const setFeature = (key: string, value: boolean, messages: { on: string; off: string }) =>
    save({ [key]: value }, value ? messages.on : messages.off, 'No se pudo actualizar la configuración.')

  return { updating, isOn, save, setFeature }
}
