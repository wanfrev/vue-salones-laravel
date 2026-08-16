import { formatMethod } from './formatters'

export interface ReceiptItem {
  name: string
  qty: number
  price: number
}

export interface ReceiptData {
  businessName: string
  branchName?: string
  receiptNumber?: string
  date: string
  clientName?: string
  employeeName?: string
  services?: ReceiptItem[]
  products?: ReceiptItem[]
  subtotal: number
  tip?: number
  total: number
  method: string
  currency: string
}

export function printThermalReceiptTXT(data: ReceiptData, _filename?: string): void {
  const formatMoney = (amount: number) => `$${amount.toFixed(2)}`

  let itemsHtml = ''
  
  const processItems = (items: ReceiptItem[]) => {
    for (const item of items) {
      itemsHtml += `
        <tr style="page-break-inside: avoid; break-inside: avoid;">
          <td class="qty-col">${item.qty}</td>
          <td class="desc-col">${item.name}</td>
          <td class="price-col">${formatMoney(item.price)}</td>
        </tr>
      `
    }
  }

  if (data.services && data.services.length > 0) processItems(data.services)
  if (data.products && data.products.length > 0) processItems(data.products)

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Recibo</title>
<style>
  @page {
    margin: 0;
  }
  body {
    margin: 0;
    /* Margen perfecto de la versión 3 que protege el lado derecho */
    padding: 2mm 3mm 2mm 1mm;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    font-weight: bold;
    /* Interlineado ajustado para que no haya espacios en blanco gigantes ni se corten las letras */
    line-height: 1.2;
    color: black;
    width: 100%;
    max-width: 48mm;
    box-sizing: border-box;
  }
  
  /* Protecciones contra saltos de página del navegador que cortan las letras a la mitad */
  table, tr, td, div {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .divider { 
    border-top: 1px dashed black; 
    margin: 4px 0; 
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 2px;
  }
  th, td {
    padding: 2px 0; /* Padding añadido para evitar que el borde de la celda muerda la letra */
    vertical-align: top;
    word-wrap: break-word;
  }
  .qty-col { width: 15%; }
  .desc-col { width: 55%; padding-right: 2px; }
  .price-col { width: 30%; text-align: right; }
  
  .meta-row { margin-bottom: 2px; }
  
  .totals-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2px;
  }
  .totals-table td { padding: 2px 0; }
  .total-row { font-size: 13px; }
  .footer { margin-top: 10px; margin-bottom: 15px; }
</style>
</head>
<body>
  <!-- Header -->
  <div class="text-center" style="font-size: 13px; margin-bottom: 2px;">${data.businessName}</div>
  ${data.branchName ? `<div class="text-center" style="margin-bottom: 2px;">${data.branchName}</div>` : ''}
  <div class="divider"></div>

  <!-- Meta -->
  ${data.receiptNumber ? `<div class="meta-row">Factura: ${data.receiptNumber}</div>` : ''}
  <div class="meta-row">Fecha: ${data.date}</div>
  ${data.clientName ? `<div class="meta-row">Cliente: ${data.clientName}</div>` : ''}
  ${data.employeeName ? `<div class="meta-row">Atiende: ${data.employeeName}</div>` : ''}
  <div class="divider"></div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <th class="qty-col text-left">CANT</th>
        <th class="desc-col text-left">DESCRIP</th>
        <th class="price-col">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <!-- Totals -->
  <table class="totals-table">
    ${(data.tip ?? 0) > 0 ? `
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td>SUBTOTAL:</td>
        <td class="text-right">${formatMoney(data.subtotal)}</td>
      </tr>
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td>PROPINA:</td>
        <td class="text-right">${formatMoney(data.tip!)}</td>
      </tr>
    ` : ''}
    <tr class="total-row" style="page-break-inside: avoid; break-inside: avoid;">
      <td>TOTAL:</td>
      <td class="text-right">${formatMoney(data.total)}</td>
    </tr>
    <tr style="page-break-inside: avoid; break-inside: avoid;">
      <td>PAGO:</td>
      <td class="text-right">${formatMethod(data.method)}</td>
    </tr>
  </table>
  
  <div class="divider"></div>
  <div class="text-center footer">¡Gracias por su compra!</div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 500);
      }, 200);
    }
  </script>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=300,height=600')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
