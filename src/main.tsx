import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ensureDefaultSettings } from './db/database';
import { seedBundledProducts } from './lib/seedProducts';
import './index.css';

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="card max-w-md text-center">
        <h1 className="text-xl font-bold text-slate-900">Temporary Invoicing</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="card max-w-lg border-red-200">
        <h1 className="text-xl font-bold text-red-700">Could not start the app</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        <p className="mt-3 text-sm text-slate-500">
          Try closing the app, double-click <strong>start-app.bat</strong> again, then open the
          link shown in the black window.
        </p>
      </div>
    </div>
  );
}

function Bootstrap() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        await ensureDefaultSettings();
        const count = await seedBundledProducts();
        if (count === 0) {
          throw new Error('No products were loaded. Please click Reload built-in price list on the Import Products page.');
        }
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Startup failed.');
      }
    })();
  }, []);

  if (error) return <ErrorScreen message={error} />;
  if (!ready) return <LoadingScreen message="Loading Cowaramup Agencies price list…" />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
