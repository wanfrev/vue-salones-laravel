import 'vue-router'
import type { Role } from '../constants/roles'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    requiresAuth?: boolean
    adminOnly?: boolean
    roles?: Role[]
  }
}
