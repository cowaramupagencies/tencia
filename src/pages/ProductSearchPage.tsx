import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, Modal, PageHeader } from '../components/ui';
import { usePendingInvoice } from '../context/PendingInvoiceContext';
import { useProducts } from '../hooks/useProducts';
import { formatCurrency } from '../lib/calculations';
import { createLineFromProduct } from '../lib/exports';
import type { Product } from '../types';

export function ProductSearchPage() {
  const navigate = useNavigate();
  const { products, categories, suppliers, searchProducts } = useProducts();
  const { addPendingLine, pendingCount } = usePendingInvoice();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [addedId, setAddedId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [quantityError, setQuantityError] = useState('');

  const results = useMemo(
    () => searchProducts(query, category || undefined, supplier || undefined),
    [query, category, supplier, searchProducts],
  );

  const openQuantityModal = (product: Product) => {
    setSelectedProduct(product);
    setQuantity('1');
    setQuantityError('');
  };

  const closeQuantityModal = () => {
    setSelectedProduct(null);
    setQuantity('1');
    setQuantityError('');
  };

  const confirmAdd = () => {
    if (!selectedProduct) return;

    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setQuantityError('Enter a valid quantity greater than zero.');
      return;
    }

    addPendingLine(createLineFromProduct(selectedProduct, 0, qty));
    setAddedId(selectedProduct.id ?? null);
    setTimeout(() => setAddedId(null), 1500);
    closeQuantityModal();
  };

  if (products.length === 0) {
    return (
      <div>
        <PageHeader title="Product Search" subtitle="Find products to add to an invoice." />
        <EmptyState
          message="No products imported yet."
          action={
            <Link to="/import" className="btn-primary">
              Import products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Product Search"
        subtitle={`Search ${products.length} products by code, name, description, category, or supplier.`}
        action={
          <Link to="/invoice/new" className="btn-primary">
            Go to New Invoice{pendingCount > 0 ? ` (${pendingCount} added)` : ''}
          </Link>
        }
      />

      {pendingCount > 0 && (
        <div className="mb-4 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {pendingCount} item{pendingCount === 1 ? '' : 's'} ready for the invoice.{' '}
          <button type="button" className="link" onClick={() => navigate('/invoice/new')}>
            Open invoice
          </button>
        </div>
      )}

      <div className="card space-y-4">
        <label className="block">
          <span className="label">Search products</span>
          <input
            type="search"
            className="input mt-1 text-lg"
            placeholder="Type item code, name, description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          {categories.length > 0 && (
            <label className="block">
              <span className="label">Category</span>
              <select className="input mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}
          {suppliers.length > 0 && (
            <label className="block">
              <span className="label">Supplier</span>
              <select className="input mt-1" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{results.length} results</p>
        <button type="button" className="btn-secondary" onClick={() => navigate('/invoice/new')}>
          Continue to invoice{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto card !p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Item Name</th>
              <th>Description</th>
              <th>Category</th>
              <th>Unit Price</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.itemCode}</td>
                <td>{p.itemName}</td>
                <td className="max-w-xs truncate">{p.description}</td>
                <td>{p.category}</td>
                <td>{formatCurrency(p.unitPrice)}</td>
                <td>{p.stockQuantity ?? '—'}</td>
                <td>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => openQuantityModal(p)}
                  >
                    {addedId === p.id ? 'Added ✓' : 'Add to Invoice'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">No products match your search.</div>
        )}
      </div>

      <Modal open={selectedProduct != null} title="Add to invoice" onClose={closeQuantityModal}>
        {selectedProduct && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">{selectedProduct.itemName}</p>
              <p className="text-slate-600">Code: {selectedProduct.itemCode}</p>
              <p className="text-slate-600">Unit price: {formatCurrency(selectedProduct.unitPrice)}</p>
            </div>

            <label className="block">
              <span className="label">Quantity</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input mt-1 text-lg"
                value={quantity}
                autoFocus
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setQuantityError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmAdd();
                }}
              />
            </label>

            {quantityError && <p className="text-sm text-red-600">{quantityError}</p>}

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={closeQuantityModal}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={confirmAdd}>
                Add to invoice
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
