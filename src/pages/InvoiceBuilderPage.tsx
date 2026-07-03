import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CollapsibleSection, ConfirmDialog, PageHeader, SavedIndicator } from '../components/ui';
import { usePendingInvoice } from '../context/PendingInvoiceContext';
import { db, ensureDefaultSettings, peekNextInvoiceNumber } from '../db/database';
import { useAutoSave, useInvoices } from '../hooks/useInvoices';
import { useSettings } from '../hooks/useSettings';
import { calculateInvoiceTotals, formatCurrency, todayIsoDate } from '../lib/calculations';
import { createManualLineItem, exportInvoiceFiles } from '../lib/exports';
import {
  clearPendingLinesStorage,
  mergeLinesIntoInvoice,
  readPendingLines,
  setActiveInvoicePath,
} from '../lib/pendingInvoiceLines';
import type { Invoice, InvoiceLineItem } from '../types';

function sortLines(lines: InvoiceLineItem[]): InvoiceLineItem[] {
  return [...lines].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function InvoiceBuilderPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { getInvoice, saveInvoice } = useInvoices();
  const { clearPendingLines, refreshPendingCount, pendingCount } = usePendingInvoice();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const invoiceIdRef = useRef<number | undefined>(undefined);
  const [errors, setErrors] = useState<string[]>([]);
  const [finaliseOpen, setFinaliseOpen] = useState(false);
  const [finalised, setFinalised] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);

  const isDraft = invoice?.status === 'Draft';
  const isLocked = invoice != null && !isDraft;

  const totals = useMemo(() => {
    if (!invoice || !settings) return { lineTotals: {}, subtotal: 0, gst: 0, total: 0 };
    return calculateInvoiceTotals(invoice.lineItems, settings);
  }, [invoice, settings]);

  const persist = useCallback(
    async (data: Invoice) => {
      if (!data || data.status !== 'Draft') return;
      const toSave = invoiceIdRef.current ? { ...data, id: invoiceIdRef.current } : data;
      const wasNew = !invoiceIdRef.current && !id;
      const savedId = await saveInvoice(toSave);
      invoiceIdRef.current = savedId;
      if (wasNew) {
        const path = `/invoice/${savedId}`;
        setActiveInvoicePath(path);
        navigate(path, { replace: true });
      }
    },
    [saveInvoice, navigate, id],
  );

  const saveKey = id ?? duplicateId ?? 'new';
  const { saved, saving } = useAutoSave(invoice, persist, {
    delayMs: 600,
    enabled: invoice?.status === 'Draft',
    saveKey,
  });

  useEffect(() => {
    setActiveInvoicePath(location.pathname);
  }, [location.pathname]);

  const commitPendingLines = useCallback(() => {
    clearPendingLinesStorage();
    clearPendingLines();
    refreshPendingCount();
  }, [clearPendingLines, refreshPendingCount]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      invoiceIdRef.current = undefined;

      const loadId = id ? Number(id) : duplicateId ? Number(duplicateId) : null;
      const appSettings = await ensureDefaultSettings();

      if (cancelled) return;

      if (loadId) {
        const existing = await getInvoice(loadId);
        if (cancelled) return;

        if (existing) {
          let nextInvoice: Invoice;
          if (duplicateId) {
            const num = await peekNextInvoiceNumber();
            invoiceIdRef.current = undefined;
            nextInvoice = {
              ...existing,
              id: undefined,
              invoiceNumber: num,
              status: 'Draft',
              finalisedAt: undefined,
              reconciliationNotes: undefined,
              auditNotes: undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          } else {
            invoiceIdRef.current = existing.id;
            nextInvoice = existing;
          }
          const pending = readPendingLines();
          if (cancelled) return;
          if (pending.length > 0) commitPendingLines();
          setInvoice(mergeLinesIntoInvoice(nextInvoice, pending));
        } else {
          setInvoice(null);
        }
      } else {
        const num = await peekNextInvoiceNumber();
        const now = new Date().toISOString();
        invoiceIdRef.current = undefined;
        const nextInvoice: Invoice = {
          invoiceNumber: num,
          date: todayIsoDate(),
          clientName: '',
          lineItems: [],
          status: 'Draft',
          jobNotes: appSettings.defaultInvoiceNotes,
          createdAt: now,
          updatedAt: now,
        };
        const pending = readPendingLines();
        if (cancelled) return;
        if (pending.length > 0) commitPendingLines();
        setInvoice(mergeLinesIntoInvoice(nextInvoice, pending));
      }

      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, duplicateId, getInvoice, commitPendingLines]);

  // Merge items added while this invoice page is already open
  useEffect(() => {
    if (loading || !invoice || pendingCount === 0) return;
    const pending = readPendingLines();
    if (pending.length === 0) return;
    commitPendingLines();
    setInvoice((prev) => (prev ? mergeLinesIntoInvoice(prev, pending) : prev));
  }, [pendingCount, loading, invoice, commitPendingLines]);

  const updateField = <K extends keyof Invoice>(key: K, value: Invoice[K]) => {
    setInvoice((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateLine = (lineId: string, updates: Partial<InvoiceLineItem>) => {
    setInvoice((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lineItems: prev.lineItems.map((l) => (l.id === lineId ? { ...l, ...updates } : l)),
      };
    });
  };

  const removeLine = (lineId: string) => {
    setInvoice((prev) => {
      if (!prev) return prev;
      return { ...prev, lineItems: prev.lineItems.filter((l) => l.id !== lineId) };
    });
  };

  const moveLine = (lineId: string, direction: -1 | 1) => {
    setInvoice((prev) => {
      if (!prev) return prev;
      const lines = sortLines(prev.lineItems);
      const idx = lines.findIndex((l) => l.id === lineId);
      const swapIdx = idx + direction;
      if (idx < 0 || swapIdx < 0 || swapIdx >= lines.length) return prev;
      const reordered = [...lines];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      return {
        ...prev,
        lineItems: reordered.map((l, i) => ({ ...l, sortOrder: i })),
      };
    });
  };

  const addManualLine = () => {
    setInvoice((prev) => {
      if (!prev) return prev;
      const order = prev.lineItems.length;
      return { ...prev, lineItems: [...prev.lineItems, createManualLineItem(order)] };
    });
  };

  const validate = (): string[] => {
    if (!invoice) return ['Invoice not loaded'];
    const msgs: string[] = [];
    if (!invoice.clientName.trim()) msgs.push('Client name is required.');
    if (!invoice.invoiceNumber.trim()) msgs.push('Invoice number is required.');
    if (!invoice.date) msgs.push('Invoice date is required.');
    if (invoice.lineItems.length === 0) msgs.push('Add at least one line item.');
    return msgs;
  };

  const handleFinalise = async () => {
    if (!invoice || !settings) return;
    const validation = validate();
    if (validation.length) {
      setErrors(validation);
      setFinaliseOpen(false);
      return;
    }

    const now = new Date().toISOString();
    const currentSettings = await ensureDefaultSettings();
    const expectedAuto = `INV-${String(currentSettings.nextInvoiceNumber).padStart(5, '0')}`;

    const finalInvoice: Invoice = {
      ...invoice,
      status: 'Finalised',
      finalisedAt: now,
      updatedAt: now,
    };

    const savedId = await saveInvoice(finalInvoice);
    finalInvoice.id = savedId;

    if (invoice.invoiceNumber === expectedAuto) {
      await db.settings.update(1, { nextInvoiceNumber: currentSettings.nextInvoiceNumber + 1 });
    }

    exportInvoiceFiles(finalInvoice, settings);

    setInvoice(finalInvoice);
    setFinalised(true);
    setFinaliseOpen(false);
  };

  const enableEditing = () => {
    if (!invoice) return;
    setInvoice({
      ...invoice,
      status: 'Draft',
      auditNotes: [
        ...(invoice.auditNotes ?? []),
        `Reopened for editing on ${new Date().toLocaleString('en-AU')}`,
      ],
    });
    setEditConfirmOpen(false);
  };

  if (loading || !invoice) {
    return <div className="card">Loading invoice…</div>;
  }

  const sortedLines = sortLines(invoice.lineItems);

  return (
    <div>
      <PageHeader
        title={id ? `Invoice ${invoice.invoiceNumber}` : 'New Invoice'}
        subtitle={isLocked ? 'This invoice is finalised. Editing requires confirmation.' : 'Draft invoices save automatically.'}
        action={
          <div className="flex items-center gap-3">
            {isDraft && <SavedIndicator saved={saved} saving={saving} />}
            <Link to="/search" className="btn-secondary">
              Add Products
            </Link>
          </div>
        }
      />

      {finalised && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Invoice finalised. Backup files have been downloaded. Please save them to your backup folder.
          <p className="mt-1 text-xs">{settings.backupFolderReminder}</p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ul className="list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h2 className="font-semibold">Invoice details</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="label">Invoice number</span>
              <input
                className="input mt-1"
                value={invoice.invoiceNumber}
                disabled={isLocked}
                onChange={(e) => updateField('invoiceNumber', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Date</span>
              <input
                type="date"
                className="input mt-1"
                value={invoice.date}
                disabled={isLocked}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="label">Client name *</span>
              <input
                className="input mt-1"
                value={invoice.clientName}
                disabled={isLocked}
                onChange={(e) => updateField('clientName', e.target.value)}
              />
            </label>
          </div>

          <CollapsibleSection title="More client & invoice details">
            <label className="block">
              <span className="label">Client phone</span>
              <input
                className="input mt-1"
                value={invoice.clientPhone ?? ''}
                disabled={isLocked}
                onChange={(e) => updateField('clientPhone', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Client email</span>
              <input
                type="email"
                className="input mt-1"
                value={invoice.clientEmail ?? ''}
                disabled={isLocked}
                onChange={(e) => updateField('clientEmail', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Client address</span>
              <textarea
                className="input mt-1"
                rows={2}
                value={invoice.clientAddress ?? ''}
                disabled={isLocked}
                onChange={(e) => updateField('clientAddress', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Job / reference notes</span>
              <textarea
                className="input mt-1"
                rows={2}
                value={invoice.jobNotes ?? ''}
                disabled={isLocked}
                onChange={(e) => updateField('jobNotes', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Internal notes</span>
              <textarea
                className="input mt-1"
                rows={2}
                value={invoice.internalNotes ?? ''}
                disabled={isLocked}
                onChange={(e) => updateField('internalNotes', e.target.value)}
              />
            </label>
          </CollapsibleSection>
        </div>

        <div className="card">
          <h2 className="font-semibold">Totals</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal (ex GST)</dt>
              <dd className="font-medium">{formatCurrency(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">GST ({(settings.defaultGstRate * 100).toFixed(0)}%)</dt>
              <dd className="font-medium">{formatCurrency(totals.gst)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-lg">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold text-brand-700">{formatCurrency(totals.total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-400">
            Prices treated as {settings.pricesGstInclusive ? 'GST-inclusive' : 'GST-exclusive'} per Settings.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {isDraft && (
              <>
                <button type="button" className="btn-primary" onClick={() => setFinaliseOpen(true)}>
                  Finalise Invoice
                </button>
                <button type="button" className="btn-secondary" onClick={() => navigate('/history')}>
                  Save & exit
                </button>
              </>
            )}
            {isLocked && (
              <>
                <button type="button" className="btn-secondary" onClick={() => exportInvoiceFiles(invoice, settings)}>
                  Export again
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditConfirmOpen(true)}>
                  Edit invoice
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 card !p-0 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Line items</h2>
          {isDraft && (
            <button type="button" className="btn-secondary btn-sm" onClick={addManualLine}>
              + Manual line
            </button>
          )}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Qty</th>
              <th>
                Unit Price
                <span className="mt-0.5 block text-xs font-normal text-slate-400">(+ GST)</span>
              </th>
              <th>Line Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedLines.map((line) => (
              <tr key={line.id}>
                <td>{line.itemCode}</td>
                <td>
                  <input
                    className="input min-w-[200px]"
                    value={line.description}
                    disabled={isLocked}
                    onChange={(e) => updateLine(line.id, { description: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input w-20"
                    value={line.quantity}
                    disabled={isLocked}
                    onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input w-24"
                    value={line.unitPrice}
                    disabled={isLocked}
                    onChange={(e) => updateLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td>{formatCurrency(totals.lineTotals[line.id] ?? 0)}</td>
                <td>
                  {isDraft && (
                    <div className="flex gap-1">
                      <button type="button" className="btn-icon" onClick={() => moveLine(line.id, -1)} title="Move up">↑</button>
                      <button type="button" className="btn-icon" onClick={() => moveLine(line.id, 1)} title="Move down">↓</button>
                      <button type="button" className="btn-icon text-red-600" onClick={() => removeLine(line.id)} title="Remove">✕</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedLines.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">
            No line items yet.{' '}
            <Link to="/search" className="link">Search products</Link> or add a manual line.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={finaliseOpen}
        title="Finalise this invoice?"
        message={`Once finalised, this invoice will be saved inside the app and backup files will be downloaded. Please place the downloaded files into the temporary invoice backup folder.\n\n${settings.backupFolderReminder}`}
        confirmLabel="Finalise & download"
        onCancel={() => setFinaliseOpen(false)}
        onConfirm={() => void handleFinalise()}
      />

      <ConfirmDialog
        open={editConfirmOpen}
        title="Edit finalised invoice?"
        message="This invoice has already been finalised. Editing will change it back to Draft and record an audit note. Only do this if corrections are required."
        confirmLabel="Enable editing"
        danger
        onCancel={() => setEditConfirmOpen(false)}
        onConfirm={enableEditing}
      />
    </div>
  );
}
