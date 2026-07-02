import * as XLSX from 'xlsx';
import type { ColumnMapping, Product } from '../types';
import {
  autoDetectColumnMapping,
  parseGstStatus,
  parsePrice,
  parseQuantity,
} from './calculations';

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, unknown>[];
  mapping: ColumnMapping;
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The file does not contain any sheets.');
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (json.length === 0) throw new Error('The spreadsheet appears to be empty.');

  const headers = Object.keys(json[0] ?? {});
  const mapping = autoDetectColumnMapping(headers);

  return { headers, rows: json, mapping };
}

export function mapRowsToProducts(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
): Product[] {
  const now = new Date().toISOString();

  return rows
    .map((row) => {
      const itemCode = String(row[mapping.itemCode ?? ''] ?? '').trim();
      const itemName = String(row[mapping.itemName ?? ''] ?? '').trim();
      if (!itemCode && !itemName) return null;

      const stock = mapping.stockQuantity ? parseQuantity(row[mapping.stockQuantity]) : undefined;
      const supplier = mapping.supplier
        ? String(row[mapping.supplier] ?? '').trim() || undefined
        : undefined;
      const notes = mapping.notes
        ? String(row[mapping.notes] ?? '').trim() || undefined
        : undefined;

      const product: Product = {
        itemCode: itemCode || itemName.slice(0, 20),
        itemName: itemName || itemCode,
        description: String(row[mapping.description ?? ''] ?? '').trim(),
        category: String(row[mapping.category ?? ''] ?? '').trim() || 'General',
        unitPrice: mapping.unitPrice ? parsePrice(row[mapping.unitPrice]) : 0,
        gstStatus: mapping.gstStatus
          ? parseGstStatus(row[mapping.gstStatus])
          : 'inclusive',
        stockQuantity: stock,
        supplier,
        notes,
        importedAt: now,
      };
      return product;
    })
    .filter((p): p is Product => p !== null);
}

export function productsToSheet(products: Product[]): XLSX.WorkSheet {
  const data = products.map((p) => ({
    'Item Code': p.itemCode,
    'Item Name': p.itemName,
    Description: p.description,
    Category: p.category,
    'Unit Price': p.unitPrice,
    'GST Status': p.gstStatus,
    'Stock Quantity': p.stockQuantity ?? '',
    Supplier: p.supplier ?? '',
    Notes: p.notes ?? '',
    'Imported At': p.importedAt,
  }));
  return XLSX.utils.json_to_sheet(data);
}
