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
        <tr class="avoid-break">
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
  /* 1. Forzar Monocromo y Apagar Suavizado */
  @media print {
    @page { 
      margin: 0 !important; 
      size: 58mm auto; 
    }
    html, body {
      margin: 0 !important; 
      padding: 0 !important;
    }
    body {
      color: #000000 !important;
      background-color: #FFFFFF !important;
      -webkit-font-smoothing: none !important;
      text-rendering: optimizeSpeed !important;
    }
  }

  /* 2. Márgenes en Cero y Estructura Principal */
  body {
    margin: 0;
    padding: 0;
  }

  .receipt-container {
    max-width: 185px; /* Restricción estricta sugerida para impresoras 58mm */
    text-align: left;
    box-sizing: border-box;
    padding: 2px; /* Margen de seguridad interno muy sutil */
    margin: 0;
  }

  /* 3. Interlineado Compacto y Tipografía */
  body, .receipt-container {
    font-family: 'Courier New', Courier, monospace;
    font-size: 10px;
    line-height: 1.3 !important;
    font-weight: bold !important;
  }

  p, h1, h2, h3, h4, h5, h6, hr, div {
    margin-top: 0;
    margin-bottom: 0;
  }

  .title {
    font-size: 11px;
    font-weight: bold !important;
    text-align: center;
    margin-bottom: 2px;
    padding-top: 2px;
    padding-bottom: 2px;
  }
  
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: bold; }

  hr.divider { 
    border: none; 
    border-top: 1px dashed #000; 
    margin: 3px 0; 
  }
  
  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    margin: 2px 0;
    font-weight: bold !important;
  }
  
  th, td {
    vertical-align: top;
    padding: 1px 0;
  }
  
  .qty-col { width: 15%; text-align: left; }
  .desc-col { width: 55%; text-align: left; word-break: break-word; }
  .price-col { width: 30%; text-align: right; }
  
  .meta-row { margin-bottom: 2px; }
  
  .totals-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2px;
  }
  .footer { margin-top: 6px; margin-bottom: 12px; }

  /* 4. Bloqueo de Paginación Web */
  .avoid-break, .receipt-container {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
</style>
</head>
<body>
  <div class="receipt-container avoid-break">
    <!-- Header -->
    <div class="title avoid-break">${data.businessName}</div>
    ${data.branchName ? `<div class="text-center meta-row avoid-break">${data.branchName}</div>` : ''}
    <hr class="divider">

    <!-- Meta -->
    ${data.receiptNumber ? `<div class="meta-row avoid-break">Factura: ${data.receiptNumber}</div>` : ''}
    <div class="meta-row avoid-break">Fecha: ${data.date}</div>
    ${data.clientName ? `<div class="meta-row avoid-break">Cliente: ${data.clientName}</div>` : ''}
    ${data.employeeName ? `<div class="meta-row avoid-break">Atiende: ${data.employeeName}</div>` : ''}
    <hr class="divider">

    <!-- Items Table -->
    <table>
      <thead>
        <tr class="avoid-break">
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
        <tr class="avoid-break">
          <td>SUBTOTAL:</td>
          <td class="text-right">${formatMoney(data.subtotal)}</td>
        </tr>
        <tr class="avoid-break">
          <td>PROPINA:</td>
          <td class="text-right">${formatMoney(data.tip!)}</td>
        </tr>
      ` : ''}
      <tr class="bold avoid-break">
        <td>TOTAL:</td>
        <td class="text-right">${formatMoney(data.total)}</td>
      </tr>
      <tr class="avoid-break">
        <td>PAGO:</td>
        <td class="text-right">${formatMethod(data.method)}</td>
      </tr>
    </table>
    
    <hr class="divider">
    <div class="text-center footer avoid-break">¡Gracias por su compra!</div>
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
