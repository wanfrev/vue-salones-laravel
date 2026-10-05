import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useBusinessStore } from '../store/business'
import { resolveNavigation } from './navigationGuard'

// Pestañas del expediente clínico (nicho psicologia) — las mismas 5 en el árbol admin y en el de
// empleado, así que se generan una vez. El empleado además lleva el flag de perfil de expediente
// clínico (can_access_dental_clinical: flag genérico, reutilizado). Cada hija declara su propia
// capability clinical.* — ningún otro nicho (ni odontología) las tiene, así que son inalcanzables.
const clinicalExpedienteChildren = (scope: 'admin' | 'employee'): RouteRecordRaw[] => {
  const flag = scope === 'employee' ? { profileFlag: 'can_access_dental_clinical' as const } : {}
  const tab = (path: string, name: string, view: () => Promise<unknown>, capability: string): RouteRecordRaw => ({
    path,
    name: `${scope}-cliente-clinica-${name}`,
    component: view,
    meta: { gate: { capability, ...flag } },
  } as RouteRecordRaw)
  return [
    { path: '', redirect: to => ({ path: `${to.path.replace(/\/$/, '')}/historia`, query: to.query }) },
    tab('historia', 'historia', () => import('../views/ClinicalIntakeView.vue'), 'clinical.intake'),
    tab('sesiones', 'sesiones', () => import('../views/ClinicalSessionsView.vue'), 'clinical.session_notes'),
    tab('plan', 'plan', () => import('../views/ClinicalPlanView.vue'), 'clinical.treatment_plan'),
    tab('evaluaciones', 'evaluaciones', () => import('../views/ClinicalAssessmentsView.vue'), 'clinical.assessments'),
    tab('consentimiento', 'consentimiento', () => import('../views/ClinicalConsentView.vue'), 'clinical.consent'),
  ]
}

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
      path: '/reservar/:slug',
      name: 'public-booking',
      component: () => import('../views/public/PublicBooking.vue'),
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
      meta: { requiresAuth: true, gate: { hideIfAgendaDisabled: true, feature: 'agenda' } },
    },
    {
      path: '/dashboard/calendario',
      name: 'employee-calendario',
      component: () => import('../views/employee/EmployeeCalendario.vue'),
      meta: { requiresAuth: true, gate: { hideIfAgendaDisabled: true, feature: 'calendario' } },
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
      meta: { requiresAuth: true, gate: { feature: 'employees_see_clients' } },
    },
    {
      path: '/dashboard/clientes/:id',
      name: 'employee-cliente-historial',
      component: () => import('../views/employee/EmployeeClienteHistorial.vue'),
      meta: { requiresAuth: true, gate: { feature: 'employees_see_clients' } },
    },
    {
      path: '/dashboard/consultorio',
      name: 'employee-consultorio',
      component: () => import('../views/employee/EmployeeConsultorio.vue'),
      meta: { requiresAuth: true, gate: { capability: 'clients.pets', profileFlag: 'can_access_consultorio' } },
    },
    {
      // Odontólogo home screen — today's checked-in ("en sala de espera") patients only.
      path: '/dashboard/gabinete',
      name: 'employee-gabinete',
      component: () => import('../views/employee/EmployeeGabinete.vue'),
      meta: { requiresAuth: true, gate: { capability: 'dental.clinical_history', profileFlag: 'can_access_dental_clinical' } },
    },
    {
      // Employee-side mirror of the admin dental tab shell — same PatientDentalShell.vue and the
      // same 6 leaf view components, wrapped in AppLayout the way EmployeeConsultorio.vue wraps
      // ConsultorioMain.vue (employee routes are flat, not nested under a layout route).
      path: '/dashboard/clientes/:id/expediente',
      component: () => import('../views/employee/EmployeePatientDentalShell.vue'),
      // Every child below carries its own specific dental.* capability, but the bare parent path
      // (no child segment) matches too and would render the shell — with real patient data in its
      // header — for any niche's employee if this weren't here.
      meta: { requiresAuth: true, gate: { feature: 'employees_see_clients', capability: 'dental.odontogram', profileFlag: 'can_access_dental_clinical' } },
      children: [
        {
          path: 'historia-clinica',
          name: 'employee-cliente-historia-clinica',
          component: () => import('../views/ClienteHistoriaClinica.vue'),
          meta: { gate: { capability: 'dental.clinical_history', profileFlag: 'can_access_dental_clinical' } },
        },
        {
          path: 'odontograma',
          name: 'employee-cliente-odontograma',
          component: () => import('../views/ClienteOdontograma.vue'),
          meta: { gate: { capability: 'dental.odontogram', profileFlag: 'can_access_dental_clinical' } },
        },
        {
          path: 'periodontograma',
          name: 'employee-cliente-periodontograma',
          component: () => import('../views/ClientePeriodontograma.vue'),
          meta: { gate: { capability: 'dental.periodontogram', profileFlag: 'can_access_dental_clinical' } },
        },
        {
          path: 'anexo-endodoncia',
          name: 'employee-cliente-anexo-endodoncia',
          component: () => import('../views/ClienteAnexoEndodoncia.vue'),
          meta: { gate: { capability: 'dental.endo_annex', profileFlag: 'can_access_dental_clinical' } },
        },
        {
          path: 'anexo-periodoncia',
          name: 'employee-cliente-anexo-periodoncia',
          component: () => import('../views/ClientePerioAnexo.vue'),
          meta: { gate: { capability: 'dental.perio_annex', profileFlag: 'can_access_dental_clinical' } },
        },
        {
          path: 'consentimiento',
          name: 'employee-cliente-consentimiento',
          component: () => import('../views/ClienteConsentimiento.vue'),
          meta: { gate: { capability: 'dental.consent', profileFlag: 'can_access_dental_clinical' } },
        },
        {
          path: 'biofilm',
          name: 'employee-cliente-biofilm',
          component: () => import('../views/ClienteBiofilm.vue'),
          meta: { gate: { capability: 'dental.biofilm', profileFlag: 'can_access_dental_clinical' } },
        },
        {
          path: 'presupuesto',
          name: 'employee-cliente-presupuesto',
          component: () => import('../views/ClientePresupuesto.vue'),
          meta: { gate: { capability: 'dental.budget', profileFlag: 'can_access_dental_clinical' } },
        },
      ],
    },
    {
      // Expediente clínico del nicho psicologia — espejo en el árbol de empleado del de /admin.
      path: '/dashboard/clientes/:id/expediente-clinico',
      component: () => import('../views/employee/EmployeePatientClinicalShell.vue'),
      // La ruta base (sin pestaña) también coincide y mostraría el shell con datos reales del
      // paciente en otro nicho si no llevara su propio gate.
      meta: { requiresAuth: true, gate: { feature: 'employees_see_clients', capability: 'clinical.intake', profileFlag: 'can_access_dental_clinical' } },
      children: clinicalExpedienteChildren('employee'),
    },
    {
      path: '/dashboard/pagos',
      name: 'employee-payments',
      component: () => import('../views/employee/EmployeePayments.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard/crm',
      name: 'employee-crm',
      component: () => import('../views/employee/EmployeeCrm.vue'),
      meta: { requiresAuth: true, gate: { capability: 'staffing.crm' } },
    },
    {
      path: '/dashboard/spreadsheet',
      name: 'employee-spreadsheet',
      component: () => import('../views/employee/EmployeeSpreadsheet.vue'),
      meta: { requiresAuth: true, gate: { capability: 'staffing.spreadsheet', profileFlag: 'can_access_spreadsheet' } },
    },
    { path: '/dashboard/finanzas', redirect: '/admin/finanzas' },
    { path: '/dashboard/finanzas/registros/:tipo', redirect: to => `/admin/finanzas/registros/${to.params.tipo}` },
    { path: '/dashboard/configuracion', redirect: '/admin/configuracion' },
    { path: '/configuracion', redirect: '/admin/configuracion' },
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
          meta: { gate: { feature: 'agenda' } },
        },
        {
          path: 'calendario',
          name: 'admin-calendario',
          component: () => import('../views/Calendario.vue'),
          meta: { gate: { feature: 'calendario' } },
        },
        {
          path: 'clientes',
          name: 'admin-clientes',
          component: () => import('../views/Clientes.vue'),
        },
        {
          // Same board as /dashboard/gabinete (employee) — a solo dentist who owns her own
          // practice logs in as admin and has no separate secretary account, so this needs to
          // exist here too rather than only under the employee tree.
          path: 'gabinete',
          name: 'admin-gabinete',
          component: () => import('../components/dental/GabineteBoard.vue'),
          meta: { gate: { capability: 'dental.clinical_history' } },
        },
        {
          path: 'clientes/:id',
          name: 'admin-cliente-historial',
          component: () => import('../views/ClienteHistorial.vue'),
        },
        {
          path: 'consultorio',
          name: 'admin-consultorio',
          component: () => import('../views/Consultorio.vue'),
          meta: { gate: { capability: 'clients.pets' } },
        },
        {
          // Shared tab shell for the 6 dental clinical modules — see PatientDentalShell.vue.
          // Deliberately a distinct path segment (not nested directly under `clientes/:id`, which
          // stays ClienteHistorial.vue for every niche) so this whole subtree is additive and
          // unreachable outside odontología (each child still carries its own capability gate).
          path: 'clientes/:id/expediente',
          component: () => import('../components/dental/PatientDentalShell.vue'),
          // Every child below carries its own specific dental.* capability, but the bare parent
          // path (no child segment) matches too and would render the shell — with real patient
          // data in its header — for any niche if this weren't here. Any dental.* capability
          // works as the "is this business odontología" proxy since only that niche has them.
          meta: { gate: { capability: 'dental.odontogram' } },
          children: [
            {
              path: 'historia-clinica',
              name: 'admin-cliente-historia-clinica',
              component: () => import('../views/ClienteHistoriaClinica.vue'),
              meta: { gate: { capability: 'dental.clinical_history' } },
            },
            {
              path: 'odontograma',
              name: 'admin-cliente-odontograma',
              component: () => import('../views/ClienteOdontograma.vue'),
              meta: { gate: { capability: 'dental.odontogram' } },
            },
            {
              path: 'periodontograma',
              name: 'admin-cliente-periodontograma',
              component: () => import('../views/ClientePeriodontograma.vue'),
              meta: { gate: { capability: 'dental.periodontogram' } },
            },
            {
              path: 'anexo-endodoncia',
              name: 'admin-cliente-anexo-endodoncia',
              component: () => import('../views/ClienteAnexoEndodoncia.vue'),
              meta: { gate: { capability: 'dental.endo_annex' } },
            },
            {
              path: 'anexo-periodoncia',
              name: 'admin-cliente-anexo-periodoncia',
              component: () => import('../views/ClientePerioAnexo.vue'),
              meta: { gate: { capability: 'dental.perio_annex' } },
            },
            {
              path: 'consentimiento',
              name: 'admin-cliente-consentimiento',
              component: () => import('../views/ClienteConsentimiento.vue'),
              meta: { gate: { capability: 'dental.consent' } },
            },
            {
              path: 'biofilm',
              name: 'admin-cliente-biofilm',
              component: () => import('../views/ClienteBiofilm.vue'),
              meta: { gate: { capability: 'dental.biofilm' } },
            },
            {
              path: 'presupuesto',
              name: 'admin-cliente-presupuesto',
              component: () => import('../views/ClientePresupuesto.vue'),
              meta: { gate: { capability: 'dental.budget' } },
            },
          ],
        },
        {
          // Expediente clínico del nicho psicologia (módulo clinical.*) — path distinto al de
          // odontología (`expediente`) para que ambos subárboles sean independientes.
          path: 'clientes/:id/expediente-clinico',
          component: () => import('../components/clinical/PatientClinicalShell.vue'),
          meta: { gate: { capability: 'clinical.intake' } },
          children: clinicalExpedienteChildren('admin'),
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
          path: 'reportes',
          name: 'admin-reportes',
          component: () => import('../views/Reportes.vue'),
        },
        {
          path: 'equipo',
          name: 'admin-equipo',
          component: () => import('../views/Equipo.vue'),
        },
        {
          // Staffing-only. The capability gate blocks every other niche here and in the API.
          path: 'empresas',
          name: 'admin-empresas',
          component: () => import('../views/Empresas.vue'),
          meta: { gate: { capability: 'staffing.timesheets' } },
        },
        {
          // Staffing-only — weekly hours-and-payroll entry, per company.
          path: 'nomina',
          name: 'admin-nomina',
          component: () => import('../views/Nomina.vue'),
          meta: { gate: { capability: 'staffing.timesheets' } },
        },
        {
          // Staffing-only reports — separate from the salon-side `reportes` route/module above.
          path: 'staffing-reportes',
          name: 'admin-staffing-reportes',
          component: () => import('../views/StaffingReportes.vue'),
          meta: { gate: { capability: 'staffing.reports' } },
        },
        {
          path: 'staffing-taxes',
          name: 'admin-staffing-taxes',
          component: () => import('../views/StaffingTaxes.vue'),
          meta: { gate: { capability: 'staffing.reports' } },
        },
        {
          path: 'crm',
          name: 'admin-crm',
          component: () => import('../views/Crm.vue'),
          meta: { gate: { capability: 'staffing.crm' } },
        },
        {
          path: 'spreadsheet',
          name: 'admin-spreadsheet',
          component: () => import('../views/Spreadsheet.vue'),
          meta: { gate: { capability: 'staffing.spreadsheet' } },
        },
        {
          path: 'incidentes',
          name: 'admin-incidentes',
          component: () => import('../views/Incidentes.vue'),
          meta: { gate: { capability: 'staffing.incidents' } },
        },
        {
          path: 'servicios',
          name: 'admin-servicios',
          component: () => import('../views/Servicios.vue'),
          meta: { gate: { feature: 'servicios' } },
        },
        {
          path: 'inventario',
          name: 'admin-inventario',
          component: () => import('../views/Productos.vue'),
        },
        {
          path: 'requerimientos',
          name: 'admin-requerimientos',
          component: () => import('../views/Requerimientos.vue'),
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
        { path: 'configuracion', redirect: 'configuracion/general' },
        {
          path: 'configuracion/:section',
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
    {
      path: '/superadmin/audit-log',
      name: 'superadmin-audit-log',
      component: () => import('../views/SuperadminAuditLog.vue'),
      meta: { requiresAuth: true, superadminOnly: true },
    },
    {
      path: '/superadmin/accounts',
      name: 'superadmin-accounts',
      component: () => import('../views/SuperadminAccounts.vue'),
      meta: { requiresAuth: true, superadminOnly: true },
    },
    {
      path: '/superadmin/features',
      name: 'superadmin-features',
      component: () => import('../views/SuperadminFeaturesMatrix.vue'),
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

  const businessStore = useBusinessStore()

  return resolveNavigation(
    { path: to.path, meta: to.meta as any },
    {
      loading: authStore.loading,
      isAuthenticated: authStore.isAuthenticated,
      isCajeroProfile: authStore.isCajeroProfile,
      role: authStore.role,
      profile: authStore.profile,
      hasFeature: (key) => businessStore.hasFeature(key),
      hasCapability: (capability) => businessStore.hasCapability(capability),
    },
  )
})

export default router
