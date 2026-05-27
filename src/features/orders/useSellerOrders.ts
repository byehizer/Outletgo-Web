import { useEffect, useState } from 'react';

import { ApiError } from '../../lib/http/apiClient';
import type { Page } from '../../types/api';
import type { SellerOrderSummary } from '../../types/order';

import { SELLER_ORDERS_PAGE_SIZE } from '../../lib/constants';
import {
  buildDevSellerOrdersPageForHook,
  fetchSellerOrders,
  type FetchSellerOrdersParams,
} from './ordersApi';

export type SellerOrdersListFilters = {
  pageZero: number;
};

export type UseSellerOrdersState = {
  data: Page<SellerOrderSummary> | null;
  loading: boolean;
  errorMessage: string | null;
};

export function useSellerOrdersList(filters: SellerOrdersListFilters): UseSellerOrdersState {
  const [data, setData] = useState<Page<SellerOrderSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const query: FetchSellerOrdersParams = {
      page: filters.pageZero,
      size: SELLER_ORDERS_PAGE_SIZE,
    };

    setLoading(true);
    setErrorMessage(null);

    if (import.meta.env.DEV) {
      void Promise.resolve(buildDevSellerOrdersPageForHook(filters.pageZero, SELLER_ORDERS_PAGE_SIZE))
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
      void fetchSellerOrders(query)
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
            setErrorMessage('No se pudo cargar los pedidos.');
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
  }, [filters.pageZero]);

  return { data, loading, errorMessage };
}
