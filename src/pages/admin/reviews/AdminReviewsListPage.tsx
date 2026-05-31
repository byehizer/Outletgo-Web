import { Eye, Loader2, Search, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useId,
  type KeyboardEvent,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import { DataTable, type DataColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { Pagination } from '../../../components/Pagination';
import { Skeleton } from '../../../components/Skeleton';
import {
  ADMIN_REVIEWS_PAGE_SIZE,
  fetchAdminReviews,
} from '../../../features/admin/adminReviewsApi';
import { fetchAdminProducts } from '../../../features/admin/moderationApi';
import { ReviewDetailPanel } from '../../../features/admin/ReviewDetailPanel';
import { fetchSellerAccounts } from '../../../features/admin/sellersApi';
import { RatingStars } from '../../../features/reviews/RatingStars';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../lib/cn';
import { formatDate } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import type { Page } from '../../../types/api';
import type { AdminReview } from '../../../types/admin-review';
import { REFERENCE_TYPE, type ReferenceType } from '../../../types/moderation';

type ReviewsListUiState = {
  data: Page<AdminReview> | null;
  loading: boolean;
  errorMessage: string | null;
};

type ReviewsListAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: Page<AdminReview> }
  | { type: 'FETCH_ERR'; payload: string }
  | { type: 'PATCH_REVIEW'; payload: AdminReview }
  | { type: 'REMOVE_REVIEW'; payload: string };

type StoreOption = { id: string; businessName: string };
type ProductOption = { id: string; name: string; storeId: string; storeName: string };

type AutocompleteUiState = {
  options: StoreOption[] | ProductOption[];
  loading: boolean;
  hasSearched: boolean;
};

type AutocompleteAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: StoreOption[] | ProductOption[] }
  | { type: 'FETCH_ERR' }
  | { type: 'RESET' };

function reviewsListReducer(state: ReviewsListUiState, action: ReviewsListAction): ReviewsListUiState {
  switch (action.type) {
    case 'FETCH_BEGIN':
      return { ...state, loading: true, errorMessage: null };
    case 'FETCH_OK':
      return { data: action.payload, loading: false, errorMessage: null };
    case 'FETCH_ERR':
      return { data: null, loading: false, errorMessage: action.payload };
    case 'PATCH_REVIEW': {
      if (!state.data) {
        return state;
      }
      return {
        ...state,
        data: {
          ...state.data,
          content: state.data.content.map((row) =>
            row.id === action.payload.id ? action.payload : row,
          ),
        },
      };
    }
    case 'REMOVE_REVIEW': {
      if (!state.data) {
        return state;
      }
      const content = state.data.content.filter((row) => row.id !== action.payload);
      return {
        ...state,
        data: {
          ...state.data,
          content,
          totalElements: Math.max(0, state.data.totalElements - 1),
        },
      };
    }
    default:
      return state;
  }
}

function autocompleteReducer(
  state: AutocompleteUiState,
  action: AutocompleteAction,
): AutocompleteUiState {
  switch (action.type) {
    case 'FETCH_BEGIN':
      return { ...state, loading: true, hasSearched: false };
    case 'FETCH_OK':
      return { options: action.payload, loading: false, hasSearched: true };
    case 'FETCH_ERR':
      return { options: [], loading: false, hasSearched: true };
    case 'RESET':
      return { options: [], loading: false, hasSearched: false };
    default:
      return state;
  }
}

const initialListState: ReviewsListUiState = {
  data: null,
  loading: true,
  errorMessage: null,
};

const initialAutocompleteState: AutocompleteUiState = {
  options: [],
  loading: false,
  hasSearched: false,
};

function parsePageOneBased(raw: string | null): number {
  const n = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return n;
}

function referenceTypeFromParams(raw: string | null): ReferenceType | undefined {
  if (raw === REFERENCE_TYPE.STORE) {
    return REFERENCE_TYPE.STORE;
  }
  if (raw === REFERENCE_TYPE.PRODUCT) {
    return REFERENCE_TYPE.PRODUCT;
  }
  return undefined;
}

function ratingFromParams(raw: string | null): number | undefined {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    return undefined;
  }
  return n;
}

