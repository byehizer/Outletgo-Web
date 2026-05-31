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
import { ProductDetailPanel } from '../../../features/admin/ProductDetailPanel';
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  fetchAdminProducts,
} from '../../../features/admin/moderationApi';
import { fetchSellerAccounts } from '../../../features/admin/sellersApi';
import { ProductStatusBadge } from '../../../features/products/ProductStatusBadge';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../lib/cn';
import { formatARS, formatDate } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import type { Page } from '../../../types/api';
import type { AdminProduct } from '../../../types/moderation';
import { PRODUCT_STATUS, type ProductStatus } from '../../../types/product';

type ProductsListUiState = {
  data: Page<AdminProduct> | null;
  loading: boolean;
  errorMessage: string | null;
};

type ProductsListAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: Page<AdminProduct> }
  | { type: 'FETCH_ERR'; payload: string };

type StoreOption = {
  id: string;
  businessName: string;
};

type StoreSearchUiState = {
  options: StoreOption[];
  loading: boolean;
  hasSearched: boolean;
};

type StoreSearchAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: StoreOption[] }
  | { type: 'FETCH_ERR' }
  | { type: 'RESET' };

function productsListReducer(
  state: ProductsListUiState,
  action: ProductsListAction,
): ProductsListUiState {
  switch (action.type) {
    case 'FETCH_BEGIN':
      return { ...state, loading: true, errorMessage: null };
    case 'FETCH_OK':
      return { data: action.payload, loading: false, errorMessage: null };
    case 'FETCH_ERR':
      return { data: null, loading: false, errorMessage: action.payload };
    default:
      return state;
  }
}

