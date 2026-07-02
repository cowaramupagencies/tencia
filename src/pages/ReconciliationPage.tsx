import { useMemo, useState } from 'react';
import { PageHeader, StatCard, StatusBadge } from '../components/ui';
import { setLastBackupDate } from '../db/database';
import { useInvoices } from '../hooks/useInvoices';
import { useSettings } from '../hooks/useSettings';
import { calculateInvoiceTotals, formatCurrency } from '../lib/calculations';
import { exportAllInvoicesJson, exportInvoicesSpreadsheet } from '../lib/exports';
import type { InvoiceStatus } from '../types';
import { FINALISED_STATUSES } from '../types';

export function ReconciliationPage() {
  const { invoices, saveInvoice } = useInvoices();
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});

  const finalisedInvoices = useMemo(
    () => invoices.filter((i) => FINALISED_STATUSES.includes(i.status)),
    [invoices],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return finalisedInvoices.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false;
      if (dateFrom && inv.date < dateFrom) return false;
      if (dateTo && inv.date > dateTo) return false;
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q)
      );
    });
  }, [finalisedInvoices, query, statusFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    if (!settings) {
      return {
        count: 0,
        totalValue: 0,
        totalGst: 0,
        unreconciled: 0,
        transferred: 0,
        reconciled: 0,
      };
    }

    let totalValue = 0;
    let totalGst = 0;
    let unreconciled = 0;
    let transferred = 0;
    let reconciled = 0;

    for (const inv of filtered) {
      const t = calculateInvoiceTotals(inv.lineItems, settings);
      totalValue += t.total;
      totalGst += t.gst;
      if (['Finalised', 'Exported'].includes(inv.status)) unreconciled++;
      if (inv.status === 'Transferred to Main System') transferred++;
      if (inv.status === 'Reconciled') reconciled++;
    }

    return {
      count: filtered.length,
      totalValue,
      totalGst,
      unreconciled,
      transferred,
      reconciled,
    };
  }, [filtered, settings]);

  const updateStatus = async (id: number, status: InvoiceStatus, notes?: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    await saveInvoice({
      ...inv,
      status,
      reconciliationNotes: notes ?? inv.reconciliationNotes,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleExport = async (scope: 'filtered' | 'unreconciled' | 'all') => {
    if (!settings) return;
    let list = filtered;
    if (scope === 'unreconciled') {
      list = finalisedInvoices.filter((i) => ['Finalised', 'Exported'].includes(i.status));
    } else if (scope === 'all') {
      list = finalisedInvoices;
    }
    exportInvoicesSpreadsheet(
      list,
      settings,
      settings.exportFormatPreference,
      `reconciliation-export-${new Date().toISOString().slice(0, 10)}`,
    );
    await setLastBackupDate();
  };

  return (
    <div>
      <PageHeader
        title="Reconciliation"
        subtitle="Track invoices transferred back into the main invoicing system."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Invoices shown" value={stats.count} />
        <StatCard label="Total value" value={formatCurrency(stats.totalValue)} />
        <StatCard label="Total GST" value={formatCurrency(stats.totalGst)} />
        <StatCard label="Unreconciled" value={stats.unreconciled} />
        <StatCard label="Transferred" value={stats.transferred} />
        <StatCard label="Reconciled" value={stats.reconciled} />
      </div>

      <div className="mt-6 card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="label">Search</span>
          <input
            className="input mt-1"
            placeholder="Client name or invoice number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Status</span>
          <select className="input mt-1" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All finalised statuses</option>
            {FINALISED_STATUSES.map((s) => (
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

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => void handleExport('filtered')}>
          Export shown ({settings?.exportFormatPreference.toUpperCase()})
        </button>
        <button type="button" className="btn-secondary" onClick={() => void handleExport('unreconciled')}>
          Export unreconciled
        </button>
        <button type="button" className="btn-secondary" onClick={() => void handleExport('all')}>
          Export all finalised
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            exportAllInvoicesJson(invoices);
            void setLastBackupDate();
          }}
        >
          Full JSON backup
        </button>
      </div>

      <div className="mt-6 overflow-x-auto card !p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Client</th>
              <th>Total</th>
              <th>Status</th>
              <th>Reconciliation notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const total = settings
                ? calculateInvoiceTotals(inv.lineItems, settings).total
                : 0;
              const noteValue = notesDraft[inv.id!] ?? inv.reconciliationNotes ?? '';
              return (
                <tr key={inv.id}>
                  <td className="font-medium">{inv.invoiceNumber}</td>
                  <td>{inv.date}</td>
                  <td>{inv.clientName}</td>
                  <td>{formatCurrency(total)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>
                    <input
                      className="input min-w-[180px]"
                      value={noteValue}
                      onChange={(e) =>
                        setNotesDraft((prev) => ({ ...prev, [inv.id!]: e.target.value }))
                      }
                      onBlur={() =>
                        void updateStatus(inv.id!, inv.status, noteValue)
                      }
                      placeholder="Add notes…"
                    />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => void updateStatus(inv.id!, 'Transferred to Main System', noteValue)}
                      >
                        Mark transferred
                      </button>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={() => void updateStatus(inv.id!, 'Reconciled', noteValue)}
                      >
                        Mark reconciled
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">No finalised invoices match your filters.</p>
        )}
      </div>
    </div>
  );
}
