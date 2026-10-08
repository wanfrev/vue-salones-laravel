const esc = (value: string | number | null | undefined): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

/** The saved numbers a worker's stub is built from — a subset of StaffingTimesheetEntry. */
export interface PayStubSource {
  employeeName: string
  role: string
  regularHours: number
  overtimeHours: number
  payRate: number
  preTaxDeduction: number
  fixedFees: number
  adjustment: number
  perdiemTotal: number
  travelTotal: number
  gross: number
  taxWithheld: number
  net: number
  payout: number
}

export interface PayStub extends PayStubSource {
  regularPay: number
  overtimePay: number
  taxPercent: number
  rounding: number
}

/**
 * Derives the lines a stub shows from the entry's saved numbers, the same way the payroll sheet
 * does: gross already has the pre-tax deduction taken out, so overtime pay is whatever is left of
 * gross once regular pay (and the deduction) are accounted for. Never exposes bill rate, invoice or
 * margin — a worker's stub is not the client's bill nor the agency's internal sheet.
 */
export const buildPayStub = (s: PayStubSource): PayStub => {
  const regularPay = s.regularHours * s.payRate
  return {
    ...s,
    regularPay,
    overtimePay: s.gross - regularPay + s.preTaxDeduction,
    taxPercent: s.gross > 0 ? (s.taxWithheld / s.gross) * 100 : 0,
    rounding: Math.round((s.payout - s.net) * 100) / 100,
  }
}

const line = (label: string, value: string, cls = '') =>
  `<tr class="${cls}"><td>${label}</td><td class="num">${value}</td></tr>`

const stubHtml = (stub: PayStub, ctx: { agencyName: string; companyName: string; projectName?: string | null; weekStart: string; weekEnd: string; approvalStamp?: string | null }) => `
  <section class="stub">
    <div class="header">
      <div><h1>${esc(ctx.agencyName)}</h1><p class="muted">Talón de pago</p></div>
      <div class="meta">
        <p><strong>${esc(stub.employeeName)}</strong></p>
        <p class="muted">${esc(stub.role || 'Sin rol')}</p>
        <p class="muted">${esc(ctx.companyName)}${ctx.projectName ? ' — ' + esc(ctx.projectName) : ''}</p>
        <p class="muted">${date(ctx.weekStart)} – ${date(ctx.weekEnd)}</p>
      </div>
    </div>
    <table>
      <tr class="sec"><th colspan="2">Ingresos</th></tr>
      ${line(`Horas regulares (${stub.regularHours.toFixed(2)} h × ${money(stub.payRate)})`, money(stub.regularPay))}
      ${stub.overtimeHours > 0 ? line(`Horas extra (${stub.overtimeHours.toFixed(2)} h)`, money(stub.overtimePay)) : ''}
      ${stub.preTaxDeduction ? line('Deducción antes de impuestos', `− ${money(stub.preTaxDeduction)}`) : ''}
      ${line('Total bruto', money(stub.gross), 'strong')}
      <tr class="sec"><th colspan="2">Retenciones y ajustes</th></tr>
      ${line(`Retención (${stub.taxPercent.toFixed(1)}%)`, `− ${money(stub.taxWithheld)}`)}
      ${stub.fixedFees ? line('Fee fijo', `− ${money(stub.fixedFees)}`) : ''}
      ${stub.adjustment ? line('Ajuste', `${stub.adjustment < 0 ? '− ' : ''}${money(Math.abs(stub.adjustment))}`) : ''}
      ${stub.perdiemTotal ? line('Perdiem', money(stub.perdiemTotal)) : ''}
      ${stub.travelTotal ? line('Viaje', money(stub.travelTotal)) : ''}
      ${stub.rounding ? line('Redondeo', `${stub.rounding < 0 ? '− ' : ''}${money(Math.abs(stub.rounding))}`) : ''}
      ${line('Pago neto', money(stub.payout), 'total')}
    </table>
    ${ctx.approvalStamp ? `<p class="muted" style="margin-top:10px">${esc(ctx.approvalStamp)}</p>` : ''}
  </section>`

/** Opens a printable window with one stub per page. Pure presentation — call only with saved entries. */
export function printStaffingPayStubs(params: {
  agencyName: string
  companyName: string
  projectName?: string | null
  weekStart: string
  weekEnd: string
  stubs: PayStub[]
  approvalStamp?: string | null
}): void {
  const { stubs, ...ctx } = params
  if (stubs.length === 0) return

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Talones ${esc(ctx.companyName)} - ${esc(ctx.weekStart)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 0; font-size: 12px; }
  .stub { max-width: 560px; margin: 30px auto; padding: 0 20px; page-break-after: always; }
  .stub:last-child { page-break-after: auto; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .muted { color: #666; font-size: 11px; margin: 2px 0; }
  .header { display: flex; justify-content: space-between; margin-bottom: 14px; align-items: flex-start; }
  .meta { text-align: right; } .meta p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 5px 6px; border-bottom: 1px solid #e5e5e5; text-align: left; }
  th { background: #f2f2f2; font-size: 10px; text-transform: uppercase; }
  td.num { text-align: right; white-space: nowrap; }
  tr.strong td { font-weight: bold; }
  tr.total td { font-weight: bold; font-size: 14px; border-top: 2px solid #1a1a1a; border-bottom: none; }
  @media print { .stub { margin: 10mm auto; } }
</style></head>
<body>${stubs.map(s => stubHtml(s, ctx)).join('')}
<script>window.onload = () => window.print()</script></body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}
