import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/Login.vue'
import EmployeeAgenda from '../views/employee/EmployeeAgenda.vue'
import EmployeeCalendario from '../views/employee/EmployeeCalendario.vue'
import EmployeeHistorial from '../views/employee/EmployeeHistorial.vue'
import EmployeeComisiones from '../views/employee/EmployeeComisiones.vue'
import EmployeeRecibo from '../views/employee/EmployeeRecibo.vue'
import EmployeeClientes from '../views/employee/EmployeeClientes.vue'
import EmployeeClienteHistorial from '../views/employee/EmployeeClienteHistorial.vue'
import EmployeePayments from '../views/employee/EmployeePayments.vue'
import AdminLayout from '../components/layout/AdminLayout.vue'
import AdminView from '../views/Admin.vue'
import CalendarioView from '../views/Calendario.vue'
import SuperadminView from '../views/Superadmin.vue'
import SuperadminBusinessAdminsView from '../views/SuperadminBusinessAdmins.vue'
import SuperadminBusinessDetailView from '../views/SuperadminBusinessDetail.vue'
import ClientesView from '../views/Clientes.vue'
import ClienteHistorialView from '../views/ClienteHistorial.vue'
import FinanzasView from '../views/Finanzas.vue'
import FinanzasRegistrosView from '../views/FinanzasRegistros.vue'
import EquipoView from '../views/Equipo.vue'
import ServiciosView from '../views/Servicios.vue'
import ProductosView from '../views/Productos.vue'
import InventarioView from '../views/Inventario.vue'
import POSView from '../views/POS.vue'
import ProveedoresView from '../views/Proveedores.vue'
import GiftCardsView from '../views/GiftCards.vue'
import ConfiguracionView from '../views/Configuracion.vue'
import { useAuthStore } from '../store/auth'
import { isAdminPanelRole, resolveHomeByRole } from '../constants/roles'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/dashboard',
      redirect: '/dashboard/agenda',
    },
    {
      path: '/dashboard/agenda',
      name: 'employee-agenda',
      component: EmployeeAgenda,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/calendario',
      name: 'employee-calendario',
      component: EmployeeCalendario,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/historial',
      name: 'employee-historial',
      component: EmployeeHistorial,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/comisiones',
      name: 'employee-comisiones',
      component: EmployeeComisiones,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/recibo',
      name: 'employee-recibo',
      component: EmployeeRecibo,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/clientes',
      name: 'employee-clientes',
      component: EmployeeClientes,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/clientes/:id',
      name: 'employee-cliente-historial',
      component: EmployeeClienteHistorial,
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/pagos',
      name: 'employee-payments',
      component: EmployeePayments,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, adminOnly: true },
      children: [
        {
          path: '',
          name: 'admin',
          component: AdminView,
        },
        {
          path: 'calendario',
          name: 'admin-calendario',
          component: CalendarioView,
        },
        {
          path: 'clientes',
          name: 'admin-clientes',
          component: ClientesView,
        },
        {
          path: 'clientes/:id',
          name: 'admin-cliente-historial',
          component: ClienteHistorialView,
        },
        {
          path: 'finanzas',
          name: 'admin-finanzas',
          component: FinanzasView,
        },
        {
          path: 'finanzas/registros/:tipo',
          name: 'admin-finanzas-registros',
          component: FinanzasRegistrosView,
        },
        {
          path: 'equipo',
          name: 'admin-equipo',
          component: EquipoView,
        },
        {
          path: 'servicios',
          name: 'admin-servicios',
          component: ServiciosView,
        },
        {
          path: 'productos',
          name: 'admin-productos',
          component: ProductosView,
        },
        {
          path: 'inventario',
          name: 'admin-inventario',
          component: InventarioView,
        },
        {
          path: 'pos',
          name: 'admin-pos',
          component: POSView,
        },
        {
          path: 'proveedores',
          name: 'admin-proveedores',
          component: ProveedoresView,
        },
        {
          path: 'gift-cards',
          name: 'admin-gift-cards',
          component: GiftCardsView,
        },
        {
          path: 'configuracion',
          name: 'admin-configuracion',
          component: ConfiguracionView,
        },
      ],
    },
    {
      path: '/superadmin',
      name: 'superadmin',
      component: SuperadminView,
      meta: { requiresAuth: true, superadminOnly: true },
    },
    {
      path: '/superadmin/business/:id',
      name: 'superadmin-business-detail',
      component: SuperadminBusinessDetailView,
      meta: { requiresAuth: true, superadminOnly: true },
    },
    {
      path: '/superadmin/business/:id/admins',
      name: 'superadmin-business-admins',
      component: SuperadminBusinessAdminsView,
      meta: { requiresAuth: true, superadminOnly: true },
    },
    // Legacy redirects
    { path: '/clientes', redirect: '/admin/clientes' },
    { path: '/clientes/:id', redirect: to => `/admin/clientes/${to.params.id}` },
    { path: '/finanzas', redirect: '/admin/finanzas' },
    { path: '/equipo', redirect: '/admin/equipo' },
    { path: '/servicios', redirect: '/admin/servicios' },
    { path: '/productos', redirect: '/admin/productos' },
    { path: '/inventario', redirect: '/admin/inventario' },
    { path: '/proveedores', redirect: '/admin/proveedores' },
    { path: '/gift-cards', redirect: '/admin/gift-cards' },
    { path: '/pos', redirect: '/admin/pos' },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  await authStore.initialize()

  // If auth is still loading (e.g., mid sign-out), redirect to login
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
