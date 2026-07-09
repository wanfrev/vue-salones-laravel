/**
 * API Client — HTTP wrapper for Laravel backend.
 *
 * Provides a supabase-js compatible query builder API so services need minimal changes.
 * Ready to connect to Laravel endpoints.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export type ApiError = {
  message: string
  code?: string
  details?: string
  hint?: string
}

export type ApiResponse<T> = {
  data: T | null
  error: ApiError | null
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await apiFetch<T>(method, path, body)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

let authToken: string | null = localStorage.getItem('auth_token')

export function getAuthToken(): string | null {
  return authToken
}

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

async function apiFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 204) {
      return { data: null, error: null }
    }

    if (!res.ok) {
        let errorBody: ApiError = { message: `HTTP ${res.status}` }
        try {
          const json = await res.json()
          const message =
            typeof json.message === 'string' ? json.message :
            typeof json.error === 'string' ? json.error :
            typeof json.error?.message === 'string' ? json.error.message :
            json.message ?? json.error ?? `HTTP ${res.status}`
          errorBody = {
            message,
            code: json.code ?? String(res.status),
            details: json.details,
            hint: json.hint,
          }
        } catch { /* not JSON */ }
        if (res.status === 401) {
          errorBody.code = '401'
        }
      return { data: null, error: errorBody }
    }

    const data = (await res.json()) as T
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Network error',
        code: 'NETWORK_ERROR',
      },
    }
  }
}

// ── Query Builder ──────────────────────────────────────────────

type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in'

type Filter = {
  column: string
  op: FilterOp
  value: unknown
}

class ApiQueryBuilder<T = any> {
  private tableName: string
  private _method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
  private _select: string = '*'
  private _filters: Filter[] = []
  private _orFilters: string[] = []
  private _orderColumn?: string
  private _orderAscending: boolean = true
  private _limit?: number
  private _single: boolean = false
  private _body?: unknown
  private _onConflict?: string
  private _isInsert: boolean = false
  private _isUpsert: boolean = false
  private _maybeSingle: boolean = false

  constructor(table: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET') {
    this.tableName = table
    this._method = method
  }

  select(columns?: string): this {
    this._select = columns || '*'
    return this
  }

  eq(column: string, value: unknown): this {
    this._filters.push({ column, op: 'eq', value })
    return this
  }

  neq(column: string, value: unknown): this {
    this._filters.push({ column, op: 'neq', value })
    return this
  }

  gt(column: string, value: unknown): this {
    this._filters.push({ column, op: 'gt', value })
    return this
  }

  gte(column: string, value: unknown): this {
    this._filters.push({ column, op: 'gte', value })
    return this
  }

  lt(column: string, value: unknown): this {
    this._filters.push({ column, op: 'lt', value })
    return this
  }

  lte(column: string, value: unknown): this {
    this._filters.push({ column, op: 'lte', value })
    return this
  }

  like(column: string, value: unknown): this {
    this._filters.push({ column, op: 'like', value })
    return this
  }

  ilike(column: string, value: unknown): this {
    this._filters.push({ column, op: 'ilike', value })
    return this
  }

  is(column: string, value: unknown): this {
    this._filters.push({ column, op: 'is', value })
    return this
  }

  in(column: string, values: unknown[]): this {
    this._filters.push({ column, op: 'in', value: values })
    return this
  }

  or(filterString: string): this {
    this._orFilters.push(filterString)
    return this
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this._orderColumn = column
    this._orderAscending = opts?.ascending ?? true
    return this
  }

  limit(count: number): this {
    this._limit = count
    return this
  }

  single(): this {
    this._single = true
    return this
  }

  maybeSingle(): this {
    this._maybeSingle = true
    this._single = true
    return this
  }

  insert(data: unknown): this {
    this._method = 'POST'
    this._body = data
    this._isInsert = true
    return this
  }

  update(data: unknown): this {
    this._method = 'PUT'
    this._body = data
    return this
  }

  delete(): this {
    this._method = 'DELETE'
    return this
  }

