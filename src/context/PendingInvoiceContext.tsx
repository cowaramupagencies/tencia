import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  appendPendingLine as appendStoredLine,
  clearPendingLinesStorage,
  readPendingLines,
} from '../lib/pendingInvoiceLines';
import type { InvoiceLineItem } from '../types';

interface PendingInvoiceContextValue {
  pendingCount: number;
  refreshPendingCount: () => void;
  addPendingLine: (line: InvoiceLineItem) => void;
  clearPendingLines: () => void;
}

const PendingInvoiceContext = createContext<PendingInvoiceContextValue | null>(null);

export function PendingInvoiceProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(() => readPendingLines().length);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(readPendingLines().length);
  }, []);

  const addPendingLine = useCallback(
    (line: InvoiceLineItem) => {
      appendStoredLine(line);
      refreshPendingCount();
    },
    [refreshPendingCount],
  );

  const clearPendingLines = useCallback(() => {
    clearPendingLinesStorage();
    refreshPendingCount();
  }, [refreshPendingCount]);

  const value = useMemo(
    () => ({ pendingCount, refreshPendingCount, addPendingLine, clearPendingLines }),
    [pendingCount, refreshPendingCount, addPendingLine, clearPendingLines],
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
