import {
  CalendarIcon,
  ClockCircleIcon,
  DollarIcon,
  BillIcon,
  UsersGroupRoundedIcon,
  GraphIcon,
  BagIcon,
  StarsIcon,
  BoxIcon,
  CartLargeIcon,
  DeliveryIcon,
  SettingsIcon,
  GiftIcon,
  DocumentIcon,
  HeartPulseIcon,
  BuildingsIcon,
  ChatRoundLineIcon,
  WalletMoneyIcon,
} from '@solar-icons/vue/linear'
import type { Component } from 'vue'
import type { RouteGate } from '../../router/gate'

export interface SidebarLink {
  to: string
  label: string
  labelKey?: string
  icon: Component
  adminOnly?: boolean
  employeeOnly?: boolean
  badge?: string
  gate?: RouteGate
}

export interface SidebarSection {
  title?: string
  adminOnly?: boolean
  links: SidebarLink[]
}

export const sidebarSections: SidebarSection[] = [
  {
    links: [
      { to: '/admin/calendario', label: 'Calendario', icon: CalendarIcon, adminOnly: true, gate: { feature: 'calendario' } },
      { to: '/dashboard/calendario', label: 'Calendario', icon: CalendarIcon, employeeOnly: true, gate: { hideIfAgendaDisabled: true, feature: 'calendario' } },
      { to: '/admin', label: 'Agenda', icon: CalendarIcon, adminOnly: true, gate: { feature: 'agenda' } },
      { to: '/dashboard/agenda', label: 'Agenda', icon: CalendarIcon, employeeOnly: true, gate: { hideIfAgendaDisabled: true, feature: 'agenda' } },
      { to: '/dashboard/historial', label: 'Historial', icon: ClockCircleIcon, employeeOnly: true, gate: { feature: 'servicios' } },
      { to: '/dashboard/comisiones', label: 'Comisiones', icon: DollarIcon, employeeOnly: true, gate: { feature: 'servicios' } },
      { to: '/dashboard/recibo', label: 'Recibo', icon: BillIcon, employeeOnly: true },
      { to: '/admin/pos', label: 'Punto de Venta', icon: CartLargeIcon, adminOnly: true, gate: { feature: 'pos' } },
      { to: '/admin/clientes', label: 'Clientes', labelKey: 'client', icon: UsersGroupRoundedIcon, adminOnly: true, gate: { hideIfCapability: 'staffing.timesheets' } },
      { to: '/dashboard/clientes', label: 'Clientes', labelKey: 'client', icon: UsersGroupRoundedIcon, employeeOnly: true, gate: { feature: 'employees_see_clients', hideIfCapability: 'staffing.timesheets' } },
      { to: '/admin/consultorio', label: 'Consultorio', icon: HeartPulseIcon, adminOnly: true, gate: { capability: 'clients.pets' } },
      { to: '/dashboard/consultorio', label: 'Consultorio', icon: HeartPulseIcon, employeeOnly: true, gate: { capability: 'clients.pets', profileFlag: 'can_access_consultorio' } },
      { to: '/admin/equipo', label: 'Equipo', labelKey: 'employee', icon: BagIcon, adminOnly: true },
      { to: '/admin/empresas', label: 'Empresas', icon: BuildingsIcon, adminOnly: true, gate: { capability: 'staffing.timesheets' } },
      { to: '/admin/nomina', label: 'Nómina', icon: WalletMoneyIcon, adminOnly: true, gate: { capability: 'staffing.timesheets' } },
      { to: '/admin/staffing-reportes', label: 'Reportes', icon: DocumentIcon, adminOnly: true, gate: { capability: 'staffing.reports' } },
      { to: '/admin/staffing-taxes', label: 'Taxes', icon: DocumentIcon, adminOnly: true, gate: { capability: 'staffing.reports' } },
      { to: '/admin/crm', label: 'CRM', icon: ChatRoundLineIcon, adminOnly: true, gate: { capability: 'staffing.crm' } },
      { to: '/dashboard/crm', label: 'CRM', icon: ChatRoundLineIcon, employeeOnly: true, gate: { capability: 'staffing.crm' } },
      { to: '/admin/spreadsheet', label: 'Spreadsheet', icon: DocumentIcon, adminOnly: true, gate: { capability: 'staffing.spreadsheet' } },
      { to: '/dashboard/spreadsheet', label: 'Spreadsheet', icon: DocumentIcon, employeeOnly: true, gate: { capability: 'staffing.spreadsheet', profileFlag: 'can_access_spreadsheet' } },
      { to: '/admin/incidentes', label: 'Incidentes', icon: DocumentIcon, adminOnly: true, gate: { capability: 'staffing.incidents' } },
      { to: '/admin/finanzas', label: 'Finanzas', icon: GraphIcon, adminOnly: true, badge: 'Nuevo' },
      { to: '/admin/finanzas', label: 'Finanzas', icon: GraphIcon, employeeOnly: true, badge: 'Nuevo', gate: { profileFlag: 'can_access_finanzas' } },
      { to: '/admin/servicios', label: 'Servicios', labelKey: 'service', icon: StarsIcon, adminOnly: true, gate: { feature: 'servicios' } },
      { to: '/admin/inventario', label: 'Inventario', icon: BoxIcon, adminOnly: true, gate: { feature: 'inventario' } },
      { to: '/admin/requerimientos', label: 'Requerimientos', icon: DocumentIcon, adminOnly: true, gate: { capability: 'catalog.requirements' } },
      { to: '/admin/proveedores', label: 'Proveedores', icon: DeliveryIcon, adminOnly: true, gate: { feature: 'proveedores' } },
      { to: '/admin/gift-cards', label: 'Gift Cards', icon: GiftIcon, adminOnly: true, gate: { feature: 'gift_cards' } },
      { to: '/admin/reportes', label: 'Reporte', icon: DocumentIcon, adminOnly: true, gate: { feature: 'manual_reports' }, badge: 'Nuevo' },
    ],
  },
  {
    title: 'Ajustes',
    links: [
      { to: '/admin/configuracion', label: 'Configuración', icon: SettingsIcon },
    ],
  },
]
