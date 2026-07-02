import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { InvoiceLineItem } from '../types';

interface PendingInvoiceContextValue {
  pendingLines: InvoiceLineItem[];
  addPendingLine: (line: InvoiceLineItem) => void;
  clearPendingLines: () => void;
}

const PendingInvoiceContext = createContext<PendingInvoiceContextValue | null>(null);

export function PendingInvoiceProvider({ children }: { children: ReactNode }) {
  const [pendingLines, setPendingLines] = useState<InvoiceLineItem[]>([]);

  const addPendingLine = useCallback((line: InvoiceLineItem) => {
    setPendingLines((prev) => [...prev, line]);
  }, []);

  const clearPendingLines = useCallback(() => {
    setPendingLines([]);
  }, []);

  const value = useMemo(
    () => ({ pendingLines, addPendingLine, clearPendingLines }),
    [pendingLines, addPendingLine, clearPendingLines],
  );

  return (
    <PendingInvoiceContext.Provider value={value}>
      {children}
    </PendingInvoiceContext.Provider>
  );
}

export function usePendingInvoice() {
  const ctx = useContext(PendingInvoiceContext);
  if (!ctx) throw new Error('usePendingInvoice must be used within PendingInvoiceProvider');
  return ctx;
}
