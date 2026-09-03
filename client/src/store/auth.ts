import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db, getAuthToken } from '../lib/api'
import type { ApiSession as Session, ApiUser as User } from '../lib/api'
import { queryClient } from '../queryClient'
import { useBusinessStore } from './business'
import { clearImpersonationState } from '../composables/superadmin/useImpersonation'
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
  // The synthetic cajero encoding (role='empleado' + disable_agenda + disable_inventory_edit)
  // was designed for the tienda niche's cashier. It also happens to match staffing's
  // "vendedora" employees (NuevaVendedoraModal sets both flags for an unrelated reason — hiding
  // agenda/inventory, which staffing doesn't have anyway) — without this guard they'd get
  // misclassified as cajero and force-routed to /admin/pos, a screen staffing has locked off
  // entirely (pos feature is locked false for that niche), leaving them stuck. Requiring the
  // business to actually have POS available scopes the encoding back to where it's meaningful.
  const isSyntheticCajero = (p: AuthProfile): boolean =>
    p.role === 'empleado' && !!p.disable_agenda && !!p.disable_inventory_edit && useBusinessStore().hasFeature('pos')

  const role = computed<Role | null>(() => {
    const p = profile.value
    if (!p) return null
    if (p.role === 'cajero') return 'cajero' as Role
    if (isSyntheticCajero(p)) return 'cajero' as Role
    return p.role ?? null
  })
  const isCajeroProfile = computed(() => {
    const p = profile.value
    if (!p) return false
    if (p.role === 'cajero') return true
    return isSyntheticCajero(p)
  })
  const businessId = computed(() => profile.value?.business_id ?? null)
  const disableInventoryEdit = computed(() => {
    if (profile.value?.role === 'encargado') {
      return useBusinessStore().features.disable_manager_inventory_edit
    }
    return !!(profile.value as any)?.disable_inventory_edit
  })
  // Admin/encargado can always add purchase invoices; a plain empleado/cajero needs inventory
  // write access AND the dedicated flag an admin explicitly granted them — mirrors
  // BusinessContext::hasProfilePermission('purchase-invoice') on the backend exactly.
  const canAddPurchaseInvoice = computed(() => {
    const p = profile.value
    if (!p) return false
    if (p.role === 'admin' || p.role === 'encargado' || p.role === 'superadmin') return true
    return !!p.can_access_inventory && !disableInventoryEdit.value && !!p.can_add_purchase_invoice
  })

  const isProfileHardFailure = (err: unknown): boolean => {
    const msg = err instanceof Error ? err.message : String(err ?? '')
    return msg.includes('Perfil de usuario no encontrado')
      || msg.includes('usuario está inactivo')
      || msg.includes('rol válido')
  }

  const loadProfile = async (userId: string, userRole?: string | null) => {
    const { data, error } = await db
      .from('profiles')
      .select('id, business_id, branch_id, full_name, role, phone, avatar_url, active, pay_type, pay_percentage, base_salary, salary_frequency, disable_agenda, disable_inventory_edit, employee_ves_rate, can_create_appointments, can_create_clients, can_access_consultorio, can_access_inventory, can_access_pos, can_access_suppliers, can_access_finanzas, can_access_requirements, can_add_purchase_invoice, can_access_spreadsheet')
      .eq('id', userId)
      .maybeSingle()

    const isSuperadminFallback = userRole === 'superadmin' || userId === '00000000-0000-0000-0000-000000000001'

    if (!data || error) {
      if (isSuperadminFallback) {
        profile.value = {
          id: userId,
          business_id: null,
          branch_id: null,
          full_name: 'Superadmin',
          role: 'superadmin',
          phone: null,
          avatar_url: null,
          pay_type: null,
          pay_percentage: null,
          base_salary: null,
          salary_frequency: null,
          disable_agenda: false,
          disable_inventory_edit: false,
        }
        return
      }
      if (error) { profile.value = null; throw error }
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
      branch_id: authProfile.branch_id,
      full_name: authProfile.full_name,
      role: authProfile.role,
      phone: authProfile.phone,
      avatar_url: authProfile.avatar_url,
      pay_type: (authProfile as any).pay_type ?? null,
      pay_percentage: (authProfile as any).pay_percentage ?? null,
      base_salary: (authProfile as any).base_salary ?? null,
      salary_frequency: (authProfile as any).salary_frequency ?? null,
      disable_agenda: (authProfile as any).disable_agenda ?? false,
      disable_inventory_edit: (authProfile as any).disable_inventory_edit ?? false,
      can_create_appointments: (authProfile as any).can_create_appointments ?? true,
      can_create_clients: (authProfile as any).can_create_clients ?? true,
      can_access_consultorio: (authProfile as any).can_access_consultorio ?? true,
      can_access_inventory: (authProfile as any).can_access_inventory ?? false,
      can_access_pos: (authProfile as any).can_access_pos ?? false,
      can_access_suppliers: (authProfile as any).can_access_suppliers ?? false,
      can_access_finanzas: (authProfile as any).can_access_finanzas ?? false,
      can_access_requirements: (authProfile as any).can_access_requirements ?? false,
      can_add_purchase_invoice: (authProfile as any).can_add_purchase_invoice ?? false,
      can_access_spreadsheet: (authProfile as any).can_access_spreadsheet ?? false,
    }
  }

  const hydrateUserContext = async (userId: string, userRole?: string | null) => {
    await loadProfile(userId, userRole)
    const businessStore = useBusinessStore()
    await businessStore.loadBusiness(
      profile.value?.business_id ?? null,
      profile.value?.role === 'empleado' || profile.value?.role === 'encargado' ? profile.value?.id : undefined,
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
      const { data, error } = await db.auth.getSession()
      if (error) {
        console.warn('[auth.initialize] getSession error (non-fatal):', error)
        if (hadToken && error.code === '401') {
          await db.auth.signOut({ scope: 'local' }).catch(() => {})
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

        // Always load full profile to get all flags (disable_agenda, disable_inventory_edit, etc.)
        try {
          await loadProfile(user.value.id, user.value?.role)
        } catch (err) {
          if (isProfileHardFailure(err)) {
            clearAuthState()
            await db.auth.signOut({ scope: 'local' }).catch(() => {})
          } else {
            console.warn('[auth.initialize] transient hydration error; keeping session', err)
          }
        }

        if (embeddedBusiness) {
          const businessStore = useBusinessStore()
          businessStore.business = embeddedBusiness
        }

        if (!embeddedProfile) {
          try {
            await hydrateUserContext(user.value.id, user.value?.role)
          } catch (err) {
            if (isProfileHardFailure(err)) {
              clearAuthState()
              await db.auth.signOut({ scope: 'local' }).catch(() => {})
            } else {
              console.warn('[auth.initialize] transient hydration error; keeping session', err)
            }
          }
        } else if (!embeddedBusiness) {
          const businessStore = useBusinessStore()
          await businessStore.loadBusiness(embeddedProfile.business_id ?? null).catch(() => {})
        }
      }

      if (authUnsubscribe) authUnsubscribe()
      const { data: subData } = db.auth.onAuthStateChange(async (_event: string, nextSession: Session | null) => {
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

          if (!embeddedProfile) {
            try {
              await hydrateUserContext(user.value.id, user.value?.role)
            } catch (err) {
              if (isProfileHardFailure(err)) {
                clearAuthState()
                await db.auth.signOut({ scope: 'local' }).catch(() => {})
              } else {
                console.warn('[auth.onAuthStateChange] transient hydration error; preserving local context', err)
              }
            }
          } else if (!embeddedBusiness) {
            const businessStore = useBusinessStore()
            await businessStore.loadBusiness(embeddedProfile.business_id ?? null).catch(() => {})
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
      const { data, error } = await db.auth.signInWithPassword({ email, password })
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

      // Always load full profile to get all flags
      try {
        await loadProfile(user.value!.id, user.value?.role)
      } catch (err) {
        if (isProfileHardFailure(err)) throw err
        console.warn('[auth.signIn] profile reload failed; keeping embedded', err)
      }

      if (embeddedBusiness) {
        useBusinessStore().business = embeddedBusiness
      }

      if (!embeddedProfile) {
        await hydrateUserContext(user.value!.id, user.value?.role)
      } else if (!embeddedBusiness) {
        const businessStore = useBusinessStore()
        await businessStore.loadBusiness(embeddedProfile.business_id ?? null)
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

    // An explicit logout ends the session outright — don't leave a stashed superadmin
    // token behind for a future "volver a superadmin" to resurrect after this device logs
    // in as someone else.
    clearImpersonationState()

    clearAuthState()
    queryClient.clear()
    useBusinessStore().clearBusiness()
    if (authUnsubscribe) {
      authUnsubscribe()
      authUnsubscribe = null
    }

    try {
      await Promise.race([
        db.auth.signOut({ scope: 'local' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000)),
      ])
    } catch {
      await db.auth.signOut({ scope: 'local' }).catch(() => {})
    } finally {
      loading.value = false
      initialized.value = false
    }
  }

  const refreshSession = async (): Promise<boolean> => {
    if (!session.value) return false
    try {
      const { data, error } = await db.auth.refreshSession()
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
    isCajeroProfile,
    businessId,
    disableInventoryEdit,
    canAddPurchaseInvoice,
    initialize,
    signIn,
    signOut,
    refreshSession,
  }
})
