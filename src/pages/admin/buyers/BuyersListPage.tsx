import { Headphones, Loader2, Power, PowerOff, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { DataTable, type DataColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { Pagination } from '../../../components/Pagination';
import { Skeleton } from '../../../components/Skeleton';
import { BuyerSupportModal } from '../../../features/admin/BuyerSupportModal';
import { DeactivateBuyerModal } from '../../../features/admin/DeactivateBuyerModal';
import {
  ADMIN_BUYERS_PAGE_SIZE,
  fetchBuyerAccounts,
  toggleBuyerStatus,
} from '../../../features/admin/buyersApi';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../lib/cn';
import { formatDate } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import type { Page } from '../../../types/api';
import type { BuyerAccount } from '../../../types/buyer-account';

type BuyersListUiState = {
  data: Page<BuyerAccount> | null;
  loading: boolean;
  errorMessage: string | null;
};

type BuyersListAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: Page<BuyerAccount> }
  | { type: 'FETCH_ERR'; payload: string };

type BuyersPageModal =
  | { kind: 'support'; buyer: BuyerAccount }
  | { kind: 'deactivate'; buyer: BuyerAccount }
  | null;

function buyersListReducer(
  state: BuyersListUiState,
  action: BuyersListAction,
): BuyersListUiState {
  switch (action.type) {
    case 'FETCH_BEGIN':
      return { ...state, loading: true, errorMessage: null };
    case 'FETCH_OK':
      return {
        data: action.payload,
        loading: false,
        errorMessage: null,
      };
    case 'FETCH_ERR':
      return {
        data: null,
        loading: false,
        errorMessage: action.payload,
      };
    default:
      return state;
  }
}

const initialListState: BuyersListUiState = {
  data: null,
  loading: true,
  errorMessage: null,
};

function parsePageOneBased(raw: string | null): number {
  const n = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return n;
}

function isActiveFromParams(raw: string | null): boolean | undefined {
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  return undefined;
}

function buyerInitial(account: BuyerAccount): string {
  const source = account.name?.trim() || account.email.trim();
  if (!source) {
    return '?';
  }
  return source.charAt(0).toUpperCase();
}

function BuyersTableSkeleton() {
  return (
    <div className="-mx-1 overflow-x-auto" aria-hidden>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {['Comprador', 'Pedidos', 'Reseñas', 'Estado', 'Creado', 'Acciones'].map((col) => (
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
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-8" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-8" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-8 w-16" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BuyersListPage() {
  const { success, error: showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listState, dispatch] = useReducer(buyersListReducer, initialListState);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [modal, setModal] = useState<BuyersPageModal>(null);
  const [reactivateTarget, setReactivateTarget] = useState<BuyerAccount | null>(null);
  const [reactivateBusy, setReactivateBusy] = useState(false);

  const pageOneBased = useMemo(() => parsePageOneBased(searchParams.get('page')), [searchParams]);
  const urlSearch = searchParams.get('search') ?? '';
  const isActiveFilter = useMemo(
    () => isActiveFromParams(searchParams.get('isActive')),
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
      isActive: isActiveFilter,
      refreshNonce,
    }),
    [pageOneBased, debouncedSearch, isActiveFilter, refreshNonce],
  );

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_BEGIN' });

    void fetchBuyerAccounts({
      page: queryKey.pageZero,
      size: ADMIN_BUYERS_PAGE_SIZE,
      search: queryKey.search.length > 0 ? queryKey.search : undefined,
      isActive: queryKey.isActive,
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
          dispatch({ type: 'FETCH_ERR', payload: 'No se pudo cargar el listado de compradores.' });
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

  const setActiveFilter = useCallback(
    (value: 'all' | 'true' | 'false') => {
      const next = new URLSearchParams(searchParams);
      if (value === 'all') {
        next.delete('isActive');
      } else {
        next.set('isActive', value);
      }
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const activeSelectValue =
    isActiveFilter === true ? 'true' : isActiveFilter === false ? 'false' : 'all';

  const data = listState.data;
  const loading = listState.loading;
  const showSkeleton = loading && !data;
  const totalPages =
    data != null ? Math.max(1, Math.ceil((data.totalElements || 0) / Math.max(1, data.size))) : 1;
  const hasSearch = debouncedSearch.trim().length > 0;

  useEffect(() => {
    if (!data) {
      return;
    }
    setModal((current) => {
      if (current?.kind !== 'support') {
        return current;
      }
      const fresh = data.content.find((row) => row.id === current.buyer.id);
      if (fresh && fresh.email !== current.buyer.email) {
        return { kind: 'support', buyer: fresh };
      }
      return current;
    });
  }, [data]);

  const columns: DataColumn<BuyerAccount>[] = useMemo(
    (): DataColumn<BuyerAccount>[] => [
      {
        id: 'buyer',
        header: 'Comprador',
        wrap: true,
        cell: (row) => (
          <div className="flex min-w-[12rem] items-center gap-3">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-brand/10 text-xs font-semibold text-brand"
              aria-hidden
            >
              {buyerInitial(row)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--text-primary)]">
                {row.name?.trim() || (
                  <span className="text-[var(--text-muted)]">Sin nombre</span>
                )}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'orders',
        header: 'Pedidos',
        className: 'hidden sm:table-cell',
        cell: (row) => (
          <span className="tabular-nums text-[var(--text-secondary)]">{row.stats.totalOrders}</span>
        ),
      },
      {
        id: 'reviews',
        header: 'Reseñas',
        className: 'hidden md:table-cell',
        cell: (row) => (
          <span className="tabular-nums text-[var(--text-secondary)]">{row.stats.totalReviews}</span>
        ),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: (row) => (
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
              row.isActive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
            )}
          >
            {row.isActive ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
      {
        id: 'created',
        header: 'Creado',
        className: 'hidden lg:table-cell',
        cell: (row) => (
          <span className="text-[var(--text-secondary)]">{formatDate(row.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        align: 'right',
        cell: (row) => (
          <div className="flex items-center justify-end gap-1">
            {row.isActive ? (
              <button
                type="button"
                aria-label="Soporte al comprador"
                className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-brand"
                onClick={() => setModal({ kind: 'support', buyer: row })}
              >
                <Headphones className="size-4" aria-hidden />
                <span className="sr-only">Soporte</span>
              </button>
            ) : null}
            <button
              type="button"
              aria-label={row.isActive ? 'Desactivar cuenta' : 'Reactivar cuenta'}
              className={cn(
                'rounded-lg p-2 transition hover:bg-[var(--bg-hover)]',
                row.isActive ? 'text-danger hover:text-danger' : 'text-success hover:text-success',
              )}
              onClick={() => {
                if (row.isActive) {
                  setModal({ kind: 'deactivate', buyer: row });
                } else {
                  setReactivateTarget(row);
                }
              }}
            >
              {row.isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              <span className="sr-only">{row.isActive ? 'Desactivar' : 'Reactivar'}</span>
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const handleDeactivateSuccess = useCallback(() => {
    setModal(null);
    success('Cuenta desactivada');
    bumpList();
  }, [bumpList, success]);

  const handleSupportSuccess = useCallback(
    (action: 'email' | 'password') => {
      success(action === 'email' ? 'Email actualizado' : 'Contraseña reseteada');
      if (action === 'email') {
        bumpList();
      }
    },
    [bumpList, success],
  );

  const handleReactivateConfirm = useCallback(async () => {
    if (!reactivateTarget) {
      return;
    }
    setReactivateBusy(true);
    try {
      await toggleBuyerStatus(reactivateTarget.id, true, { reason: '' });
      setReactivateTarget(null);
      success('Cuenta reactivada');
      bumpList();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else if (err instanceof Error) {
        showError(err.message);
      } else {
        showError('No se pudo reactivar la cuenta.');
      }
    } finally {
      setReactivateBusy(false);
    }
  }, [reactivateTarget, bumpList, success, showError]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-display-md text-[var(--text-primary)]">
          Compradores
          {data != null ? (
            <span className="ml-2 text-lg font-semibold text-[var(--text-muted)]">
              ({data.totalElements})
            </span>
          ) : null}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Gestioná cuentas de compradores, soporte y acceso.
        </p>
      </header>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[min(100%,20rem)] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            />
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </div>
          <select
            value={activeSelectValue}
            onChange={(e) => setActiveFilter(e.target.value as 'all' | 'true' | 'false')}
            className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        <div className="mt-6">
          {listState.errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {listState.errorMessage}
            </p>
          ) : null}

          {showSkeleton ? <BuyersTableSkeleton /> : null}

          {!loading && data && data.content.length === 0 ? (
            <EmptyState
              title={
                hasSearch
                  ? 'No se encontraron compradores con esos criterios'
                  : 'No hay compradores registrados'
              }
            />
          ) : null}

          {data != null && data.content.length > 0 ? (
            <>
              <DataTable<BuyerAccount>
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
          ) : null}

          {loading && data ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="size-4 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
              Actualizando…
            </div>
          ) : null}
        </div>
      </section>

      {modal?.kind === 'support' ? (
        <BuyerSupportModal
          open
          buyer={modal.buyer}
          onClose={() => setModal(null)}
          onSuccess={handleSupportSuccess}
        />
      ) : null}

      {modal?.kind === 'deactivate' ? (
        <DeactivateBuyerModal
          open
          buyer={modal.buyer}
          onClose={() => setModal(null)}
          onSuccess={handleDeactivateSuccess}
        />
      ) : null}

      <ConfirmDialog
        open={reactivateTarget != null}
        title="Reactivar cuenta"
        description={
          reactivateTarget ?
            <>
              ¿Reactivar la cuenta de{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {reactivateTarget.name?.trim() || reactivateTarget.email}
              </span>
              ? El comprador podrá volver a iniciar sesión.
            </>
          : null
        }
        confirmLabel="Reactivar"
        busy={reactivateBusy}
        onClose={() => {
          if (!reactivateBusy) {
            setReactivateTarget(null);
          }
        }}
        onConfirm={handleReactivateConfirm}
      />
    </div>
  );
}
