import type { StaffingDepositListRow } from '../services/staffing/staffingService'
import { SHIFT_OPTIONS } from '../services/staffing/staffingService'

const esc = (value: string | number | null | undefined): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const shiftLabel = (shift: string | null) => shift ? (SHIFT_OPTIONS.find(o => o.value === shift)?.label ?? shift) : ''

// Mirrors the agency's own paper sheet: "BENSON GDI NOCHE" is company name + shift, not two
// separate columns — shift lives on the assignment, not the company, so it's folded in here.
const companyLabel = (row: StaffingDepositListRow) => row.shift ? `${row.companyName} - ${shiftLabel(row.shift)}` : row.companyName

/**
 * Opens a self-contained printable window for a week's "lista de depósitos" — one row per
 * (employee, company) direct-deposit payout, a blank "Observación" column to mirror the
 * hand-filled "cambio de cuenta" notes on the paper original, and a total at the bottom. Same
 * new-window-per-print approach as printStaffingInvoice: fighting the app shell's own CSS under
 * @media print is more fragile than a clean standalone document.
 */
export function printStaffingDepositList(rows: StaffingDepositListRow[], weekLabel: string, agencyName: string): void {
  const body = rows.map(r => `
    <tr>
      <td>${esc(r.employeeName)}</td>
      <td>${esc(r.titular)}</td>
      <td>${esc(r.bankName)}</td>
      <td>${esc(companyLabel(r))}</td>
      <td class="num">${fmtMoney(r.amount)}</td>
      <td></td>
    </tr>
  `).join('')

  const total = rows.reduce((acc, r) => acc + r.amount, 0)

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Lista de depósitos - ${esc(weekLabel)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 40px; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #666; }
  .header { margin-bottom: 24px; }
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
    <h1>${esc(agencyName)}</h1>
    <p class="muted">Lista de depósitos — semana ${esc(weekLabel)}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Empleado</th>
        <th>Titular</th>
        <th>Banco</th>
        <th>Empresa</th>
        <th class="num">Cantidad</th>
        <th>Observación</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">Total</td>
        <td class="num">${fmtMoney(total)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <p class="total-due">Total a depositar: ${fmtMoney(total)}</p>

  <script>window.onload = () => window.print()</script>
</body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}
