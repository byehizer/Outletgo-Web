import { Search, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { DataTable, type DataColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { Pagination } from '../../../components/Pagination';
import { Skeleton } from '../../../components/Skeleton';
import { RatingStars } from '../../../features/reviews/RatingStars';
import type { ReviewsCreatedAtSort } from '../../../features/reviews/reviewsApi';
import { useProductOptions } from '../../../features/reviews/useProductOptions';
import {
  useSellerReviewsList,
  type SellerReviewsListFilters,
} from '../../../features/reviews/useSellerReviews';

import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { cn } from '../../../lib/cn';
import { SELLER_REVIEWS_PAGE_SIZE } from '../../../lib/constants';
import { formatDate } from '../../../lib/format';
import type { SellerReview } from '../../../types/review';

type ReviewsTab = 'store' | 'products';

function parsePageOneBased(raw: string | null): number {
  const n = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return n;
}

function parseRatingFilter(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') {
    return undefined;
  }
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    return undefined;
  }
  return n;
}

function parseTabParam(raw: string | null): ReviewsTab {
  return raw === 'products' ? 'products' : 'store';
}

function parseCreatedAtSort(raw: string | null): ReviewsCreatedAtSort {
  const v = raw?.trim().toLowerCase();
  if (v === 'asc') {
    return 'asc';
  }
  return 'desc';
}

