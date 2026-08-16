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
  /* Regla de impresión maestra */
  @media print { 
    @page { 
      margin: 0 !important; 
      size: 58mm auto; 
    } 
    body { 
      margin: 0 !important; 
      padding: 0 !important; 
      width: 100%; 
    } 
  }

  /* Fuentes limpias sin renderizado borroso */
  body {
    margin: 0;
    padding: 0;
    text-rendering: optimizeSpeed; 
    -webkit-font-smoothing: none;
    background: white;
  }

  /* Contenedor fluido pero restringido */
  .receipt-container {
    width: 100%; 
    max-width: 190px; 
    margin: 0; 
    padding: 0; 
    font-family: monospace; 
    font-size: 11px; 
    text-align: left; 
    color: #000;
    line-height: 1.2;
  }
  
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: bold; }
  
  hr.divider { 
    border: none; 
    border-top: 1px dashed #000; 
    margin: 4px 0; 
  }
  
  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    margin: 2px 0;
  }
  
  th, td {
    vertical-align: top;
  }
  
  .qty-col { width: 15%; text-align: left; }
  .desc-col { width: 55%; text-align: left; word-break: break-word; }
  .price-col { width: 30%; text-align: right; }
  
  .meta-row { margin: 2px 0; }
  
  /* Estructura de totales con Flexbox */
  .flex-row {
    display: flex; 
    justify-content: space-between; 
    width: 100%;
    margin: 2px 0;
  }
  
  .footer { margin-top: 6px; margin-bottom: 12px; }
</style>
</head>
<body>
  <div class="receipt-container">
    <!-- Header -->
    <div class="text-center bold meta-row">${data.businessName}</div>
    ${data.branchName ? `<div class="text-center meta-row">${data.branchName}</div>` : ''}
    <hr class="divider">

    <!-- Meta -->
    ${data.receiptNumber ? `<div class="meta-row">Factura: ${data.receiptNumber}</div>` : ''}
    <div class="meta-row">Fecha: ${data.date}</div>
    ${data.clientName ? `<div class="meta-row">Cliente: ${data.clientName}</div>` : ''}
    ${data.employeeName ? `<div class="meta-row">Atiende: ${data.employeeName}</div>` : ''}
    <hr class="divider">

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th class="qty-col">CANT</th>
          <th class="desc-col">DESCRIP</th>
          <th class="price-col">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <hr class="divider">

    <!-- Totals -->
    ${(data.tip ?? 0) > 0 ? `
      <div class="flex-row">
        <span>SUBTOTAL:</span>
        <span>${formatMoney(data.subtotal)}</span>
      </div>
      <div class="flex-row">
        <span>PROPINA:</span>
        <span>${formatMoney(data.tip!)}</span>
      </div>
    ` : ''}
    <div class="flex-row bold">
      <span>TOTAL:</span>
      <span>${formatMoney(data.total)}</span>
    </div>
    <div class="flex-row">
      <span>PAGO:</span>
      <span>${formatMethod(data.method)}</span>
    </div>
    
    <hr class="divider">
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
