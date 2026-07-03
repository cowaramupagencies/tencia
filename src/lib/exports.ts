import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { AppSettings, Invoice, InvoiceLineItem, Product } from '../types';
import {
  calculateInvoiceTotals,
  calculateLineAmounts,
  formatCurrency,
  formatDate,
  formatDateTime,
  invoiceExportBasename,
} from './calculations';

function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}

export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), filename);
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildInvoiceCsvRows(
  invoice: Invoice,
  settings: AppSettings,
): string[][] {
  const totals = calculateInvoiceTotals(invoice.lineItems, settings);
  const rows: string[][] = [
    [
      'Invoice Number',
      'Invoice Date',
      'Client Name',
      'Client Phone',
      'Client Email',
      'Client Address',
      'Item Code',
      'Item Name',
      'Description',
      'Quantity',
      'Unit Price',
      'GST Amount',
      'Line Total',
      'Invoice Subtotal',
      'Invoice GST',
      'Invoice Total',
      'Status',
      'Reconciliation Notes',
    ],
  ];

  invoice.lineItems.forEach((item, index) => {
    const amounts = calculateLineAmounts(item, settings);
    rows.push([
      invoice.invoiceNumber,
      invoice.date,
      invoice.clientName,
      invoice.clientPhone ?? '',
      invoice.clientEmail ?? '',
      invoice.clientAddress ?? '',
      item.itemCode,
      item.itemName,
      item.description,
      String(item.quantity),
      String(item.unitPrice),
      amounts.gst.toFixed(2),
      totals.lineTotals[item.id].toFixed(2),
      index === 0 ? totals.subtotal.toFixed(2) : '',
      index === 0 ? totals.gst.toFixed(2) : '',
      index === 0 ? totals.total.toFixed(2) : '',
      invoice.status,
      invoice.reconciliationNotes ?? '',
    ]);
  });

  return rows;
}

