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
}
