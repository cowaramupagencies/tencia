import fs from 'fs';
import path from 'path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath =
  'c:\\Users\\Rebecca\\OneDrive - Cowaramup Agencies\\Desktop\\Current Price List - To Save on Desktop.pdf';

const buffer = fs.readFileSync(pdfPath);
const data = new Uint8Array(buffer);
const doc = await getDocument({ data, useSystemFonts: true }).promise;

let fullText = '';
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
  fullText += `\n--- PAGE ${i} ---\n${pageText}\n`;
}

console.log('Pages:', doc.numPages);
console.log('Text length:', fullText.length);
console.log(fullText.slice(0, 12000));

fs.mkdirSync('scripts', { recursive: true });
fs.writeFileSync('scripts/pdf-extract-sample.txt', fullText.slice(0, 40000), 'utf8');
fs.writeFileSync('scripts/pdf-extract-full.txt', fullText, 'utf8');
console.log('Done');
