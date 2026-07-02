import { useEffect, useState } from 'react';
import { PageHeader, SavedIndicator } from '../components/ui';
import { useSettings } from '../hooks/useSettings';
import type { AppSettings } from '../types';

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!form) return <div className="card">Loading settings…</div>;

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const handleSave = async () => {
    await updateSettings(form);
    setSaved(true);
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Business details, GST preferences, and backup reminders."
        action={
          <div className="flex items-center gap-3">
            <SavedIndicator saved={saved} saving={false} />
            <button type="button" className="btn-primary" onClick={() => void handleSave()}>
              Save settings
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h2 className="font-semibold">Business details</h2>
          <label className="block">
            <span className="label">Business name</span>
            <input className="input mt-1" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">ABN</span>
            <input className="input mt-1" value={form.abn} onChange={(e) => set('abn', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Phone</span>
            <input className="input mt-1" value={form.businessPhone} onChange={(e) => set('businessPhone', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input className="input mt-1" type="email" value={form.businessEmail} onChange={(e) => set('businessEmail', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Address</span>
            <textarea className="input mt-1" rows={3} value={form.businessAddress} onChange={(e) => set('businessAddress', e.target.value)} />
          </label>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Invoice defaults</h2>
          <label className="block">
            <span className="label">Default GST rate (%)</span>
            <input
              className="input mt-1"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={(form.defaultGstRate * 100).toFixed(1)}
              onChange={(e) => set('defaultGstRate', (parseFloat(e.target.value) || 0) / 100)}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.pricesGstInclusive}
              onChange={(e) => set('pricesGstInclusive', e.target.checked)}
            />
            <span className="text-sm">Imported product prices are GST-inclusive</span>
          </label>
          <label className="block">
            <span className="label">Next invoice number</span>
            <input
              className="input mt-1"
              type="number"
              min="1"
              value={form.nextInvoiceNumber}
              onChange={(e) => set('nextInvoiceNumber', parseInt(e.target.value, 10) || 1)}
            />
            <p className="mt-1 text-xs text-slate-400">
              Next invoice will be INV-{String(form.nextInvoiceNumber).padStart(5, '0')}
            </p>
          </label>
          <label className="block">
            <span className="label">Default invoice notes</span>
            <textarea className="input mt-1" rows={3} value={form.defaultInvoiceNotes} onChange={(e) => set('defaultInvoiceNotes', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Export format preference</span>
            <select className="input mt-1" value={form.exportFormatPreference} onChange={(e) => set('exportFormatPreference', e.target.value as 'csv' | 'xlsx')}>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </label>
        </div>

        <div className="card space-y-4 lg:col-span-2">
          <h2 className="font-semibold">Backup reminder</h2>
          <label className="block">
            <span className="label">Message shown to staff after finalising invoices</span>
            <textarea
              className="input mt-1"
              rows={3}
              value={form.backupFolderReminder}
              onChange={(e) => set('backupFolderReminder', e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
