import type { Service } from '../types/database'
import type { Servicio, ServicioFormData } from '../types/servicio'

const iconByCategory: Record<string, { icon: string; iconBg: string; iconColor: string; color: string }> = {
  corte: {
    icon: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm8.486-.486a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    color: '#567CB0',
  },
  color: {
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    color: '#7C3AED',
  },
  manos: {
    icon: 'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    color: '#E11D48',
  },
  tratamientos: {
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    color: '#059669',
  },
  barberia: {
    icon: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm8.486-.486a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    color: '#475569',
  },
  maquillaje: {
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    color: '#DB2777',
  },
  otros: {
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    color: '#6B7280',
  },
}

export const getServiceVisuals = (category?: string, icon?: string | null, color?: string | null) => {
  const base = iconByCategory[category || 'otros'] ?? iconByCategory.otros

  return {
    ...base,
    icon: icon || base.icon,
    color: color || base.color,
  }
}

export const mapServiceToServicio = (service: Service, citasMes = 0, ingresos = 0): Servicio => {
  const visuals = getServiceVisuals(service.category, service.icon, service.color)

  return {
    id: service.id,
    name: service.name,
    description: service.description ?? '',
    price: Number(service.price),
    duration: service.duration_minutes,
    status: service.active ? 'Activo' : 'Inactivo',
    category: service.category,
    citasMes,
    ingresos,
    icon: visuals.icon,
    iconBg: visuals.iconBg,
    iconColor: visuals.iconColor,
    color: visuals.color,
    linked_product_id: service.linked_product_id,
    linked_variant_id: service.linked_variant_id,
    is_fixed_commission: !!service.is_fixed_commission,
    fixed_commission_amount: service.fixed_commission_amount ? Number(service.fixed_commission_amount) : 0,
    fixed_commission_assistant_amount: service.fixed_commission_assistant_amount ? Number(service.fixed_commission_assistant_amount) : 0,
  }
}

export const mapServicioFormToServiceInsert = (businessId: string, data: ServicioFormData) => {
  return {
    business_id: businessId,
    name: data.name.trim(),
    description: data.description.trim() || null,
    duration_minutes: Number(data.duration),
    price: Number(data.price),
    category: data.category,
    active: data.status === 'Activo',
    linked_product_id: data.linked_product_id ?? null,
    linked_variant_id: data.linked_variant_id ?? null,
    is_fixed_commission: data.is_fixed_commission,
    fixed_commission_amount: data.fixed_commission_amount ?? null,
    fixed_commission_assistant_amount: data.fixed_commission_assistant_amount ?? null,
  }
}
