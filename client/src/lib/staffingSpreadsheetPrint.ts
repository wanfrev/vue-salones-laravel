import type { SpreadsheetEmployeeRateRow } from '../services/staffing/staffingSpreadsheetService'

const esc = (value: string | number | null | undefined): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const fmtMoney = (n: number | null) => n === null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const roleShiftLabel = (row: SpreadsheetEmployeeRateRow): string =>
  [row.role, row.shift].filter(Boolean).join(' · ')

/**
 * Opens a self-contained printable window for the Spreadsheet module's rate sheet — one row per
 * selected employee, bill rate only. Same window.open + document.write + window.print() pattern
 * as printStaffingInvoice/printStaffingPayroll: a standalone document is far less fragile than
 * fighting the app shell's CSS under @media print.
 */
export function printStaffingSpreadsheet(agencyName: string, companyName: string, rows: SpreadsheetEmployeeRateRow[]): void {
  const bodyRows = rows.map(r => `
    <tr>
      <td>${esc(r.name)}</td>
      <td>${esc(roleShiftLabel(r))}</td>
      <td class="num">${fmtMoney(r.billRate)}</td>
      <td class="num">${fmtMoney(r.overtimeBillRate)}</td>
    </tr>
  `).join('')

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Spreadsheet ${esc(companyName)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 40px; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f2f2f2; font-size: 11px; text-transform: uppercase; }
  td.num, th.num { text-align: right; }
  @media print { body { margin: 15mm; } }
</style></head>
<body>
  <h1>${esc(agencyName)}</h1>
  <p class="muted">Rate sheet — ${esc(companyName)}</p>

  <table>
    <thead>
      <tr>
        <th>Staff name</th>
        <th>Role / Shift</th>
        <th class="num">Bill rate (reg)</th>
        <th class="num">Bill rate (OT)</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>

  <script>window.onload = () => window.print()</script>
</body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}
