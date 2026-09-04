import { computed } from 'vue'
import { useBusinessStore } from '../../store/business'

export function useBusinessTerminology() {
  const businessStore = useBusinessStore()
  const terminology = computed(() => businessStore.terminology)

  const t = computed(() => ({
    client: terminology.value.client || 'Cliente',
    clientPlural: terminology.value.clientPlural || 'Clientes',
    employee: terminology.value.employee || 'Empleado',
    employeePlural: terminology.value.employeePlural || 'Empleados',
    service: terminology.value.service || 'Servicio',
    servicePlural: terminology.value.servicePlural || 'Servicios',
    appointment: terminology.value.appointment || 'Cita',
    appointmentPlural: terminology.value.appointmentPlural || 'Citas',
    product: terminology.value.product || 'Producto',
    staff: terminology.value.staff || 'Personal',
    pet: terminology.value.pet || 'Mascota',
    owner: terminology.value.owner || 'Dueño',
    breed: terminology.value.breed || 'Raza',
    weight: terminology.value.weight || 'Peso',
    vaccines: terminology.value.vaccines || 'Vacunas',
    history: terminology.value.history || 'Historia clínica',
    historyPlural: terminology.value.historyPlural || 'Historias clínicas',
    professional: terminology.value.professional || 'Profesional',
    professionalPlural: terminology.value.professionalPlural || 'Profesionales',
  }))

  return {
    terminology,
    t,
  }
}
