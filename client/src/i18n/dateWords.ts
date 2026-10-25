import type { Locale } from './translate'

/**
 * Period labels (e.g. "Lunes 12 Octubre", "Sem 42 · 12 Oct - 18 Oct", "Año 2026") are built in shared
 * code with Spanish words. For English they are translated word by word here, so the shared code stays untouched.
 */
const WORDS: Record<string, string> = {
  Enero: 'January', Febrero: 'February', Marzo: 'March', Abril: 'April', Mayo: 'May', Junio: 'June',
  Julio: 'July', Agosto: 'August', Septiembre: 'September', Octubre: 'October', Noviembre: 'November', Diciembre: 'December',
  Ene: 'Jan', Abr: 'Apr', Ago: 'Aug', Dic: 'Dec',
  Domingo: 'Sunday', Lunes: 'Monday', Martes: 'Tuesday', Miércoles: 'Wednesday', Jueves: 'Thursday', Viernes: 'Friday', Sábado: 'Saturday',
  Sem: 'Wk', Año: 'Year',
}

const PHRASES: [string, string][] = [
  ['Rango personalizado', 'Custom range'],
  ['Semana actual', 'Current week'],
  ['Mes actual', 'Current month'],
]

const WORD_RE = new RegExp(`\\b(${Object.keys(WORDS).join('|')})\\b`, 'g')

export function localizeDateText(text: string, locale: Locale): string {
  if (locale === 'es') return text
  const phrase = PHRASES.find(([es]) => es === text)
  if (phrase) return phrase[1]
  // The weekday/month names come before a digit or at the start; plain \b would also cut accented words, so match explicitly.
  return text.replace(WORD_RE, (w) => WORDS[w] ?? w)
}
