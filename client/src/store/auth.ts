import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js'
import { api as supabase, getAuthToken } from '../lib/api'
import { queryClient } from '../queryClient'
import { useBusinessStore } from './business'
import type { Role } from '../constants/roles'
import { isRole } from '../constants/roles'
import type { AuthProfile } from '../types/auth'
import type { Profile } from '../types/database'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<AuthProfile | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  let authUnsubscribe: (() => void) | null = null

  const isAuthenticated = computed(() => !!session.value && !!user.value)
  const role = computed<Role | null>(() => profile.value?.role ?? null)
  const businessId = computed(() => profile.value?.business_id ?? null)

  const isProfileHardFailure = (err: unknown): boolean => {
    const msg = err instanceof Error ? err.message : String(err ?? '')
    return msg.includes('Perfil de usuario no encontrado')
      || msg.includes('usuario está inactivo')
      || msg.includes('rol válido')
  }

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, business_id, full_name, role, phone, avatar_url, active, pay_type, pay_percentage, base_salary, disable_agenda, employee_ves_rate, can_create_appointments, can_create_clients')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      profile.value = null
      throw error
    }

    if (!data) {
      profile.value = null
      throw new Error('Perfil de usuario no encontrado. Contacta al administrador.')
    }

    const authProfile = data as Profile

    if (!isRole(authProfile.role)) {
      profile.value = null
      throw new Error('El perfil no tiene un rol válido.')
    }

    if (!authProfile.active) {
      profile.value = null
      throw new Error('El usuario está inactivo.')
    }

    profile.value = {
      id: authProfile.id,
      business_id: authProfile.business_id,
      full_name: authProfile.full_name,
      role: authProfile.role,
      phone: authProfile.phone,
      avatar_url: authProfile.avatar_url,
      pay_type: (authProfile as any).pay_type ?? null,
      pay_percentage: (authProfile as any).pay_percentage ?? null,
      base_salary: (authProfile as any).base_salary ?? null,
      disable_agenda: (authProfile as any).disable_agenda ?? false,
    }
  }

  const hydrateUserContext = async (userId: string) => {
    await loadProfile(userId)
    const businessStore = useBusinessStore()
    await businessStore.loadBusiness(
      profile.value?.business_id ?? null,
      profile.value?.role === 'empleado' ? profile.value?.id : undefined,
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
      const hadToken = !!getAuthToken()
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.warn('[auth.initialize] getSession error (non-fatal):', error)
        if (hadToken && error.code === '401') {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        }
      }

      session.value = data.session
      user.value = data.session?.user ?? null

      if (user.value) {
        const sessionData = data.session as any
        const embeddedProfile = sessionData?.user?.profile
        const embeddedBusiness = sessionData?.business

        if (embeddedProfile) {
          if (!isRole(embeddedProfile.role)) {
            clearAuthState()
            throw new Error('El perfil no tiene un rol válido.')
          }
          if (!embeddedProfile.active) {
            clearAuthState()
            throw new Error('El usuario está inactivo.')
          }
          profile.value = embeddedProfile
        }

        if (embeddedBusiness) {
          const businessStore = useBusinessStore()
          businessStore.business = embeddedBusiness
        }

        if (!embeddedProfile || !embeddedBusiness) {
          try {
            await hydrateUserContext(user.value.id)
          } catch (err) {
            if (isProfileHardFailure(err)) {
              clearAuthState()
              await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
            } else {
              console.warn('[auth.initialize] transient hydration error; keeping session', err)
            }
          }
        }
      }

      if (authUnsubscribe) authUnsubscribe()
      const { data: subData } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, nextSession: Session | null) => {
        session.value = nextSession
        user.value = nextSession?.user ?? null

        if (user.value) {
          const sessionData = nextSession as any
          const embeddedProfile = sessionData?.user?.profile
          const embeddedBusiness = sessionData?.business

          if (embeddedProfile) {
            profile.value = embeddedProfile
          }
          if (embeddedBusiness) {
            const businessStore = useBusinessStore()
            businessStore.business = embeddedBusiness
          }

          if (!embeddedProfile || !embeddedBusiness) {
            try {
              await hydrateUserContext(user.value.id)
            } catch (err) {
              if (isProfileHardFailure(err)) {
                clearAuthState()
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
              } else {
                console.warn('[auth.onAuthStateChange] transient hydration error; preserving local context', err)
              }
            }
          }
        } else {
          profile.value = null
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
      if (error) throw error

      session.value = data.session
      user.value = data.user

      const sessionData = data.session as any
      const embeddedProfile = sessionData?.user?.profile
      const embeddedBusiness = sessionData?.business

      if (embeddedProfile) {
        if (!isRole(embeddedProfile.role)) throw new Error('El perfil no tiene un rol válido.')
        if (!embeddedProfile.active) throw new Error('El usuario está inactivo.')
        profile.value = embeddedProfile
      }
      if (embeddedBusiness) {
        useBusinessStore().business = embeddedBusiness
      }

      if (!embeddedProfile || !embeddedBusiness) {
        await hydrateUserContext(user.value!.id)
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

    clearAuthState()
    queryClient.clear()
    useBusinessStore().clearBusiness()
    if (authUnsubscribe) {
      authUnsubscribe()
      authUnsubscribe = null
    }

    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000)),
      ])
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    } finally {
      loading.value = false
      initialized.value = false
    }
  }

  const refreshSession = async (): Promise<boolean> => {
    if (!session.value) return false
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      if (data.session) {
        session.value = data.session
        user.value = data.session.user
        return true
      }
      return false
    } catch (err) {
      console.warn('[auth.refreshSession] refresh failed; keeping local session', err)
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
