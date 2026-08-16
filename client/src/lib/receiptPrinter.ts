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

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width)
  const leftPad = Math.floor((width - text.length) / 2)
  const rightPad = width - text.length - leftPad
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad)
}

function justifyText(left: string, right: string, width: number): string {
  const combinedLength = left.length + right.length
  if (combinedLength >= width) {
    const maxLeft = width - right.length - 1
    return left.substring(0, maxLeft > 0 ? maxLeft : 0) + ' ' + right
  }
  return left + ' '.repeat(width - combinedLength) + right
}

function padRight(text: string, length: number): string {
  if (text.length >= length) return text.substring(0, length)
  return text + ' '.repeat(length - text.length)
}

function padLeft(text: string, length: number): string {
  if (text.length >= length) return text.substring(0, length)
  return ' '.repeat(length - text.length) + text
}

const WIDTH = 32 // 32 columnas es estándar para impresoras térmicas de 58mm

export function buildThermalReceiptTXT(data: ReceiptData): string {
  const lines: string[] = []

  const addDivider = () => lines.push('-'.repeat(WIDTH))
  const addLine = (text: string) => lines.push(text)

  addLine(centerText(data.businessName, WIDTH))
  if (data.branchName) addLine(centerText(data.branchName, WIDTH))
  addDivider()

  if (data.receiptNumber) addLine(`Factura: ${data.receiptNumber}`)
  addLine(`Fecha: ${data.date}`)
  if (data.clientName) addLine(`Cliente: ${data.clientName}`)
  if (data.employeeName) addLine(`Atiende: ${data.employeeName}`)
  addDivider()

  const formatMoney = (amount: number) => `$${amount.toFixed(2)}`

  addLine('CANT DESCRIPCION        TOTAL')
  
  const processItems = (items: ReceiptItem[]) => {
    for (const item of items) {
      const qtyStr = padRight(String(item.qty), 4)
      const priceStr = padLeft(formatMoney(item.price), 8)
      
      const descMaxWidth = WIDTH - qtyStr.length - priceStr.length - 1
      const descParts = item.name.match(new RegExp(`.{1,${descMaxWidth}}`, 'g')) || []
      
      for (let i = 0; i < descParts.length; i++) {
        if (i === 0) {
          addLine(`${qtyStr} ${padRight(descParts[i], descMaxWidth)} ${priceStr}`)
        } else {
          addLine(`     ${descParts[i]}`)
        }
      }
    }
  }

  if (data.services && data.services.length > 0) processItems(data.services)
  if (data.products && data.products.length > 0) processItems(data.products)

  addDivider()

  if ((data.tip ?? 0) > 0) {
    addLine(justifyText('SUBTOTAL:', formatMoney(data.subtotal), WIDTH))
    addLine(justifyText('PROPINA:', formatMoney(data.tip!), WIDTH))
  }
  
  addLine(justifyText('TOTAL:', formatMoney(data.total), WIDTH))
  addLine(justifyText('PAGO:', formatMethod(data.method), WIDTH))
  
  addDivider()
  addLine(centerText('¡Gracias por su compra!', WIDTH))
  addLine('')
  addLine('')
  
  return lines.join('\n')
}

export function printThermalReceiptTXT(data: ReceiptData, _filename?: string): void {
  const txtContent = buildThermalReceiptTXT(data)
  
  // Imprimir usando un bloque <pre> puro. Esto evita por completo el motor de layout complejo (tablas, flexbox)
  // y forza valores de pixeles enteros (12px, 14px) para evitar el error de rasterizado (líneas blancas) en Windows.
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
    padding: 0;
    background: white;
  }
  pre {
    margin: 0;
    padding: 4px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px; /* Pixeles exactos */
    line-height: 14px; /* Pixeles exactos para evitar interpolación del driver (líneas blancas) */
    color: black;
    white-space: pre-wrap;
    word-break: break-all;
    width: 100%;
    max-width: 200px;
    overflow: hidden;
    /* Apagar anti-aliasing */
    -webkit-font-smoothing: none;
  }
</style>
</head>
<body>
  <pre>${txtContent}</pre>
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
