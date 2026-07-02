import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath =
  process.argv[2] ||
  'c:\\Users\\Rebecca\\OneDrive - Cowaramup Agencies\\Desktop\\Current Price List - To Save on Desktop.pdf';

// Column x-positions from Cowaramup price list PDF
const COL = { code: 47, desc: 141, unit: 388, price1: 454, tax: 785 };
const TOL = 35;

function col(parts, x) {
  const hit = parts.find((p) => Math.abs(p.x - x) < TOL);
  return hit?.text?.trim() ?? '';
}

function parsePrice(value) {
  if (!value) return 0;
  const n = parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

async function extractRows(doc) {
  const rows = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rowMap = new Map();

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!rowMap.has(y)) rowMap.set(y, []);
      rowMap.get(y).push({ x: item.transform[4], text: item.str.trim() });
    }

    for (const y of [...rowMap.keys()].sort((a, b) => b - a)) {
      rows.push({ page: p, parts: rowMap.get(y).sort((a, b) => a.x - b.x) });
    }
  }

  return rows;
}

function parseProductsFromRows(rows) {
  let currentCategory = 'General';
  const products = [];
  const seen = new Set();
  let pendingCode = '';

  for (const row of rows) {
    const parts = row.parts;
    const joined = parts.map((p) => p.text).join(' ');

    if (joined.includes('Stock Code') && joined.includes('Stock Description')) continue;
    if (/^Date:/.test(joined) || /^Page \d+ of/.test(joined)) continue;
    if (joined.includes('Stock Location Price List')) continue;
    if (joined === 'COWARAMUP AGENCIES') continue;
    if (joined.includes('(All Suppliers)') || joined.includes('(Excluding Tax)')) continue;

    const catCell = col(parts, COL.code);
    const catValue = col(parts, COL.desc);

    if (catCell === 'Category...' && catValue) {
      currentCategory = catValue;
      pendingCode = '';
      continue;
    }
    if (catCell === 'Sub Category...') {
      pendingCode = '';
      continue;
    }

    let code = col(parts, COL.code);
    const description = col(parts, COL.desc);
    const unit = col(parts, COL.unit);
    const price1 = col(parts, COL.price1);
    const tax = col(parts, COL.tax);

    if (!code && !description) continue;

    // Continuation row for split stock codes (e.g. BULKFER- then AGFLOWCZM)
    if (code && !description && !price1 && !unit) {
      pendingCode += code.replace(/\s/g, '');
      continue;
    }

    if (pendingCode) {
      code = pendingCode + (code ?? '').replace(/\s/g, '');
      pendingCode = '';
    }

    if (code.endsWith('-')) {
      pendingCode = code;
      // keep description/price for next merge if this row has them
      if (description) {
        const mergedCode = pendingCode; // wait for next row
        // store partial in a temp - actually handle inline:
        // BULKFER- row HAS description - code is BULKFER-, need AGFLOWCZM from next row
        row._pendingDesc = description;
        row._pendingUnit = unit;
        row._pendingPrice = price1;
      }
      continue;
    }

    if (!code || !description) continue;

    const key = code.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    products.push({
      itemCode: code,
      itemName: description,
      description,
      category: currentCategory,
      unitPrice: parsePrice(price1),
      gstStatus: tax === '0.00' ? 'exempt' : 'exclusive',
      notes: unit ? `Unit: ${unit}` : undefined,
      supplier: 'Cowaramup Agencies',
      importedAt: new Date().toISOString(),
    });
  }

  // Second pass: fix split codes by merging BULKFER- + AGFLOWCZM pattern
  return mergeSplitCodes(products, rows);
}

