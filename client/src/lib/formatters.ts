export function getInitials(name?: string): string {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const TITLE_CASE_LOWERCASE_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e'])

/** "mariemma diaz" / "YANET CHACON" -> "Mariemma Diaz" / "Yanet Chacon". Keeps Spanish connector words lowercase unless they open the name. */
export function toTitleCase(value?: string | null): string {
  if (!value) return ''
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0 && TITLE_CASE_LOWERCASE_WORDS.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo ($)',
  cash_ves: 'Efectivo (Bs)',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  zelle: 'Zelle',
  binance: 'Binance',
  cashea: 'Cashea',
  pago_movil: 'Pago Móvil',
  punto_venta: 'Punto de Venta (Bs)',
  mixed: 'Mixto',
  other: 'Otro',
  gift_card: 'Gift Card',
  day_average_rate: 'Tasa promedio del día',
  credito: 'Crédito',
}

export function formatMethod(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  paid: 'Pagada',
  completed: 'Completada',
  no_show: 'Cancelada',
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-warning/10 text-warning border border-warning/30',
  pending: 'bg-danger/10 text-danger border border-danger/30',
  cancelled: 'bg-danger/10 text-danger border border-danger/30',
  paid: 'bg-success/10 text-success border border-success/30',
  completed: 'bg-success/10 text-success border border-success/30',
  no_show: 'bg-danger/10 text-danger border border-danger/30',
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-bg-secondary text-text-muted border border-border'
}

export function normalizeAppointmentStatus(appt: { status: string; payment_status: string }): string {
  if (appt.payment_status === 'paid') return 'paid'
  if (appt.status === 'no_show') return 'cancelled'
  if (appt.status === 'completed') return 'confirmed'
  return appt.status
}

const DATE_FORMATS = {
  short: 'short',
  long: 'long',
  shortTime: 'shortTime',
  month: 'month',
} as const

export function parseLocalDate(isoDateString: string, hours = 0, minutes = 0, seconds = 0): Date {
  const match = isoDateString.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day), hours, minutes, seconds)
  }
  return new Date(isoDateString)
}

export function toLocalISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/
  const match = value.match(dateOnly)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }
  return new Date(value)
}

function formatDdMmYy(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function formatDate(date: string | Date, format: keyof typeof DATE_FORMATS = 'short'): string {
  const d = toLocalDate(date)
  if (Number.isNaN(d.getTime())) return String(date)
  if (format === 'month') {
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`
  }
  return formatDdMmYy(d)
}

const SHORT_MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** "2026-08-15" / "2026-08-15T16:00:00+00:00" -> "15 Ago 2026". Drops time/timezone — for read-only display, not sorting or inputs. */
export function formatDateHuman(date: string | Date): string {
  const d = toLocalDate(date)
  if (Number.isNaN(d.getTime())) return String(date)
  return `${d.getDate()} ${SHORT_MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
}

export function formatTime(date: string | Date): string {
  const d = toLocalDate(date)
  if (Number.isNaN(d.getTime())) return String(date)
  return d.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function formatDateTime(date: string | Date): string {
  const d = toLocalDate(date)
  if (Number.isNaN(d.getTime())) return String(date)
  return `${formatDate(d, 'short')} ${formatTime(d)}`
}

/** MM/DD/YYYY — the staffing niche runs on US date conventions (nómina week filters, invoices). */
export function formatDateUS(date: string | Date): string {
  const d = toLocalDate(date)
  if (Number.isNaN(d.getTime())) return String(date)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}/${d.getFullYear()}`
}

export function toISODate(date: string | Date): string {
  const d = toLocalDate(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

export function minutesToHHmm(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mm = String(minutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export function dateToHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function dateToHHmm12(date: Date): string {
  const h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export function formatTime24to12(time24: string): string {
  const parts = time24.split(':')
  if (parts.length < 2) return time24
  const h = Number(parts[0])
  if (Number.isNaN(h)) return time24
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export function formatNumber(n: number): string {
  return n.toLocaleString()
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  purchase: 'Compra',
  sale: 'Venta',
  adjustment: 'Ajuste',
  transfer_in: 'Transferencia (entrada)',
  transfer_out: 'Transferencia (salida)',
  return: 'Devolución',
  consumption: 'Consumo',
}

export function formatMovementType(type: string): string {
  return MOVEMENT_TYPE_LABELS[type] ?? type
}

export function formatPayType(payType?: string | null, baseSalary?: number, payPercentage?: number): string {
  if (!payType) return 'Por servicio'
  if (payType === 'salary') return `Sueldo base ($${baseSalary ?? 0})`
  if (payType === 'mixed') return `Sueldo + % ($${baseSalary ?? 0} + ${payPercentage ?? 0}%)`
  if (payType === 'percentage') return `${payPercentage ?? 0}% por servicio`
  return 'Por servicio'
}

export function formatPercentage(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return '0.0%'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}
