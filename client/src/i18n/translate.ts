/**
 * Fixed-text translations for the interface (menus, buttons, titles, help text). It deliberately does NOT
 * touch what people register (names, notes, company names…) or uploaded files.
 *
 * Spanish is the source of truth and the fallback: a text with no English version yet shows in Spanish,
 * never as a raw key.
 */
export type Locale = 'es' | 'en'

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
]

export const DEFAULT_LOCALE: Locale = 'es'

export const isLocale = (value: unknown): value is Locale => value === 'es' || value === 'en'

export type MessageParams = Record<string, string | number>

/** A message set for one area: both languages must define exactly the same keys (checked at compile time). */
export function defineMessages<K extends string>(es: Record<K, string>, en: Record<K, string>) {
  return { es, en }
}

/** `Hello {name}` + `{ name: 'Ana' }` → `Hello Ana`. A placeholder with no value is left as written. */
export function interpolate(text: string, params?: MessageParams): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole))
}

export function translate(
  catalog: Record<Locale, Record<string, string>>,
  locale: Locale,
  key: string,
  params?: MessageParams,
): string {
  const text = catalog[locale]?.[key] ?? catalog[DEFAULT_LOCALE][key] ?? key
  return interpolate(text, params)
}
