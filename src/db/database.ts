import Dexie, { type Table } from 'dexie';
import type { AppSettings, Invoice, Product } from '../types';
import { DEFAULT_SETTINGS } from '../types';

export interface MetaEntry {
  key: string;
  value: string;
}

class InvoiceAppDatabase extends Dexie {
  products!: Table<Product, number>;
  invoices!: Table<Invoice, number>;
  settings!: Table<AppSettings, number>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super('TemporaryInvoicingDB');
    this.version(1).stores({
      products: '++id, itemCode, itemName, category, supplier, importedAt',
      invoices:
        '++id, invoiceNumber, status, date, clientName, createdAt, updatedAt, finalisedAt',
      settings: 'id',
      meta: 'key',
    });
  }
}

export const db = new InvoiceAppDatabase();

export async function ensureDefaultSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(1);
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function getNextInvoiceNumber(): Promise<string> {
  const settings = await ensureDefaultSettings();
  const num = settings.nextInvoiceNumber;
  await db.settings.update(1, { nextInvoiceNumber: num + 1 });
  return `INV-${String(num).padStart(5, '0')}`;
}

export async function peekNextInvoiceNumber(): Promise<string> {
  const settings = await ensureDefaultSettings();
  return `INV-${String(settings.nextInvoiceNumber).padStart(5, '0')}`;
}

export async function setLastBackupDate(): Promise<void> {
  const now = new Date().toISOString();
  await db.settings.update(1, { lastBackupDate: now });
  await db.meta.put({ key: 'lastBackupDate', value: now });
}

export async function replaceAllProducts(products: Product[]): Promise<number> {
  await db.products.clear();
  await db.products.bulkAdd(products);
  return products.length;
}

export async function getProductCount(): Promise<number> {
  return db.products.count();
}

export async function getDashboardStats() {
  const { calculateInvoiceTotals } = await import('../lib/calculations');
  const [productCount, invoices, settings] = await Promise.all([
    db.products.count(),
    db.invoices.toArray(),
    ensureDefaultSettings(),
  ]);

  const drafts = invoices.filter((i) => i.status === 'Draft');
  const finalised = invoices.filter((i) =>
    ['Finalised', 'Exported', 'Transferred to Main System', 'Reconciled'].includes(i.status),
  );
  const unreconciled = invoices.filter((i) =>
    ['Finalised', 'Exported', 'Transferred to Main System'].includes(i.status),
  );

  let totalValue = 0;
  for (const inv of finalised) {
    totalValue += calculateInvoiceTotals(inv.lineItems, settings).total;
  }

  return {
    productCount,
    draftCount: drafts.length,
    finalisedCount: finalised.length,
    unreconciledCount: unreconciled.length,
    totalValue,
  };
}
