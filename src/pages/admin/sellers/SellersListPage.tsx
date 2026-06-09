import { Eye, Loader2, Pencil, Plus, Power, PowerOff, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { DataTable, type DataColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { Pagination } from '../../../components/Pagination';
import { Skeleton } from '../../../components/Skeleton';
import { DeactivateSellerModal } from '../../../features/admin/DeactivateSellerModal';
import { SellerFormModal } from '../../../features/admin/SellerFormModal';
import {
  ADMIN_SELLERS_PAGE_SIZE,
  fetchSellerAccounts,
  toggleSellerStatus,
} from '../../../features/admin/sellersApi';
import { RatingStars } from '../../../features/reviews/RatingStars';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useToast } from '../../../hooks/useToast';
import { adminSellerDetailPath } from '../../../lib/constants';
import { cn } from '../../../lib/cn';
import { formatDate } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import type { Page } from '../../../types/api';
import type { SellerAccount } from '../../../types/seller-account';

type SellersListUiState = {
  data: Page<SellerAccount> | null;
  loading: boolean;
  errorMessage: string | null;
};

type SellersListAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: Page<SellerAccount> }
  | { type: 'FETCH_ERR'; payload: string };

type SellersPageModal =
  | { kind: 'create' }
  | { kind: 'edit'; seller: SellerAccount }
  | { kind: 'deactivate'; seller: SellerAccount }
  | null;

function sellersListReducer(
  state: SellersListUiState,
  action: SellersListAction,
): SellersListUiState {
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

const initialListState: SellersListUiState = {
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

function storeInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }
  return trimmed.charAt(0).toUpperCase();
}

function SellersTableSkeleton() {
  return (
    <div className="w-full max-w-full overflow-x-auto overscroll-x-contain" aria-hidden>
      <table className="min-w-[36rem] w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {['Tienda', 'CUIT', 'Rating', 'Estado', 'Creado', 'Acciones'].map((col) => (
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
                  <Skeleton variant="circular" className="size-8 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton variant="text" className="w-32" />
                    <Skeleton variant="text" className="h-3 w-40" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-8 w-24" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SellersListPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listState, dispatch] = useReducer(sellersListReducer, initialListState);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [modal, setModal] = useState<SellersPageModal>(null);
  const [reactivateTarget, setReactivateTarget] = useState<SellerAccount | null>(null);
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

    void fetchSellerAccounts({
      page: queryKey.pageZero,
      size: ADMIN_SELLERS_PAGE_SIZE,
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
          dispatch({ type: 'FETCH_ERR', payload: 'No se pudo cargar el listado de vendedores.' });
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

  const columns: DataColumn<SellerAccount>[] = useMemo(
    (): DataColumn<SellerAccount>[] => [
      {
        id: 'store',
        header: 'Tienda',
        wrap: true,
        cell: (row) => (
          <div className="flex min-w-[12rem] items-center gap-3">
            {row.store.logoUrl ? (
              <img
                src={row.store.logoUrl}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-lg border border-[var(--border)] object-cover"
              />
            ) : (
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-brand/10 text-xs font-semibold text-brand"
                aria-hidden
              >
                {storeInitial(row.store.businessName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--text-primary)]">
                {row.store.businessName}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'cuit',
        header: 'CUIT',
        className: 'hidden md:table-cell',
        cell: (row) => (
          <span className="font-mono text-sm text-[var(--text-secondary)]">{row.store.cuit}</span>
        ),
      },
      {
        id: 'rating',
        header: 'Rating',
        className: 'hidden lg:table-cell',
        cell: (row) =>
          row.store.ratingAvg != null ? (
            <div className="flex flex-wrap items-center gap-2">
              <RatingStars rating={Math.round(row.store.ratingAvg)} />
              <span className="text-xs text-[var(--text-muted)]">({row.store.ratingCount})</span>
            </div>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">Sin reseñas</span>
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
        className: 'hidden sm:table-cell',
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
            <button
              type="button"
              aria-label="Editar vendedor"
              className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-brand"
              onClick={() => setModal({ kind: 'edit', seller: row })}
            >
              <Pencil className="size-4" aria-hidden />
              <span className="sr-only">Editar</span>
            </button>
            <button
              type="button"
              aria-label={row.isActive ? 'Desactivar cuenta' : 'Reactivar cuenta'}
              className={cn(
                'rounded-lg p-2 transition hover:bg-[var(--bg-hover)]',
                row.isActive ? 'text-danger hover:text-danger' : 'text-success hover:text-success',
              )}
              onClick={() => {
                if (row.isActive) {
                  setModal({ kind: 'deactivate', seller: row });
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
            <button
              type="button"
              aria-label="Ver perfil del vendedor"
              className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-brand"
              onClick={() => navigate(adminSellerDetailPath(row.id))}
            >
              <Eye className="size-4" aria-hidden />
              <span className="sr-only">Ver perfil</span>
            </button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  const handleModalSuccess = useCallback(
    (message: string) => {
      setModal(null);
      success(message);
      bumpList();
    },
    [bumpList, success],
  );

  const handleReactivateConfirm = useCallback(async () => {
    if (!reactivateTarget) {
      return;
    }
    setReactivateBusy(true);
    try {
      await toggleSellerStatus(reactivateTarget.id, true, { reason: '' });
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-[var(--text-primary)]">
            Vendedores
            {data != null ? (
              <span className="ml-2 text-lg font-semibold text-[var(--text-muted)]">
                ({data.totalElements})
              </span>
            ) : null}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Gestioná las cuentas de vendedores y sus tiendas.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90"
          onClick={() => setModal({ kind: 'create' })}
        >
          <Plus className="size-4" aria-hidden />
          Nuevo vendedor
        </button>
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
              placeholder="Buscar por nombre de tienda o email..."
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

          {showSkeleton ? <SellersTableSkeleton /> : null}

          {!loading && data && data.content.length === 0 ? (
            <EmptyState
              title={
                hasSearch
                  ? 'No se encontraron vendedores con esos criterios'
                  : 'No hay vendedores registrados'
              }
            />
          ) : null}

          {data != null && data.content.length > 0 ? (
            <>
              <DataTable<SellerAccount>
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

      {modal?.kind === 'create' ? (
        <SellerFormModal
          open
          mode="create"
          onClose={() => setModal(null)}
          onSuccess={() => handleModalSuccess('Vendedor creado correctamente')}
        />
      ) : null}

      {modal?.kind === 'edit' ? (
        <SellerFormModal
          open
          mode="edit"
          seller={modal.seller}
          onClose={() => setModal(null)}
          onSuccess={() => handleModalSuccess('Cambios guardados')}
        />
      ) : null}

      {modal?.kind === 'deactivate' ? (
        <DeactivateSellerModal
          open
          seller={modal.seller}
          onClose={() => setModal(null)}
          onSuccess={() => handleModalSuccess('Cuenta desactivada')}
        />
      ) : null}

      <ConfirmDialog
        open={reactivateTarget != null}
        title="Reactivar cuenta"
        description={
          reactivateTarget ?
            <>
              ¿Reactivar la cuenta de{' '}
              <span className="font-medium text-[var(--text-primary)]">{reactivateTarget.email}</span>
              ? Su tienda volverá a aparecer en la app.
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
