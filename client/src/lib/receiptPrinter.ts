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
  @media print {
    @page { 
      margin: 0; 
      size: 58mm auto; 
    }
    body { 
      margin: 0; 
      padding: 0; 
    }
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: 10px;
    line-height: 1.2;
    color: black;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: none;
  }

  .receipt-container {
    width: 48mm;
    max-width: 48mm;
    padding: 0;
    margin: 0 auto;
    box-sizing: border-box;
  }
  
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .title { font-size: 11px; font-weight: bold; }
  
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
  
  .totals-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2px;
  }
  .total-row { font-weight: bold; }
  .footer { margin-top: 8px; margin-bottom: 12px; }
</style>
</head>
<body>
  <div class="receipt-container">
    <!-- Header -->
    <div class="text-center title meta-row">${data.businessName}</div>
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