function truncateForTable(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed === '') {
    return '—';
  }
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars)}…`;
}

export function ReviewsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { options: productOptions, loading: productOptionsLoading, error: productOptionsError } =
    useProductOptions();

  const tab = useMemo(() => parseTabParam(searchParams.get('tab')), [searchParams]);
  const pageOneBased = useMemo(() => parsePageOneBased(searchParams.get('page')), [searchParams]);
  const ratingFilter = useMemo(() => parseRatingFilter(searchParams.get('rating')), [searchParams]);
  const createdAtSort = useMemo(
    (): ReviewsCreatedAtSort => parseCreatedAtSort(searchParams.get('dateOrder')),
    [searchParams],
  );
  const searchFromParams = useMemo(() => searchParams.get('search') ?? '', [searchParams]);
  const [searchDraft, setSearchDraft] = useState(searchFromParams);
  const debouncedSearchDraft = useDebouncedValue(searchDraft, 380);

  const productIdRaw = searchParams.get('productId')?.trim() ?? '';
  const productIdFilter = productIdRaw.length > 0 ? productIdRaw : undefined;

  useEffect(() => {
    setSearchDraft(searchFromParams);
  }, [searchFromParams]);

  useEffect(() => {
    if (tab !== 'products') {
      return;
    }
    const trimmed = debouncedSearchDraft.trim();
    const current = searchFromParams.trim();
    if (trimmed === current) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (trimmed.length === 0) {
      next.delete('search');
    } else {
      next.set('search', trimmed);
    }
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [
    debouncedSearchDraft,
    tab,
    searchFromParams,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (tab !== 'store') {
      return;
    }
    const s = searchParams.get('search')?.trim() ?? '';
    if (s.length === 0) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete('search');
    setSearchParams(next, { replace: true });
  }, [tab, searchParams, setSearchParams]);

  const ratingControlValue = ratingFilter === undefined ? '' : String(ratingFilter);
  const hideProductColumn = tab === 'products' && productIdFilter !== undefined;

  const filters: SellerReviewsListFilters = useMemo(() => {
    if (tab === 'store') {
      return {
        variant: 'store',
        pageZero: pageOneBased - 1,
        rating: ratingFilter,
        createdAtSort,
      };
    }
    const q = searchFromParams.trim();
    return {
      variant: 'products',
      pageZero: pageOneBased - 1,
      rating: ratingFilter,
      productId: productIdFilter,
      createdAtSort,
      search: q.length > 0 ? q : undefined,
    };
  }, [
    tab,
    pageOneBased,
    ratingFilter,
    createdAtSort,
    productIdFilter,
    searchFromParams,
  ]);

  const { data, loading, errorMessage } = useSellerReviewsList(filters);

  useEffect(() => {
    if (!data || loading) {
      return;
    }
    const size = Math.max(1, data.size || SELLER_REVIEWS_PAGE_SIZE);
    const totalPages =
      data.totalElements === 0 ? 1 : Math.max(1, Math.ceil((data.totalElements || 0) / size));

    if (pageOneBased <= totalPages) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set('page', String(totalPages));
    setSearchParams(next, { replace: true });
  }, [data, loading, pageOneBased, searchParams, setSearchParams]);

  const switchTab = useCallback(
    (next: ReviewsTab) => {
      const p = new URLSearchParams();
      p.set('tab', next);
      p.set('page', '1');
      setSearchParams(p);
    },
    [setSearchParams],
  );

  const applyRatingParam = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value === '') {
        next.delete('rating');
      } else {
        next.set('rating', value);
      }
      next.set('page', '1');
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const applyCreatedAtSortParam = useCallback(
    (value: ReviewsCreatedAtSort) => {
      const next = new URLSearchParams(searchParams);
      if (value === 'desc') {
        next.delete('dateOrder');
      } else {
        next.set('dateOrder', 'asc');
      }
      next.set('page', '1');
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const applyProductIdParam = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams);
      const v = value.trim();
      if (v === '') {
        next.delete('productId');
      } else {
        next.set('productId', v);
      }
      next.set('page', '1');
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const goPage = useCallback(
    (p: number) => {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(p));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams();
    next.set('tab', tab);
    next.set('page', '1');
    setSearchParams(next);
  }, [setSearchParams, tab]);

  const totalPages =
    data != null ?
      Math.max(
        1,
        Math.ceil((data.totalElements || 0) / Math.max(1, data.size || SELLER_REVIEWS_PAGE_SIZE)),
      )
    : 1;

  const columns = useMemo((): DataColumn<SellerReview>[] => {
    const base: DataColumn<SellerReview>[] = [
      {
        id: 'author',
        header: 'Autor',
        wrap: true,
        cell: (row) => <span className="font-medium text-[var(--text-primary)]">{row.authorName}</span>,
      },
      {
        id: 'rating',
        header: 'Calificación',
        cell: (row) => <RatingStars rating={row.rating} />,
      },
      {
        id: 'comment',
        header: 'Comentario',
        wrap: true,
        className: 'max-w-md',
        cell: (row) => (
          <span className="text-[var(--text-secondary)]">{truncateForTable(row.comment, 120)}</span>
        ),
      },
    ];

    if (tab === 'products' && !hideProductColumn) {
      base.push({
        id: 'product',
        header: 'Producto',
        wrap: true,
        cell: (row) =>
          row.productName?.trim() ?
            <span>{row.productName.trim()}</span>
          : <span className="text-[var(--text-muted)]">—</span>,
      });
    }

    base.push({
      id: 'date',
      header: 'Fecha',
      cell: (row) => <span className="text-[var(--text-secondary)]">{formatDate(row.createdAt)}</span>,
    });

    return base;
  }, [tab, hideProductColumn]);

  const showSkeleton = loading && !data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-display-md text-[var(--text-primary)]">Reseñas</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
          Opiniones de compradores sobre tu tienda o cada producto (Paso&nbsp;17). Solo lectura; ordenás por fecha, en
          productos podés buscar texto que luego resolverá la indexación del backend.
        </p>
      </header>

      <div
        className="flex flex-wrap gap-2 border-b border-[var(--border)]"
        role="tablist"
        aria-label="Origen de reseñas"
      >
        <button
          type="button"
          role="tab"
          id="reviews-tab-store"
          aria-controls="reviews-panel"
          aria-selected={tab === 'store'}
          className={cn(
            '-mb-px px-4 py-2 text-sm font-medium transition-colors',
            tab === 'store' ?
              'border-b-2 border-brand text-brand'
            : 'border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
          onClick={() => switchTab('store')}
        >
          Mi Tienda
        </button>
        <button
          type="button"
          role="tab"
          id="reviews-tab-products"
          aria-controls="reviews-panel"
          aria-selected={tab === 'products'}
          className={cn(
            '-mb-px px-4 py-2 text-sm font-medium transition-colors',
            tab === 'products' ?
              'border-b-2 border-brand text-brand'
            : 'border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
          onClick={() => switchTab('products')}
        >
          Mis Productos
        </button>
      </div>

      <section
        id="reviews-panel"
        role="tabpanel"
        aria-labelledby={tab === 'store' ? 'reviews-tab-store' : 'reviews-tab-products'}
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
      >
        <fieldset className="grid gap-4 sm:grid-cols-3 lg:max-w-4xl">
          <legend className="sr-only">Filtros de reseñas</legend>
          <div className="space-y-1.5">
            <label htmlFor="reviews-filter-rating" className="text-xs font-medium text-[var(--text-secondary)]">
              Estrellas
            </label>
            <select
              id="reviews-filter-rating"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
              value={ratingControlValue}
              onChange={(e) => applyRatingParam(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="5">5 estrellas</option>
              <option value="4">4 estrellas</option>
              <option value="3">3 estrellas</option>
              <option value="2">2 estrellas</option>
              <option value="1">1 estrella</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reviews-filter-date-order" className="text-xs font-medium text-[var(--text-secondary)]">
              Orden por fecha
            </label>
            <select
              id="reviews-filter-date-order"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
              value={createdAtSort}
              onChange={(e) =>
                applyCreatedAtSortParam(e.target.value === 'asc' ? 'asc' : 'desc')
              }
            >
              <option value="desc">Más recientes primero</option>
              <option value="asc">Más antiguas primero</option>
            </select>
          </div>

          {tab === 'products' ?
            <div className="space-y-1.5">
              <label htmlFor="reviews-filter-product" className="text-xs font-medium text-[var(--text-secondary)]">
                Producto
              </label>
              <select
                id="reviews-filter-product"
                disabled={productOptionsLoading}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] disabled:opacity-60"
                value={productIdFilter ?? ''}
                onChange={(e) => applyProductIdParam(e.target.value)}
              >
                <option value="">Todos los productos</option>
                {productOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {productOptionsError ?
                <p role="alert" className="text-xs text-danger">
                  {productOptionsError}
                </p>
              : null}
            </div>
          : (
            <div className="hidden sm:block" aria-hidden />
          )}

          {tab === 'products' ?
            <div className="sm:col-span-3 mt-2 space-y-1.5">
              <label htmlFor="reviews-search-products" className="text-xs font-medium text-[var(--text-secondary)]">
                Buscar
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
                  aria-hidden
                />
                <input
                  id="reviews-search-products"
                  type="search"
                  autoComplete="off"
                  placeholder="Autor, comentario o producto…"
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                En desarrollo es un filtro local; cuando el backend indexe contenido usará esta misma búsqueda.
              </p>
            </div>
          : null}
        </fieldset>

        <div className="mt-8">
          {errorMessage ?
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </p>
          : null}

          {showSkeleton ?
            <div
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
              aria-busy="true"
              aria-label="Cargando reseñas"
            >
              {tab === 'products' ?
                <div className="mb-6 max-w-xl">
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              : null}
              <div className="space-y-4">
                {(['a', 'b', 'c', 'd', 'e'] as const).map((key) => (
                  <div
                    key={key}
                    className="flex flex-wrap items-center gap-4 border-b border-[var(--border)] pb-4 last:border-0 last:pb-0"
                  >
                    <Skeleton className="h-4 w-32 shrink-0" />
                    <Skeleton className="h-6 w-24 shrink-0" />
                    <Skeleton className="h-4 min-w-0 flex-1 basis-56" />
                    {tab === 'products' && !hideProductColumn ?
                      <Skeleton className="h-4 w-28 shrink-0 max-sm:hidden" />
                    : null}
                    <Skeleton className="h-4 w-20 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          : null}

          {!loading && data?.content?.length === 0 ?
            <EmptyState
              icon={Star}
              title="No hay reseñas con estos filtros"
              action={
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline"
                  onClick={clearFilters}
                >
                  Borrar filtros
                </button>
              }
            />
          : null}

          {!showSkeleton && data != null && data.content.length > 0 ?
            <>
              <DataTable<SellerReview>
                columns={columns}
                data={data.content}
                getRowKey={(row) => row.id}
                className="-mx-2"
              />
              <div className={cn('mt-6', totalPages <= 1 ? 'hidden' : '')}>
                <Pagination
                  disabled={loading}
                  currentPage={pageOneBased}
                  totalPages={totalPages}
                  onPageChange={goPage}
                />
              </div>
            </>
          : null}
        </div>
      </section>
    </div>
  );
}
