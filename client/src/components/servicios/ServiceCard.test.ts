import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import ServiceCard from './ServiceCard.vue'
import type { Servicio } from '../../types/servicio'

const service: Servicio = {
  id: 's1', name: 'Corte', description: 'Corte clásico', price: 20, duration: 45, status: 'Activo',
  category: 'Cabello', citasMes: 3, ingresos: 60, icon: 'M5 13l4 4L19 7', iconBg: 'bg-primary/10', iconColor: 'text-primary',
}

const mountCard = (s: Servicio = service) => mount(ServiceCard, {
    props: { service: s, appointmentLabel: 'Citas' },
    global: { plugins: [createPinia(), VueQueryPlugin] },
  })

describe('ServiceCard', () => {
  it('muestra nombre, precio, duración, estado y totales del mes', () => {
    const text = mountCard().text()
    expect(text).toContain('Corte')
    expect(text).toContain('$20')
    expect(text).toContain('45 min')
    expect(text).toContain('Activo')
    expect(text).toContain('3 citas este mes')
    expect(text).toContain('$60.00 ingresos')
  })

  it('muestra el estado inactivo', () => {
    expect(mountCard({ ...service, status: 'Inactivo' }).text()).toContain('Inactivo')
  })

  it('emite editar y eliminar con el servicio', async () => {
    const wrapper = mountCard()
    await wrapper.get('[title="Editar servicio"]').trigger('click')
    await wrapper.get('[title="Eliminar servicio"]').trigger('click')
    expect(wrapper.emitted('edit')![0]).toEqual([service])
    expect(wrapper.emitted('delete')![0]).toEqual([service])
  })
})