  upsert(data: unknown, opts?: { onConflict?: string }): this {
    this._method = 'POST'
    this._body = data
    this._isUpsert = true
    this._onConflict = opts?.onConflict
    return this
  }

  // Makes the builder thennable
  then<TResult1 = ApiResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private get tablePath(): string {
    return this.tableName.replace(/_/g, '-')
  }

  private buildPathAndBody(): { path: string; method: string; body?: unknown } {
    const params = new URLSearchParams()

    if (this._select && this._select !== '*') {
      params.set('select', this._select)
    }

    for (const f of this._filters) {
      if (f.op === 'in') {
        const vals = (f.value as unknown[]).join(',')
        params.set(f.column, `in.(${vals})`)
      } else {
        params.set(f.column, `${f.op}.${f.value}`)
      }
    }

    for (const orStr of this._orFilters) {
      params.append('or', orStr)
    }

    if (this._orderColumn) {
      params.set('order', `${this._orderColumn}.${this._orderAscending ? 'asc' : 'desc'}`)
    }

    if (this._limit !== undefined) {
      params.set('limit', String(this._limit))
    }

    const qs = params.toString()

    if (this._isUpsert) {
      const path = `/${this.tablePath}/upsert`
      return { path: qs ? `${path}?${qs}` : path, method: 'POST', body: { data: this._body, onConflict: this._onConflict } }
    }

    if (this._isInsert) {
      const path = `/${this.tablePath}`
      return { path: qs ? `${path}?${qs}` : path, method: 'POST', body: { data: this._body } }
    }

    const idFilter = this._filters.find(f => f.column === 'id' && f.op === 'eq')
    if (idFilter && ['GET', 'PUT', 'DELETE', 'PATCH'].includes(this._method)) {
      const path = `/${this.tablePath}/${idFilter.value}`
      const otherFilters = this._filters.filter(f => f !== idFilter)
      const otherParams = new URLSearchParams()
      if (this._select && this._select !== '*') otherParams.set('select', this._select)
      for (const f of otherFilters) {
        if (f.op === 'in') otherParams.set(f.column, `in.(${(f.value as unknown[]).join(',')})`)
        else otherParams.set(f.column, `${f.op}.${f.value}`)
      }
      for (const orStr of this._orFilters) otherParams.append('or', orStr)
      if (this._orderColumn) otherParams.set('order', `${this._orderColumn}.${this._orderAscending ? 'asc' : 'desc'}`)
      const oqs = otherParams.toString()
      return { path: oqs ? `${path}?${oqs}` : path, method: this._method, body: this._body ? { data: this._body } : undefined }
    }

    const path = `/${this.tablePath}`
    return { path: qs ? `${path}?${qs}` : path, method: this._method, body: this._body ? { data: this._body } : undefined }
  }

  private async execute(): Promise<ApiResponse<T>> {
    const { path, method, body } = this.buildPathAndBody()

    if (this._single) {
      const res = await apiFetch<T>(method, path, body)
      if (res.error) return { data: null, error: res.error }
      const d = res.data
      if (Array.isArray(d)) {
        if (d.length === 0) {
          return this._maybeSingle ? { data: null, error: null } : { data: null, error: { message: 'Not found', code: 'PGRST116' } }
        }
        return { data: d[0], error: null }
      }
      return { data: d, error: null }
    }

    return apiFetch<T>(method, path, body)
  }
}

// ── Auth API ───────────────────────────────────────────────────

export type ApiSession = {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_at?: number
  user: ApiUser
}

export type ApiUser = {
  id: string
  email?: string
  role?: string
  profile?: {
    id: string
    business_id: string | null
    full_name: string
    role: string
    phone: string | null
    avatar_url: string | null
    active: boolean
    pay_type: string | null
    pay_percentage: number | null
    base_salary: number | null
    disable_agenda?: boolean
  }
}

const authListeners = new Set<(session: ApiSession | null) => void>()
let currentSession: ApiSession | null = null

