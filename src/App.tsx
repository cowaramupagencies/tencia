import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PendingInvoiceProvider } from './context/PendingInvoiceContext';
import { BackupCentrePage } from './pages/BackupCentrePage';
import { DashboardPage } from './pages/DashboardPage';
import { ImportProductsPage } from './pages/ImportProductsPage';
import { InvoiceBuilderPage } from './pages/InvoiceBuilderPage';
import { InvoiceHistoryPage } from './pages/InvoiceHistoryPage';
import { ProductSearchPage } from './pages/ProductSearchPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <PendingInvoiceProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="import" element={<ImportProductsPage />} />
            <Route path="search" element={<ProductSearchPage />} />
            <Route path="invoice/new" element={<InvoiceBuilderPage />} />
            <Route path="invoice/:id" element={<InvoiceBuilderPage />} />
            <Route path="history" element={<InvoiceHistoryPage />} />
            <Route path="reconciliation" element={<ReconciliationPage />} />
            <Route path="backup" element={<BackupCentrePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </PendingInvoiceProvider>
    </BrowserRouter>
  );
}
