import { useEffect, useState } from 'react';

import { ApiError } from '../../lib/http/apiClient';
import type { Page } from '../../types/api';
import type { ProductStatus, ProductSummary } from '../../types/product';

import { SELLER_PRODUCTS_PAGE_SIZE } from '../../lib/constants';
import { enumerateDevSellerProductDetailsMerged } from './productDetailApi';
import type { FetchSellerProductsParams } from './productsApi';
import { coercePageProductSummary, fetchSellerProducts, summarizeSellerProductDetail } from './productsApi';

export type SellerProductListFilters = {
  pageZero: number;
  name: string;
  status?: ProductStatus;
  /** Incrementar para forzar relectura del catálogo mock (Paso 14: mutaciones locales). */
  refreshNonce: number;
};

export type UseSellerProductsState = {
  data: Page<ProductSummary> | null;
  loading: boolean;
  errorMessage: string | null;
};

/** Simula `Page<ProductSummary>` tipo Spring; en DEV el catálogo proviene de `productDetailApi`. */
function buildDevSellerProductPage(filters: SellerProductListFilters): Page<ProductSummary> {
  let rows = enumerateDevSellerProductDetailsMerged().map(summarizeSellerProductDetail);
  const q = filters.name.trim().toLowerCase();
  if (q.length > 0) {
    rows = rows.filter((r) => String(r.name ?? '').toLowerCase().includes(q));
  }
  if (filters.status) {
    rows = rows.filter((r) => r.status === filters.status);
  }
  const size = SELLER_PRODUCTS_PAGE_SIZE;
  const start = filters.pageZero * size;
  const slice = rows.slice(start, start + size);
  return coercePageProductSummary({
    content: slice,
    totalElements: rows.length,
    number: filters.pageZero,
    size,
  });
}

/**
 * Lista de productos del vendedor (Paso 12 + 14). Reconsulta ante cambios en filtros derivados del hook padre (URL/debounce).
 */
export function useSellerProductList(filters: SellerProductListFilters): UseSellerProductsState {
  const [data, setData] = useState<Page<ProductSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const query: FetchSellerProductsParams = {
      page: filters.pageZero,
      size: SELLER_PRODUCTS_PAGE_SIZE,
      name: filters.name.trim().length > 0 ? filters.name.trim() : undefined,
      status: filters.status,
    };

    setLoading(true);
    setErrorMessage(null);

    if (import.meta.env.DEV) {
      void Promise.resolve(buildDevSellerProductPage(filters))
        .then((page) => {
          if (!cancelled) {
            setData(page);
            setErrorMessage(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    } else {
      void fetchSellerProducts(query)
        .then((page) => {
          if (!cancelled) {
            setData(page);
            setErrorMessage(null);
          }
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }
          setData(null);
          if (error instanceof ApiError) {
            setErrorMessage(error.message);
          } else if (error instanceof Error) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage('No se pudo cargar el listado de productos.');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [filters]);

  return { data, loading, errorMessage };
}
