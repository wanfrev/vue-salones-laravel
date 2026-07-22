import {
  CalendarDays,
  Calendar,
  Clock,
  DollarSign,
  Receipt,
  Users,
  BarChart3,
  Briefcase,
  Sparkles,
  Package,
  Archive,
  ShoppingCart,
  Truck,
  Settings,
  Gift,
} from 'lucide-vue-next'
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
  hideIfAgendaDisabled?: boolean
}

export interface SidebarSection {
  title?: string
  adminOnly?: boolean
  links: SidebarLink[]
}

export const sidebarSections: SidebarSection[] = [
  {
    links: [
      { to: '/admin/calendario', label: 'Calendario', icon: Calendar, adminOnly: true },
      { to: '/dashboard/calendario', label: 'Calendario', icon: Calendar, employeeOnly: true, hideIfAgendaDisabled: true },
      { to: '/admin', label: 'Agenda', icon: CalendarDays, adminOnly: true },
      { to: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays, employeeOnly: true, hideIfAgendaDisabled: true },
      { to: '/dashboard/historial', label: 'Historial', icon: Clock, employeeOnly: true },
      { to: '/dashboard/comisiones', label: 'Comisiones', icon: DollarSign, employeeOnly: true },
      { to: '/dashboard/recibo', label: 'Recibo', icon: Receipt, employeeOnly: true },
      { to: '/admin/pos', label: 'Punto de Venta', icon: ShoppingCart, adminOnly: true, requiresFeature: 'pos' },
      { to: '/admin/clientes', label: 'Clientes', labelKey: 'client', icon: Users, adminOnly: true },
      { to: '/dashboard/clientes', label: 'Clientes', labelKey: 'client', icon: Users, employeeOnly: true },
      { to: '/admin/equipo', label: 'Equipo', labelKey: 'employee', icon: Briefcase, adminOnly: true },
      { to: '/admin/finanzas', label: 'Finanzas', icon: BarChart3, adminOnly: true, badge: 'Nuevo' },
      { to: '/admin/servicios', label: 'Servicios', labelKey: 'service', icon: Sparkles, adminOnly: true },
      { to: '/admin/inventario', label: 'Inventario', icon: Package, adminOnly: true, requiresFeature: 'inventario' },
      { to: '/admin/proveedores', label: 'Proveedores', icon: Truck, adminOnly: true, requiresFeature: 'proveedores' },
      { to: '/admin/gift-cards', label: 'Gift Cards', icon: Gift, adminOnly: true, requiresFeature: 'gift_cards' },
    ],
  },
  {
    title: 'Ajustes',
    adminOnly: true,
    links: [
      { to: '/admin/configuracion', label: 'Configuración', icon: Settings, adminOnly: true },
    ],
  },
]
