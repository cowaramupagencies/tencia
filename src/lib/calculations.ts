import type { AppSettings, GstStatus, InvoiceLineItem, InvoiceTotals } from '../types';

export function parseGstStatus(value: unknown): GstStatus {
  const str = String(value ?? '').toLowerCase().trim();
  if (!str || str === 'exempt' || str === 'no' || str === 'n' || str === '0') return 'exempt';
  if (str.includes('incl') || str === 'yes' || str === 'y' || str === '1') return 'inclusive';
  if (str.includes('excl')) return 'exclusive';
  return 'inclusive';
}

export function calculateLineAmounts(
  item: InvoiceLineItem,
  settings: AppSettings,
): { exGst: number; gst: number; incGst: number } {
  const qty = item.quantity || 0;
  const unitPrice = item.unitPrice || 0;
  const lineBase = qty * unitPrice;
  const rate = settings.defaultGstRate;

  if (item.gstStatus === 'exempt') {
    return { exGst: lineBase, gst: 0, incGst: lineBase };
  }

  if (item.gstStatus === 'inclusive' || settings.pricesGstInclusive) {
    const exGst = lineBase / (1 + rate);
    const gst = lineBase - exGst;
    return { exGst, gst, incGst: lineBase };
  }

  const gst = lineBase * rate;
  return { exGst: lineBase, gst, incGst: lineBase + gst };
}

export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  settings: AppSettings,
): InvoiceTotals {
  const lineTotals: Record<string, number> = {};
  let subtotal = 0;
  let gst = 0;

  for (const item of lineItems) {
    const amounts = calculateLineAmounts(item, settings);
    lineTotals[item.id] = amounts.incGst;
    subtotal += amounts.exGst;
    gst += amounts.gst;
  }

  return {
    lineTotals,
    subtotal,
    gst,
    total: subtotal + gst,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
}

export function invoiceExportBasename(invoiceNumber: string, clientName: string, date: string): string {
  const num = invoiceNumber.startsWith('INV-') ? invoiceNumber : `INV-${invoiceNumber}`;
  return sanitizeFilename(`${num} - ${clientName} - ${date}`);
}

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES: Record<string, keyof import('../types').ColumnMapping> = {
  itemcode: 'itemCode',
  code: 'itemCode',
  sku: 'itemCode',
  productcode: 'itemCode',
  itemname: 'itemName',
  name: 'itemName',
  productname: 'itemName',
  description: 'description',
  desc: 'description',
  details: 'description',
  category: 'category',
  cat: 'category',
  type: 'category',
  unitprice: 'unitPrice',
  price: 'unitPrice',
  sellprice: 'unitPrice',
  unitcost: 'unitPrice',
  gst: 'gstStatus',
  gststatus: 'gstStatus',
  tax: 'gstStatus',
  stockquantity: 'stockQuantity',
  quantity: 'stockQuantity',
  qty: 'stockQuantity',
  stock: 'stockQuantity',
  available: 'stockQuantity',
  supplier: 'supplier',
  vendor: 'supplier',
  notes: 'notes',
  note: 'notes',
  comments: 'notes',
};

export function autoDetectColumnMapping(headers: string[]): import('../types').ColumnMapping {
  const mapping: import('../types').ColumnMapping = {};
  for (const header of headers) {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    if (key && !mapping[key]) {
      mapping[key] = header;
    }
  }
  return mapping;
}

export function parsePrice(value: unknown): number {
  if (typeof value === 'number') return value;
  const str = String(value ?? '').replace(/[$,\s]/g, '');
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
}

export function parseQuantity(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = parseFloat(String(value).replace(/[,\s]/g, ''));
  return Number.isFinite(num) ? num : undefined;
}
