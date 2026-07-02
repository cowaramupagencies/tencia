import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog, EmptyState, PageHeader } from '../components/ui';
import { replaceAllProducts } from '../db/database';
import { useProducts } from '../hooks/useProducts';
import { formatDateTime } from '../lib/calculations';
import { mapRowsToProducts, parseSpreadsheetFile, type ParsedSpreadsheet } from '../lib/productImport';
import { CATALOG_NAME, CATALOG_VERSION, getCatalogInfo, seedBundledProducts } from '../lib/seedProducts';
import type { ColumnMapping, Product } from '../types';
import { PRODUCT_FIELD_LABELS } from '../types';

export function ImportProductsPage() {
  const navigate = useNavigate();
  const { products } = useProducts();
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [catalogInfo, setCatalogInfo] = useState({
    name: CATALOG_NAME,
    version: CATALOG_VERSION,
    loadedAt: '',
    productCount: 0,
  });

  const previewRows = useMemo(() => preview.slice(0, 10), [preview]);

  useEffect(() => {
    void getCatalogInfo().then((info) =>
      setCatalogInfo({
        name: info.name,
        version: info.version ?? CATALOG_VERSION,
        loadedAt: info.loadedAt ?? '',
        productCount: info.productCount,
      }),
    );
  }, [products.length, importCount]);

  const handleFile = async (file: File) => {
    setError('');
    setImportCount(null);
    try {
      const result = await parseSpreadsheetFile(file);
      setParsed(result);
      setMapping(result.mapping);
      setPreview(mapRowsToProducts(result.rows, result.mapping));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the file.');
      setParsed(null);
      setPreview([]);
    }
  };

  const updateMapping = (field: keyof ColumnMapping, column: string) => {
    const next = { ...mapping, [field]: column || undefined };
    setMapping(next);
    if (parsed) {
      setPreview(mapRowsToProducts(parsed.rows, next));
    }
  };

  const handleImport = async () => {
    if (!parsed || preview.length === 0) return;
    setImporting(true);
    try {
      const count = await replaceAllProducts(preview);
      setImportCount(count);
      setConfirmOpen(false);
      setParsed(null);
      setPreview([]);
    } catch {
      setError('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleReloadCatalog = async () => {
    setImporting(true);
    try {
      const count = await seedBundledProducts(true);
      setImportCount(count);
      setReloadOpen(false);
      setError('');
    } catch {
      setError('Could not reload the price list. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Import Products"
        subtitle="Your Cowaramup Agencies price list is built into the app. Use this page only when updating from a new file."
      />

      <div className="card mb-6 border-brand-100 bg-brand-50">
        <h2 className="font-semibold text-brand-700">Built-in price list loaded</h2>
        <p className="mt-2 text-sm text-slate-600">
          <strong>{catalogInfo.name}</strong> (version {catalogInfo.version}) is included with this app.
        </p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Products in app</dt>
            <dd className="font-semibold">{catalogInfo.productCount || products.length}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Price list date</dt>
            <dd className="font-semibold">30/06/2026</dd>
          </div>
          <div>
            <dt className="text-slate-500">Last loaded</dt>
            <dd className="font-semibold">
              {catalogInfo.loadedAt ? formatDateTime(catalogInfo.loadedAt) : 'On first start'}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => navigate('/search')}>
            Search products
          </button>
          <button type="button" className="btn-secondary" onClick={() => setReloadOpen(true)}>
            Reload built-in price list
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          No import needed for normal use — products load automatically when the app starts.
        </p>
      </div>

      {importCount != null && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Successfully loaded {importCount} products.{' '}
          <button type="button" className="link" onClick={() => navigate('/search')}>
            Search products
          </button>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold">Optional: import a newer spreadsheet</h2>
        <p className="mt-1 text-sm text-slate-500">
          Only use this if you receive an updated Excel or CSV price list. This replaces all products.
        </p>
        <label className="mt-4 block">
          <span className="label">Choose spreadsheet (.xlsx or .csv)</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="input mt-1"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {parsed && (
        <>
          <div className="mt-6 card">
            <h2 className="text-lg font-semibold">Column mapping</h2>
            <p className="mt-1 text-sm text-slate-500">
              Match spreadsheet columns to product fields. Required: Item Code and Item Name.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(PRODUCT_FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
                <label key={field} className="block">
                  <span className="label">{PRODUCT_FIELD_LABELS[field]}</span>
                  <select
                    className="input mt-1"
                    value={mapping[field] ?? ''}
                    onChange={(e) => updateMapping(field, e.target.value)}
                  >
                    <option value="">— Not mapped —</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6 card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Import preview</h2>
              <span className="text-sm text-slate-500">{preview.length} items ready</span>
            </div>

            {preview.length === 0 ? (
              <EmptyState message="No valid products found. Check your column mapping." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>GST</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((p, i) => (
                      <tr key={`${p.itemCode}-${i}`}>
                        <td>{p.itemCode}</td>
                        <td>{p.itemName}</td>
                        <td>{p.category}</td>
                        <td>{p.unitPrice.toFixed(2)}</td>
                        <td>{p.gstStatus}</td>
                        <td>{p.stockQuantity ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <p className="mt-2 text-xs text-slate-400">
                    Showing first 10 of {preview.length} items.
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="btn-primary"
                disabled={preview.length === 0 || importing}
                onClick={() => setConfirmOpen(true)}
              >
                Confirm import ({preview.length} items)
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Replace product database?"
        message={`This will replace all ${preview.length} existing products with the imported list. This cannot be undone unless you have a backup.`}
        confirmLabel="Import products"
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleImport()}
      />

      <ConfirmDialog
        open={reloadOpen}
        title="Reload built-in price list?"
        message={`This will replace all current products with the ${CATALOG_NAME} (${CATALOG_VERSION}) built into the app.`}
        confirmLabel="Reload price list"
        onCancel={() => setReloadOpen(false)}
        onConfirm={() => void handleReloadCatalog()}
      />
    </div>
  );
}