export const apiAuth = {
  get currentUser(): ApiUser | null {
    return currentSession?.user ?? null
  },

  async getSession() {
    if (currentSession) {
      return { data: { session: currentSession }, error: null as ApiError | null }
    }
    const res = await apiFetch<ApiSession>('GET', '/auth/session')
    if (res.data) {
      currentSession = res.data
      authToken = res.data.access_token
      setAuthToken(res.data.access_token)
      return { data: { session: res.data }, error: null as ApiError | null }
    }
    return { data: { session: null as ApiSession | null }, error: res.error }
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const res = await apiFetch<ApiSession>('POST', '/auth/login', { email, password })
    if (res.data) {
      currentSession = res.data
      setAuthToken(res.data.access_token)
      authListeners.forEach(fn => fn(res.data))
      return { data: { session: res.data, user: res.data.user }, error: null as ApiError | null }
    }
    return { data: null as unknown as { session: ApiSession; user: ApiUser }, error: res.error }
  },

  async signOut(_opts?: { scope?: string }) {
    await apiFetch<void>('POST', '/auth/logout')
    currentSession = null
    setAuthToken(null)
    authListeners.forEach(fn => fn(null))
    return { error: null }
  },

  async refreshSession(_opts?: { refresh_token?: string }) {
    const res = await apiFetch<ApiSession>('POST', '/auth/refresh')
    if (res.data) {
      currentSession = res.data
      setAuthToken(res.data.access_token)
      return { data: { session: res.data, user: res.data.user }, error: null }
    }
    return { data: null as unknown as { session: ApiSession; user: ApiUser }, error: res.error }
  },

  onAuthStateChange(callback: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: ApiSession | null) => void) {
    const listener = (session: ApiSession | null) => {
      callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session)
    }
    authListeners.add(listener)
    return {
      data: {
        subscription: {
          unsubscribe: () => { authListeners.delete(listener) },
        },
      },
    }
  },
}

// ── RPC ────────────────────────────────────────────────────────

function rpcCallable<T = any>(fn: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  return apiFetch<T>('POST', `/rpc/${fn}`, params)
}

export const apiRpc = Object.assign(rpcCallable, {
  invoke: rpcCallable,
})

// ── Edge Functions (stub) ──────────────────────────────────────

const functionsStub = {
  invoke(_fn: string, _opts?: { body?: unknown }): Promise<ApiResponse<{ success: boolean }>> {
    return Promise.resolve({
      data: { success: true },
      error: null,
    })
  },
}

// ── Realtime (stub) ────────────────────────────────────────────

interface RealtimeChannel {
  on(_event: string, _filter: unknown, _callback: Function): RealtimeChannel
  subscribe(_callback?: Function): RealtimeChannel
  unsubscribe(): RealtimeChannel
}

const channels = new Map<string, RealtimeChannel>()

function createChannel(_name: string): RealtimeChannel {
  const ch: RealtimeChannel = {
    on() { return ch },
    subscribe() { return ch },
    unsubscribe() { return ch },
  }
  return ch
}

const apiRealtime = {
  channel(name: string, _config?: unknown): RealtimeChannel {
    const ch = createChannel(name)
    channels.set(name, ch)
    return ch
  },
  removeChannel(channelOrName: string | RealtimeChannel) {
    if (typeof channelOrName === 'string') {
      channels.delete(channelOrName)
    } else {
      for (const [key, ch] of channels) {
        if (ch === channelOrName) { channels.delete(key); break }
      }
    }
  },
  removeAllChannels() {
    channels.clear()
  },
}

// ── Public API ─────────────────────────────────────────────────

export const api = {
  from(table: string): ApiQueryBuilder {
    return new ApiQueryBuilder(table)
  },

  rpc: apiRpc,

  auth: apiAuth,

  functions: functionsStub,

  channel(name: string, config?: unknown) {
    return apiRealtime.channel(name, config)
  },

  removeChannel(channelOrName: string | RealtimeChannel) {
    apiRealtime.removeChannel(channelOrName)
  },

  removeAllChannels() {
    apiRealtime.removeAllChannels()
  },
}

export default api
