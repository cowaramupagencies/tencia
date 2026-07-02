import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/import', label: 'Import Products' },
  { to: '/search', label: 'Product Search' },
  { to: '/invoice/new', label: 'New Invoice' },
  { to: '/history', label: 'Invoice History' },
  { to: '/reconciliation', label: 'Reconciliation' },
  { to: '/backup', label: 'Backup Centre' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              Temporary Invoicing
            </p>
            <h1 className="text-lg font-bold text-slate-900">Invoice Backup System</h1>
          </div>
          <p className="hidden text-sm text-slate-500 md:block">
            Offline-ready · Data saved in this browser
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <nav className="lg:w-56 lg:shrink-0">
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {navItems.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
