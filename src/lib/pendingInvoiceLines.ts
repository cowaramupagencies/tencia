import type { Invoice, InvoiceLineItem } from '../types';

export const PENDING_LINES_KEY = 'pending-invoice-lines';
export const ACTIVE_INVOICE_PATH_KEY = 'active-invoice-path';

export function readPendingLines(): InvoiceLineItem[] {
  try {
    const raw = sessionStorage.getItem(PENDING_LINES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InvoiceLineItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePendingLines(lines: InvoiceLineItem[]) {
  try {
    if (lines.length === 0) {
      sessionStorage.removeItem(PENDING_LINES_KEY);
    } else {
      sessionStorage.setItem(PENDING_LINES_KEY, JSON.stringify(lines));
    }
  } catch {
    // ignore
  }
}

export function appendPendingLine(line: InvoiceLineItem) {
  writePendingLines([...readPendingLines(), line]);
}

export function clearPendingLinesStorage() {
  sessionStorage.removeItem(PENDING_LINES_KEY);
}

export function setActiveInvoicePath(path: string) {
  sessionStorage.setItem(ACTIVE_INVOICE_PATH_KEY, path);
}

export function getActiveInvoicePath(): string {
  return sessionStorage.getItem(ACTIVE_INVOICE_PATH_KEY) || '/invoice/new';
}

export function mergeLinesIntoInvoice(invoice: Invoice, lines: InvoiceLineItem[]): Invoice {
  if (lines.length === 0) return invoice;
  const maxOrder = invoice.lineItems.reduce((m, l) => Math.max(m, l.sortOrder), -1);
  const newLines = lines.map((line, i) => ({ ...line, sortOrder: maxOrder + 1 + i }));
  return { ...invoice, lineItems: [...invoice.lineItems, ...newLines] };
}

export function consumePendingLines(): InvoiceLineItem[] {
  const lines = readPendingLines();
  clearPendingLinesStorage();
  return lines;
}
