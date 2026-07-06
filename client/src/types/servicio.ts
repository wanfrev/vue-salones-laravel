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
}

export interface ServicioFormData {
  name: string
  description: string
  price: number
  duration: number
  status: 'Activo' | 'Inactivo'
  category: string
}
