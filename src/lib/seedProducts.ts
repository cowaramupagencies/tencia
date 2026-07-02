import type { Product } from '../types';
import cowaramupProducts from '../data/cowaramup-products.json';
import { db, replaceAllProducts } from '../db/database';

export const CATALOG_VERSION = '2026-07-01';
export const CATALOG_NAME = 'Cowaramup Agencies Price List';

export function getBundledProducts(): Product[] {
  return cowaramupProducts as Product[];
}

export async function isCatalogLoaded(): Promise<boolean> {
  const count = await db.products.count();
  return count > 0;
}

export async function seedBundledProducts(force = false): Promise<number> {
  const [existing, storedVersion] = await Promise.all([
    db.products.count(),
    db.meta.get('catalogVersion'),
  ]);

  const versionChanged = storedVersion?.value !== CATALOG_VERSION;
  if (existing > 0 && !force && !versionChanged) return existing;

  const products = getBundledProducts().map((p) => ({
    ...p,
    importedAt: new Date().toISOString(),
  }));

  await replaceAllProducts(products);
  await db.meta.put({ key: 'catalogVersion', value: CATALOG_VERSION });
  await db.meta.put({ key: 'catalogName', value: CATALOG_NAME });
  await db.meta.put({ key: 'catalogLoadedAt', value: new Date().toISOString() });

  return products.length;
}

export async function getCatalogInfo() {
  const [version, name, loadedAt, count] = await Promise.all([
    db.meta.get('catalogVersion'),
    db.meta.get('catalogName'),
    db.meta.get('catalogLoadedAt'),
    db.products.count(),
  ]);
  return {
    version: version?.value,
    name: name?.value ?? CATALOG_NAME,
    loadedAt: loadedAt?.value,
    productCount: count,
  };
}
