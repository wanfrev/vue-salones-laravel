import { computed, ref } from 'vue'
import { useBusinessStore } from '../store/business'
import { DEFAULT_LOCALE, LOCALES, isLocale, translate, type Locale, type MessageParams } from './translate'
import { setLocaleProvider } from './active'
import { errorMessages } from './messages/errors'
import { nav } from './messages/nav'
import { settings } from './messages/settings'
import { nomina } from './messages/nomina'
import { approvals } from './messages/approvals'
import { common } from './messages/common'
import { empresas } from './messages/empresas'
import { companyDetail } from './messages/companyDetail'
import { hours } from './messages/hours'
import { reports } from './messages/reports'
import { taxes } from './messages/taxes'
import { incidents } from './messages/incidents'
import { spreadsheet } from './messages/spreadsheet'
import { crm } from './messages/crm'
import { equipo } from './messages/equipo'
import { staffForm } from './messages/staffForm'
import { finance } from './messages/finance'
import { validation } from './messages/validation'
import { recibo } from './messages/recibo'

/**
 * Every area registers its messages here: import it above and add it to AREAS. Each area already
 * guarantees (at compile time) that Spanish and English have the same keys, and MessageKey is built
 * from this list, so a mistyped key in a component fails the type check.
 */
const AREAS = [nav, settings, nomina, approvals, common, empresas, companyDetail, hours, reports, taxes, incidents, spreadsheet, crm, equipo, staffForm, finance, errorMessages, validation, recibo] as const

type KeysOf<A> = A extends { es: infer E } ? keyof E : never
export type MessageKey = KeysOf<(typeof AREAS)[number]>

const catalog: Record<Locale, Record<string, string>> = {
  es: Object.assign({}, ...AREAS.map(a => a.es)),
  en: Object.assign({}, ...AREAS.map(a => a.en)),
}

export const messageCatalog = catalog

const STORAGE_KEY = 'luma_locale'

const readStored = (): Locale => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLocale(value) ? value : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

/** The language this person picked on this device. One per browser, so each person on a shared account keeps theirs. */
const storedLocale = ref<Locale>(readStored())

export function setLocale(locale: Locale) {
  storedLocale.value = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch { /* private window or blocked storage: the choice just lasts until reload */ }
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

// Plain functions (error helpers, formatters) read the language through this, outside any component.
setLocaleProvider(() => {
  const businessStore = useBusinessStore()
  return businessStore.hasCapability('staffing.timesheets') ? storedLocale.value : DEFAULT_LOCALE
})

/**
 * Only staffing businesses offer English for now, so everyone else always sees Spanish — even if this
 * browser once picked English while signed in to a staffing business.
 */
export function useI18n() {
  const businessStore = useBusinessStore()
  const canChooseLanguage = computed(() => businessStore.hasCapability('staffing.timesheets'))
  const locale = computed<Locale>(() => (canChooseLanguage.value ? storedLocale.value : DEFAULT_LOCALE))
  const t = (key: MessageKey, params?: MessageParams): string => translate(catalog, locale.value, key, params)
  return { t, locale, canChooseLanguage, setLocale, locales: LOCALES }
}
