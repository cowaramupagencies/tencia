import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../db/database';
import type { Invoice } from '../types';

export function useInvoices() {
  const invoices = useLiveQuery(() => db.invoices.orderBy('updatedAt').reverse().toArray(), []) ?? [];

  const saveInvoice = useCallback(async (invoice: Invoice): Promise<number> => {
    const now = new Date().toISOString();
    const payload: Invoice = {
      ...invoice,
      updatedAt: now,
      createdAt: invoice.createdAt || now,
    };
    if (invoice.id) {
      await db.invoices.put(payload);
      return invoice.id;
    }
    return db.invoices.add(payload);
  }, []);

  const deleteInvoice = useCallback(async (id: number) => {
    await db.invoices.delete(id);
  }, []);

  const getInvoice = useCallback(async (id: number) => db.invoices.get(id), []);

  return { invoices, saveInvoice, deleteInvoice, getInvoice };
}

interface AutoSaveOptions {
  delayMs?: number;
  enabled?: boolean;
  saveKey?: string | number | null;
}

export function useAutoSave<T>(
  data: T | null,
  onSave: (data: T) => Promise<void>,
  options: AutoSaveOptions = {},
) {
  const { delayMs = 800, enabled = true, saveKey = null } = options;
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const dataRef = useRef(data);
  const lastSavedRef = useRef<string | null>(null);
  const initialisedRef = useRef(false);

  onSaveRef.current = onSave;
  dataRef.current = data;

  // Reset when switching to a different invoice
  useEffect(() => {
    initialisedRef.current = false;
    lastSavedRef.current = null;
    setSaved(true);
    setSaving(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [saveKey]);

  useEffect(() => {
    if (!enabled || !data) return;

    const snapshot = JSON.stringify(data);

    if (!initialisedRef.current) {
      initialisedRef.current = true;
      lastSavedRef.current = snapshot;
      return;
    }

    if (snapshot === lastSavedRef.current) return;

    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void (async () => {
        const current = dataRef.current;
        if (!current) return;
        setSaving(true);
        try {
          await onSaveRef.current(current);
          lastSavedRef.current = JSON.stringify(current);
          setSaved(true);
        } finally {
          setSaving(false);
        }
      })();
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, delayMs, enabled]);

  return { saved, saving };
}
