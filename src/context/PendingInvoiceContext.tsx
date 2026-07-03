import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { InvoiceLineItem } from '../types';

const STORAGE_KEY = 'pending-invoice-lines';

interface PendingInvoiceContextValue {
  pendingLines: InvoiceLineItem[];
  pendingCount: number;
  addPendingLine: (line: InvoiceLineItem) => void;
  clearPendingLines: () => void;
}

const PendingInvoiceContext = createContext<PendingInvoiceContextValue | null>(null);

function loadStoredLines(): InvoiceLineItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InvoiceLineItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredLines(lines: InvoiceLineItem[]) {
  try {
    if (lines.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    }
  } catch {
    // ignore storage errors
  }
}

export function PendingInvoiceProvider({ children }: { children: ReactNode }) {
  const [pendingLines, setPendingLines] = useState<InvoiceLineItem[]>(() => loadStoredLines());

  useEffect(() => {
    saveStoredLines(pendingLines);
  }, [pendingLines]);

  const addPendingLine = useCallback((line: InvoiceLineItem) => {
    setPendingLines((prev) => [...prev, line]);
  }, []);

  const clearPendingLines = useCallback(() => {
    setPendingLines([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      pendingLines,
      pendingCount: pendingLines.length,
      addPendingLine,
      clearPendingLines,
    }),
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
