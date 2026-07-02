import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureDefaultSettings } from '../db/database';
import { DEFAULT_SETTINGS, type AppSettings } from '../types';

export function useSettings() {
  const settings = useLiveQuery(() => ensureDefaultSettings(), []) ?? DEFAULT_SETTINGS;

  const updateSettings = async (updates: Partial<AppSettings>) => {
    await db.settings.update(1, updates);
  };

  return { settings, updateSettings };
}
