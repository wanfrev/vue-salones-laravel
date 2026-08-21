import { apiRequest } from '../lib/api'

export interface PurchaseInvoiceLineInput {
  productId?: string | null
  newProduct?: {
    name: string
    sku?: string | null
    unit?: string | null
    unitPrice?: number | null
    unitPrice2?: number | null
  } | null
  quantity: number
  unitCost?: number
}

export interface PurchaseInvoiceFormData {
  supplierId?: string | null
  invoiceNumber: string
  invoiceDate: string
  branchId?: string | null
  notes?: string | null
  items: PurchaseInvoiceLineInput[]
}

export interface PurchaseInvoiceItemRow {
  id: string
  productId: string
  productName: string
  productSku: string | null
  quantity: number
  unitCost: number
  lineTotal: number
}

export interface PurchaseInvoiceRow {
  id: string
  supplierId: string | null
  supplierName: string | null
  invoiceNumber: string
  invoiceDate: string
  total: number
  notes: string | null
  createdByName: string | null
  createdAt: string
  items: PurchaseInvoiceItemRow[]
}

interface PurchaseInvoiceApiRow {
  id: string
  supplier_id: string | null
  invoice_number: string
  invoice_date: string
  total: number | string
  notes: string | null
  created_at: string
  supplier?: { id: string; company: string | null; first_name: string; last_name: string } | null
  creator?: { id: string; full_name: string } | null
  items?: Array<{
    id: string
    product_id: string
    quantity: number | string
    unit_cost: number | string
    line_total: number | string
    product?: { id: string; name: string; sku: string | null } | null
  }>
}

const supplierDisplayName = (s: PurchaseInvoiceApiRow['supplier']): string | null => {
  if (!s) return null
  return s.company || [s.first_name, s.last_name].filter(Boolean).join(' ') || null
}

const toPurchaseInvoiceRow = (row: PurchaseInvoiceApiRow): PurchaseInvoiceRow => ({
  id: row.id,
  supplierId: row.supplier_id,
  supplierName: supplierDisplayName(row.supplier),
  invoiceNumber: row.invoice_number,
  invoiceDate: String(row.invoice_date).slice(0, 10),
  total: Number(row.total),
  notes: row.notes,
  createdByName: row.creator?.full_name ?? null,
  createdAt: row.created_at,
  items: (row.items ?? []).map(item => ({
    id: item.id,
    productId: item.product_id,
    productName: item.product?.name ?? '',
    productSku: item.product?.sku ?? null,
    quantity: Number(item.quantity),
    unitCost: Number(item.unit_cost),
    lineTotal: Number(item.line_total),
  })),
})

export const purchaseInvoiceKeys = {
  all: (businessId?: string | null) => ['purchase-invoices', businessId] as const,
}

export const listPurchaseInvoices = async (supplierId?: string | null): Promise<PurchaseInvoiceRow[]> => {
  const query = supplierId ? `?supplier_id=${supplierId}` : ''
  const rows = await apiRequest<PurchaseInvoiceApiRow[]>('GET', `/purchase-invoices${query}`)
  return rows.map(toPurchaseInvoiceRow)
}

export const createPurchaseInvoice = async (data: PurchaseInvoiceFormData): Promise<PurchaseInvoiceRow> => {
  const payload = {
    supplier_id: data.supplierId || null,
    invoice_number: data.invoiceNumber,
    invoice_date: data.invoiceDate,
    branch_id: data.branchId || null,
    notes: data.notes || null,
    items: data.items.map(item => ({
      product_id: item.productId || null,
      new_product: item.newProduct
        ? {
            name: item.newProduct.name,
            sku: item.newProduct.sku || null,
            unit: item.newProduct.unit || null,
            unit_price: item.newProduct.unitPrice ?? null,
            unit_price_2: item.newProduct.unitPrice2 ?? null,
          }
        : null,
      quantity: item.quantity,
      unit_cost: item.unitCost ?? 0,
    })),
  }

  const row = await apiRequest<PurchaseInvoiceApiRow>('POST', '/purchase-invoices', payload)
  return toPurchaseInvoiceRow(row)
}
