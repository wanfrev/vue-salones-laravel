import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { isAdminPanelRole, resolveHomeByRole } from '../constants/roles'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/dashboard',
      redirect: '/dashboard/agenda',
    },
    // Employee routes — lazy loaded
    {
      path: '/dashboard/agenda',
      name: 'employee-agenda',
      component: () => import('../views/employee/EmployeeAgenda.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/calendario',
      name: 'employee-calendario',
      component: () => import('../views/employee/EmployeeCalendario.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/historial',
      name: 'employee-historial',
      component: () => import('../views/employee/EmployeeHistorial.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/comisiones',
      name: 'employee-comisiones',
      component: () => import('../views/employee/EmployeeComisiones.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/recibo',
      name: 'employee-recibo',
      component: () => import('../views/employee/EmployeeRecibo.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/clientes',
      name: 'employee-clientes',
      component: () => import('../views/employee/EmployeeClientes.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/clientes/:id',
      name: 'employee-cliente-historial',
      component: () => import('../views/employee/EmployeeClienteHistorial.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/pagos',
      name: 'employee-payments',
      component: () => import('../views/employee/EmployeePayments.vue'),
      meta: { requiresAuth: true },
    },
    // Admin routes — lazy loaded layout + children
    {
      path: '/admin',
      component: () => import('../components/layout/AdminLayout.vue'),
      meta: { requiresAuth: true, adminOnly: true },
      children: [
        {
          path: '',
          name: 'admin',
          component: () => import('../views/Admin.vue'),
        },
        {
          path: 'calendario',
          name: 'admin-calendario',
          component: () => import('../views/Calendario.vue'),
        },
        {
          path: 'clientes',
          name: 'admin-clientes',
          component: () => import('../views/Clientes.vue'),
        },
        {
          path: 'clientes/:id',
          name: 'admin-cliente-historial',
          component: () => import('../views/ClienteHistorial.vue'),
        },
        {
          path: 'finanzas',
          name: 'admin-finanzas',
          component: () => import('../views/Finanzas.vue'),
        },
        {
          path: 'finanzas/registros/:tipo',
          name: 'admin-finanzas-registros',
          component: () => import('../views/FinanzasRegistros.vue'),
        },
        {
          path: 'equipo',
          name: 'admin-equipo',
          component: () => import('../views/Equipo.vue'),
        },
        {
          path: 'servicios',
          name: 'admin-servicios',
          component: () => import('../views/Servicios.vue'),
        },
        {
          path: 'inventario',
          name: 'admin-inventario',
          component: () => import('../views/Productos.vue'),
        },
        {
          path: 'pos',
          name: 'admin-pos',
          component: () => import('../views/POS.vue'),
        },
        {
          path: 'proveedores',
          name: 'admin-proveedores',
          component: () => import('../views/Proveedores.vue'),
        },
        {
          path: 'gift-cards',
          name: 'admin-gift-cards',
          component: () => import('../views/GiftCards.vue'),
        },
        {
          path: 'configuracion',
          name: 'admin-configuracion',
          component: () => import('../views/Configuracion.vue'),
        },
      ],
    },
    // Superadmin routes — lazy loaded
    {
      path: '/superadmin',
      name: 'superadmin',
      component: () => import('../views/Superadmin.vue'),
      meta: { requiresAuth: true, superadminOnly: true },
    },
    {
      path: '/superadmin/business/:id',
      name: 'superadmin-business-detail',
      component: () => import('../views/SuperadminBusinessDetail.vue'),
      meta: { requiresAuth: true, superadminOnly: true },
    },
    {
      path: '/superadmin/business/:id/admins',
      name: 'superadmin-business-admins',
      component: () => import('../views/SuperadminBusinessAdmins.vue'),
      meta: { requiresAuth: true, superadminOnly: true },
    },
    // Legacy redirects
    { path: '/clientes', redirect: '/admin/clientes' },
    { path: '/clientes/:id', redirect: to => `/admin/clientes/${to.params.id}` },
    { path: '/finanzas', redirect: '/admin/finanzas' },
    { path: '/equipo', redirect: '/admin/equipo' },
    { path: '/servicios', redirect: '/admin/servicios' },
    { path: '/productos', redirect: '/admin/inventario' },
    { path: '/inventario', redirect: '/admin/inventario' },
    { path: '/proveedores', redirect: '/admin/proveedores' },
    { path: '/gift-cards', redirect: '/admin/gift-cards' },
    { path: '/pos', redirect: '/admin/pos' },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  await authStore.initialize()

  if (authStore.loading) {
    if (to.meta.public) return
    return '/'
  }

  if (to.meta.public && authStore.isAuthenticated) {
    return resolveHomeByRole(authStore.role ?? undefined, authStore.profile?.disable_agenda)
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/'
  }

  if (to.meta.superadminOnly && authStore.role !== 'superadmin') {
    return resolveHomeByRole(authStore.role ?? undefined, authStore.profile?.disable_agenda)
  }

  if (to.meta.adminOnly && !isAdminPanelRole(authStore.role ?? undefined)) {
    return resolveHomeByRole(authStore.role ?? undefined, authStore.profile?.disable_agenda)
  }

  if (authStore.role === 'empleado' && authStore.profile?.disable_agenda && (to.path === '/dashboard/agenda' || to.path === '/dashboard/calendario')) {
    return resolveHomeByRole(authStore.role, true)
  }
})

export default router
