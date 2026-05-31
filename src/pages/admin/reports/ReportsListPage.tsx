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
import { fetchAdminProducts } from '../../../features/admin/moderationApi';
import { ReportDetailPanel } from '../../../features/admin/ReportDetailPanel';
import {
  ADMIN_REPORTS_PAGE_SIZE,
  fetchProductReports,
  fetchStoreReports,
} from '../../../features/admin/reportsApi';
import { fetchSellerAccounts } from '../../../features/admin/sellersApi';
import { ProductStatusBadge } from '../../../features/products/ProductStatusBadge';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { cn } from '../../../lib/cn';
import { formatDate } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import type { Page } from '../../../types/api';
import {
  REPORT_RESOLUTION_TYPE,
  REPORT_STATUS,
  type ProductReport,
  type ReportResolutionType,
  type ReportStatus,
  type StoreReport,
} from '../../../types/report';

type ReportsTab = 'products' | 'stores';

type SelectedReport =
  | { reportType: 'PRODUCT'; report: ProductReport }
  | { reportType: 'STORE'; report: StoreReport };

type ReportsListUiState = {
  tab: ReportsTab;
  data: Page<ProductReport> | Page<StoreReport> | null;
  loading: boolean;
  errorMessage: string | null;
};

type ReportsListAction =
  | { type: 'FETCH_BEGIN'; tab: ReportsTab }
  | { type: 'FETCH_OK'; tab: ReportsTab; payload: Page<ProductReport> | Page<StoreReport> }
  | { type: 'FETCH_ERR'; payload: string }
  | {
      type: 'PATCH_REPORT';
      tab: ReportsTab;
      payload: ProductReport | StoreReport;
    };

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

