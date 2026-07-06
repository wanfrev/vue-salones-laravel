import { computed } from 'vue'
import { useBusinessStore } from '../store/business'

export function useBusinessTerminology() {
  const businessStore = useBusinessStore()
  const terminology = computed(() => businessStore.terminology)

  const t = computed(() => ({
    client: terminology.value.client || 'Cliente',
    employee: terminology.value.employee || 'Empleado',
    service: terminology.value.service || 'Servicio',
    appointment: terminology.value.appointment || 'Cita',
    product: terminology.value.product || 'Producto',
    staff: terminology.value.staff || 'Personal',
    pet: terminology.value.pet || 'Mascota',
    owner: terminology.value.owner || 'Dueño',
    breed: terminology.value.breed || 'Raza',
    weight: terminology.value.weight || 'Peso',
    vaccines: terminology.value.vaccines || 'Vacunas',
  }))

  return {
    terminology,
    t,
  }
}
