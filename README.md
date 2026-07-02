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

## Data storage

All invoices and products are stored in your browser's IndexedDB. Regular backups via the Backup Centre are strongly recommended.

## Tech stack

- React + TypeScript + Vite
- Dexie.js (IndexedDB)
- Tailwind CSS
- xlsx, jsPDF, file-saver