function mergeSplitCodes(products, rows) {
  const byCode = new Map(products.map((p) => [p.itemCode.toUpperCase(), p]));
  const orphans = [];
  const fixed = [];

  for (const row of rows) {
    const code = col(row.parts, COL.code);
    const desc = col(row.parts, COL.desc);
    const price = col(row.parts, COL.price1);
    const unit = col(row.parts, COL.unit);
    if (code?.endsWith('-') && desc) {
      orphans.push({ code, desc, price, unit, page: row.page });
    }
  }

  for (const o of orphans) {
    // find orphan continuation row on same or next page
    const suffixRow = rows.find((r) => {
      const c = col(r.parts, COL.code);
      const d = col(r.parts, COL.desc);
      return c && !d && o.code.endsWith('-') && r.page >= o.page && r.page <= o.page + 1;
    });
    if (!suffixRow) continue;

    const suffix = col(suffixRow.parts, COL.code);
    const fullCode = o.code + suffix;
    if (byCode.has(fullCode.toUpperCase())) continue;

    fixed.push({
      itemCode: fullCode,
      itemName: o.desc,
      description: o.desc,
      category: products[0]?.category ?? 'General',
      unitPrice: parsePrice(o.price),
      gstStatus: 'exclusive',
      notes: o.unit ? `Unit: ${o.unit}` : undefined,
      supplier: 'Cowaramup Agencies',
      importedAt: new Date().toISOString(),
    });
    byCode.set(fullCode.toUpperCase(), true);
  }

  // Remove bad partial codes like BULKFER-
  const cleaned = products.filter((p) => !p.itemCode.endsWith('-') && p.itemCode.length > 2);
  for (const f of fixed) {
    if (!cleaned.find((p) => p.itemCode.toUpperCase() === f.itemCode.toUpperCase())) {
      cleaned.push(f);
    }
  }

  return cleaned;
}

async function main() {
  console.log('Reading PDF:', pdfPath);
  const buffer = fs.readFileSync(pdfPath);
  const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  console.log('Pages:', doc.numPages);

  const rows = await extractRows(doc);
  let products = parseProductsFromRows(rows);

  // Re-parse with proper category tracking in one pass
  products = parseProductsFinal(rows);

  console.log('Parsed products:', products.length);
  const cats = {};
  for (const p of products) cats[p.category] = (cats[p.category] || 0) + 1;
  console.log('Top categories:', Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 8));
  console.log('Sample:', products.filter((p) => p.itemCode === 'BULBAD' || p.itemCode === 'BULKFER-AGFLOWCZM').slice(0, 3));

  const outPath = path.join(__dirname, '..', 'src', 'data', 'cowaramup-products.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(products));

  console.log('Wrote', outPath);
}

function parseProductsFinal(rows) {
  let currentCategory = 'General';
  const products = [];
  const seen = new Set();
  let pending = null;

  for (let i = 0; i < rows.length; i++) {
    const parts = rows[i].parts;
    const joined = parts.map((p) => p.text).join(' ');

    if (joined.includes('Stock Code') || /^Date:/.test(joined) || /^Page \d+/.test(joined)) continue;
    if (joined.includes('Stock Location') || joined === 'COWARAMUP AGENCIES') continue;
    if (joined.includes('(All Suppliers)') || joined.includes('(Excluding Tax)')) continue;

    const c0 = col(parts, COL.code);
    const c1 = col(parts, COL.desc);

    if (c0 === 'Category...' && c1) {
      currentCategory = c1;
      continue;
    }
    if (c0 === 'Sub Category...') continue;

    let code = c0;
    let description = c1;
    const unit = col(parts, COL.unit);
    const price1 = col(parts, COL.price1);
    const tax = col(parts, COL.tax);

    // Continuation code row (e.g. AGFLOWCZM after BULKFER-)
    if (code && !description && !price1 && !unit && pending?.code?.endsWith('-')) {
      const fullCode = pending.code + code.replace(/\s/g, '');
      const key = fullCode.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        products.push({
          itemCode: fullCode,
          itemName: pending.description,
          description: pending.description,
          category: pending.category,
          unitPrice: parsePrice(pending.price1),
          gstStatus: pending.tax === '0.00' ? 'exempt' : 'exclusive',
          notes: pending.unit ? `Unit: ${pending.unit}` : undefined,
          supplier: 'Cowaramup Agencies',
          importedAt: new Date().toISOString(),
        });
      }
      pending = null;
      continue;
    }

    if (code?.endsWith('-') && description) {
      pending = { code, description, unit, price1, tax, category: currentCategory };
      continue;
    }

    if (code && !description && !price1 && pending?.code?.endsWith('-')) {
      code = pending.code + code.replace(/\s/g, '');
      description = pending.description;
      pending = null;
    } else if (pending && code && description) {
      pending = null;
    }

    if (!code || !description) continue;
    if (code.endsWith('-')) continue;

    const key = code.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    products.push({
      itemCode: code,
      itemName: description,
      description,
      category: currentCategory,
      unitPrice: parsePrice(price1),
      gstStatus: tax === '0.00' ? 'exempt' : 'exclusive',
      notes: unit ? `Unit: ${unit}` : undefined,
      supplier: 'Cowaramup Agencies',
      importedAt: new Date().toISOString(),
    });
  }

  return products;
}

main().catch(console.error);
