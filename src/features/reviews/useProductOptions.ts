import { useEffect, useState } from 'react';

import { fetchSellerProducts } from '../products/productsApi';
import { SELLER_PRODUCTS_PAGE_SIZE } from '../../lib/constants';
import type { Page } from '../../types/api';
import type { ProductSummary } from '../../types/product';

export type SellerProductOption = {
  id: string;
  name: string;
};

/** Productos demo para filtros DEV (alineados con mock de `reviewsApi`). */
export const DEV_SELLER_PRODUCT_OPTIONS: SellerProductOption[] = [
  { id: 'prod-mock-jean', name: 'Jean recto azul 32' },
  { id: 'prod-mock-remera', name: 'Remera manga corta beige' },
  { id: 'prod-mock-buzo', name: 'Buzo canguro granate' },
  { id: 'prod-mock-campera', name: 'Campera softshell negra' },
  { id: 'prod-mock-gorra', name: 'Gorra trucker OutletGo' },
];

export type UseProductOptionsResult = {
  options: SellerProductOption[];
  loading: boolean;
  error: string | null;
};

/** Opciones `{ id, name }` para el select de producto en Reseñas (tab productos). */
export function useProductOptions(): UseProductOptionsResult {
  const [options, setOptions] = useState<SellerProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      setOptions(DEV_SELLER_PRODUCT_OPTIONS);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchSellerProducts({ page: 0, size: Math.max(SELLER_PRODUCTS_PAGE_SIZE, 120) }).then((page: Page<ProductSummary>) => {
        if (cancelled) {
          return;
        }
        const opts = page.content.map((row) => ({ id: row.id, name: row.name })).filter((o) => o.id.length > 0);
        setOptions(opts);
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          setError('No se pudieron cargar los productos.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading, error };
}
