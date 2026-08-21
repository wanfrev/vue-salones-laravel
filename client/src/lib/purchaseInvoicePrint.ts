import type { PurchaseInvoiceRow } from '../services/purchaseInvoiceService'

const esc = (value: string | number | null | undefined): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })

/**
 * Prints the receiving summary for one purchase invoice — what an admin checks against the
 * physical paper to confirm an employee vació it correctly. Same "print window" approach as
 * staffingInvoicePrint.ts: no PDF library, the user saves it as PDF from the browser's own
 * print dialog.
 */
export function printPurchaseInvoice(invoice: PurchaseInvoiceRow, businessName: string): void {
  const rows = invoice.items.map(item => `
    <tr>
      <td>${esc(item.productName)}</td>
      <td>${esc(item.productSku || '—')}</td>
      <td class="num">${item.quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
      <td class="num">${fmtMoney(item.unitCost)}</td>
      <td class="num">${fmtMoney(item.lineTotal)}</td>
    </tr>
  `).join('')

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Factura de compra ${esc(invoice.invoiceNumber)}</title>
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
  .verify { margin-top: 40px; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 12px; }
  @media print { body { margin: 15mm; } }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>${esc(businessName)}</h1>
      <p class="muted">Factura de compra — mercancía recibida</p>
    </div>
    <div class="meta">
      <p><strong>N° de factura:</strong> ${esc(invoice.invoiceNumber)}</p>
      <p><strong>Fecha:</strong> ${fmtDate(invoice.invoiceDate)}</p>
      ${invoice.supplierName ? `<p><strong>Proveedor:</strong> ${esc(invoice.supplierName)}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th>SKU</th>
        <th class="num">Cantidad</th>
        <th class="num">Costo unitario</th>
        <th class="num">Subtotal</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">Total</td>
        <td class="num">${fmtMoney(invoice.total)}</td>
      </tr>
    </tfoot>
  </table>

  <p class="total-due">Total de la factura: ${fmtMoney(invoice.total)}</p>

  ${invoice.notes ? `<p><strong>Notas:</strong> ${esc(invoice.notes)}</p>` : ''}

  <p class="verify">
    Registrado por: ${esc(invoice.createdByName || '—')}<br />
    Compara este documento contra la factura física del proveedor para verificar que la mercancía
    se ingresó correctamente.
  </p>

  <script>window.onload = () => window.print()</script>
</body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}
