# Temporary Invoicing App

A browser-based temporary invoicing system for use while your main booking/invoicing software is unavailable.

## Features

- Import products from Excel/CSV with flexible column mapping
- Fast product search with category and supplier filters
- Invoice builder with auto-save drafts, manual line items, and GST calculations
- Finalise invoices with automatic PDF, CSV, and JSON downloads
- Invoice history, reconciliation tracking, and backup centre
- All data stored locally in IndexedDB (via Dexie.js)

## Getting started

```bash
cd C:\Users\Rebecca\Projects\temporary-invoicing
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview
```

## GitHub Pages

This app can be hosted on GitHub Pages. After pushing to GitHub:

1. Go to your repo **Settings → Pages**
2. Under **Build and deployment**, set Source to **GitHub Actions**
3. Push to `main` — the workflow builds and deploys automatically

Your app will be at: `https://YOUR-USERNAME.github.io/REPO-NAME/`

If you see **404 errors** for `/assets/...`, the site was built without the GitHub Pages base path. Push the latest code and let the GitHub Action rebuild, or build locally:

```bash
set VITE_BASE_PATH=/YOUR-REPO-NAME/
npm run build
```

Then upload the `dist` folder contents.

## Data storage

All invoices and products are stored in your browser's IndexedDB. Regular backups via the Backup Centre are strongly recommended.

## Tech stack

- React + TypeScript + Vite
- Dexie.js (IndexedDB)
- Tailwind CSS
- xlsx, jsPDF, file-saver
