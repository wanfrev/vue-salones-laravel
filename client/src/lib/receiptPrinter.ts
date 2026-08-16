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
 * Centra un texto en una línea de `width` caracteres.
 */
function centerText(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width)
  const leftPad = Math.floor((width - text.length) / 2)
  const rightPad = width - text.length - leftPad
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad)
}

/**
 * Alinea texto a la izquierda y derecha en una misma línea (ej. Total:  $10.00).
 */
function justifyText(left: string, right: string, width: number): string {
  const combinedLength = left.length + right.length
  if (combinedLength >= width) {
    // Si no cabe, corta el de la izquierda un poco
    const maxLeft = width - right.length - 1
    return left.substring(0, maxLeft) + ' ' + right
  }
  const spaces = width - combinedLength
  return left + ' '.repeat(spaces) + right
}

/**
 * Trunca o rellena texto por la izquierda
 */
function padRight(text: string, length: number): string {
  if (text.length >= length) return text.substring(0, length)
  return text + ' '.repeat(length - text.length)
}

/**
 * Trunca o rellena texto por la derecha
 */
function padLeft(text: string, length: number): string {
  if (text.length >= length) return text.substring(0, length)
  return ' '.repeat(length - text.length) + text
}

const WIDTH = 32

/**
 * Genera el contenido TXT para una impresora térmica de 58mm (aprox 32 columnas).
 */
export function buildThermalReceiptTXT(data: ReceiptData): string {
  const lines: string[] = []

  const addDivider = () => lines.push('-'.repeat(WIDTH))
  const addLine = (text: string) => lines.push(text)

  // Cabecera
  addLine(centerText(data.businessName, WIDTH))
  if (data.branchName) {
    addLine(centerText(data.branchName, WIDTH))
  }
  addDivider()

  // Metadatos
  if (data.receiptNumber) {
    addLine(`Factura: ${data.receiptNumber}`)
  }
  addLine(`Fecha: ${data.date}`)
  if (data.clientName) {
    addLine(`Cliente: ${data.clientName}`)
  }
  if (data.employeeName) {
    addLine(`Atiende: ${data.employeeName}`)
  }
  addDivider()

  const formatMoney = (amount: number) => `$${amount.toFixed(2)}`

  // Items
  addLine('CANT DESCRIPCION        TOTAL')
  
  const processItems = (items: ReceiptItem[]) => {
    for (const item of items) {
      const qtyStr = padRight(String(item.qty), 4) // "1   "
      const priceStr = padLeft(formatMoney(item.price), 8) // "  $10.00"
      
      const descMaxWidth = WIDTH - qtyStr.length - priceStr.length - 1
      const descParts = item.name.match(new RegExp(`.{1,${descMaxWidth}}`, 'g')) || []
      
      for (let i = 0; i < descParts.length; i++) {
        if (i === 0) {
          addLine(`${qtyStr} ${padRight(descParts[i], descMaxWidth)}${priceStr}`)
        } else {
          addLine(`     ${descParts[i]}`) // sangría para multilíneas
        }
      }
    }
  }

  if (data.services && data.services.length > 0) {
    processItems(data.services)
  }
  if (data.products && data.products.length > 0) {
    processItems(data.products)
  }

  addDivider()

  // Totales
  if ((data.tip ?? 0) > 0) {
    addLine(justifyText('SUBTOTAL:', formatMoney(data.subtotal), WIDTH))
    addLine(justifyText('PROPINA:', formatMoney(data.tip!), WIDTH))
  }
  
  addLine(justifyText('TOTAL:', formatMoney(data.total), WIDTH))
  addLine(justifyText('METODO PAGO:', formatMethod(data.method), WIDTH))
  
  addDivider()
  addLine(centerText('¡Gracias por su compra!', WIDTH))
  addLine('')
  addLine('')
  addLine('')
  addLine('')
  
  return lines.join('\n')
}

/**
 * Genera el HTML y abre el diálogo de impresión directamente.
 */
export function printThermalReceiptTXT(data: ReceiptData, _filename?: string): void {
  const txtContent = buildThermalReceiptTXT(data)
  
  // En lugar de descargar un TXT, generamos un documento HTML con una fuente monospace
  // estricta y márgenes en cero, y abrimos el diálogo de impresión del navegador.
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
    padding: 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.2;
    background: white;
    color: black;
    width: 58mm; /* Ancho de la impresora */
    white-space: pre-wrap; /* Respeta los espacios y saltos de línea */
    word-break: break-all;
  }
  .content {
    padding: 2mm;
    margin: 0;
  }
</style>
</head>
<body>
  <div class="content">${txtContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
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