function storeSearchReducer(state: StoreSearchUiState, action: StoreSearchAction): StoreSearchUiState {
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

const initialListState: ProductsListUiState = {
  data: null,
  loading: true,
  errorMessage: null,
};

const initialStoreSearchState: StoreSearchUiState = {
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

function statusFromParams(raw: string | null): ProductStatus | undefined {
  if (raw === PRODUCT_STATUS.ACTIVE) {
    return PRODUCT_STATUS.ACTIVE;
  }
  if (raw === PRODUCT_STATUS.PAUSED_BY_SELLER) {
    return PRODUCT_STATUS.PAUSED_BY_SELLER;
  }
  if (raw === PRODUCT_STATUS.DISABLED_BY_ADMIN) {
    return PRODUCT_STATUS.DISABLED_BY_ADMIN;
  }
  return undefined;
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
    stores.push({
      id: seller.store.id,
      businessName: seller.store.businessName,
    });
  }
  return stores.sort((a, b) => a.businessName.localeCompare(b.businessName, 'es'));
}

function ProductsTableSkeleton() {
  return (
    <div className="-mx-1 overflow-x-auto" aria-hidden>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {['Producto', 'Tienda', 'Precio', 'Estado', 'Creado', 'Acciones'].map((col) => (
              <th
                key={col}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i} className="bg-[var(--bg-card)]">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-5 w-24 rounded-full" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-8 w-8" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StoreDropdownSkeleton() {
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
  const [searchState, dispatchSearch] = useReducer(storeSearchReducer, initialStoreSearchState);

  const debouncedDraft = useDebouncedValue(draft, 400);
  const hasSelection = storeId != null && storeId.length > 0;
  const showClear = draft.trim().length > 0 || hasSelection;

  useEffect(() => {
    if (!storeId) {
      return;
    }
    let cancelled = false;
    void fetchSellerAccounts({ page: 0, size: 50, isActive: true })
      .then((page) => {
        if (cancelled) {
          return;
        }
        const match = page.content.find((seller) => seller.store.id === storeId);
        if (match) {
          setDraft(match.store.businessName);
        }
      })
      .catch(() => {
        /* mantener draft vacío si falla la resolución del nombre */
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
          dispatchSearch({ type: 'FETCH_OK', payload: sellersToStoreOptions(page.content) });
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

  const showDropdown =
    dropdownOpen && !hasSelection && debouncedDraft.trim().length > 0;

  const handleClear = () => {
    setDraft('');
    dispatchSearch({ type: 'RESET' });
    setDropdownOpen(false);
    onClearStore();
  };

  const handleSelect = (store: StoreOption) => {
    setDraft(store.businessName);
    setDropdownOpen(false);
    dispatchSearch({ type: 'RESET' });
    onSelectStore(store);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-[min(100%,16rem)] flex-1">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
        aria-hidden
      />
      <input
        type="search"
        value={draft}
        onChange={(e) => {
          const value = e.target.value;
          setDraft(value);
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
        onKeyDown={handleInputKeyDown}
        placeholder="Buscar tienda..."
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listboxId : undefined}
        aria-autocomplete="list"
        className={cn(
          'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]',
          showClear ? 'pr-10' : 'pr-3',
        )}
      />
      {showClear ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          onClick={handleClear}
          aria-label="Limpiar tienda seleccionada"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}

      {showDropdown ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg"
        >
          {searchState.loading ? (
            <StoreDropdownSkeleton />
          ) : searchState.hasSearched && searchState.options.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[var(--text-muted)]">
              No se encontró ninguna tienda
            </p>
          ) : (
            <ul id={listboxId} role="listbox" className="max-h-56 overflow-y-auto py-1">
              {searchState.options.map((store) => (
                <li key={store.id} role="option">
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(store)}
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

export function AdminProductsListPage() {
  const { success } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listState, dispatch] = useReducer(productsListReducer, initialListState);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [panelRefreshNonce, setPanelRefreshNonce] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const detailPanelRef = useRef<HTMLElement>(null);
  const pendingScrollToDetailRef = useRef(false);

  const pageOneBased = useMemo(() => parsePageOneBased(searchParams.get('page')), [searchParams]);
  const urlSearch = searchParams.get('search') ?? '';
  const storeIdFilter = searchParams.get('storeId')?.trim() || undefined;
  const statusFilter = useMemo(
    () => statusFromParams(searchParams.get('status')),
    [searchParams],
  );

  const [searchDraft, setSearchDraft] = useState(urlSearch);

  useEffect(() => {
    setSearchDraft(urlSearch);
  }, [urlSearch]);

  const debouncedSearch = useDebouncedValue(searchDraft, 400);

  useEffect(() => {
    const trimmedUrl = urlSearch.trim();
    const trimmedDebounced = debouncedSearch.trim();
    if (trimmedDebounced === trimmedUrl) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (trimmedDebounced.length > 0) {
      next.set('search', trimmedDebounced);
    } else {
      next.delete('search');
    }
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams, urlSearch]);

  const queryKey = useMemo(
    () => ({
      pageZero: pageOneBased - 1,
      search: debouncedSearch.trim(),
      status: statusFilter,
      storeId: storeIdFilter,
      refreshNonce,
    }),
    [pageOneBased, debouncedSearch, statusFilter, storeIdFilter, refreshNonce],
  );

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_BEGIN' });

    void fetchAdminProducts({
      page: queryKey.pageZero,
      size: ADMIN_PRODUCTS_PAGE_SIZE,
      search: queryKey.search.length > 0 ? queryKey.search : undefined,
      status: queryKey.status,
      storeId: queryKey.storeId,
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
          dispatch({ type: 'FETCH_ERR', payload: 'No se pudo cargar el listado de productos.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  const bumpList = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  const goPage = useCallback(
    (p: number) => {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(p));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setStatusFilter = useCallback(
    (value: 'all' | ProductStatus) => {
      const next = new URLSearchParams(searchParams);
      if (value === 'all') {
        next.delete('status');
      } else {
        next.set('status', value);
      }
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const selectStore = useCallback(
    (store: StoreOption) => {
      const next = new URLSearchParams(searchParams);
      next.set('storeId', store.id);
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
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const openProduct = useCallback((productId: string) => {
    setSelectedProductId(productId);
    pendingScrollToDetailRef.current = true;
  }, []);

  useEffect(() => {
    if (!selectedProductId || !pendingScrollToDetailRef.current) {
      return;
    }
    pendingScrollToDetailRef.current = false;
    const timer = window.setTimeout(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [selectedProductId]);

  const handleStatusChange = useCallback(
    (message: string) => {
      success(message);
      bumpList();
      setPanelRefreshNonce((n) => n + 1);
    },
    [bumpList, success],
  );

  const statusSelectValue = statusFilter ?? 'all';

  const data = listState.data;
  const loading = listState.loading;
  const showSkeleton = loading && !data;
  const totalPages =
    data != null ? Math.max(1, Math.ceil((data.totalElements || 0) / Math.max(1, data.size))) : 1;
  const hasFilters =
    debouncedSearch.trim().length > 0 || statusFilter !== undefined || storeIdFilter !== undefined;

  const columns: DataColumn<AdminProduct>[] = useMemo(
    (): DataColumn<AdminProduct>[] => [
      {
        id: 'product',
        header: 'Producto',
        wrap: true,
        cell: (row) => {
          const thumb = row.images[0]?.imageUrl;
          return (
            <div className="flex min-w-[14rem] items-center gap-3">
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-lg border border-[var(--border)] object-cover"
                />
              ) : (
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-muted)]"
                  aria-hidden
                >
                  ?
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text-primary)]">{row.name}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">{row.category.name}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'store',
        header: 'Tienda',
        cell: (row) => (
          <span className="text-[var(--text-secondary)]">{row.store.businessName}</span>
        ),
      },
      {
        id: 'price',
        header: 'Precio',
        cell: (row) => (
          <span className="tabular-nums text-[var(--text-secondary)]">
            {formatARS(row.basePrice)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: (row) => <ProductStatusBadge status={row.status} />,
      },
      {
        id: 'created',
        header: 'Creado',
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
            aria-label="Ver detalle del producto"
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-brand"
            onClick={(e) => {
              e.stopPropagation();
              openProduct(row.id);
            }}
          >
            <Eye className="size-4" aria-hidden />
            <span className="sr-only">Ver detalle</span>
          </button>
        ),
      },
    ],
    [openProduct],
  );

  return (
    <div className="-m-6 flex flex-col p-6">
      <header className="shrink-0">
          <h1 className="font-display text-display-md text-[var(--text-primary)]">
            Moderación de productos
            {data != null ? (
              <span className="ml-2 text-lg font-semibold text-[var(--text-muted)]">
                ({data.totalElements})
              </span>
            ) : null}
          </h1>
        </header>

        <div className="mt-4 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative min-w-[min(100%,16rem)] flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
                aria-hidden
              />
              <input
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Buscar producto..."
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </div>
            <StoreSearchAutocomplete
              storeId={storeIdFilter}
              onSelectStore={selectStore}
              onClearStore={clearStore}
            />
            <select
              value={statusSelectValue}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ProductStatus)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] lg:w-auto"
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos</option>
              <option value={PRODUCT_STATUS.ACTIVE}>Activos</option>
              <option value={PRODUCT_STATUS.PAUSED_BY_SELLER}>Pausados</option>
              <option value={PRODUCT_STATUS.DISABLED_BY_ADMIN}>Inhabilitados</option>
            </select>
          </div>
        </div>

        <section className="mt-4 flex max-h-[min(55vh,520px)] min-h-[16rem] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          {listState.errorMessage ? (
            <p
              role="alert"
              className="shrink-0 border-b border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {listState.errorMessage}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {showSkeleton ? <ProductsTableSkeleton /> : null}

            {!loading && data && data.content.length === 0 ? (
              <EmptyState
                title={
                  hasFilters
                    ? 'No se encontraron productos con esos criterios'
                    : 'No hay productos en la plataforma'
                }
              />
            ) : null}

            {data != null && data.content.length > 0 ? (
              <DataTable<AdminProduct>
                columns={columns}
                data={data.content}
                getRowKey={(row) => row.id}
                className="-mx-2"
                onRowClick={(row) => openProduct(row.id)}
              />
            ) : null}

            {loading && data ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Loader2
                  className="size-4 animate-spin text-brand motion-reduce:animate-none"
                  aria-hidden
                />
                Actualizando…
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
            <Pagination
              disabled={loading || data == null}
              currentPage={pageOneBased}
              totalPages={totalPages}
              onPageChange={goPage}
            />
          </div>
        </section>

        {selectedProductId ? (
          <div className="mt-4 shrink-0 scroll-mt-4">
            <ProductDetailPanel
              productId={selectedProductId}
              refreshNonce={panelRefreshNonce}
              panelRef={detailPanelRef}
              onClose={() => setSelectedProductId(null)}
              onStatusChange={handleStatusChange}
            />
          </div>
        ) : null}
    </div>
  );
}
