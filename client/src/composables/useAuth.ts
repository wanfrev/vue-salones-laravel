import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../store/auth'

export const useAuth = () => {
  const authStore = useAuthStore()
  const { loading: storeLoading } = storeToRefs(authStore)
  const errorMessage = ref('')
  const loading = computed(() => storeLoading.value)

  const login = async (_email: string, _password: string) => {
    errorMessage.value = ''
    try {
      await authStore.signIn(_email, _password)
      return true
    } catch (error) {
      errorMessage.value = error instanceof Error
        ? error.message
        : 'No fue posible iniciar sesión.'
      return false
    }
  }

  const logout = async () => {
    try {
      await authStore.signOut()
    } catch {
      // local state cleared in signOut
    } finally {
      if (typeof window !== 'undefined') {
        window.location.assign('/')
      }
    }
  }

  return {
    loading,
    errorMessage,
    login,
    logout,
    authStore,
  }
}
