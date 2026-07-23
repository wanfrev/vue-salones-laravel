export interface Servicio {
  id: string
  name: string
  description: string
  price: number
  duration: number
  status: 'Activo' | 'Inactivo'
  category: string
  citasMes: number
  ingresos: number
  icon: string
  iconBg: string
  iconColor: string
  color?: string
  linked_product_id?: string | null
  linked_variant_id?: string | null
  is_fixed_commission?: boolean
  fixed_commission_amount?: number
  fixed_commission_assistant_amount?: number
}

export interface ServicioFormData {
  name: string
  description: string
  price: number
  duration: number
  status: 'Activo' | 'Inactivo'
  category: string
  linked_product_id?: string | null
  linked_variant_id?: string | null
  is_fixed_commission?: boolean
  fixed_commission_amount?: number
  fixed_commission_assistant_amount?: number
}