export function invoiceToCsv(invoice: Invoice, settings: AppSettings): string {
  const rows = buildInvoiceCsvRows(invoice, settings);
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export function generateInvoicePdf(invoice: Invoice, settings: AppSettings): jsPDF {
  const doc = new jsPDF();
  const totals = calculateInvoiceTotals(invoice.lineItems, settings);
  const generatedAt = formatDateTime(new Date().toISOString());

  doc.setFontSize(18);
  doc.text(settings.businessName, 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`ABN: ${settings.abn}`, 14, 27);
  doc.text(settings.businessAddress, 14, 32);
  doc.text(`${settings.businessPhone} | ${settings.businessEmail}`, 14, 37);

  doc.setTextColor(0);
  doc.setFontSize(16);
  doc.text('TAX INVOICE', 140, 20);
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 28);
  doc.text(`Date: ${formatDate(invoice.date)}`, 140, 34);
  doc.text(`Status: ${invoice.status}`, 140, 40);

  doc.setFontSize(12);
  doc.text('Bill To:', 14, 50);
  doc.setFontSize(10);
  doc.text(invoice.clientName, 14, 56);
  let y = 61;
  if (invoice.clientPhone) {
    doc.text(invoice.clientPhone, 14, y);
    y += 5;
  }
  if (invoice.clientEmail) {
    doc.text(invoice.clientEmail, 14, y);
    y += 5;
  }
  if (invoice.clientAddress) {
    const lines = doc.splitTextToSize(invoice.clientAddress, 90);
    doc.text(lines, 14, y);
  }

  const tableBody = invoice.lineItems.map((item) => {
    const lineTotal = totals.lineTotals[item.id];
    return [
      item.itemCode,
      item.description || item.itemName,
      String(item.quantity),
      formatCurrency(item.unitPrice),
      formatCurrency(lineTotal),
    ];
  });

  autoTable(doc, {
    startY: 85,
    head: [['Code', 'Description', 'Qty', 'Unit Price', 'Line Total']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.text(`Subtotal: ${formatCurrency(totals.subtotal)}`, 140, finalY);
  doc.text(`GST: ${formatCurrency(totals.gst)}`, 140, finalY + 6);
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(totals.total)}`, 140, finalY + 14);

  if (invoice.jobNotes) {
    doc.setFontSize(10);
    doc.text('Notes:', 14, finalY + 10);
    doc.text(doc.splitTextToSize(invoice.jobNotes, 110), 14, finalY + 16);
  }

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generated: ${generatedAt}`, 14, 285);

  return doc;
}

export function exportInvoiceFiles(invoice: Invoice, settings: AppSettings): void {
  const base = invoiceExportBasename(invoice.invoiceNumber, invoice.clientName, invoice.date);

  const pdf = generateInvoicePdf(invoice, settings);
  pdf.save(`${base}.pdf`);

  const csv = invoiceToCsv(invoice, settings);
  downloadCsv(csv, `${base}.csv`);

  downloadJson(
    {
      exportedAt: new Date().toISOString(),
      settings: {
        businessName: settings.businessName,
        abn: settings.abn,
      },
      invoice,
    },
    `${base}.json`,
  );
}

export function exportAllInvoicesJson(invoices: Invoice[]): void {
  downloadJson(
    { exportedAt: new Date().toISOString(), invoices },
    `all-invoices-backup-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

export function exportInvoicesSpreadsheet(
  invoices: Invoice[],
  settings: AppSettings,
  format: 'csv' | 'xlsx',
  filename: string,
): void {
  const allRows: string[][] = [
    [
      'Invoice Number',
      'Invoice Date',
      'Client Name',
      'Client Phone',
      'Client Email',
      'Client Address',
      'Item Code',
      'Item Name',
      'Description',
      'Quantity',
      'Unit Price',
      'GST Amount',
      'Line Total',
      'Invoice Subtotal',
      'Invoice GST',
      'Invoice Total',
      'Status',
      'Reconciliation Notes',
      'Job Notes',
      'Internal Notes',
    ],
  ];

  for (const invoice of invoices) {
    const totals = calculateInvoiceTotals(invoice.lineItems, settings);
    invoice.lineItems.forEach((item, index) => {
      const amounts = calculateLineAmounts(item, settings);
      allRows.push([
        invoice.invoiceNumber,
        invoice.date,
        invoice.clientName,
        invoice.clientPhone ?? '',
        invoice.clientEmail ?? '',
        invoice.clientAddress ?? '',
        item.itemCode,
        item.itemName,
        item.description,
        String(item.quantity),
        String(item.unitPrice),
        amounts.gst.toFixed(2),
        totals.lineTotals[item.id].toFixed(2),
        index === 0 ? totals.subtotal.toFixed(2) : '',
        index === 0 ? totals.gst.toFixed(2) : '',
        index === 0 ? totals.total.toFixed(2) : '',
        invoice.status,
        invoice.reconciliationNotes ?? '',
        index === 0 ? (invoice.jobNotes ?? '') : '',
        index === 0 ? (invoice.internalNotes ?? '') : '',
      ]);
    });
  }

  if (format === 'csv') {
    downloadCsv(
      allRows.map((row) => row.map(escapeCsv).join(',')).join('\n'),
      `${filename}.csv`,
    );
  } else {
    const ws = XLSX.utils.aoa_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    downloadWorkbook(wb, `${filename}.xlsx`);
  }
}

export function exportProductsSpreadsheet(
  products: Product[],
  format: 'csv' | 'xlsx',
  filename: string,
): void {
  const headers = [
    'Item Code',
    'Item Name',
    'Description',
    'Category',
    'Unit Price',
    'GST Status',
    'Stock Quantity',
    'Supplier',
    'Notes',
  ];
  const rows = products.map((p) => [
    p.itemCode,
    p.itemName,
    p.description,
    p.category,
    String(p.unitPrice),
    p.gstStatus,
    p.stockQuantity != null ? String(p.stockQuantity) : '',
    p.supplier ?? '',
    p.notes ?? '',
  ]);

  if (format === 'csv') {
    const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
    downloadCsv(csv, `${filename}.csv`);
  } else {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    downloadWorkbook(wb, `${filename}.xlsx`);
  }
}

export function createEmptyInvoice(settings: AppSettings): Partial<Invoice> {
  return {
    date: new Date().toISOString().slice(0, 10),
    clientName: '',
    lineItems: [],
    status: 'Draft',
    jobNotes: settings.defaultInvoiceNotes,
  };
}

export function createLineFromProduct(
  product: Product,
  sortOrder: number,
  quantity = 1,
): InvoiceLineItem {
  return {
    id: crypto.randomUUID(),
    productId: product.id,
    itemCode: product.itemCode,
    itemName: product.itemName,
    description: product.description || product.itemName,
    quantity: quantity > 0 ? quantity : 1,
    unitPrice: product.unitPrice,
    gstStatus: product.gstStatus,
    isManual: false,
    sortOrder,
  };
}

export function createManualLineItem(sortOrder: number): InvoiceLineItem {
  return {
    id: crypto.randomUUID(),
    itemCode: 'MANUAL',
    itemName: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    gstStatus: 'inclusive',
    isManual: true,
    sortOrder,
  };
}
