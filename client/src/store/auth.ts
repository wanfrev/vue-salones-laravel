import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api as supabase } from '../lib/api'
import { queryClient } from '../queryClient'
import type { Role } from '../constants/roles'
import { isRole } from '../constants/roles'
import type { AuthProfile } from '../types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ id: string; email?: string } | null>(null)
  const session = ref<{ access_token: string } | null>(null)
  const profile = ref<AuthProfile | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  let authUnsubscribe: (() => void) | null = null

  const isAuthenticated = computed(() => !!session.value)
  const role = computed<Role | null>(() => profile.value?.role ?? null)
  const businessId = computed(() => profile.value?.business_id ?? null)

  const mapProfileFromAuth = (raw: any): AuthProfile | null => {
    const p = raw?.profile ?? raw
    if (!p || !p.id) return null
    if (!isRole(p.role)) return null
    if (!p.active) return null
    return {
      id: p.id,
      business_id: p.business_id ?? null,
      full_name: p.full_name,
      role: p.role,
      phone: p.phone ?? null,
      avatar_url: p.avatar_url ?? null,
      pay_type: p.pay_type ?? null,
      pay_percentage: p.pay_percentage ?? null,
      base_salary: p.base_salary ?? null,
      disable_agenda: p.disable_agenda ?? false,
    }
  }

  const hydrateUserContext = async (authUser: any) => {
    const authProfile = mapProfileFromAuth(authUser)
    if (!authProfile) {
      profile.value = null
      throw new Error('Perfil de usuario no encontrado o inactivo.')
    }
    profile.value = authProfile

    const { useBusinessStore } = await import('./business')
    const businessStore = useBusinessStore()
    await businessStore.loadBusiness(
      profile.value.business_id,
      profile.value.role === 'empleado' ? profile.value.id : undefined,
    )
  }

  const clearAuthState = () => {
    user.value = null
    session.value = null
    profile.value = null
  }

  const initialize = async () => {
    if (initialized.value) return
    loading.value = true

    try {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        session.value = data.session
        user.value = data.session.user ?? null

        if (data.session.user) {
          try {
            await hydrateUserContext(data.session.user)
          } catch (err) {
            clearAuthState()
            await supabase.auth.signOut().catch(() => {})
          }
        }
      }

      if (authUnsubscribe) authUnsubscribe()
      const { data: subData } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        session.value = nextSession
        user.value = nextSession?.user ?? null

        if (nextSession?.user) {
          try {
            await hydrateUserContext(nextSession.user)
          } catch {
            clearAuthState()
            await supabase.auth.signOut().catch(() => {})
          }
        } else {
          profile.value = null
          const { useBusinessStore } = await import('./business')
          useBusinessStore().clearBusiness()
        }
      })
      authUnsubscribe = subData.subscription.unsubscribe
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  const signIn = async (email: string, password: string) => {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message || 'Credenciales inválidas')

      session.value = data.session
      user.value = data.user

      if (data.user) {
        await hydrateUserContext(data.user)
      }
    } catch (err) {
      clearAuthState()
      throw err
    } finally {
      loading.value = false
    }
  }

  const signOut = async () => {
    loading.value = true
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000)),
      ])
    } catch {
      await supabase.auth.signOut().catch(() => {})
    } finally {
      clearAuthState()
      queryClient.clear()
      const { useBusinessStore } = await import('./business')
      useBusinessStore().clearBusiness()
      if (authUnsubscribe) {
        authUnsubscribe()
        authUnsubscribe = null
      }
      loading.value = false
      initialized.value = false
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.assign('/')
      }
    }
  }

  const refreshSession = async (): Promise<boolean> => {
    if (!session.value) return false
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      if (data?.session) {
        session.value = data.session
        user.value = data.session.user
        if (data.session.user) {
          try {
            await hydrateUserContext(data.session.user)
          } catch {
            await signOut()
            return false
          }
        }
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return {
    user,
    session,
    profile,
    initialized,
    loading,
    isAuthenticated,
    role,
    businessId,
    initialize,
    signIn,
    signOut,
    refreshSession,
  }
})
