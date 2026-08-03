import { Eye, Loader2, Pencil, Plus, Power, PowerOff, Search, CheckCircle2, XCircle, Clock, Building2 } from 'lucide-react';
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
import {
  fetchSellerRequests,
  updateSellerRequestStatus,
  SellerRegistrationRequestItem,
} from '../../../features/landing/landingSellerRequestsApi';
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
  | { kind: 'create'; initialValues?: { businessName?: string; cuit?: string; email?: string; description?: string } }
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

  const [activeTab, setActiveTab] = useState<'accounts' | 'requests'>('accounts');
  const [requestsList, setRequestsList] = useState<SellerRegistrationRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsSearchQuery, setRequestsSearchQuery] = useState('');
  const [requestsStatusFilter, setRequestsStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    const res = await fetchSellerRequests();
    setRequestsList(res);
    setLoadingRequests(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests();
    }
  }, [activeTab, loadRequests]);

  const filteredRequests = useMemo(() => {
    const q = requestsSearchQuery.trim().toLowerCase();
    return requestsList.filter((req) => {
      if (requestsStatusFilter !== 'ALL' && req.status !== requestsStatusFilter) {
        return false;
      }
      if (!q) return true;
      const matchBusiness = req.businessName?.toLowerCase().includes(q);
      const matchContact = req.contactName?.toLowerCase().includes(q);
      const matchCuit = req.cuit?.toLowerCase().includes(q);
      const matchEmail = req.email?.toLowerCase().includes(q);
      const matchPhone = req.phone?.toLowerCase().includes(q);
      const matchNotes = req.notes?.toLowerCase().includes(q);
      return Boolean(matchBusiness || matchContact || matchCuit || matchEmail || matchPhone || matchNotes);
    });
  }, [requestsList, requestsSearchQuery, requestsStatusFilter]);

  const handleStatusChange = async (reqItem: SellerRegistrationRequestItem, status: 'APPROVED' | 'REJECTED') => {
    await updateSellerRequestStatus(reqItem.id, status);
    if (status === 'APPROVED') {
      success('Solicitud aprobada correctamente. Abrimos el formulario para crear la cuenta de vendedor.');
      setModal({
        kind: 'create',
        initialValues: {
          businessName: reqItem.businessName,
          cuit: reqItem.cuit,
          email: reqItem.email,
          description: reqItem.notes,
        },
      });
    } else {
      success('Solicitud rechazada.');
    }
    loadRequests();
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-[var(--text-primary)]">
            Gestión de Vendedores
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Administrá cuentas activas de tiendas y revisá solicitudes de alta enviadas desde la Landing Page.
          </p>
        </div>
        {activeTab === 'accounts' && (
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90"
            onClick={() => setModal({ kind: 'create' })}
          >
            <Plus className="size-4" aria-hidden />
            Nuevo vendedor
          </button>
        )}
      </header>

      {/* SELECTOR DE PESTAÑAS */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 -mb-[5px]',
            activeTab === 'accounts'
              ? 'border-brand text-brand bg-brand/5'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
          )}
        >
          <Building2 className="size-4" />
          <span>Cuentas de Vendedores ({data?.totalElements || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 -mb-[5px]',
            activeTab === 'requests'
              ? 'border-brand text-brand bg-brand/5'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
          )}
        >
          <Clock className="size-4" />
          <span>Solicitudes de Alta B2B Landing ({requestsList.filter(r => r.status === 'PENDING').length} pendientes)</span>
        </button>
      </div>

      {activeTab === 'requests' ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Solicitudes de Registro B2B ({filteredRequests.length} mostradas)
            </h2>
            <button
              onClick={loadRequests}
              className="text-xs font-semibold text-brand hover:underline self-start sm:self-auto"
            >
              Refrescar listado
            </button>
          </div>

          {/* BUSCADOR Y FILTROS */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                value={requestsSearchQuery}
                onChange={(e) => setRequestsSearchQuery(e.target.value)}
                placeholder="Buscar por comercio, CUIT, contacto, email o teléfono..."
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
              />
            </div>
            <select
              value={requestsStatusFilter}
              onChange={(e) => setRequestsStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED')}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDING">Solo Pendientes</option>
              <option value="APPROVED">Solo Aprobadas</option>
              <option value="REJECTED">Solo Rechazadas</option>
            </select>
          </div>

          {loadingRequests ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">Cargando solicitudes de tiendas...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              {requestsSearchQuery || requestsStatusFilter !== 'ALL'
                ? 'No se encontraron solicitudes que coincidan con la búsqueda o filtro.'
                : 'No hay solicitudes de alta registradas aún.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-left text-xs text-[var(--text-secondary)]">
                <thead className="bg-[var(--bg-surface)] text-[11px] font-bold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">
                  <tr>
                    <th className="px-4 py-3">Comercio / Marca</th>
                    <th className="px-4 py-3">CUIT</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Email & Teléfono</th>
                    <th className="px-4 py-3">Comentarios / Notas</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[var(--bg-surface)] transition">
                      <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{req.businessName}</td>
                      <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{req.cuit}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{req.contactName}</td>
                      <td className="px-4 py-3 space-y-0.5">
                        <p className="font-semibold text-[var(--text-primary)]">{req.email}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{req.phone}</p>
                      </td>
                      <td className="px-4 py-3 max-w-xs text-xs">
                        {req.notes ? (
                          <span className="text-[var(--text-secondary)] italic bg-[var(--bg-surface)] px-2 py-1 rounded-md border border-[var(--border)] block leading-relaxed line-clamp-2" title={req.notes}>
                            "{req.notes}"
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {new Date(req.createdAt).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                            req.status === 'APPROVED' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                            req.status === 'REJECTED' && 'bg-red-500/10 text-red-400 border-red-500/20',
                            req.status === 'PENDING' && 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          )}
                        >
                          {req.status === 'APPROVED' && 'APROBADO'}
                          {req.status === 'REJECTED' && 'RECHAZADO'}
                          {req.status === 'PENDING' && 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStatusChange(req, 'APPROVED')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition shadow-sm"
                              title="Aprobar Solicitud y Crear Vendedor"
                            >
                              <CheckCircle2 className="size-3.5" /> Aprobar y Crear
                            </button>
                            <button
                              onClick={() => handleStatusChange(req, 'REJECTED')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-[11px] font-bold hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition"
                              title="Rechazar Solicitud"
                            >
                              <XCircle className="size-3.5" /> Rechazar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
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
      )}

      {modal?.kind === 'create' ? (
        <SellerFormModal
          open
          mode="create"
          initialValues={modal.initialValues}
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
