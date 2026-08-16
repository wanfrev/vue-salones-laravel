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

/**
 * Genera el HTML y abre el diálogo de impresión directamente.
 * Usa elementos HTML nativos en lugar de pre-wrap para evitar recortes de fuente en impresoras térmicas.
 */
export function printThermalReceiptTXT(data: ReceiptData, _filename?: string): void {
  const formatMoney = (amount: number) => `$${amount.toFixed(2)}`

  let itemsHtml = ''
  
  const processItems = (items: ReceiptItem[]) => {
    for (const item of items) {
      itemsHtml += `
        <div class="item">
          <div class="item-qty">${item.qty}</div>
          <div class="item-desc">${item.name}</div>
          <div class="item-price">${formatMoney(item.price)}</div>
        </div>
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
    size: 58mm auto;
  }
  body {
    margin: 0;
    padding: 2mm;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 12px;
    line-height: normal;
    background: white;
    color: black;
    width: 48mm; /* Ancho imprimible estándar de rollos de 58mm */
    max-width: 100%;
    box-sizing: border-box;
    margin: 0 auto;
  }
  .text-center { text-align: center; }
  .bold { font-weight: bold; }
  .divider { 
    border-top: 1px dashed black; 
    margin: 6px 0; 
  }
  .flex-between {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 6px;
  }
  .item-qty {
    width: 15%;
    text-align: left;
  }
  .item-desc {
    width: 55%;
    text-align: left;
    padding-right: 2px;
    word-break: break-word;
  }
  .item-price {
    width: 30%;
    text-align: right;
  }
  .total-row {
    font-size: 14px;
    font-weight: bold;
    margin-top: 6px;
  }
  .meta-row {
    margin-bottom: 4px;
  }
  .footer {
    margin-top: 12px;
    margin-bottom: 12px;
  }
</style>
</head>
<body>
  <!-- Header -->
  <div class="text-center bold" style="font-size: 13px; margin-bottom: 2px;">${data.businessName}</div>
  ${data.branchName ? `<div class="text-center" style="margin-bottom: 2px;">${data.branchName}</div>` : ''}
  <div class="divider"></div>

  <!-- Meta -->
  ${data.receiptNumber ? `<div class="meta-row">Factura: ${data.receiptNumber}</div>` : ''}
  <div class="meta-row">Fecha: ${data.date}</div>
  ${data.clientName ? `<div class="meta-row">Cliente: ${data.clientName}</div>` : ''}
  ${data.employeeName ? `<div class="meta-row">Atiende: ${data.employeeName}</div>` : ''}
  <div class="divider"></div>

  <!-- Table Header -->
  <div class="item bold" style="margin-bottom: 4px;">
    <div class="item-qty">CANT</div>
    <div class="item-desc">DESCRIPCION</div>
    <div class="item-price">TOTAL</div>
  </div>
  
  <!-- Items -->
  ${itemsHtml}

  <div class="divider"></div>

  <!-- Totals -->
  ${(data.tip ?? 0) > 0 ? `
    <div class="flex-between meta-row">
      <span>SUBTOTAL:</span>
      <span>${formatMoney(data.subtotal)}</span>
    </div>
    <div class="flex-between meta-row">
      <span>PROPINA:</span>
      <span>${formatMoney(data.tip!)}</span>
    </div>
  ` : ''}
  <div class="flex-between total-row">
    <span>TOTAL:</span>
    <span>${formatMoney(data.total)}</span>
  </div>
  <div class="flex-between meta-row" style="margin-top: 4px;">
    <span>METODO PAGO:</span>
    <span class="text-right">${formatMethod(data.method)}</span>
  </div>
  
  <div class="divider"></div>
  <div class="text-center footer">¡Gracias por su compra!</div>
  
  <script>
    window.onload = function() {
      // Pequeño timeout para asegurar que el renderizado se completó
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
