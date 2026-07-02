export type GstStatus = 'inclusive' | 'exclusive' | 'exempt';

export type InvoiceStatus =
  | 'Draft'
  | 'Finalised'
  | 'Exported'
  | 'Transferred to Main System'
  | 'Reconciled';

export interface Product {
  id?: number;
  itemCode: string;
  itemName: string;
  description: string;
  category: string;
  unitPrice: number;
  gstStatus: GstStatus;
  stockQuantity?: number;
  supplier?: string;
  notes?: string;
  importedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  productId?: number;
  itemCode: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  gstStatus: GstStatus;
  isManual: boolean;
  sortOrder: number;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  date: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  jobNotes?: string;
  internalNotes?: string;
  lineItems: InvoiceLineItem[];
  status: InvoiceStatus;
  reconciliationNotes?: string;
  auditNotes?: string[];
  createdAt: string;
  updatedAt: string;
  finalisedAt?: string;
}

export interface AppSettings {
  id: number;
  businessName: string;
  abn: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  defaultGstRate: number;
  pricesGstInclusive: boolean;
  defaultInvoiceNotes: string;
  backupFolderReminder: string;
  nextInvoiceNumber: number;
  exportFormatPreference: 'csv' | 'xlsx';
  lastBackupDate?: string;
}

export interface InvoiceTotals {
  lineTotals: Record<string, number>;
  subtotal: number;
  gst: number;
  total: number;
}

export interface ColumnMapping {
  itemCode?: string;
  itemName?: string;
  description?: string;
  category?: string;
  unitPrice?: string;
  gstStatus?: string;
  stockQuantity?: string;
  supplier?: string;
  notes?: string;
}

export const PRODUCT_FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  itemCode: 'Item Code',
  itemName: 'Item Name',
  description: 'Description',
  category: 'Category',
  unitPrice: 'Unit Price',
  gstStatus: 'GST Status',
  stockQuantity: 'Stock Quantity',
  supplier: 'Supplier',
  notes: 'Notes',
};

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  businessName: 'Cowaramup Agencies',
  abn: '',
  businessPhone: '',
  businessEmail: '',
  businessAddress: 'Cowaramup, Western Australia',
  defaultGstRate: 0.1,
  pricesGstInclusive: false,
  defaultInvoiceNotes: 'Thank you for your business.',
  backupFolderReminder:
    'Save downloaded invoice backups to the shared Cowaramup Agencies temporary invoice backup folder.',
  nextInvoiceNumber: 1,
  exportFormatPreference: 'xlsx',
};

export const INVOICE_STATUSES: InvoiceStatus[] = [
  'Draft',
  'Finalised',
  'Exported',
  'Transferred to Main System',
  'Reconciled',
];

export const FINALISED_STATUSES: InvoiceStatus[] = [
  'Finalised',
  'Exported',
  'Transferred to Main System',
  'Reconciled',
];
