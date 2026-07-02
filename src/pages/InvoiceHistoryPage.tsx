import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog, EmptyState, PageHeader, StatusBadge } from '../components/ui';
import { useInvoices } from '../hooks/useInvoices';
import { useSettings } from '../hooks/useSettings';
import { calculateInvoiceTotals, formatCurrency, formatDateTime } from '../lib/calculations';
import { exportInvoiceFiles } from '../lib/exports';
import { INVOICE_STATUSES } from '../types';

export function InvoiceHistoryPage() {
  const navigate = useNavigate();
  const { invoices, deleteInvoice, saveInvoice } = useInvoices();
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return invoices.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false;
      if (dateFrom && inv.date < dateFrom) return false;
      if (dateTo && inv.date > dateTo) return false;
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        inv.status.toLowerCase().includes(q) ||
        inv.date.includes(q)
      );
    });
  }, [invoices, query, statusFilter, dateFrom, dateTo]);

  const getTotal = (inv: (typeof invoices)[0]) => {
    if (!settings) return 0;
    return calculateInvoiceTotals(inv.lineItems, settings).total;
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await deleteInvoice(deleteId);
    setDeleteId(null);
  };

  const handleDuplicate = (id: number) => {
    navigate(`/invoice/new?duplicate=${id}`);
  };

  const handleExport = (inv: (typeof invoices)[0]) => {
    if (!settings) return;
    exportInvoiceFiles(inv, settings);
    if (inv.status === 'Finalised') {
      void saveInvoice({ ...inv, status: 'Exported', updatedAt: new Date().toISOString() });
    }
  };

  return (
    <div>
      <PageHeader
        title="Invoice History"
        subtitle="Search, open, duplicate, or export saved invoices."
        action={
          <Link to="/invoice/new" className="btn-primary">
            New Invoice
          </Link>
        }
      />

      <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="label">Search</span>
          <input
            className="input mt-1"
            placeholder="Invoice number, client, date, status…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Status</span>
          <select className="input mt-1" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">From</span>
            <input type="date" className="input mt-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">To</span>
            <input type="date" className="input mt-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No invoices found." action={<Link to="/invoice/new" className="btn-primary">Create invoice</Link>} />
      ) : (
        <div className="mt-6 overflow-x-auto card !p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Client</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last edited</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-medium">{inv.invoiceNumber}</td>
                  <td>{inv.date}</td>
                  <td>{inv.clientName}</td>
                  <td>{formatCurrency(getTotal(inv))}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td className="text-xs text-slate-500">{formatDateTime(inv.createdAt)}</td>
                  <td className="text-xs text-slate-500">{formatDateTime(inv.updatedAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => navigate(`/invoice/${inv.id}`)}>
                        Open
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => handleDuplicate(inv.id!)}>
                        Duplicate
                      </button>
                      {inv.status !== 'Draft' && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => handleExport(inv)}>
                          Export
                        </button>
                      )}
                      <button type="button" className="btn-danger btn-sm" onClick={() => setDeleteId(inv.id!)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteId != null}
        title="Delete invoice?"
        message="This will permanently delete the invoice from this browser. Make sure you have backup files first."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
