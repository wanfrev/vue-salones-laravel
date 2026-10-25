import { DEFAULT_LOCALE, type Locale } from './translate'

/**
 * The language in use, readable from plain functions that run outside a component (error helpers, formatters).
 * It has no imports on purpose, so low-level libraries can use it without creating import cycles: the real
 * answer is registered by `i18n/index.ts` as soon as the app loads it; before that, Spanish.
 */
let provider: () => Locale = () => DEFAULT_LOCALE

export const setLocaleProvider = (fn: () => Locale) => { provider = fn }

export const activeLocale = (): Locale => {
  try {
    return provider()
  } catch {
    return DEFAULT_LOCALE
  }
}
