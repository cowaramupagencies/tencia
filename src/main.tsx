import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ensureDefaultSettings } from './db/database';
import { seedBundledProducts } from './lib/seedProducts';
import './index.css';

async function init() {
  await ensureDefaultSettings();
  await seedBundledProducts();
}

void init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
