import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, PageHeader } from '../components/ui';
import { usePendingInvoice } from '../context/PendingInvoiceContext';
import { useProducts } from '../hooks/useProducts';
import { formatCurrency } from '../lib/calculations';
import { createLineFromProduct } from '../lib/exports';
import type { Product } from '../types';

export function ProductSearchPage() {
  const navigate = useNavigate();
  const { products, categories, suppliers, searchProducts } = useProducts();
  const { addPendingLine } = usePendingInvoice();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [addedId, setAddedId] = useState<number | null>(null);

  const results = useMemo(
    () => searchProducts(query, category || undefined, supplier || undefined),
    [query, category, supplier, searchProducts],
  );

  const handleAdd = (product: Product) => {
    addPendingLine(createLineFromProduct(product, 0));
    setAddedId(product.id ?? null);
    setTimeout(() => setAddedId(null), 1500);
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
            Go to New Invoice
          </Link>
        }
      />

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
          Continue to invoice
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
                    onClick={() => handleAdd(p)}
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
    </div>
  );
}
