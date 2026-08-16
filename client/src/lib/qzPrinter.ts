import qz from 'qz-tray'
import { apiRequest } from './api'
import type { ReceiptData, ReceiptItem } from './receiptPrinter'

const LINE_WIDTH = 32 // standard column count for 58mm thermal paper at normal font
const LOCAL_STORAGE_KEY = 'luma_qz_printer_name'

let securityConfigured = false

/**
 * Wires qz.security up to the backend once per page load — QzController signs/certifies every
 * request so QZ Tray trusts it came from Luma. After the operator accepts the one-time "allow
 * this app?" prompt on a machine, every print after that is silent (see QzCertificateService).
 */
function ensureSecurityConfigured(): void {
  if (securityConfigured) return
  securityConfigured = true

  qz.security.setCertificatePromise((resolve, reject) => {
    apiRequest<string>('GET', '/qz/certificate').then(resolve).catch(reject)
  })

  qz.security.setSignatureAlgorithm('SHA512')
  qz.security.setSignaturePromise((toSign: string) => (resolve: (v?: string) => void, reject: (v?: string) => void) => {
    apiRequest<string>('POST', '/qz/sign', { request: toSign }).then(resolve).catch(reject)
  })
}

async function connect(): Promise<void> {
  ensureSecurityConfigured()
  if (qz.websocket.isActive()) return
  await qz.websocket.connect({ retries: 1, delay: 0 })
}

/** Fast, side-effect-free probe — callers use this to decide whether to fall back to window.print(). */
export async function isQzAvailable(): Promise<boolean> {
  try {
    await connect()
    return qz.websocket.isActive()
  } catch {
    return false
  }
}

export function getSelectedPrinterName(): string | null {
  return localStorage.getItem(LOCAL_STORAGE_KEY)
}

export function setSelectedPrinterName(name: string | null): void {
  if (name) localStorage.setItem(LOCAL_STORAGE_KEY, name)
  else localStorage.removeItem(LOCAL_STORAGE_KEY)
}

/** Every printer QZ Tray sees on this machine — feeds the picker in Configuración. */
export async function listQzPrinters(): Promise<string[]> {
  await connect()
  const found = await qz.printers.find()
  return Array.isArray(found) ? found : [found]
}

async function resolvePrinterName(): Promise<string> {
  const saved = getSelectedPrinterName()
  if (saved) return saved
  return qz.printers.getDefault()
}

// ── CP437 mapping for the Spanish characters a receipt actually needs ──────
// Thermal printers speak a single-byte code page, not UTF-8 — anything outside this map (and
// outside plain ASCII) prints as garbage or drops silently, so unknown characters fall back to '?'.
const CP437: Record<string, number> = {
  'á': 0xA0, 'é': 0x82, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3,
  'ñ': 0xA4, 'Ñ': 0xA5, 'ü': 0x81, 'Ü': 0x9A, '¿': 0xA8, '¡': 0xAD,
}

function encodeText(text: string): number[] {
  const bytes: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63
    if (code < 128) {
      bytes.push(code)
    } else if (ch in CP437) {
      bytes.push(CP437[ch])
    } else {
      bytes.push(63) // '?'
    }
  }
  return bytes
}

function padLine(left: string, right: string, width = LINE_WIDTH): string {
  const space = Math.max(1, width - left.length - right.length)
  if (left.length + right.length >= width) {
    return left.slice(0, width - right.length - 1) + ' ' + right
  }
  return left + ' '.repeat(space) + right
}

function wrapText(text: string, width = LINE_WIDTH): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > width) {
      if (current) lines.push(current)
      current = word.length > width ? word.slice(0, width) : word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

/** Command builder — appends raw ESC/POS bytes as it goes, mirrors what mike42/escpos-php sends. */
class EscPosBuilder {
  private bytes: number[] = []

  init(): this {
    this.bytes.push(0x1B, 0x40) // ESC @
    return this
  }

  align(mode: 'left' | 'center' | 'right'): this {
    const n = mode === 'center' ? 1 : mode === 'right' ? 2 : 0
    this.bytes.push(0x1B, 0x61, n) // ESC a n
    return this
  }

  bold(on: boolean): this {
    this.bytes.push(0x1B, 0x45, on ? 1 : 0) // ESC E n
    return this
  }

  /** GS ! n — width/height multiplier, 0x00 = normal, 0x11 = double width+height. */
  size(double: boolean): this {
    this.bytes.push(0x1D, 0x21, double ? 0x11 : 0x00)
    return this
  }

  text(line: string): this {
    this.bytes.push(...encodeText(line))
    return this
  }

  line(line = ''): this {
    this.text(line)
    this.bytes.push(0x0A)
    return this
  }

  divider(char = '-'): this {
    return this.line(char.repeat(LINE_WIDTH))
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) this.bytes.push(0x0A)
    return this
  }

  /** GS V — partial cut, leaving a tear strip. */
  cut(): this {
    this.bytes.push(0x1D, 0x56, 0x42, 0x00)
    return this
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes)
  }
}

function buildEscPosReceipt(data: ReceiptData): Uint8Array {
  const rate = data.exchangeRate ?? 1
  const formatMoney = (amount: number) => {
    const val = amount * rate
    return `Bs ${val.toFixed(2)}`
  }
  const b = new EscPosBuilder().init()

  b.align('center').bold(true).size(true).line(data.businessName).size(false).bold(false)
  if (data.branchName) b.line(data.branchName)
  b.align('left').divider()

  if (data.receiptNumber) b.line(`Factura: ${data.receiptNumber}`)
  b.line(`Fecha: ${data.date}`)
  if (data.clientName) b.line(`Cliente: ${data.clientName}`)
  if (data.employeeName) b.line(`Atiende: ${data.employeeName}`)
  b.divider()

  b.bold(true).line(padLine('CANT/DESCRIP', 'TOTAL')).bold(false)

  const printItems = (items: ReceiptItem[]) => {
    for (const item of items) {
      const label = `${item.qty}x ${item.name}`
      const price = formatMoney(item.price)
      const wrapped = wrapText(label, LINE_WIDTH - price.length - 1)
      wrapped.forEach((chunk, i) => {
        b.line(i === 0 ? padLine(chunk, price) : chunk)
      })
    }
  }
  if (data.services?.length) printItems(data.services)
  if (data.products?.length) printItems(data.products)

  b.divider()

  if ((data.tip ?? 0) > 0) {
    b.line(padLine('SUBTOTAL:', formatMoney(data.subtotal)))
    b.line(padLine('PROPINA:', formatMoney(data.tip!)))
  }
  b.bold(true).line(padLine('TOTAL:', formatMoney(data.total))).bold(false)

  b.divider()
  b.align('center').line('¡Gracias por su compra!')
  b.feed(3)
  b.cut()

  return b.toUint8Array()
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * Prints straight to the printer's native ESC/POS command language via QZ Tray — no HTML, no
 * rasterizing, no window.print(). Throws if QZ Tray isn't running/connected on this machine;
 * callers should catch and fall back to printThermalReceiptTXT (see receiptPrinter.ts).
 */
export async function printThermalReceiptESC(data: ReceiptData): Promise<void> {
  await connect()
  const printerName = await resolvePrinterName()
  const config = qz.configs.create(printerName)
  const bytes = buildEscPosReceipt(data)

  await qz.print(config, [{
    type: 'raw',
    format: 'command',
    flavor: 'base64',
    data: toBase64(bytes),
  }])
}
