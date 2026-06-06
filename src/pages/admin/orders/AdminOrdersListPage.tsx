import { Eye, Search, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { DataTable, type DataColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { Pagination } from '../../../components/Pagination';
import { Skeleton } from '../../../components/Skeleton';
import {
  fetchAdminOrders,
} from '../../../features/admin/adminOrdersApi';
import { fetchSellerAccounts } from '../../../features/admin/sellersApi';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { cn } from '../../../lib/cn';
import { ADMIN_ORDERS_PAGE_SIZE, adminOrderDetailPath } from '../../../lib/constants';
import { formatARS, formatDate } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import type { Page } from '../../../types/api';
import {
  ORDER_STATUS,
  getAdminOrderAggregateStatus,
  type AdminOrder,
  type AdminOrderAggregateStatus,
  type AdminOrderStore,
  type OrderStatus,
} from '../../../types/order';

type OrdersListUiState = {
  data: Page<AdminOrder> | null;
  loading: boolean;
  errorMessage: string | null;
};

type OrdersListAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: Page<AdminOrder> }
  | { type: 'FETCH_ERR'; payload: string };

type StoreOption = { id: string; businessName: string };

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

function ordersListReducer(state: OrdersListUiState, action: OrdersListAction): OrdersListUiState {
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

const initialListState: OrdersListUiState = {
  data: null,
  loading: true,
  errorMessage: null,
};

const initialStoreSearchState: StoreSearchUiState = {
  options: [],
  loading: false,
  hasSearched: false,
};

const AGGREGATE_BADGE: Record<
  AdminOrderAggregateStatus,
  { label: string; className: string }
> = {
  STOCK_ISSUE: {
    label: 'Problema de stock',
    className: 'border border-warning/50 bg-warning/10 text-warning',
  },
  PARTIAL_CANCEL: {
    label: 'Cancelación parcial',
    className: 'bg-danger/15 text-danger',
  },
  COMPLETED: {
    label: 'Completado',
    className: 'bg-success/15 text-success',
  },
  PENDING: {
    label: 'Pendiente',
    className: 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]',
  },
  IN_PROGRESS: {
    label: 'En progreso',
    className: 'bg-brand/15 text-brand',
  },
  CANCELED: {
    label: 'Cancelado',
    className: 'bg-danger/15 text-danger',
  },
};

function parsePageOneBased(raw: string | null): number {
  const n = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return n;
}

function statusFromParams(raw: string | null): OrderStatus | undefined {
  if (!raw) {
    return undefined;
  }
  const values = Object.values(ORDER_STATUS) as string[];
  return values.includes(raw) ? (raw as OrderStatus) : undefined;
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

function formatStoreNames(stores: AdminOrderStore[]): { display: string; full: string } {
  const names = stores.map((s) => s.businessName);
  const full = names.join(', ');
  if (names.length <= 2) {
    return { display: full, full };
  }
  return { display: `${names.slice(0, 2).join(', ')} +${names.length - 2}`, full };
}

function AdminOrderAggregateBadge({ order }: { order: AdminOrder }) {
  const agg = getAdminOrderAggregateStatus(order.stores, order.status);
  const cfg = AGGREGATE_BADGE[agg];
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

function OrdersTableSkeleton() {
  return (
    <div className="-mx-1 overflow-x-auto" aria-hidden>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {['Orden', 'Comprador', 'Tiendas', 'Total', 'Estado general', 'Fecha', 'Acciones'].map(
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
              {Array.from({ length: 7 }, (__, j) => (
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
      .catch(() => {});
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

  const showDropdown = dropdownOpen && !hasSelection && debouncedDraft.trim().length > 0;

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
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Escape') {
            setDropdownOpen(false);
          }
        }}
        placeholder="Filtrar por tienda..."
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listboxId : undefined}
        className={cn(
          'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]',
          showClear ? 'pr-10' : 'pr-3',
        )}
      />
      {showClear ?
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          onClick={handleClear}
          aria-label="Limpiar tienda"
        >
          <X className="size-4" aria-hidden />
        </button>
      : null}
      {showDropdown ?
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg">
          {searchState.loading ?
            <StoreDropdownSkeleton />
          : searchState.hasSearched && searchState.options.length === 0 ?
            <p className="px-3 py-3 text-sm text-[var(--text-muted)]">No se encontró ninguna tienda</p>
          : (
            <ul id={listboxId} role="listbox" className="max-h-56 overflow-y-auto py-1">
              {searchState.options.map((store) => (
                <li key={store.id} role="option">
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-hover)]"
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
      : null}
    </div>
  );
}

export function AdminOrdersListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listState, dispatch] = useReducer(ordersListReducer, initialListState);

  const pageOneBased = useMemo(() => parsePageOneBased(searchParams.get('page')), [searchParams]);
  const urlSearch = searchParams.get('search') ?? '';
  const storeIdFilter = searchParams.get('storeId')?.trim() || undefined;
  const statusFilter = useMemo(() => statusFromParams(searchParams.get('status')), [searchParams]);
  const startDate = searchParams.get('startDate')?.trim() || undefined;
  const endDate = searchParams.get('endDate')?.trim() || undefined;

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

  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    storeIdFilter != null ||
    statusFilter != null ||
    startDate != null ||
    endDate != null;

  const queryKey = useMemo(
    () => ({
      pageZero: pageOneBased - 1,
      search: debouncedSearch.trim(),
      status: statusFilter,
      storeId: storeIdFilter,
      startDate,
      endDate,
    }),
    [pageOneBased, debouncedSearch, statusFilter, storeIdFilter, startDate, endDate],
  );

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_BEGIN' });
    void fetchAdminOrders({
      page: queryKey.pageZero,
      size: ADMIN_ORDERS_PAGE_SIZE,
      search: queryKey.search.length > 0 ? queryKey.search : undefined,
      status: queryKey.status,
      storeId: queryKey.storeId,
      startDate: queryKey.startDate,
      endDate: queryKey.endDate,
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
          dispatch({ type: 'FETCH_ERR', payload: 'No se pudo cargar el listado de pedidos.' });
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

  const setStatusFilter = useCallback(
    (value: 'all' | OrderStatus) => {
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

  const setDateFilter = useCallback(
    (key: 'startDate' | 'endDate', value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value.trim()) {
        next.set(key, value);
      } else {
        next.delete(key);
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

  const openDetail = useCallback(
    (orderId: string) => {
      navigate({
        pathname: adminOrderDetailPath(orderId),
        search: searchParams.toString(),
      });
    },
    [navigate, searchParams],
  );

  const columns: DataColumn<AdminOrder>[] = useMemo(
    () => [
      {
        id: 'order',
        header: 'Orden',
        wrap: true,
        cell: (row) => (
          <div>
            <p className="font-medium text-[var(--text-primary)]"># {row.id}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{formatDate(row.orderDate)}</p>
          </div>
        ),
      },
      {
        id: 'buyer',
        header: 'Comprador',
        wrap: true,
        cell: (row) => (
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {row.buyer.displayName?.trim() || 'Sin nombre'}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{row.buyer.email}</p>
          </div>
        ),
      },
      {
        id: 'stores',
        header: 'Tiendas',
        wrap: true,
        className: 'hidden md:table-cell',
        cell: (row) => {
          const { display, full } = formatStoreNames(row.stores);
          return (
            <span className="text-[var(--text-secondary)]" title={full}>
              {display}
            </span>
          );
        },
      },
      {
        id: 'total',
        header: 'Total',
        align: 'right',
        className: 'hidden sm:table-cell',
        cell: (row) => formatARS(row.totalArs),
      },
      {
        id: 'aggregate',
        header: 'Estado general',
        cell: (row) => <AdminOrderAggregateBadge order={row} />,
      },
      {
        id: 'date',
        header: 'Fecha',
        className: 'hidden lg:table-cell',
        cell: (row) => (
          <span className="text-[var(--text-secondary)]">{formatDate(row.orderDate)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        align: 'center',
        cell: (row) => (
          <button
            type="button"
            title="Ver detalle"
            aria-label="Ver detalle"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-input)]"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(row.id);
            }}
          >
            <Eye className="size-4" aria-hidden />
          </button>
        ),
      },
    ],
    [openDetail],
  );

  const totalElements = listState.data?.totalElements ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / ADMIN_ORDERS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-display-md text-[var(--text-primary)]">
          Pedidos{' '}
          {!listState.loading && listState.data ?
            <span className="text-lg font-normal text-[var(--text-muted)]">({totalElements})</span>
          : null}
        </h1>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[min(100%,14rem)] flex-[2]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden
          />
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Buscar por # orden, comprador o tienda..."
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 pr-3 text-sm outline-none focus:border-[var(--border-focus)]"
          />
        </div>
        <StoreSearchAutocomplete
          storeId={storeIdFilter}
          onSelectStore={selectStore}
          onClearStore={clearStore}
        />
        <select
          value={statusFilter ?? 'all'}
          onChange={(e) => {
            const v = e.target.value;
            setStatusFilter(v === 'all' ? 'all' : (v as OrderStatus));
          }}
          className="h-10 min-w-[10rem] rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm outline-none focus:border-[var(--border-focus)]"
          aria-label="Filtrar por estado"
        >
          <option value="all">Todos</option>
          <option value={ORDER_STATUS.PENDING}>Pendientes</option>
          <option value={ORDER_STATUS.PREPARING}>Preparando</option>
          <option value={ORDER_STATUS.READY_FOR_PICKUP}>Listo para retiro</option>
          <option value={ORDER_STATUS.DELIVERED}>Entregados</option>
          <option value={ORDER_STATUS.CANCELED}>Cancelados</option>
          <option value={ORDER_STATUS.STOCK_ISSUE}>Problema de stock</option>
        </select>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          Desde
          <input
            type="date"
            value={startDate ?? ''}
            onChange={(e) => setDateFilter('startDate', e.target.value)}
            className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          Hasta
          <input
            type="date"
            value={endDate ?? ''}
            onChange={(e) => setDateFilter('endDate', e.target.value)}
            className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)]"
          />
        </label>
      </div>

      {listState.errorMessage ?
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {listState.errorMessage}
        </p>
      : null}

      <section className="flex max-h-[min(55vh,520px)] min-h-[16rem] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {listState.loading ?
            <OrdersTableSkeleton />
          : (
            <DataTable<AdminOrder>
              columns={columns}
              data={listState.data?.content ?? []}
              getRowKey={(row) => row.id}
              onRowClick={(row) => openDetail(row.id)}
              empty={
                <EmptyState
                  title={
                    hasActiveFilters
                      ? 'No se encontraron pedidos con esos criterios'
                      : 'No hay pedidos en la plataforma'
                  }
                />
              }
            />
          )}
        </div>
        {!listState.loading && totalElements > ADMIN_ORDERS_PAGE_SIZE ?
          <div className="border-t border-[var(--border)] px-4 py-3">
            <Pagination
              currentPage={pageOneBased}
              totalPages={totalPages}
              onPageChange={goPage}
            />
          </div>
        : null}
      </section>
    </div>
  );
}
