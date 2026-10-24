import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import PermissionsSettings from './PermissionsSettings.vue'
import NotificationsSettings from './NotificationsSettings.vue'
import SettingToggle from './SettingToggle.vue'
import { useBusinessStore } from '../../store/business'

const apiRequest = vi.fn()

vi.mock('../../lib/api', async (orig) => ({ ...(await orig<object>()), apiRequest: (...args: unknown[]) => apiRequest(...args) }))
vi.mock('../../composables/common/useAuth', () => ({ useAuth: () => ({ authStore: { businessId: 'biz-1', role: 'admin' } }) }))
vi.mock('../../services/pushService', () => ({ isPushSupported: () => false, isPushDisabledByUser: () => false, unsubscribeFromPush: vi.fn() }))
vi.mock('../../composables/common/useNotifications', () => ({ requestNotificationPermission: vi.fn() }))
vi.mock('../../services/branchesService', async (orig) => ({ ...(await orig<object>()), listBranches: vi.fn().mockResolvedValue([]) }))

/**
 * Saving a switch must keep sending exactly what the original Configuracion.vue sent:
 * PUT /businesses/:id with the business's WHOLE feature set and only that one key changed.
 * Anything else could wipe the settings production businesses already have on or off.
 */
function setup(niche: string, features: Record<string, unknown>) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const host = createApp({ render: () => null })
  host.use(pinia).use(VueQueryPlugin)
  const store = host.runWithContext(() => useBusinessStore())
  store.business = { id: 'biz-1', niche_type: niche, features, terminology: null } as any
  return { pinia, store }
}

const mountIt = (component: any, pinia: any) => mount(component, { global: { plugins: [pinia, VueQueryPlugin], stubs: { Teleport: true } } })

describe('saving a switch', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    apiRequest.mockImplementation(async (_m: string, _p: string, body: any) => ({ id: 'biz-1', niche_type: 'salon', features: body.features }))
  })

  it('sends the whole feature set with only the clicked key changed', async () => {
    const { pinia, store } = setup('salon', { courtesy_charge_enabled: false, employees_recibo_only: true, custom_unrelated_setting: 'keep-me' })
    const before = { ...store.features }
    const wrapper = mountIt(PermissionsSettings, pinia)

    const toggle = wrapper.findAllComponents(SettingToggle).find(w => w.props('settingKey') === 'courtesy_charge_enabled')!
    await toggle.find('[role="switch"]').trigger('click')
    await flushPromises()

    expect(apiRequest).toHaveBeenCalledTimes(1)
    const [method, path, body] = apiRequest.mock.calls[0]
    expect(method).toBe('PUT')
    expect(path).toBe('/businesses/biz-1')
    expect(body.features).toEqual({ ...before, courtesy_charge_enabled: true })
    expect(body.features.custom_unrelated_setting).toBe('keep-me')
    expect(body.features.employees_recibo_only).toBe(true)
  })

  it('turning an enabled switch off sends false', async () => {
    const { pinia } = setup('salon', { employees_recibo_only: true })
    const wrapper = mountIt(PermissionsSettings, pinia)

    const toggle = wrapper.findAllComponents(SettingToggle).find(w => w.props('settingKey') === 'employees_recibo_only')!
    await toggle.find('[role="switch"]').trigger('click')
    await flushPromises()

    expect(apiRequest.mock.calls[0][2].features.employees_recibo_only).toBe(false)
  })

  it('turning ON the payroll-rate switch only asks for confirmation — nothing is saved until confirmed', async () => {
    const { pinia } = setup('salon', { payroll_locked_exchange_rate: false })
    const wrapper = mountIt(PermissionsSettings, pinia)

    const toggle = wrapper.findAllComponents(SettingToggle).find(w => w.props('settingKey') === 'payroll_locked_exchange_rate')!
    await toggle.find('[role="switch"]').trigger('click')
    await flushPromises()

    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('turning the payroll-rate switch OFF saves immediately, without the warning', async () => {
    const { pinia } = setup('salon', { payroll_locked_exchange_rate: true })
    const wrapper = mountIt(PermissionsSettings, pinia)

    const toggle = wrapper.findAllComponents(SettingToggle).find(w => w.props('settingKey') === 'payroll_locked_exchange_rate')!
    await toggle.find('[role="switch"]').trigger('click')
    await flushPromises()

    expect(apiRequest).toHaveBeenCalledTimes(1)
    expect(apiRequest.mock.calls[0][2].features.payroll_locked_exchange_rate).toBe(false)
  })

  it('adding a reminder lead time saves the same list key as before', async () => {
    const { pinia } = setup('salon', { reminder_24h_enabled: true, appointment_reminder_offsets_hours: [24, 1] })
    const wrapper = mountIt(NotificationsSettings, pinia)

    await wrapper.find('input[type="number"]').setValue('2')
    await wrapper.findAll('button').find(b => b.text().includes('Agregar'))!.trigger('click')
    await flushPromises()

    expect(apiRequest).toHaveBeenCalledTimes(1)
    expect(apiRequest.mock.calls[0][1]).toBe('/businesses/biz-1')
    expect(apiRequest.mock.calls[0][2].features.appointment_reminder_offsets_hours).toEqual([24, 2, 1])
  })
})
