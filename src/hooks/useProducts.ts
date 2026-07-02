import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Product } from '../types';

export function useProducts() {
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const suppliers = [...new Set(products.map((p) => p.supplier).filter(Boolean))].sort() as string[];

  const searchProducts = (
    query: string,
    categoryFilter?: string,
    supplierFilter?: string,
  ): Product[] => {
    const q = query.toLowerCase().trim();
    return products.filter((p) => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (supplierFilter && p.supplier !== supplierFilter) return false;
      if (!q) return true;
      return (
        p.itemCode.toLowerCase().includes(q) ||
        p.itemName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.supplier?.toLowerCase().includes(q) ?? false)
      );
    });
  };

  const deleteAllProducts = async () => {
    await db.products.clear();
  };

  return { products, categories, suppliers, searchProducts, deleteAllProducts };
}
