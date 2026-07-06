import { MOCK_USER_ID, MOCK_BUSINESS_ID, MOCK_EMAIL, MOCK_PASSWORD, SUPERADMIN_USER_ID, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, EMPLOYEE_USER_ID, EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD, createMockDataStore, type MockDataStore } from './mockData'

const BIZ = MOCK_BUSINESS_ID
const ADMIN = MOCK_USER_ID

type MockAuthChangeCallback = (event: string, session: any) => void

const RELATION_CONFIG: Record<string, Record<string, { table: string; localKey: string; foreignKey: string; isArray: boolean }>> = {
  appointments: {
    clients: { table: 'clients', localKey: 'client_id', foreignKey: 'id', isArray: false },
    services: { table: 'services', localKey: 'service_id', foreignKey: 'id', isArray: false },
    profiles: { table: 'profiles', localKey: 'employee_id', foreignKey: 'id', isArray: false },
  },
  profiles: {
    employee_schedules: { table: 'employee_schedules', localKey: 'id', foreignKey: 'employee_id', isArray: true },
  },
  employee_schedules: {
    profiles: { table: 'profiles', localKey: 'employee_id', foreignKey: 'id', isArray: false },
  },
  inventory_stock: {
    products: { table: 'products', localKey: 'product_id', foreignKey: 'id', isArray: false },
    inventory_locations: { table: 'inventory_locations', localKey: 'location_id', foreignKey: 'id', isArray: false },
  },
  inventory_movements: {
    products: { table: 'products', localKey: 'product_id', foreignKey: 'id', isArray: false },
    inventory_locations: { table: 'inventory_locations', localKey: 'location_id', foreignKey: 'id', isArray: false },
  },
  employee_payments: {
    profiles: { table: 'profiles', localKey: 'employee_id', foreignKey: 'id', isArray: false },
  },
  transactions: {
    appointments: { table: 'appointments', localKey: 'appointment_id', foreignKey: 'id', isArray: false },
  },
}

