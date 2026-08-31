const esc = (value: string | number | null | undefined): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

export interface PayrollPrintRow {
  employeeName: string
  role: string
  totalHours: number
  regularHours: number
  payRate: number
  billRate: number
  regularAmount: number
  overtimeHours: number
  overtimeRate: number
  overtimeAmount: number
  deduction: number
  fixedFees: number
  adjustment: number
  /** Monto total ingresado directamente (no se calcula) — nunca en la factura. */
  perdiemTotal: number
  travelTotal: number
  gross: number
  taxPercent: number
  payout: number
  invoiceTotal: number
  margin: number
}

/**
 * Opens a self-contained printable window with the internal payroll worksheet (pay rates,
 * deductions, tax withheld, payout) — distinct from `printStaffingInvoice`, which is the
 * client-facing bill (bill rate + total due only). This one is meant to be printable at any
 * point, including before a factura has been generated for the week.
 */
export function printStaffingPayroll(params: {
  agencyName: string
  companyName: string
  projectName?: string | null
  weekStart: string
  weekEnd: string
  statusLabel: string
  rows: PayrollPrintRow[]
}): void {
  const { agencyName, companyName, projectName, weekStart, weekEnd, statusLabel, rows } = params

  const bodyRows = rows.map(r => `
    <tr>
      <td>${esc(r.employeeName)}<br><span class="muted">${esc(r.role || 'Sin rol')}</span></td>
      <td class="num">${r.totalHours.toFixed(2)}</td>
      <td class="num">${r.regularHours.toFixed(2)}</td>
      <td class="num">${fmtMoney(r.payRate)}</td>
      <td class="num">${fmtMoney(r.billRate)}</td>
      <td class="num">${fmtMoney(r.regularAmount)}</td>
      <td class="num">${r.overtimeHours.toFixed(2)}</td>
      <td class="num">${r.overtimeHours > 0 ? fmtMoney(r.overtimeRate) : '—'}</td>
      <td class="num">${fmtMoney(r.overtimeAmount)}</td>
      <td class="num">${fmtMoney(r.deduction)}</td>
      <td class="num">${fmtMoney(r.fixedFees)}</td>
      <td class="num">${fmtMoney(r.adjustment)}</td>
      <td class="num">${fmtMoney(r.perdiemTotal)}</td>
      <td class="num">${fmtMoney(r.travelTotal)}</td>
      <td class="num">${fmtMoney(r.gross)}</td>
      <td class="num">${r.taxPercent.toFixed(1)}%</td>
      <td class="num strong">${fmtMoney(r.payout)}</td>
      <td class="num">${fmtMoney(r.invoiceTotal)}</td>
      <td class="num success">${fmtMoney(r.margin)}</td>
    </tr>
  `).join('')

  const totals = rows.reduce((acc, r) => ({
    totalHours: acc.totalHours + r.totalHours,
    perdiemTotal: acc.perdiemTotal + r.perdiemTotal,
    travelTotal: acc.travelTotal + r.travelTotal,
    gross: acc.gross + r.gross,
    payout: acc.payout + r.payout,
    invoiceTotal: acc.invoiceTotal + r.invoiceTotal,
    margin: acc.margin + r.margin,
  }), { totalHours: 0, perdiemTotal: 0, travelTotal: 0, gross: 0, payout: 0, invoiceTotal: 0, margin: 0 })

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Nomina ${esc(companyName)} - ${esc(weekStart)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 30px; font-size: 11px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .muted { color: #666; font-size: 10px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 16px; align-items: flex-start; }
  .meta { text-align: right; }
  .status { display: inline-block; margin-top: 4px; padding: 2px 8px; border: 1px solid #999; border-radius: 999px; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f2f2f2; font-size: 9px; text-transform: uppercase; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  td.strong { font-weight: bold; }
  td.success { color: #15803d; }
  tfoot td { font-weight: bold; background: #f8f8f8; }
  @media print { body { margin: 10mm; } }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>${esc(agencyName)}</h1>
      <p class="muted">Nómina interna — no es una factura</p>
    </div>
    <div class="meta">
      <p><strong>Empresa:</strong> ${esc(companyName)}</p>
      ${projectName ? `<p><strong>Proyecto:</strong> ${esc(projectName)}</p>` : ''}
      <p><strong>Semana:</strong> ${fmtDate(weekStart)} – ${fmtDate(weekEnd)}</p>
      <span class="status">${esc(statusLabel)}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Empleado</th>
        <th class="num">Hrs totales</th>
        <th class="num">Hrs reg</th>
        <th class="num">Pay rate</th>
        <th class="num">Bill rate</th>
        <th class="num">Total reg</th>
        <th class="num">Hrs OT</th>
        <th class="num">OT rate</th>
        <th class="num">Total OT</th>
        <th class="num">Deducción</th>
        <th class="num">Fee fijo</th>
        <th class="num">Ajuste</th>
        <th class="num">Total Perdiem</th>
        <th class="num">Total viaje</th>
        <th class="num">Total semanal</th>
        <th class="num">% Ret.</th>
        <th class="num">Payout</th>
        <th class="num">Factura</th>
        <th class="num">Margen</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
    <tfoot>
      <tr>
        <td>Totales</td>
        <td class="num">${totals.totalHours.toFixed(2)}</td>
        <td colspan="10"></td>
        <td class="num">${fmtMoney(totals.perdiemTotal)}</td>
        <td class="num">${fmtMoney(totals.travelTotal)}</td>
        <td class="num">${fmtMoney(totals.gross)}</td>
        <td></td>
        <td class="num">${fmtMoney(totals.payout)}</td>
        <td class="num">${fmtMoney(totals.invoiceTotal)}</td>
        <td class="num">${fmtMoney(totals.margin)}</td>
      </tr>
    </tfoot>
  </table>

  <script>window.onload = () => window.print()</script>
</body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}
