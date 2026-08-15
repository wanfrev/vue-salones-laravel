import type { StaffingInvoice } from '../types/database'

const esc = (value: string | number | null | undefined): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// Eloquent's `date` cast serializes as a full ISO datetime ("2026-08-10T00:00:00.000000Z"), not
// the bare "2026-08-10" this used to assume — slicing first avoids building an invalid
// "...T00:00:00.000000ZT00:00:00" string that would render as "Invalid Date".
const fmtDate = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

/**
 * Opens a self-contained printable window for one invoice — mirrors the layout of the source
 * INVOICE PRUEBA.xlsx sheet (bill-to, invoice number/terms, work site, a row per employee with
 * reg/OT hours and amounts, total due). A new window rather than an in-app print stylesheet:
 * fighting the app shell's own CSS under @media print is more fragile than just writing a
 * clean standalone document.
 */
export function printStaffingInvoice(invoice: StaffingInvoice, agencyName: string): void {
  const entries = invoice.timesheet?.entries ?? []

  // Prefer the persisted, cent-rounded split (invoice_regular_amount/invoice_overtime_amount —
  // see StaffingPayrollCalculator::invoice()). Older rows saved before that split existed fall
  // back to a client-side estimate; the OT rate shown is derived from the OT amount rather than
  // assumed to be 1.5x, since a role can now carry its own overtime multiplier (see Fase 1).
  const rows = entries.map(e => {
    const regularAmount = e.invoice_regular_amount ?? e.regular_hours * e.bill_rate
    const overtimeAmount = e.invoice_overtime_amount ?? e.invoice_total - regularAmount
    const overtimeRate = e.overtime_hours > 0 ? overtimeAmount / e.overtime_hours : 0

    return `
    <tr>
      <td>${esc(e.employee?.full_name)}</td>
      <td class="num">${e.total_hours.toFixed(2)}</td>
      <td class="num">${e.regular_hours.toFixed(2)}</td>
      <td class="num">${fmtMoney(e.bill_rate)}</td>
      <td class="num">${fmtMoney(regularAmount)}</td>
      <td class="num">${e.overtime_hours.toFixed(2)}</td>
      <td class="num">${e.overtime_hours > 0 ? fmtMoney(overtimeRate) : '—'}</td>
      <td class="num">${fmtMoney(overtimeAmount)}</td>
      <td class="num">${fmtMoney(e.invoice_total)}</td>
    </tr>
  `
  }).join('')

  const totalHours = entries.reduce((a, e) => a + e.total_hours, 0)

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Invoice ${esc(invoice.invoice_number)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 40px; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #666; }
  .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .meta { text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f2f2f2; font-size: 11px; text-transform: uppercase; }
  td.num, th.num { text-align: right; }
  tfoot td { font-weight: bold; }
  .total-due { margin-top: 16px; text-align: right; font-size: 16px; font-weight: bold; }
  @media print { body { margin: 15mm; } }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>${esc(agencyName)}</h1>
      <p class="muted">Invoice</p>
    </div>
    <div class="meta">
      <p><strong>Invoice #:</strong> ${esc(invoice.invoice_number)}</p>
      <p><strong>Issue date:</strong> ${fmtDate(invoice.issue_date)}</p>
      <p><strong>Due date:</strong> ${fmtDate(invoice.due_date)} (${invoice.terms_days} days)</p>
      ${invoice.work_site ? `<p><strong>Work site:</strong> ${esc(invoice.work_site)}</p>` : ''}
    </div>
  </div>

  <p><strong>Bill to:</strong> ${esc(invoice.company?.name)}</p>
  <p class="muted">Week: ${fmtDate(invoice.timesheet?.week_start ?? invoice.issue_date)} to ${fmtDate(invoice.timesheet?.week_end ?? invoice.issue_date)}</p>

  <table>
    <thead>
      <tr>
        <th>Staff name</th>
        <th class="num">Total hours</th>
        <th class="num">Reg hours</th>
        <th class="num">Reg rate</th>
        <th class="num">Reg amount</th>
        <th class="num">OT hours</th>
        <th class="num">OT rate</th>
        <th class="num">OT amount</th>
        <th class="num">Total amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td>Totals</td>
        <td class="num">${totalHours.toFixed(2)}</td>
        <td colspan="6"></td>
        <td class="num">${fmtMoney(invoice.total)}</td>
      </tr>
    </tfoot>
  </table>

  <p class="total-due">Total amount due: ${fmtMoney(invoice.total)}</p>

  <script>window.onload = () => window.print()</script>
</body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}