function parseRelations(selectStr: string): { name: string; inner: boolean }[] {
  const relations: { name: string; inner: boolean }[] = []
  const regex = /(\w+)(?:!(\w+))?\(/g
  let match
  while ((match = regex.exec(selectStr)) !== null) {
    relations.push({ name: match[1], inner: match[2] === 'inner' })
  }
  return relations
}

function applyFilters(rows: any[], filters: any[]): any[] {
  return rows.filter(row => {
    for (const f of filters) {
      const val = row[f.field]
      switch (f.op) {
        case 'is':
          if (f.value === null && val !== null) return false
          if (f.value !== null && val === null) return false
          if (f.value !== null && val !== f.value) return false
          break
        case 'eq':
          if (val !== f.value) return false
          break
        case 'neq':
          if (val === f.value) return false
          break
        case 'ilike': {
          const pattern = String(f.value ?? '')
          const regex = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i')
          if (!regex.test(String(val ?? ''))) return false
          break
        }
        case 'gt':
          if (val <= f.value) return false
          break
        case 'gte':
          if (val < f.value) return false
          break
        case 'lte':
          if (val > f.value) return false
          break
        case 'in':
          if (!f.value.includes(val)) return false
          break
      }
    }
    return true
  })
}

function applyJoins(rows: any[], relations: { name: string; inner: boolean }[], table: string, store: MockDataStore): any[] {
  const configs = RELATION_CONFIG[table]
  if (!configs) return rows

  let result = rows.map(row => {
    const joined = { ...row }
    for (const rel of relations) {
      const cfg = configs[rel.name]
      if (!cfg) continue

      if (cfg.isArray) {
        const related = store[cfg.table].filter(r => r[cfg.foreignKey] === row[cfg.localKey])
        joined[rel.name] = related
      } else {
        const localVal = row[cfg.localKey]
        if (!localVal) { joined[rel.name] = null; continue }
        const match = store[cfg.table].find(r => r[cfg.foreignKey] === localVal)
        joined[rel.name] = match || null
      }
    }
    return joined
  })

  // Apply !inner joins: remove rows where the joined relation is null
  for (const rel of relations) {
    if (rel.inner) {
      result = result.filter(row => row[rel.name] != null)
    }
  }

  return result
}

class MockQueryBuilder {
  private table: string
  private filters: any[] = []
  private orderField: string | null = null
  private orderAsc = true
  private isSingle = false
  private isMaybeSingle = false
  private selectFields: string | null = null
  private store: MockDataStore
  private mutationPayload: any = null
  private mutationType: 'insert' | 'update' | 'upsert' | 'delete' | null = null
  private upsertOptions: any = null

  constructor(table: string, store: MockDataStore) {
    this.table = table
    this.store = store
  }

  select(fields: string): this {
    this.selectFields = fields
    return this
  }

  eq(field: string, value: any): this {
    this.filters.push({ field, op: 'eq', value })
    return this
  }

  neq(field: string, value: any): this {
    this.filters.push({ field, op: 'neq', value })
    return this
  }

  ilike(field: string, value: any): this {
    this.filters.push({ field, op: 'ilike', value })
    return this
  }

  is(field: string, value: any): this {
    this.filters.push({ field, op: 'is', value })
    return this
  }

  gte(field: string, value: any): this {
    this.filters.push({ field, op: 'gte', value })
    return this
  }

  lte(field: string, value: any): this {
    this.filters.push({ field, op: 'lte', value })
    return this
  }

  in(field: string, values: any[]): this {
    this.filters.push({ field, op: 'in', value: values })
    return this
  }

  limit(_count: number): this {
    return this
  }

  gt(field: string, value: any): this {
    this.filters.push({ field, op: 'gt', value })
    return this
  }

  order(field: string, opts?: { ascending?: boolean }): this {
    this.orderField = field
    this.orderAsc = opts?.ascending ?? true
    return this
  }

  single(): this {
    this.isSingle = true
    return this
  }

  maybeSingle(): this {
    this.isMaybeSingle = true
    return this
  }

  insert(payload: any): this {
    this.mutationType = 'insert'
    this.mutationPayload = payload
    return this
  }

  update(payload: any): this {
    this.mutationType = 'update'
    this.mutationPayload = payload
    return this
  }

  upsert(payload: any, options?: any): this {
    this.mutationType = 'upsert'
    this.mutationPayload = payload
    this.upsertOptions = options
    return this
  }

  delete(): this {
    this.mutationType = 'delete'
    return this
  }

  private async execute(): Promise<{ data: any; error: null } | { data: null; error: any }> {
    try {
      if (this.mutationType) {
        return this.executeMutation()
      }
      return this.executeQuery()
    } catch (e) {
      return { data: null, error: e }
    }
  }

  private executeQuery() {
    const table = this.table
    let data = [...this.store[table]]

    // Separate direct filters from joined filters (e.g., 'profiles.business_id')
    const directFilters = this.filters.filter(f => !f.field.includes('.'))
    const joinFilters = this.filters.filter(f => f.field.includes('.'))

    data = applyFilters(data, directFilters)

    let relations: { name: string; inner: boolean }[] = []
    if (this.selectFields) {
      relations = parseRelations(this.selectFields)
    }
    if (relations.length > 0) {
      data = applyJoins(data, relations, table, this.store)
    }

    // Apply filters on joined fields
    for (const f of joinFilters) {
      const [relName, fieldName] = f.field.split('.')
      data = data.filter(item => {
        const relObj = item[relName]
        if (!relObj) return false
        const val = relObj[fieldName]
        switch (f.op) {
          case 'eq': return val === f.value
          case 'neq': return val !== f.value
          default: return true
        }
      })
    }

    if (this.orderField) {
      data.sort((a, b) => {
        const aVal = a[this.orderField!]
        const bVal = b[this.orderField!]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return this.orderAsc ? -1 : 1
        if (bVal == null) return this.orderAsc ? 1 : -1
        if (aVal < bVal) return this.orderAsc ? -1 : 1
        if (aVal > bVal) return this.orderAsc ? 1 : -1
        return 0
      })
    }

    if (this.isSingle) {
      if (data.length === 0) throw { message: 'No rows found', code: 'PGRST116', details: '', hint: '' }
      data = data[0]
    } else if (this.isMaybeSingle) {
      data = data[0] ?? null
    }

    return { data, error: null }
  }

  private executeMutation() {
    const table = this.table
    const now = new Date().toISOString()
    const arr = this.store[table]

    switch (this.mutationType) {
      case 'insert': {
        const payload = Array.isArray(this.mutationPayload) ? this.mutationPayload : [this.mutationPayload]
        const inserted = payload.map((item: any) => ({
          ...item,
          id: item.id || crypto.randomUUID?.() || `${table}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          created_at: now,
          updated_at: now,
        }))
        for (const item of inserted) {
          arr.push(item)
        }
        const result = inserted.length === 1 ? inserted[0] : inserted
        return { data: result, error: null }
      }
      case 'update': {
        let targets = applyFilters(arr, this.filters)
        for (const target of targets) {
          Object.assign(target, this.mutationPayload, { updated_at: now })
        }

        const relations = this.selectFields ? parseRelations(this.selectFields) : []
        let result = targets.length === 1 ? targets[0] : targets
        if (relations.length > 0 && !Array.isArray(result)) {
          result = applyJoins([result], relations, table, this.store)[0]
        } else if (relations.length > 0 && Array.isArray(result)) {
          result = applyJoins(result, relations, table, this.store)
        }
        return { data: result, error: null }
      }
      case 'upsert': {
        const payload = this.mutationPayload
        const conflictFields = this.upsertOptions?.onConflict?.split(',') || []
        const existingIdx = arr.findIndex((item: any) =>
          conflictFields.every((f: string) => item[f.trim()] === payload[f.trim()])
        )

        if (existingIdx >= 0) {
          Object.assign(arr[existingIdx], payload, { updated_at: now })
          return { data: arr[existingIdx], error: null }
        }

        const inserted = {
          ...payload,
          id: payload.id || crypto.randomUUID?.() || `${table}-${Date.now()}`,
          created_at: now,
          updated_at: now,
        }
        arr.push(inserted)
        return { data: inserted, error: null }
      }
      case 'delete': {
        const targets = applyFilters(arr, this.filters)
        for (const t of targets) {
          const idx = arr.indexOf(t)
          if (idx >= 0) arr.splice(idx, 1)
        }
        return { data: null, error: null }
      }
      default:
        return { data: null, error: { message: 'Unknown mutation' } }
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any)
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<any> {
    return this.execute().catch(onrejected)
  }
}

export function createMockClient() {
  const store = createMockDataStore()

  const makeMockUser = (id: string, email: string, fullName: string) => ({
    id,
    email,
    user_metadata: { full_name: fullName },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  })

  const resolveUser = (email: string, password: string) => {
    if (email === SUPERADMIN_EMAIL && password === SUPERADMIN_PASSWORD) {
      return makeMockUser(SUPERADMIN_USER_ID, SUPERADMIN_EMAIL, 'Super Admin')
    }
    if (email === MOCK_EMAIL && password === MOCK_PASSWORD) {
      return makeMockUser(MOCK_USER_ID, MOCK_EMAIL, 'Admin Demo')
    }
    if (email === EMPLOYEE_EMAIL && password === EMPLOYEE_PASSWORD) {
      return makeMockUser(EMPLOYEE_USER_ID, EMPLOYEE_EMAIL, 'Sofía Martínez')
    }
    return null
  }

  const MOCK_SESSION_KEY = 'mock-session'

  const buildSession = (user: any) => ({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 36000,
    expires_at: Math.floor(Date.now() / 1000) + 36000,
    token_type: 'bearer',
    user,
  })

  const saved = localStorage.getItem(MOCK_SESSION_KEY)
  let currentSession: any = saved ? JSON.parse(saved) : null

  const persistSession = () => {
    if (currentSession) {
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(currentSession))
    } else {
      localStorage.removeItem(MOCK_SESSION_KEY)
    }
  }

  const authCallbacks: MockAuthChangeCallback[] = []

  const mockAuth = {
    getSession: async () => ({
      data: { session: currentSession },
      error: null,
    }),
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const user = resolveUser(email, password)
      if (user) {
        currentSession = buildSession(user)
        persistSession()
        for (const cb of authCallbacks) cb('SIGNED_IN', currentSession)
        return {
          data: { user: currentSession.user, session: currentSession },
          error: null,
        }
      }
      return {
        data: { user: null, session: null },
        error: { message: 'Credenciales inválidas' },
      }
    },
    signOut: async () => {
      currentSession = null
      persistSession()
      for (const cb of authCallbacks) cb('SIGNED_OUT', null)
      return { error: null }
    },
    onAuthStateChange: (callback: MockAuthChangeCallback) => {
      authCallbacks.push(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = authCallbacks.indexOf(callback)
              if (idx >= 0) authCallbacks.splice(idx, 1)
            },
          },
        },
      }
    },
  }

  const mockRpc = {
    financial_summary: async (_args: any) => ({ data: [], error: null }),
    record_payment: async (_args: any) => ({ data: 'mock-txn-id', error: null }),
    record_sale: async (args: any) => {
      const now = new Date().toISOString()
      const txnId = `txn-mock-${Date.now()}`

      const appointment = store.appointments.find((a: any) => a.id === args.p_appointment_id)
      if (!appointment) return { data: null, error: { message: 'Appointment not found' } }

      const service = store.services.find((s: any) => s.id === appointment.service_id)
      const employeeProfile = store.profiles.find((p: any) => p.id === appointment.employee_id)

      const exchangeRate = args.p_exchange_rate ?? 36.50
      let paymentsBreakdown = []
      try {
        paymentsBreakdown = typeof args.p_payments_breakdown === 'string'
          ? JSON.parse(args.p_payments_breakdown)
          : (args.p_payments_breakdown || [])
      } catch { paymentsBreakdown = [] }

      const business = store.businesses.find((b: any) => b.id === BIZ)
      if (business) business.ves_exchange_rate = exchangeRate

      const assistantPct = Number(appointment.assistant_percentage ?? 0)
      const employeePct = Number(
        appointment.employee_percentage_override
        ?? employeeProfile?.pay_percentage
        ?? (100 - Number(service?.local_percentage ?? 50))
      )
      const localPct = Math.max(0, 100 - employeePct - assistantPct)
      const assistantAmount = Number((Number(args.p_amount) * (assistantPct / 100)).toFixed(2))
      const employeeAmount = Number((Number(args.p_amount) * (employeePct / 100)).toFixed(2))
      const localAmount = Number((Number(args.p_amount) - assistantAmount - employeeAmount).toFixed(2))

      store.transactions.push({
        id: txnId,
        business_id: BIZ,
        appointment_id: args.p_appointment_id,
        total_amount: args.p_amount,
        local_amount: localAmount,
        employee_amount: employeeAmount,
        assistant_amount: assistantAmount,
        local_percentage: localPct,
        employee_percentage: employeePct,
        assistant_percentage: assistantPct,
        method: args.p_method || 'cash',
        exchange_rate_used: exchangeRate,
        payments_breakdown: paymentsBreakdown,
        paid_at: now,
        created_by: ADMIN,
        notes: args.p_notes || null,
        created_at: now,
      } as any)

      appointment.payment_status = 'paid'

      const products = typeof args.p_products === 'string' ? JSON.parse(args.p_products) : (args.p_products || [])
      for (const p of products) {
        const stockItem = store.inventory_stock.find((s: any) =>
          s.product_id === p.product_id &&
          (s.variant_id === p.variant_id || (!s.variant_id && !p.variant_id))
        )
        if (stockItem) {
          stockItem.quantity = Math.max(0, Number(stockItem.quantity) - Number(p.quantity))
        }
      }

      return { data: txnId, error: null }
    },
    public_business_info: async (_args: any) => ({ data: store.businesses.slice(0, 1), error: null }),
    public_list_services: async (_args: any) => ({ data: [], error: null }),
    public_list_employees_for_service: async (_args: any) => ({ data: [], error: null }),
    public_get_available_slots: async (_args: any) => ({ data: [], error: null }),
    public_book_appointment: async (_args: any) => ({ data: null, error: null }),
  }

  const mockFunctions = {
    invoke: async (fnName: string, options?: { body?: any }) => {
      const payload = options?.body || {}
      const now = new Date().toISOString()

      if (fnName === 'manage-user') {
        const action = payload.action || 'create'
        const meta = payload.user_metadata || {}

        if (action === 'create') {
          const userId = crypto.randomUUID?.() || `user-${Date.now()}`
          store.profiles.push({
            id: userId,
            business_id: meta.business_id || null,
            full_name: meta.full_name || payload.email?.split('@')[0] || 'Nuevo usuario',
            role: meta.role || 'empleado',
            job_title: meta.job_title || null,
            phone: meta.phone || null,
            avatar_url: null,
            pay_type: meta.pay_type || 'percentage',
            pay_percentage: meta.pay_percentage ?? 50,
            base_salary: meta.base_salary ?? 0,
            active: true,
            created_at: now,
            updated_at: now,
          } as any)
          return { data: { user: { id: userId, email: payload.email } }, error: null }
        }

        if (action === 'update') {
          const profile = store.profiles.find(p => p.id === payload.user_id)
          if (profile && meta) {
            if (meta.full_name) profile.full_name = meta.full_name
            if (meta.job_title) profile.job_title = meta.job_title
            if (meta.phone) profile.phone = meta.phone
            if (meta.pay_type) profile.pay_type = meta.pay_type
            if (meta.pay_percentage != null) profile.pay_percentage = meta.pay_percentage
            if (meta.base_salary != null) profile.base_salary = meta.base_salary
          }
          return { data: { success: true }, error: null }
        }

        if (action === 'delete') {
          const idx = store.profiles.findIndex(p => p.id === payload.user_id)
          if (idx >= 0) store.profiles.splice(idx, 1)
          return { data: { success: true }, error: null }
        }

        return { data: null, error: { message: `Unknown action: ${action}` } }
      }

      if (fnName !== 'superadmin-invite') {
        return { data: null, error: { message: 'Function not found' } }
      }

      if (payload.action === 'suspend_business') {
        const bizId = payload.business_id
        const biz = store.businesses.find((b: any) => b.id === bizId)
        if (biz) biz.active = false
        for (const p of store.profiles) {
          if (p.business_id === bizId) p.active = false
        }
        return { data: { success: true }, error: null }
      }

      if (payload.action === 'resume_business') {
        const bizId = payload.business_id
        const biz = store.businesses.find((b: any) => b.id === bizId)
        if (biz) biz.active = true
        for (const p of store.profiles) {
          if (p.business_id === bizId) p.active = true
        }
        return { data: { success: true }, error: null }
      }

      if (payload.action === 'update_business') {
        const bizId = payload.business_id
        const biz = store.businesses.find((b: any) => b.id === bizId)
        if (!biz) {
          return { data: null, error: { message: 'Business not found' } }
        }
        const allowed = ['name', 'phone', 'address', 'timezone', 'currency', 'niche_type', 'active', 'ves_exchange_rate', 'theme_config', 'terminology', 'multi_branch_enabled', 'features'] as const
        for (const f of allowed) {
          if (payload[f] !== undefined) (biz as any)[f] = payload[f]
        }
        biz.updated_at = new Date().toISOString()
        return { data: { business: biz }, error: null }
      }

      if (payload.action === 'delete_business') {
        const bizId = payload.business_id
        const biz = store.businesses.find((b: any) => b.id === bizId)
        if (biz) biz.deleted_at = new Date().toISOString()
        for (const p of store.profiles) {
          if (p.business_id === bizId) p.active = false
        }
        return { data: { success: true }, error: null }
      }

      const baseSlug = String(payload.businessName || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `biz-${Date.now()}`

      let slug = baseSlug
      let suffix = 1
      while (store.businesses.some(b => b.slug === slug)) {
        suffix += 1
        slug = `${baseSlug}-${suffix}`
      }

      const business = {
        id: crypto.randomUUID?.() || `biz-${Date.now()}`,
        name: payload.businessName || 'Nuevo negocio',
        slug,
        phone: null,
        address: null,
        timezone: 'America/Santo_Domingo',
        currency: 'USD',
        niche_type: payload.nicheType || 'salon',
        theme_config: { primary: '#8B5CF6', secondary: '#60A5FA' },
        terminology: {
          client: 'Cliente',
          employee: 'Empleado',
          service: 'Servicio',
          appointment: 'Cita',
          staff: 'Personal',
          pet: 'Mascota',
          owner: 'Dueño',
          breed: 'Raza',
          weight: 'Peso',
          vaccines: 'Vacunas',
        },
        active: true,
        job_titles: [],
        service_categories: [],
        ves_exchange_rate: 36.50,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      }

      store.businesses.push(business as any)

      const invitedUserId = crypto.randomUUID?.() || `user-${Date.now()}`
      store.profiles.push({
        id: invitedUserId,
        business_id: business.id,
        full_name: `Admin ${business.name}`,
        role: 'admin',
        job_title: 'Administrador',
        phone: null,
        avatar_url: null,
        active: true,
        created_at: now,
        updated_at: now,
      } as any)

      return { data: { business, invitedUserId }, error: null }
    },
  }

  return {
    from: (table: string) => new MockQueryBuilder(table, store),
    auth: mockAuth,
    rpc: (fnName: string, args: any) => {
      const fn = (mockRpc as any)[fnName]
      if (fn) return fn(args)
      return Promise.resolve({ data: null, error: null })
    },
    functions: mockFunctions,
  } as any
}