function reportsListReducer(
  state: ReportsListUiState,
  action: ReportsListAction,
): ReportsListUiState {
  switch (action.type) {
    case 'FETCH_BEGIN':
      return {
        tab: action.tab,
        data: action.tab !== state.tab ? null : state.data,
        loading: true,
        errorMessage: null,
      };
    case 'FETCH_OK':
      return {
        tab: action.tab,
        data: action.payload,
        loading: false,
        errorMessage: null,
      };
    case 'FETCH_ERR':
      return { ...state, data: null, loading: false, errorMessage: action.payload };
    case 'PATCH_REPORT': {
      if (!state.data || state.tab !== action.tab) {
        return state;
      }
      if (action.tab === 'products') {
        const page = state.data as Page<ProductReport>;
        const updated = action.payload as ProductReport;
        return {
          ...state,
          data: {
            ...page,
            content: page.content.map((row) => (row.id === updated.id ? updated : row)),
          },
        };
      }
      const page = state.data as Page<StoreReport>;
      const updated = action.payload as StoreReport;
      return {
        ...state,
        data: {
          ...page,
          content: page.content.map((row) => (row.id === updated.id ? updated : row)),
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

const initialListState: ReportsListUiState = {
  tab: 'products',
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

function tabFromParams(raw: string | null): ReportsTab {
  return raw === 'stores' ? 'stores' : 'products';
}

function statusFromParams(raw: string | null): ReportStatus | undefined {
  if (raw === REPORT_STATUS.PENDING) {
    return REPORT_STATUS.PENDING;
  }
  if (raw === REPORT_STATUS.DISMISSED) {
    return REPORT_STATUS.DISMISSED;
  }
  if (raw === REPORT_STATUS.RESOLVED) {
    return REPORT_STATUS.RESOLVED;
  }
  return undefined;
}

function truncateReason(text: string, max = 60): string {
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

function ReportStatusBadge({
  status,
  resolutionType,
}: {
  status: ReportStatus;
  resolutionType: ReportResolutionType | null;
}) {
  if (status === REPORT_STATUS.PENDING) {
    return (
      <span className="inline-flex rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
        Pendiente
      </span>
    );
  }
  if (status === REPORT_STATUS.DISMISSED) {
    return (
      <span className="inline-flex rounded-full bg-[var(--text-muted)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
        Desestimado
      </span>
    );
  }
  if (resolutionType === REPORT_RESOLUTION_TYPE.DISABLED) {
    return (
      <span className="inline-flex rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-semibold text-danger">
        Resuelto — inhabilitado
      </span>
    );
  }
  if (resolutionType === REPORT_RESOLUTION_TYPE.WARNED) {
    return (
      <span className="inline-flex rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
        Resuelto — advertencia
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
      Resuelto
    </span>
  );
}

function StoreActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        isActive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
      )}
    >
      {isActive ? 'Activa' : 'Inactiva'}
    </span>
  );
}

function ReportsTableSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <div className="-mx-1 overflow-x-auto" aria-hidden>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {Array.from({ length: columnCount }, (_, i) => (
              <th
                key={i}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
              >
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i} className="bg-[var(--bg-card)]">
              {Array.from({ length: columnCount }, (_, j) => (
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
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
        aria-hidden
      />
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
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
        aria-hidden
      />
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

export function ReportsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listState, dispatch] = useReducer(reportsListReducer, initialListState);
  const [selectedReport, setSelectedReport] = useState<SelectedReport | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const detailPanelRef = useRef<HTMLElement>(null);
  const pendingScrollToDetailRef = useRef(false);

  const activeTab = useMemo(() => tabFromParams(searchParams.get('tab')), [searchParams]);
  const pageOneBased = useMemo(() => parsePageOneBased(searchParams.get('page')), [searchParams]);
  const statusFilter = useMemo(() => statusFromParams(searchParams.get('status')), [searchParams]);
  const storeIdFilter = searchParams.get('storeId')?.trim() || undefined;
  const productIdFilter = searchParams.get('productId')?.trim() || undefined;

  const queryKey = useMemo(
    () => ({
      tab: activeTab,
      pageZero: pageOneBased - 1,
      status: statusFilter,
      storeId: storeIdFilter,
      productId: productIdFilter,
      refreshNonce,
    }),
    [activeTab, pageOneBased, statusFilter, storeIdFilter, productIdFilter, refreshNonce],
  );

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_BEGIN', tab: queryKey.tab });
    const fetch =
      queryKey.tab === 'products'
        ? fetchProductReports({
            page: queryKey.pageZero,
            size: ADMIN_REPORTS_PAGE_SIZE,
            status: queryKey.status,
            storeId: queryKey.storeId,
            productId: queryKey.productId,
          })
        : fetchStoreReports({
            page: queryKey.pageZero,
            size: ADMIN_REPORTS_PAGE_SIZE,
            status: queryKey.status,
            storeId: queryKey.storeId,
          });

    void fetch
      .then((page) => {
        if (!cancelled) {
          dispatch({ type: 'FETCH_OK', tab: queryKey.tab, payload: page });
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
          dispatch({ type: 'FETCH_ERR', payload: 'No se pudieron cargar los reportes.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  useEffect(() => {
    let cancelled = false;
    const fetchPending =
      activeTab === 'products'
        ? fetchProductReports({
            page: 0,
            size: 1,
            status: REPORT_STATUS.PENDING,
            storeId: storeIdFilter,
            productId: productIdFilter,
          })
        : fetchStoreReports({
            page: 0,
            size: 1,
            status: REPORT_STATUS.PENDING,
            storeId: storeIdFilter,
          });

    void fetchPending.then((page) => {
      if (!cancelled) {
        setPendingCount(page.totalElements);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeTab, storeIdFilter, productIdFilter, refreshNonce]);

  const { data, loading, errorMessage, tab: listTab } = listState;
  const dataReady = !loading && data != null && listTab === activeTab;
  const showSkeleton = loading && (data == null || listTab !== activeTab);
  const totalPages = dataReady ? Math.max(1, Math.ceil(data.totalElements / data.size)) : 1;

  const hasFilters =
    statusFilter != null ||
    storeIdFilter != null ||
    (activeTab === 'products' && productIdFilter != null);

  const setTab = (tab: ReportsTab) => {
    if (tab === activeTab) {
      return;
    }
    const next = new URLSearchParams();
    next.set('tab', tab);
    const status = searchParams.get('status');
    if (status) {
      next.set('status', status);
    }
    next.set('page', '1');
    setSearchParams(next, { replace: true });
    setSelectedReport(null);
  };

  const goPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next, { replace: true });
  };

  const setStatusFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') {
      next.delete('status');
    } else {
      next.set('status', value);
    }
    next.set('page', '1');
    setSearchParams(next, { replace: true });
    setSelectedReport(null);
  };

  const selectStore = (store: StoreOption) => {
    const next = new URLSearchParams(searchParams);
    next.set('storeId', store.id);
    next.set('page', '1');
    setSearchParams(next, { replace: true });
    setSelectedReport(null);
  };

  const clearStore = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('storeId');
    if (activeTab === 'products') {
      next.delete('productId');
    }
    next.set('page', '1');
    setSearchParams(next, { replace: true });
    setSelectedReport(null);
  };

  const selectProduct = (product: ProductOption) => {
    const next = new URLSearchParams(searchParams);
    next.set('productId', product.id);
    next.set('storeId', product.storeId);
    next.set('page', '1');
    setSearchParams(next, { replace: true });
    setSelectedReport(null);
  };

  const clearProduct = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('productId');
    next.set('page', '1');
    setSearchParams(next, { replace: true });
    setSelectedReport(null);
  };

  const openProductReport = useCallback((report: ProductReport) => {
    setSelectedReport({ reportType: 'PRODUCT', report });
    pendingScrollToDetailRef.current = true;
  }, []);

  const openStoreReport = useCallback((report: StoreReport) => {
    setSelectedReport({ reportType: 'STORE', report });
    pendingScrollToDetailRef.current = true;
  }, []);

  useEffect(() => {
    if (!selectedReport || !pendingScrollToDetailRef.current) {
      return;
    }
    pendingScrollToDetailRef.current = false;
    const timer = window.setTimeout(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [selectedReport]);

  const handleReportChange = useCallback(
    (updated: ProductReport | StoreReport) => {
      const tab: ReportsTab =
        'product' in updated ? 'products' : 'stores';
      dispatch({ type: 'PATCH_REPORT', tab, payload: updated });
      if ('product' in updated) {
        setSelectedReport({ reportType: 'PRODUCT', report: updated });
      } else {
        setSelectedReport({ reportType: 'STORE', report: updated });
      }
      setRefreshNonce((n) => n + 1);
    },
    [],
  );

  const productColumns = useMemo(
    (): DataColumn<ProductReport>[] => [
      {
        id: 'product',
        header: 'Producto',
        cell: (row) => (
          <div>
            <p className="font-medium text-[var(--text-primary)]">{row.product.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{row.product.store.businessName}</p>
          </div>
        ),
      },
      {
        id: 'reason',
        header: 'Motivo',
        wrap: true,
        cell: (row) => (
          <span className="text-[var(--text-secondary)]">{truncateReason(row.reason)}</span>
        ),
      },
      {
        id: 'reporter',
        header: 'Reportado por',
        cell: (row) => (
          <div>
            <p className="text-sm text-[var(--text-primary)]">
              {row.reporter.displayName?.trim() || (
                <span className="text-[var(--text-muted)]">Sin nombre</span>
              )}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{row.reporter.email}</p>
          </div>
        ),
      },
      {
        id: 'productStatus',
        header: 'Estado producto',
        cell: (row) => <ProductStatusBadge status={row.product.currentStatus} />,
      },
      {
        id: 'reportStatus',
        header: 'Estado reporte',
        cell: (row) => (
          <ReportStatusBadge status={row.status} resolutionType={row.resolutionType} />
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
            aria-label="Ver detalle del reporte"
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-brand"
            onClick={(e) => {
              e.stopPropagation();
              openProductReport(row);
            }}
          >
            <Eye className="size-4" aria-hidden />
            <span className="sr-only">Ver detalle</span>
          </button>
        ),
      },
    ],
    [openProductReport],
  );

  const storeColumns = useMemo(
    (): DataColumn<StoreReport>[] => [
      {
        id: 'store',
        header: 'Tienda',
        cell: (row) => (
          <span className="font-medium text-[var(--text-primary)]">{row.store.businessName}</span>
        ),
      },
      {
        id: 'reason',
        header: 'Motivo',
        wrap: true,
        cell: (row) => (
          <span className="text-[var(--text-secondary)]">{truncateReason(row.reason)}</span>
        ),
      },
      {
        id: 'reporter',
        header: 'Reportado por',
        cell: (row) => (
          <div>
            <p className="text-sm text-[var(--text-primary)]">
              {row.reporter.displayName?.trim() || (
                <span className="text-[var(--text-muted)]">Sin nombre</span>
              )}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{row.reporter.email}</p>
          </div>
        ),
      },
      {
        id: 'storeStatus',
        header: 'Estado tienda',
        cell: (row) => <StoreActiveBadge isActive={row.store.isActive} />,
      },
      {
        id: 'reportStatus',
        header: 'Estado reporte',
        cell: (row) => (
          <ReportStatusBadge status={row.status} resolutionType={row.resolutionType} />
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
            aria-label="Ver detalle del reporte"
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-brand"
            onClick={(e) => {
              e.stopPropagation();
              openStoreReport(row);
            }}
          >
            <Eye className="size-4" aria-hidden />
            <span className="sr-only">Ver detalle</span>
          </button>
        ),
      },
    ],
    [openStoreReport],
  );

  const statusSelectValue = statusFilter ?? 'all';

  const productContent =
    dataReady && activeTab === 'products' ? (data as Page<ProductReport>).content : [];
  const storeContent =
    dataReady && activeTab === 'stores' ? (data as Page<StoreReport>).content : [];

  return (
    <div className="-m-6 flex flex-col p-6">
      <header className="shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-display-md text-[var(--text-primary)]">Reportes</h1>
          <span className="inline-flex rounded-full bg-warning/15 px-2.5 py-0.5 text-sm font-semibold text-warning">
            {pendingCount} pendientes
          </span>
          {dataReady ? (
            <span className="text-sm text-[var(--text-muted)]">{data.totalElements} en total</span>
          ) : null}
        </div>
      </header>

      <div className="mt-4 shrink-0 flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-1">
        <button
          type="button"
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none',
            activeTab === 'products'
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
          onClick={() => setTab('products')}
        >
          Productos
        </button>
        <button
          type="button"
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none',
            activeTab === 'stores'
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
          onClick={() => setTab('stores')}
        >
          Tiendas
        </button>
      </div>

      <div className="mt-4 shrink-0 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <StoreSearchAutocomplete
            storeId={storeIdFilter}
            onSelectStore={selectStore}
            onClearStore={clearStore}
          />
          {activeTab === 'products' ? (
            <ProductSearchAutocomplete
              productId={productIdFilter}
              storeId={storeIdFilter}
              onSelectProduct={selectProduct}
              onClearProduct={clearProduct}
            />
          ) : null}
          <select
            value={statusSelectValue}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm outline-none focus:border-[var(--border-focus)] lg:w-auto"
            aria-label="Filtrar por estado del reporte"
          >
            <option value="all">Todos</option>
            <option value={REPORT_STATUS.PENDING}>Pendientes</option>
            <option value={REPORT_STATUS.DISMISSED}>Desestimados</option>
            <option value={REPORT_STATUS.RESOLVED}>Resueltos</option>
          </select>
        </div>
      </div>

      <section className="mt-4 flex max-h-[min(55vh,520px)] min-h-[16rem] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        {errorMessage ? (
          <p
            role="alert"
            className="shrink-0 border-b border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {showSkeleton ? (
            <ReportsTableSkeleton columnCount={activeTab === 'products' ? 7 : 7} />
          ) : null}

          {!loading && dataReady && data.content.length === 0 ? (
            <EmptyState
              title={
                hasFilters
                  ? 'No se encontraron reportes con esos criterios'
                  : activeTab === 'products'
                    ? 'No hay reportes de productos'
                    : 'No hay reportes de tiendas'
              }
            />
          ) : null}

          {activeTab === 'products' && productContent.length > 0 ? (
            <DataTable<ProductReport>
              columns={productColumns}
              data={productContent}
              getRowKey={(row) => row.id}
              className="-mx-2"
              onRowClick={(row) => openProductReport(row)}
              getRowClassName={(row) =>
                row.status === REPORT_STATUS.PENDING
                  ? 'bg-warning/5 hover:bg-warning/10'
                  : undefined
              }
            />
          ) : null}

          {activeTab === 'stores' && storeContent.length > 0 ? (
            <DataTable<StoreReport>
              columns={storeColumns}
              data={storeContent}
              getRowKey={(row) => row.id}
              className="-mx-2"
              onRowClick={(row) => openStoreReport(row)}
              getRowClassName={(row) =>
                row.status === REPORT_STATUS.PENDING
                  ? 'bg-warning/5 hover:bg-warning/10'
                  : undefined
              }
            />
          ) : null}

          {loading && data != null && listTab === activeTab ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2
                className="size-4 animate-spin text-brand motion-reduce:animate-none"
                aria-hidden
              />
              Actualizando…
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[var(--border)] px-4 py-3">
          <Pagination
            disabled={loading || !dataReady}
            currentPage={pageOneBased}
            totalPages={totalPages}
            onPageChange={goPage}
          />
        </div>
      </section>

      {selectedReport ? (
        <div className="mt-4 shrink-0 scroll-mt-4">
          <ReportDetailPanel
            reportId={selectedReport.report.id}
            reportType={selectedReport.reportType}
            report={selectedReport.report}
            panelRef={detailPanelRef}
            onClose={() => setSelectedReport(null)}
            onReportChange={handleReportChange}
          />
        </div>
      ) : null}
    </div>
  );
}
