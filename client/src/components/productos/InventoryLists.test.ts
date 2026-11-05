import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import ProductList from './ProductList.vue'

const plugins = [createPinia(), VueQueryPlugin]

const product = (over: Record<string, unknown> = {}) => ({
  id: 'p1', name: 'Shampoo', sku: 'SKU-1', categoryName: 'Cabello', unit: 'und', unitCost: 3.5, unitPrice: 8,
  unitPrice2: null, reorderPoint: 5, status: 'Activo', stockTotal: 12, ...over,
})

const mountProducts = (products: any[], props: Record<string, unknown> = {}) =>
  mount(ProductList, { props: { products, ...props }, global: { plugins } })

describe('ProductList', () => {
  it('muestra producto, SKU, categoría, costo, precio y stock', () => {
    const text = mountProducts([product({ unitPrice2: 7 })]).text()
    expect(text).toContain('Shampoo')
    expect(text).toContain('SKU-1')
    expect(text).toContain('Cabello')
    expect(text).toContain('$3.50')
    expect(text).toContain('$8.00 | $7.00')
    expect(text).toContain('12')
  })

  it('marca el stock bajo y los productos inactivos', () => {
    const wrapper = mountProducts([product({ stockTotal: 5 }), product({ id: 'p2', status: 'Inactivo' })])
    expect(wrapper.find('.text-danger').text()).toBe('5')
    expect(wrapper.findAll('[data-testid="product-row"]')[1].text()).toContain('Inactivo')
  })

  it('con permiso de edición expone todas las acciones y las emite', async () => {
    const p = product()
    const wrapper = mountProducts([p], { showTransfer: true })
    const titles = ['Ajustar stock', 'Transferir stock a otra sucursal', 'Variantes (talla, color...)', 'Editar producto', 'Desactivar producto', 'Eliminar permanentemente']
    for (const t of titles) expect(wrapper.find(`[title="${t}"]`).exists()).toBe(true)
    await wrapper.get('[title="Editar producto"]').trigger('click')
    await wrapper.get('[title="Eliminar permanentemente"]').trigger('click')
    await wrapper.get('[title="Ajustar stock"]').trigger('click')
    expect(wrapper.emitted('edit')![0]).toEqual([p])
    expect(wrapper.emitted('delete')![0]).toEqual([p])
    expect(wrapper.emitted('adjust')![0]).toEqual([p])
  })

  it('sin showTransfer no ofrece transferir', () => {
    expect(mountProducts([product()]).find('[title="Transferir stock a otra sucursal"]').exists()).toBe(false)
  })

  it('en solo lectura no muestra ninguna acción', () => {
    const wrapper = mountProducts([product()], { readonly: true })
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('sin productos muestra el mensaje vacío', () => {
    expect(mountProducts([]).text()).toContain('No hay productos')
  })
})

