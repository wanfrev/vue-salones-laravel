<template>
  <SettingsSection :title="section.title" :description="section.description">
    <div class="divide-y divide-border">
      <!-- Encargados -->
      <SettingsGroup v-if="showEncargados" :title="groups.encargados.title" :description="groups.encargados.description" :icon="ICONS.encargados" class="pb-6">
        <SettingToggle v-if="features.inventario" setting-key="disable_manager_inventory_edit" :copy="copy.disable_manager_inventory_edit" />
        <SettingToggle v-if="!businessStore.isSingleCurrency" setting-key="encargados_change_exchange_rate" :copy="copy.encargados_change_exchange_rate" />
        <SettingToggle v-if="!businessStore.isSingleCurrency" setting-key="encargados_change_employee_rate" :copy="copy.encargados_change_employee_rate" />
        <SettingToggle v-if="features.agenda" setting-key="disable_employee_commission_edit" :copy="copy.disable_employee_commission_edit" />
        <SettingToggle v-if="features.pos" setting-key="encargado_product_commission_enabled" :copy="copy.encargado_product_commission_enabled" />
        <SettingToggle setting-key="encargados_edit_clients" :copy="copy.encargados_edit_clients" />
        <SettingToggle v-if="features.agenda || features.pos" setting-key="encargados_view_financial_summary" :copy="copy.encargados_view_financial_summary" />
      </SettingsGroup>

      <!-- Empleados -->
      <SettingsGroup :title="groups.employees.title" :description="groups.employees.description" :icon="ICONS.employees" class="py-6 first:pt-0">
        <SettingToggle setting-key="employees_see_clients" :copy="copy.employees_see_clients" />
        <SettingToggle setting-key="hide_client_phone_from_employees" :copy="copy.hide_client_phone_from_employees" />
        <SettingToggle setting-key="employees_recibo_only" :copy="copy.employees_recibo_only" />
      </SettingsGroup>

      <!-- Pago de nómina -->
      <SettingsGroup v-if="showPayroll" :title="groups.payroll.title" :description="groups.payroll.description" :icon="ICONS.payroll" class="py-6">
        <SettingToggle setting-key="payroll_locked_exchange_rate" :copy="copy.payroll_locked_exchange_rate" confirm-on @request-on="showPayrollWarning = true" />
        <SettingToggle setting-key="payroll_currency_breakdown_enabled" :copy="copy.payroll_currency_breakdown_enabled" />
        <SettingToggle setting-key="payroll_day_average_rate_enabled" :copy="copy.payroll_day_average_rate_enabled" />
      </SettingsGroup>

      <!-- POS y ventas -->
      <SettingsGroup v-if="showPos" :title="groups.pos.title" :description="groups.pos.description" :icon="ICONS.pos" class="pt-6">
        <SettingToggle v-if="features.agenda" setting-key="pos_direct_service_sale" :copy="copy.pos_direct_service_sale" />
        <SettingToggle v-if="features.manual_reports && features.pos" setting-key="daily_report_autofill_from_pos" :copy="copy.daily_report_autofill_from_pos" />
        <SettingToggle v-if="features.pos" setting-key="pos_backdate_enabled" :copy="copy.pos_backdate_enabled" />
        <SettingToggle v-if="features.pos" setting-key="courtesy_charge_enabled" :copy="copy.courtesy_charge_enabled" />
      </SettingsGroup>
    </div>
  </SettingsSection>

  <ModalBase
    :is-open="showPayrollWarning"
    title="Vas a cambiar el tipo de nómina"
    subtitle="Este cambio afecta cómo se calculan los bolívares que se le deben a tus empleados"
    variant="warning"
    icon="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
    confirm-text="Sí, cambiar tipo de nómina"
    cancel-text="Cancelar"
    :is-loading="updating"
    @confirm="confirmPayrollWarning"
    @cancel="showPayrollWarning = false"
    @close="showPayrollWarning = false"
  >
    <p class="text-sm text-text-secondary">
      A partir de ahora, los montos en bolívares de las comisiones y propinas de tus {{ terms.employees }} se calcularán con la tasa de cambio del día en que se realizó cada servicio, en lugar de la tasa actual. Esto también aplica a las comisiones ya generadas que aún no se han pagado, así que el saldo en Bs que ves hoy puede cambiar.
    </p>
    <p class="mt-3 text-sm text-text-secondary">
      Puedes desactivar esta opción cuando quieras para volver al cálculo con la tasa actual.
    </p>
  </ModalBase>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBusinessStore } from '../../store/business'
import { useBusinessFeatures } from '../../composables/common/useBusinessFeatures'
import { ModalBase } from '../common'
import { isStaffingNiche, isTiendaNiche } from '../../config/niches'
import SettingsSection from './SettingsSection.vue'
import SettingsGroup from './SettingsGroup.vue'
import SettingToggle from './SettingToggle.vue'
import { groupCopy, sectionCopy, termsFrom, toggleCopy } from './featureCopy'

const businessStore = useBusinessStore()
const { updating, setFeature } = useBusinessFeatures()

const features = computed(() => businessStore.features)
const terms = computed(() => termsFrom(businessStore.terminology))
const copy = computed(() => toggleCopy(terms.value))
const groups = computed(() => groupCopy(terms.value))
const section = computed(() => sectionCopy(terms.value).permisos)

// Each switch only means something for niches with the matching capability — a tienda or staffing
// business has no agenda, no dual currency, etc. Hiding the whole group (not just its switches)
// avoids leaving an empty heading.
const showEncargados = computed(() =>
  features.value.inventario || !businessStore.isSingleCurrency || features.value.agenda || features.value.pos,
)
const showPayroll = computed(() =>
  !isTiendaNiche(businessStore.nicheType) && !isStaffingNiche(businessStore.nicheType) && !businessStore.isSingleCurrency,
)
const showPos = computed(() =>
  features.value.agenda || (features.value.manual_reports && features.value.pos),
)

const showPayrollWarning = ref(false)
const confirmPayrollWarning = async () => {
  await setFeature('payroll_locked_exchange_rate', true, copy.value.payroll_locked_exchange_rate)
  showPayrollWarning.value = false
}

const ICONS = {
  encargados: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  employees: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  payroll: 'M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6c1.11 0 2.08.402 2.599 1M12 8V6.5m0 1.5v6m0 0V17m0-1.5c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  pos: 'M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
}
</script>
