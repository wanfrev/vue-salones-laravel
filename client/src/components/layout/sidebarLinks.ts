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
  TruckIcon,
  SettingsIcon,
  GiftIcon,
  DocumentIcon,
  HeartPulseIcon,
} from '@solar-icons/vue/linear'
import type { Component } from 'vue'

export interface SidebarLink {
  to: string
  label: string
  labelKey?: string
  icon: Component
  adminOnly?: boolean
  employeeOnly?: boolean
  badge?: string
  requiresFeature?: string
  requiresPetNiche?: boolean
  hideIfAgendaDisabled?: boolean
  requireCanAccessConsultorio?: boolean
}

export interface SidebarSection {
  title?: string
  adminOnly?: boolean
  links: SidebarLink[]
}

export const sidebarSections: SidebarSection[] = [
  {
    links: [
      { to: '/admin/calendario', label: 'Calendario', icon: CalendarIcon, adminOnly: true },
      { to: '/dashboard/calendario', label: 'Calendario', icon: CalendarIcon, employeeOnly: true, hideIfAgendaDisabled: true },
      { to: '/admin', label: 'Agenda', icon: CalendarIcon, adminOnly: true },
      { to: '/dashboard/agenda', label: 'Agenda', icon: CalendarIcon, employeeOnly: true, hideIfAgendaDisabled: true },
      { to: '/dashboard/historial', label: 'Historial', icon: ClockCircleIcon, employeeOnly: true },
      { to: '/dashboard/comisiones', label: 'Comisiones', icon: DollarIcon, employeeOnly: true },
      { to: '/dashboard/recibo', label: 'Recibo', icon: BillIcon, employeeOnly: true },
      { to: '/admin/pos', label: 'Punto de Venta', icon: CartLargeIcon, adminOnly: true, requiresFeature: 'pos' },
      { to: '/admin/clientes', label: 'Clientes', labelKey: 'client', icon: UsersGroupRoundedIcon, adminOnly: true },
      { to: '/dashboard/clientes', label: 'Clientes', labelKey: 'client', icon: UsersGroupRoundedIcon, employeeOnly: true, requiresFeature: 'employees_see_clients' },
      { to: '/admin/consultorio', label: 'Consultorio', icon: HeartPulseIcon, adminOnly: true, requiresPetNiche: true },
      { to: '/dashboard/consultorio', label: 'Consultorio', icon: HeartPulseIcon, employeeOnly: true, requiresPetNiche: true, requireCanAccessConsultorio: true },
      { to: '/admin/equipo', label: 'Equipo', labelKey: 'employee', icon: BagIcon, adminOnly: true },
      { to: '/admin/finanzas', label: 'Finanzas', icon: GraphIcon, adminOnly: true, badge: 'Nuevo' },
      { to: '/admin/servicios', label: 'Servicios', labelKey: 'service', icon: StarsIcon, adminOnly: true },
      { to: '/admin/inventario', label: 'Inventario', icon: BoxIcon, adminOnly: true, requiresFeature: 'inventario' },
      { to: '/admin/proveedores', label: 'Proveedores', icon: TruckIcon, adminOnly: true, requiresFeature: 'proveedores' },
      { to: '/admin/gift-cards', label: 'Gift Cards', icon: GiftIcon, adminOnly: true, requiresFeature: 'gift_cards' },
      { to: '/admin/reportes', label: 'Reporte', icon: DocumentIcon, adminOnly: true, requiresFeature: 'manual_reports', badge: 'Nuevo' },
    ],
  },
  {
    title: 'Ajustes',
    adminOnly: true,
    links: [
      { to: '/admin/configuracion', label: 'Configuración', icon: SettingsIcon, adminOnly: true },
    ],
  },
]
