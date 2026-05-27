import { useEffect, useState } from 'react';

import { ApiError } from '../../lib/http/apiClient';
import { SELLER_REVIEWS_PAGE_SIZE } from '../../lib/constants';
import type { Page } from '../../types/api';
import type { SellerReview } from '../../types/review';

import type { ReviewsCreatedAtSort } from './reviewsApi';
import { fetchProductReviews, fetchStoreReviews } from './reviewsApi';

export type SellerReviewsListFilters =
  | {
      variant: 'store';
      pageZero: number;
      rating?: number;
      createdAtSort: ReviewsCreatedAtSort;
    }
  | {
      variant: 'products';
      pageZero: number;
      rating?: number;
      productId?: string;
      createdAtSort: ReviewsCreatedAtSort;
      search?: string;
    };

export type UseSellerReviewsState = {
  data: Page<SellerReview> | null;
  loading: boolean;
  errorMessage: string | null;
};

export function useSellerReviewsList(filters: SellerReviewsListFilters): UseSellerReviewsState {
  const [data, setData] = useState<Page<SellerReview> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const size = SELLER_REVIEWS_PAGE_SIZE;

    setLoading(true);
    setErrorMessage(null);

    const run =
      filters.variant === 'store' ?
        fetchStoreReviews({
          page: filters.pageZero,
          size,
          rating: filters.rating,
          createdAtSort: filters.createdAtSort,
        })
      : fetchProductReviews({
          page: filters.pageZero,
          size,
          rating: filters.rating,
          productId: filters.productId,
          createdAtSort: filters.createdAtSort,
          search: filters.search,
        });

    void run
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
          setErrorMessage('No se pudo cargar las reseñas.');
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
  }, [filters]);

  return { data, loading, errorMessage };
}