function visibilityFromParams(raw: string | null): boolean | undefined {
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  return undefined;
}

function truncateComment(text: string | null, max = 60): string | null {
  if (!text?.trim()) {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}

function sellersToStoreOptions(
  sellers: Awaited<ReturnType<typeof fetchSellerAccounts>>['content'],
): StoreOption[] {
  const seen = new Set<string>();
  const stores: StoreOption[] = [];
  for (const seller of sellers) {
    if (!seller.isActive || seen.has(seller.store.id)) {
      continue;
    }
    seen.add(seller.store.id);
    stores.push({ id: seller.store.id, businessName: seller.store.businessName });
  }
  return stores.sort((a, b) => a.businessName.localeCompare(b.businessName, 'es'));
}

function productsToOptions(
  products: Awaited<ReturnType<typeof fetchAdminProducts>>['content'],
): ProductOption[] {
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    storeId: p.store.id,
    storeName: p.store.businessName,
  }));
}

function ReviewsTableSkeleton() {
  return (
    <div className="-mx-1 overflow-x-auto" aria-hidden>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {['Reseña', 'Tipo', 'Sobre', 'Comprador', 'Visibilidad', 'Fecha', 'Acciones'].map(
              (col) => (
                <th
                  key={col}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  {col}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i} className="bg-[var(--bg-card)]">
              {Array.from({ length: 7 }, (_, j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DropdownSkeleton() {
  return (
    <ul className="py-1" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="px-3 py-2.5">
          <Skeleton className="h-4 w-3/4" />
        </li>
      ))}
    </ul>
  );
}

type StoreSearchAutocompleteProps = {
  storeId: string | undefined;
  onSelectStore: (store: StoreOption) => void;
  onClearStore: () => void;
};

function StoreSearchAutocomplete({
  storeId,
  onSelectStore,
  onClearStore,
}: StoreSearchAutocompleteProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [draft, setDraft] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchState, dispatchSearch] = useReducer(autocompleteReducer, initialAutocompleteState);
  const debouncedDraft = useDebouncedValue(draft, 400);
  const hasSelection = storeId != null && storeId.length > 0;
  const showClear = draft.trim().length > 0 || hasSelection;

  useEffect(() => {
    if (!storeId) {
      return;
    }
    let cancelled = false;
    void fetchSellerAccounts({ page: 0, size: 50, isActive: true }).then((page) => {
      if (cancelled) {
        return;
      }
      const match = page.content.find((seller) => seller.store.id === storeId);
      if (match) {
        setDraft(match.store.businessName);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  useEffect(() => {
    if (hasSelection || !dropdownOpen) {
      return;
    }
    const query = debouncedDraft.trim();
    if (query.length === 0) {
      dispatchSearch({ type: 'RESET' });
      return;
    }
    let cancelled = false;
    dispatchSearch({ type: 'FETCH_BEGIN' });
    void fetchSellerAccounts({ page: 0, size: 20, search: query, isActive: true })
      .then((page) => {
        if (!cancelled) {
          dispatchSearch({
            type: 'FETCH_OK',
            payload: sellersToStoreOptions(page.content),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatchSearch({ type: 'FETCH_ERR' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedDraft, dropdownOpen, hasSelection]);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const showDropdown = dropdownOpen && !hasSelection && debouncedDraft.trim().length > 0;
  const storeOptions = searchState.options as StoreOption[];

  return (
    <div ref={rootRef} className="relative min-w-[min(100%,14rem)] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
      <input
        type="search"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (hasSelection) {
            onClearStore();
          }
          setDropdownOpen(true);
        }}
        onFocus={() => {
          if (!hasSelection && draft.trim().length > 0) {
            setDropdownOpen(true);
          }
        }}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Escape') {
            setDropdownOpen(false);
          }
        }}
        placeholder="Buscar tienda..."
        className={cn(
          'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]',
          showClear ? 'pr-10' : 'pr-3',
        )}
      />
      {showClear ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          onClick={() => {
            setDraft('');
            dispatchSearch({ type: 'RESET' });
            setDropdownOpen(false);
            onClearStore();
          }}
          aria-label="Limpiar tienda"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg">
          {searchState.loading ? (
            <DropdownSkeleton />
          ) : searchState.hasSearched && storeOptions.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[var(--text-muted)]">No se encontró ninguna tienda</p>
          ) : (
            <ul id={listboxId} className="max-h-56 overflow-y-auto py-1">
              {storeOptions.map((store) => (
                <li key={store.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-hover)]"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setDraft(store.businessName);
                      setDropdownOpen(false);
                      dispatchSearch({ type: 'RESET' });
                      onSelectStore(store);
                    }}
                  >
                    {store.businessName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

type ProductSearchAutocompleteProps = {
  productId: string | undefined;
  storeId: string | undefined;
  onSelectProduct: (product: ProductOption) => void;
  onClearProduct: () => void;
};

function ProductSearchAutocomplete({
  productId,
  storeId,
  onSelectProduct,
  onClearProduct,
}: ProductSearchAutocompleteProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [draft, setDraft] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchState, dispatchSearch] = useReducer(autocompleteReducer, initialAutocompleteState);
  const debouncedDraft = useDebouncedValue(draft, 400);
  const hasSelection = productId != null && productId.length > 0;
  const showClear = draft.trim().length > 0 || hasSelection;

  useEffect(() => {
    if (!productId) {
      setDraft('');
      return;
    }
    let cancelled = false;
    void fetchAdminProducts({ page: 0, size: 100 }).then((page) => {
      if (cancelled) {
        return;
      }
      const match = page.content.find((p) => p.id === productId);
      if (match) {
        setDraft(match.name);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (hasSelection || !dropdownOpen) {
      return;
    }
    const query = debouncedDraft.trim();
    if (query.length === 0) {
      dispatchSearch({ type: 'RESET' });
      return;
    }
    let cancelled = false;
    dispatchSearch({ type: 'FETCH_BEGIN' });
    void fetchAdminProducts({
      page: 0,
      size: 20,
      search: query,
      storeId: storeId?.trim() || undefined,
    })
      .then((page) => {
        if (!cancelled) {
          dispatchSearch({ type: 'FETCH_OK', payload: productsToOptions(page.content) });
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatchSearch({ type: 'FETCH_ERR' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedDraft, dropdownOpen, hasSelection, storeId]);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const showDropdown = dropdownOpen && !hasSelection && debouncedDraft.trim().length > 0;
  const productOptions = searchState.options as ProductOption[];

  return (
    <div ref={rootRef} className="relative min-w-[min(100%,14rem)] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
      <input
        type="search"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (hasSelection) {
            onClearProduct();
          }
          setDropdownOpen(true);
        }}
        onFocus={() => {
          if (!hasSelection && draft.trim().length > 0) {
            setDropdownOpen(true);
          }
        }}
        placeholder="Buscar producto..."
        className={cn(
          'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 text-sm outline-none focus:border-[var(--border-focus)]',
          showClear ? 'pr-10' : 'pr-3',
        )}
      />
      {showClear ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          onClick={() => {
            setDraft('');
            dispatchSearch({ type: 'RESET' });
            setDropdownOpen(false);
            onClearProduct();
          }}
          aria-label="Limpiar producto"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg">
          {searchState.loading ? (
            <DropdownSkeleton />
          ) : searchState.hasSearched && productOptions.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[var(--text-muted)]">No se encontró ningún producto</p>
          ) : (
            <ul id={listboxId} className="max-h-56 overflow-y-auto py-1">
              {productOptions.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left hover:bg-[var(--bg-hover)]"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setDraft(product.name);
                      setDropdownOpen(false);
                      dispatchSearch({ type: 'RESET' });
                      onSelectProduct(product);
                    }}
                  >
                    <span className="block text-sm text-[var(--text-primary)]">{product.name}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{product.storeName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AdminReviewsListPage() {
  const { success } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listState, dispatch] = useReducer(reviewsListReducer, initialListState);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const detailPanelRef = useRef<HTMLElement>(null);
  const pendingScrollToDetailRef = useRef(false);

  const pageOneBased = useMemo(() => parsePageOneBased(searchParams.get('page')), [searchParams]);
  const referenceTypeFilter = useMemo(
    () => referenceTypeFromParams(searchParams.get('referenceType')),
    [searchParams],
  );
  const storeIdFilter = searchParams.get('storeId')?.trim() || undefined;
  const productIdFilter = searchParams.get('productId')?.trim() || undefined;
  const urlBuyerSearch = searchParams.get('buyerSearch') ?? '';
  const ratingFilter = useMemo(() => ratingFromParams(searchParams.get('rating')), [searchParams]);
  const visibilityFilter = useMemo(
    () => visibilityFromParams(searchParams.get('isVisible')),
    [searchParams],
  );

  const [buyerSearchDraft, setBuyerSearchDraft] = useState(urlBuyerSearch);
  useEffect(() => {
    setBuyerSearchDraft(urlBuyerSearch);
  }, [urlBuyerSearch]);

  const debouncedBuyerSearch = useDebouncedValue(buyerSearchDraft, 400);

  useEffect(() => {
    const trimmedUrl = urlBuyerSearch.trim();
    const trimmedDebounced = debouncedBuyerSearch.trim();
    if (trimmedDebounced === trimmedUrl) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (trimmedDebounced.length > 0) {
      next.set('buyerSearch', trimmedDebounced);
    } else {
      next.delete('buyerSearch');
    }
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [debouncedBuyerSearch, searchParams, setSearchParams, urlBuyerSearch]);

  const queryKey = useMemo(
    () => ({
      pageZero: pageOneBased - 1,
      referenceType: referenceTypeFilter,
      storeId: storeIdFilter,
      productId: productIdFilter,
      buyerSearch: debouncedBuyerSearch.trim(),
      rating: ratingFilter,
      isVisible: visibilityFilter,
      refreshNonce,
    }),
    [
      pageOneBased,
      referenceTypeFilter,
      storeIdFilter,
      productIdFilter,
      debouncedBuyerSearch,
      ratingFilter,
      visibilityFilter,
      refreshNonce,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_BEGIN' });
    void fetchAdminReviews({
      page: queryKey.pageZero,
      size: ADMIN_REVIEWS_PAGE_SIZE,
      referenceType: queryKey.referenceType,
      storeId: queryKey.storeId,
      productId: queryKey.productId,
      buyerSearch: queryKey.buyerSearch.length > 0 ? queryKey.buyerSearch : undefined,
      rating: queryKey.rating,
      isVisible: queryKey.isVisible,
    })
      .then((page) => {
        if (!cancelled) {
          dispatch({ type: 'FETCH_OK', payload: page });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError) {
          dispatch({ type: 'FETCH_ERR', payload: error.message });
        } else if (error instanceof Error) {
          dispatch({ type: 'FETCH_ERR', payload: error.message });
        } else {
          dispatch({ type: 'FETCH_ERR', payload: 'No se pudo cargar el listado de reseñas.' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  const goPage = useCallback(
    (p: number) => {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(p));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setReferenceTypeFilter = useCallback(
    (value: 'all' | ReferenceType) => {
      const next = new URLSearchParams(searchParams);
      if (value === 'all') {
        next.delete('referenceType');
      } else {
        next.set('referenceType', value);
      }
      next.delete('storeId');
      next.delete('productId');
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const selectStore = useCallback(
    (store: StoreOption) => {
      const next = new URLSearchParams(searchParams);
      next.set('storeId', store.id);
      next.delete('productId');
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearStore = useCallback(() => {
    if (!searchParams.get('storeId')) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete('storeId');
    next.delete('productId');
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const selectProduct = useCallback(
    (product: ProductOption) => {
      const next = new URLSearchParams(searchParams);
      next.set('productId', product.id);
      next.set('storeId', product.storeId);
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearProduct = useCallback(() => {
    if (!searchParams.get('productId')) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete('productId');
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const setRatingFilter = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value === 'all') {
        next.delete('rating');
      } else {
        next.set('rating', value);
      }
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setVisibilityFilterParam = useCallback(
    (value: 'all' | 'true' | 'false') => {
      const next = new URLSearchParams(searchParams);
      if (value === 'all') {
        next.delete('isVisible');
      } else {
        next.set('isVisible', value);
      }
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const openReview = useCallback((review: AdminReview) => {
    setSelectedReview(review);
    pendingScrollToDetailRef.current = true;
  }, []);

  useEffect(() => {
    if (!selectedReview || !pendingScrollToDetailRef.current) {
      return;
    }
    pendingScrollToDetailRef.current = false;
    const timer = window.setTimeout(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [selectedReview]);

  const handleVisibilityChange = useCallback((updated: AdminReview, message: string) => {
    success(message);
    setSelectedReview(updated);
    dispatch({ type: 'PATCH_REVIEW', payload: updated });
  }, [success]);

  const handleDelete = useCallback((reviewId: string, message: string) => {
    success(message);
    setSelectedReview(null);
    dispatch({ type: 'REMOVE_REVIEW', payload: reviewId });
    setRefreshNonce((n) => n + 1);
  }, [success]);

  const data = listState.data;
  const loading = listState.loading;
  const showSkeleton = loading && !data;
  const totalPages =
    data != null ? Math.max(1, Math.ceil((data.totalElements || 0) / Math.max(1, data.size))) : 1;
  const hasFilters =
    referenceTypeFilter !== undefined ||
    storeIdFilter !== undefined ||
    productIdFilter !== undefined ||
    debouncedBuyerSearch.trim().length > 0 ||
    ratingFilter !== undefined ||
    visibilityFilter !== undefined;

  const showProductFilter =
    referenceTypeFilter === undefined || referenceTypeFilter === REFERENCE_TYPE.PRODUCT;

  const referenceTypeSelectValue = referenceTypeFilter ?? 'all';
  const ratingSelectValue = ratingFilter != null ? String(ratingFilter) : 'all';
  const visibilitySelectValue =
    visibilityFilter === true ? 'true' : visibilityFilter === false ? 'false' : 'all';

  const columns: DataColumn<AdminReview>[] = useMemo(
    (): DataColumn<AdminReview>[] => [
      {
        id: 'review',
        header: 'Reseña',
        wrap: true,
        cell: (row) => {
          const truncated = truncateComment(row.comment);
          return (
            <div className="min-w-[12rem]">
              <RatingStars rating={row.rating} className="[&_svg]:size-3.5" />
              <p
                className={cn(
                  'mt-1.5 text-sm',
                  truncated ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]',
                )}
              >
                {truncated ?? 'Sin comentario'}
              </p>
            </div>
          );
        },
      },
      {
        id: 'type',
        header: 'Tipo',
        cell: (row) => (
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
              row.referenceType === REFERENCE_TYPE.STORE
                ? 'bg-brand/15 text-brand'
                : 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]',
            )}
          >
            {row.referenceType === REFERENCE_TYPE.STORE ? 'Tienda' : 'Producto'}
          </span>
        ),
      },
      {
        id: 'about',
        header: 'Sobre',
        cell: (row) => (
          <span className="text-[var(--text-secondary)]">
            {row.referenceType === REFERENCE_TYPE.PRODUCT && row.product
              ? row.product.name
              : row.store.businessName}
          </span>
        ),
      },
      {
        id: 'buyer',
        header: 'Comprador',
        wrap: true,
        cell: (row) => (
          <div className="min-w-[10rem]">
            <p className="text-sm text-[var(--text-primary)]">
              {row.buyer.displayName?.trim() || (
                <span className="text-[var(--text-muted)]">Sin nombre</span>
              )}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{row.buyer.email}</p>
          </div>
        ),
      },
      {
        id: 'visibility',
        header: 'Visibilidad',
        cell: (row) => (
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
              row.isVisible
                ? 'bg-success/15 text-success'
                : 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]',
            )}
          >
            {row.isVisible ? 'Visible' : 'Oculta'}
          </span>
        ),
      },
      {
        id: 'date',
        header: 'Fecha',
        cell: (row) => (
          <span className="text-[var(--text-secondary)]">{formatDate(row.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        align: 'right',
        cell: (row) => (
          <button
            type="button"
            title="Ver detalle"
            aria-label="Ver detalle de la reseña"
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-brand"
            onClick={(e) => {
              e.stopPropagation();
              openReview(row);
            }}
          >
            <Eye className="size-4" aria-hidden />
            <span className="sr-only">Ver detalle</span>
          </button>
        ),
      },
    ],
    [openReview],
  );

  return (
    <div className="-m-6 flex flex-col p-6">
      <header className="shrink-0">
          <h1 className="font-display text-display-md text-[var(--text-primary)]">
            Moderación de reseñas
            {data != null ? (
              <span className="ml-2 text-lg font-semibold text-[var(--text-muted)]">
                ({data.totalElements})
              </span>
            ) : null}
          </h1>
        </header>

        <div className="mt-4 shrink-0 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <select
              value={referenceTypeSelectValue}
              onChange={(e) =>
                setReferenceTypeFilter(e.target.value as 'all' | ReferenceType)
              }
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm outline-none focus:border-[var(--border-focus)] lg:w-auto"
              aria-label="Filtrar por tipo de reseña"
            >
              <option value="all">Todas</option>
              <option value={REFERENCE_TYPE.STORE}>De tiendas</option>
              <option value={REFERENCE_TYPE.PRODUCT}>De productos</option>
            </select>
            <StoreSearchAutocomplete
              storeId={storeIdFilter}
              onSelectStore={selectStore}
              onClearStore={clearStore}
            />
            {showProductFilter ? (
              <ProductSearchAutocomplete
                productId={productIdFilter}
                storeId={storeIdFilter}
                onSelectProduct={selectProduct}
                onClearProduct={clearProduct}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative min-w-[min(100%,16rem)] flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
                aria-hidden
              />
              <input
                type="search"
                value={buyerSearchDraft}
                onChange={(e) => setBuyerSearchDraft(e.target.value)}
                placeholder="Buscar por nombre o email del comprador..."
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 pr-3 text-sm outline-none focus:border-[var(--border-focus)]"
              />
            </div>
            <select
              value={ratingSelectValue}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm outline-none focus:border-[var(--border-focus)] lg:w-auto"
              aria-label="Filtrar por rating"
            >
              <option value="all">Todos</option>
              <option value="5">5★</option>
              <option value="4">4★</option>
              <option value="3">3★</option>
              <option value="2">2★</option>
              <option value="1">1★</option>
            </select>
            <select
              value={visibilitySelectValue}
              onChange={(e) => setVisibilityFilterParam(e.target.value as 'all' | 'true' | 'false')}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm outline-none focus:border-[var(--border-focus)] lg:w-auto"
              aria-label="Filtrar por visibilidad"
            >
              <option value="all">Todas</option>
              <option value="true">Visibles</option>
              <option value="false">Ocultas</option>
            </select>
          </div>
        </div>

        <section className="mt-4 flex max-h-[min(55vh,520px)] min-h-[16rem] flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          {listState.errorMessage ? (
            <p
              role="alert"
              className="shrink-0 border-b border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {listState.errorMessage}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {showSkeleton ? <ReviewsTableSkeleton /> : null}

            {!loading && data && data.content.length === 0 ? (
              <EmptyState
                title={
                  hasFilters
                    ? 'No se encontraron reseñas con esos criterios'
                    : 'No hay reseñas en la plataforma'
                }
              />
            ) : null}

            {data != null && data.content.length > 0 ? (
              <DataTable<AdminReview>
                columns={columns}
                data={data.content}
                getRowKey={(row) => row.id}
                className="-mx-2"
                onRowClick={(row) => openReview(row)}
              />
            ) : null}

            {loading && data ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Loader2 className="size-4 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
                Actualizando…
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[var(--border)] px-4 py-3">
            <Pagination
              disabled={loading || data == null}
              currentPage={pageOneBased}
              totalPages={totalPages}
              onPageChange={goPage}
            />
          </div>
        </section>

        {selectedReview ? (
          <div className="mt-4 shrink-0 scroll-mt-4">
            <ReviewDetailPanel
              review={selectedReview}
              panelRef={detailPanelRef}
              onClose={() => setSelectedReview(null)}
              onVisibilityChange={handleVisibilityChange}
              onDelete={handleDelete}
            />
          </div>
        ) : null}
    </div>
  );
}