import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import PermissionsSettings from './PermissionsSettings.vue'
import NotificationsSettings from './NotificationsSettings.vue'
import SettingToggle from './SettingToggle.vue'
import { useBusinessStore } from '../../store/business'
import { isStaffingNiche, isTiendaNiche } from '../../config/niches'

vi.mock('../../services/pushService', () => ({ isPushSupported: () => false, unsubscribeFromPush: vi.fn() }))
vi.mock('../../composables/common/useNotifications', () => ({ requestNotificationPermission: vi.fn() }))
// A multi-branch scenario makes the store ask for branches; keep the test off the network.
vi.mock('../../services/branchesService', async (orig) => ({ ...(await orig<object>()), listBranches: vi.fn().mockResolvedValue([]) }))

/**
 * These rules are copied from the ORIGINAL monolithic Configuracion.vue (before it was split into
 * sections). Production businesses already run with their switches on or off, so which switch shows
 * up for which kind of business must not change — only wording and layout were meant to.
 */
function originalPermissionKeys(s: ReturnType<typeof useBusinessStore>): string[] {
  const f = s.features
  const single = s.isSingleCurrency
  const keys: string[] = []

  if (f.inventario || !single || f.agenda || f.pos) {
    if (f.inventario) keys.push('disable_manager_inventory_edit')
    if (!single) keys.push('encargados_change_exchange_rate', 'encargados_change_employee_rate')
    if (f.agenda) keys.push('disable_employee_commission_edit')
    if (f.pos) keys.push('encargado_product_commission_enabled')
    keys.push('encargados_edit_clients')
    if (f.agenda || f.pos) keys.push('encargados_view_financial_summary')
  }

  keys.push('employees_see_clients', 'hide_client_phone_from_employees', 'employees_recibo_only')

  if (!isTiendaNiche(s.nicheType) && !isStaffingNiche(s.nicheType) && !single) {
    keys.push('payroll_locked_exchange_rate', 'payroll_currency_breakdown_enabled', 'payroll_day_average_rate_enabled')
  }

  if (f.agenda || (f.manual_reports && f.pos)) {
    if (f.agenda) keys.push('pos_direct_service_sale')
    if (f.manual_reports && f.pos) keys.push('daily_report_autofill_from_pos')
    if (f.pos) keys.push('pos_backdate_enabled', 'courtesy_charge_enabled')
  }

  return keys
}

function originalNotificationKeys(s: ReturnType<typeof useBusinessStore>): string[] {
  const keys = ['reminder_24h_enabled']
  if (s.features.whatsapp_available) keys.push('whatsapp_reminders_enabled')
  keys.push('enable_public_booking')
  return keys
}

const scenarios: { name: string; niche: string; features?: Record<string, unknown> }[] = [
  { name: 'salon, defaults', niche: 'salon' },
  { name: 'salon, everything switched on', niche: 'salon', features: { manual_reports: true, whatsapp_available: true, multi_branch: true, pos_backdate_enabled: true, courtesy_charge_enabled: true } },
  { name: 'salon without POS, products or inventory', niche: 'salon', features: { pos: false, productos: false, inventario: false } },
  { name: 'tienda', niche: 'tienda' },
  { name: 'staffing', niche: 'staffing' },
  { name: 'barberia with daily report', niche: 'barberia', features: { manual_reports: true } },
]

function setup(niche: string, features?: Record<string, unknown>) {
  const pinia = createPinia()
  setActivePinia(pinia)
  // The business store runs a TanStack query when it is created, so it has to be created inside an
  // app that has the query plugin installed.
  const host = createApp({ render: () => null })
  host.use(pinia).use(VueQueryPlugin)
  const store = host.runWithContext(() => useBusinessStore())
  store.business = { id: 'biz-1', niche_type: niche, features: features ?? {}, terminology: null } as any
  return { pinia, store }
}

const mountSection = (component: any, pinia: any) =>
  mount(component, { global: { plugins: [pinia, VueQueryPlugin], stubs: { Teleport: true } } })

describe('Configuración keeps showing the same switches for each kind of business', () => {
  beforeEach(() => { localStorage.clear() })

  for (const sc of scenarios) {
    it(`permissions — ${sc.name}`, () => {
      const { pinia, store } = setup(sc.niche, sc.features)
      const wrapper = mountSection(PermissionsSettings, pinia)
      const shown = wrapper.findAllComponents(SettingToggle).map(w => w.props('settingKey') as string)

      expect(shown).toEqual(originalPermissionKeys(store))
    })

    it(`notifications — ${sc.name}`, () => {
      const { pinia, store } = setup(sc.niche, sc.features)
      const wrapper = mountSection(NotificationsSettings, pinia)
      const shown = wrapper.findAllComponents(SettingToggle).map(w => w.props('settingKey') as string)

      expect(shown).toEqual(originalNotificationKeys(store))
    })
  }

  it('each switch reflects the business’s stored value (on stays on, off stays off)', () => {
    const { pinia, store } = setup('salon', { encargados_edit_clients: false, courtesy_charge_enabled: true, employees_recibo_only: true, pos_backdate_enabled: false })
    const wrapper = mountSection(PermissionsSettings, pinia)

    for (const toggle of wrapper.findAllComponents(SettingToggle)) {
      const key = toggle.props('settingKey') as string
      const rendered = toggle.find('[role="switch"]').attributes('aria-checked')
      expect(rendered, key).toBe(String(!!store.features[key]))
    }
  })
})
