import { computed } from 'vue'
import {
  ClipboardTextIcon, Widget2Icon, ChartSquareIcon, DocumentMedicineIcon, HealthIcon, ClipboardCheckIcon,
  WaterdropsIcon, CalculatorIcon,
} from '@solar-icons/vue/linear'
import { useClinicalHistories } from './useClinicalHistories'
import { useDentalChart } from './useDentalChart'
import { usePeriodontograms } from './usePeriodontograms'
import { useEndoAnnexes } from './useEndoAnnexes'
import { usePerioAnnexes } from './usePerioAnnexes'
import { useConsents } from './useConsents'
import { useBiofilmRecords } from './useBiofilmRecords'
import { useBudgets } from './useBudgets'
import type { DentalNavTab } from '../../components/dental/DentalToolsNav.vue'

/**
 * Single source of truth for the 6 clinical-tool tabs (icon, "has data" dot, keyboard shortcut)
 * shared by PatientDentalShell's in-record nav and the client summary page's quick-access
 * cards — they used to be two independent, hand-copied lists that drifted apart (different
 * icons per tool, no status dots on the summary page), which is exactly what made jumping from
 * one screen to the other feel inconsistent. Both now render the same <DentalToolsNav> fed by
 * this composable, so they can't diverge again.
 */
/**
 * @param enabled Must resolve false for any non-dental business — several call sites (like the
 * client summary page) render for every niche, and these 6 queries hit dental-only endpoints
 * that would otherwise silently create empty dental records for salon/spa/vet/etc. clients.
 */
export function useDentalToolsNavTabs(clientId: () => string | null, enabled: () => boolean = () => true) {
  const gatedClientId = () => (enabled() ? clientId() : null)
  const { histories, currentHistory, isLoading: historiaLoading } = useClinicalHistories(gatedClientId)
  const { chart, isLoading: odontogramaLoading } = useDentalChart(gatedClientId)
  const { periodontograms, isLoading: periodontogramaLoading } = usePeriodontograms(gatedClientId)
  const { annexes: endoAnnexes, isLoading: endoLoading } = useEndoAnnexes(gatedClientId)
  const { annexes: perioAnnexes, isLoading: perioAnexoLoading } = usePerioAnnexes(gatedClientId)
  const { consents, isLoading: consentimientoLoading } = useConsents(gatedClientId)
  const { records: biofilmRecords, isLoading: biofilmLoading } = useBiofilmRecords(gatedClientId)
  const { budgets, isLoading: budgetsLoading } = useBudgets(gatedClientId)

  const navTabs = computed<DentalNavTab[]>(() => [
    { key: 'historia-clinica', label: 'Historia clínica', icon: ClipboardTextIcon, shortcut: 1, isLoading: historiaLoading.value, hasData: histories.value.length > 0 },
    { key: 'odontograma', label: 'Odontograma', icon: Widget2Icon, shortcut: 2, isLoading: odontogramaLoading.value, hasData: Object.keys(chart.value?.teeth ?? {}).length > 0 },
    { key: 'periodontograma', label: 'Periodontograma', icon: ChartSquareIcon, shortcut: 3, isLoading: periodontogramaLoading.value, hasData: periodontograms.value.length > 0 },
    { key: 'anexo-endodoncia', label: 'Endodoncia', icon: DocumentMedicineIcon, shortcut: 4, isLoading: endoLoading.value, hasData: endoAnnexes.value.length > 0 },
    { key: 'anexo-periodoncia', label: 'Periodoncia', icon: HealthIcon, shortcut: 5, isLoading: perioAnexoLoading.value, hasData: perioAnnexes.value.length > 0 },
    { key: 'consentimiento', label: 'Consentimientos', icon: ClipboardCheckIcon, shortcut: 6, isLoading: consentimientoLoading.value, hasData: consents.value.length > 0 },
    { key: 'biofilm', label: 'Biopelícula', icon: WaterdropsIcon, shortcut: 7, isLoading: biofilmLoading.value, hasData: biofilmRecords.value.length > 0 },
    { key: 'presupuesto', label: 'Presupuesto', icon: CalculatorIcon, shortcut: 8, isLoading: budgetsLoading.value, hasData: budgets.value.length > 0 },
  ])

  return { navTabs, currentHistory }
}
