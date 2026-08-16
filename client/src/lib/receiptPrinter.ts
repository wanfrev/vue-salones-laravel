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
        <tr>
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
  /* 3. Corrección de líneas blancas (Paginación web) */
  @media print {
    html, body {
      margin: 0;
      padding: 0;
    }
    .receipt-container, table, tr, td, th {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @page {
      margin: 0;
      size: 58mm auto;
    }
  }

  /* 4. Interlineado y tipografía */
  body {
    margin: 0;
    padding: 0;
    font-family: sans-serif;
    font-weight: 600; /* o bold */
    line-height: 1.1;
    color: black;
  }
  
  /* Eliminar margin-top/bottom por defecto (en este caso lo controlamos con clases) */
  p, h1, h2, h3, h4, h5, h6, div {
    margin: 0;
  }

  /* 1. Contenedor y Ancho Estricto */
  .receipt-container {
    width: 48mm;
    max-width: 180px;
    box-sizing: border-box;
    padding: 2mm 1mm; /* Pequeño respiro interno para no pegarse al borde del corte */
  }
  
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  
  .divider { 
    border-top: 1px dashed black; 
    margin: 3px 0; 
  }
  
  /* 2. Prevención de desbordamiento (Totales visibles) */
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 2px;
  }
  
  th, td {
    padding: 1px 0;
    vertical-align: top;
  }
  
  .qty-col { width: 18%; white-space: nowrap; }
  /* word-wrap: break-word en la descripción */
  .desc-col { width: 50%; padding: 0 2px; word-wrap: break-word; }
  .price-col { width: 32%; text-align: right; white-space: nowrap; }
  
  .meta-row { margin-bottom: 2px; }
  
  .totals-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2px;
  }
  .totals-table td { padding: 1px 0; }
  .total-row { font-size: 13px; font-weight: bold; }
  .footer { margin-top: 8px; margin-bottom: 12px; }
</style>
</head>
<body>
  <div class="receipt-container">
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
        <tr>
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
        <tr>
          <td>SUBTOTAL:</td>
          <td class="text-right">${formatMoney(data.subtotal)}</td>
        </tr>
        <tr>
          <td>PROPINA:</td>
          <td class="text-right">${formatMoney(data.tip!)}</td>
        </tr>
      ` : ''}
      <tr class="total-row">
        <td>TOTAL:</td>
        <td class="text-right">${formatMoney(data.total)}</td>
      </tr>
      <tr>
        <td>PAGO:</td>
        <td class="text-right">${formatMethod(data.method)}</td>
      </tr>
    </table>
    
    <div class="divider"></div>
    <div class="text-center footer">¡Gracias por su compra!</div>
  </div>
  
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
