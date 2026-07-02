import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, StatCard } from '../components/ui';
import { getDashboardStats } from '../db/database';
import { formatCurrency } from '../lib/calculations';

export function DashboardPage() {
  const [stats, setStats] = useState({
    productCount: 0,
    draftCount: 0,
    finalisedCount: 0,
    unreconciledCount: 0,
    totalValue: 0,
  });

  useEffect(() => {
    void getDashboardStats().then(setStats);
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of products and invoices while the main system is unavailable."
        action={
          <div className="flex gap-2">
            <Link to="/invoice/new" className="btn-primary">
              New Invoice
            </Link>
            <Link to="/search" className="btn-secondary">
              Product Search
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Products imported" value={stats.productCount} />
        <StatCard label="Draft invoices" value={stats.draftCount} />
        <StatCard label="Finalised invoices" value={stats.finalisedCount} />
        <StatCard label="Unreconciled invoices" value={stats.unreconciledCount} />
        <StatCard
          label="Total value (finalised)"
          value={formatCurrency(stats.totalValue)}
        />
      </div>

      <div className="mt-6 card">
        <h2 className="text-lg font-semibold text-slate-900">Quick start</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Products from the Cowaramup price list load automatically — go to <Link to="/search" className="link">Product Search</Link>.</li>
          <li>Search products and add them to a new invoice.</li>
          <li>Enter client details, review totals, and finalise.</li>
          <li>Save downloaded backups to your shared backup folder.</li>
          <li>Use <Link to="/reconciliation" className="link">Reconciliation</Link> when the main system is back.</li>
        </ol>
      </div>
    </div>
  );
}
