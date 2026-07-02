import { useRef, useState } from 'react';
import { ConfirmDialog, PageHeader } from '../components/ui';
import { db, replaceAllProducts, setLastBackupDate } from '../db/database';
import { useInvoices } from '../hooks/useInvoices';
import { useProducts } from '../hooks/useProducts';
import { useSettings } from '../hooks/useSettings';
import { formatDateTime } from '../lib/calculations';
import {
  exportAllInvoicesJson,
  exportInvoicesSpreadsheet,
  exportProductsSpreadsheet,
} from '../lib/exports';
import {
  getBackupDirectoryName,
  hasFileSystemAccess,
  pickBackupDirectory,
} from '../lib/fileSystem';
import type { Invoice, Product } from '../types';

export function BackupCentrePage() {
  const { invoices } = useInvoices();
  const { products } = useProducts();
  const { settings } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    invoices: Invoice[];
    products?: Product[];
  } | null>(null);
  const [message, setMessage] = useState('');
  const [backupDir, setBackupDir] = useState(getBackupDirectoryName());

  const handleExportInvoicesJson = async () => {
    exportAllInvoicesJson(invoices);
    await setLastBackupDate();
    setMessage('Invoice JSON backup downloaded.');
  };

  const handleExportInvoicesSheet = async () => {
    if (!settings) return;
    exportInvoicesSpreadsheet(
      invoices,
      settings,
      settings.exportFormatPreference,
      `all-invoices-${new Date().toISOString().slice(0, 10)}`,
    );
    await setLastBackupDate();
    setMessage('Invoice spreadsheet downloaded.');
  };

  const handleExportProducts = async () => {
    if (!settings) return;
    exportProductsSpreadsheet(
      products,
      settings.exportFormatPreference,
      `all-products-${new Date().toISOString().slice(0, 10)}`,
    );
    await setLastBackupDate();
    setMessage('Product spreadsheet downloaded.');
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as { invoices?: Invoice[]; products?: Product[] };
      if (!data.invoices && !data.products) {
        setMessage('Backup file does not contain invoices or products.');
        return;
      }
      setPendingRestore({
        invoices: data.invoices ?? [],
        products: data.products,
      });
      setRestoreOpen(true);
    } catch {
      setMessage('Could not read backup file. Check that it is valid JSON.');
    }
  };

  const performRestore = async () => {
    if (!pendingRestore) return;
    if (pendingRestore.products?.length) {
      await replaceAllProducts(pendingRestore.products);
    }
    if (pendingRestore.invoices.length) {
      await db.invoices.clear();
      await db.invoices.bulkAdd(
        pendingRestore.invoices.map((inv) => ({
          ...inv,
          id: undefined,
        })),
      );
    }
    await setLastBackupDate();
    setMessage(
      `Restored ${pendingRestore.invoices.length} invoices${pendingRestore.products ? ` and ${pendingRestore.products.length} products` : ''}.`,
    );
    setRestoreOpen(false);
    setPendingRestore(null);
  };

  const handlePickFolder = async () => {
    const handle = await pickBackupDirectory();
    if (handle) {
      setBackupDir(handle.name);
      setMessage(`Backup folder selected: ${handle.name}`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Backup Centre"
        subtitle="Export and restore your invoice and product data to prevent loss."
      />

      {message && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h2 className="font-semibold">Export data</h2>
          <p className="text-sm text-slate-500">
            Last backup:{' '}
            {settings?.lastBackupDate
              ? formatDateTime(settings.lastBackupDate)
              : 'No backup recorded yet'}
          </p>
          <div className="flex flex-col gap-2">
            <button type="button" className="btn-primary" onClick={() => void handleExportInvoicesJson()}>
              Export all invoices (JSON)
            </button>
            <button type="button" className="btn-secondary" onClick={() => void handleExportInvoicesSheet()}>
              Export all invoices (CSV/Excel)
            </button>
            <button type="button" className="btn-secondary" onClick={() => void handleExportProducts()}>
              Export all products (CSV/Excel)
            </button>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Import / restore</h2>
          <p className="text-sm text-slate-500">
            Import a JSON backup file to restore invoices. This replaces existing invoice data.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportJson(file);
            }}
          />
          <p className="text-xs text-amber-700">
            Restoring from backup will replace data in this browser. Always export a current backup first.
          </p>
        </div>

        <div className="card space-y-4 lg:col-span-2">
          <h2 className="font-semibold">Backup folder (optional)</h2>
          <p className="text-sm text-slate-500">{settings?.backupFolderReminder}</p>
          {hasFileSystemAccess() ? (
            <div className="flex items-center gap-3">
              <button type="button" className="btn-secondary" onClick={() => void handlePickFolder()}>
                Choose backup folder
              </button>
              {backupDir && (
                <span className="text-sm text-emerald-700">Selected: {backupDir}</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              File System Access API is not available in this browser. Downloads will use your default Downloads folder.
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={restoreOpen}
        title="Restore from backup?"
        message={`This will replace ${pendingRestore?.invoices.length ?? 0} invoices${pendingRestore?.products ? ` and ${pendingRestore.products.length} products` : ''} in this browser. Existing data will be overwritten. Are you sure?`}
        confirmLabel="Restore backup"
        danger
        onCancel={() => {
          setRestoreOpen(false);
          setPendingRestore(null);
        }}
        onConfirm={() => void performRestore()}
      />
    </div>
  );
}
