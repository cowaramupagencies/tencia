/// <reference types="vite/client" />

declare module 'jspdf-autotable' {
  import type { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    startY?: number;
    head?: string[][];
    body?: (string | number)[][];
    theme?: string;
    headStyles?: Record<string, unknown>;
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
