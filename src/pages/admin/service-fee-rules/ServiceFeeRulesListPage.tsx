import { Loader2, Percent, Pencil, Plus, Power, PowerOff, Search, Tag, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { DataTable, type DataColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { Pagination } from '../../../components/Pagination';
import { Skeleton } from '../../../components/Skeleton';
import { ServiceFeeRuleFormModal } from '../../../features/admin/ServiceFeeRuleFormModal';
import {
  fetchServiceFeeRules,
  toggleServiceFeeRuleStatus,
} from '../../../features/admin/serviceFeeRulesApi';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useToast } from '../../../hooks/useToast';
import { ADMIN_SERVICE_FEE_RULES_PAGE_SIZE } from '../../../lib/constants';
import { cn } from '../../../lib/cn';
import { ApiError } from '../../../lib/http/apiClient';
import type { Page } from '../../../types/api';
import type { ServiceFeeRule, FeeTarget } from '../../../types/service-fee-rule';

type ServiceFeeRulesListUiState = {
  data: Page<ServiceFeeRule> | null;
  loading: boolean;
  errorMessage: string | null;
};

type ServiceFeeRulesListAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: Page<ServiceFeeRule> }
  | { type: 'FETCH_ERR'; payload: string };

type ServiceFeeRulesPageModal =
  | { kind: 'create' }
  | { kind: 'edit'; rule: ServiceFeeRule }
  | null;

function serviceFeeRulesListReducer(
  state: ServiceFeeRulesListUiState,
  action: ServiceFeeRulesListAction,
): ServiceFeeRulesListUiState {
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

const initialListState: ServiceFeeRulesListUiState = {
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

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
}

function formatDateDisplay(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function getValidityText(from: string | null, until: string | null): string {
  if (!from && !until) {
    return 'Permanente';
  }
  if (from && until) {
    return `Del ${formatDateDisplay(from)} al ${formatDateDisplay(until)}`;
  }
  if (from) {
    return `Desde ${formatDateDisplay(from)}`;
  }
  return `Hasta ${formatDateDisplay(until)}`;
}

function ServiceFeeRulesTableSkeleton() {
  return (
    <div className="w-full max-w-full overflow-x-auto overscroll-x-contain" aria-hidden>
      <table className="min-w-[48rem] w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {['Nombre', 'Ámbito / Destino', 'Detalles Tarifa', 'Min. Pedido', 'Prioridad', 'Vigencia', 'Estado', 'Acciones'].map((col) => (
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
          {Array.from({ length: 4 }, (_, i) => (
            <tr key={i} className="bg-[var(--bg-card)]">
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-44" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-5 w-24 rounded-full" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-16" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-12" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-36" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-5 w-16 rounded-full" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-8 w-20" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ServiceFeeRulesListPage() {
  const { success, error: showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listState, dispatch] = useReducer(serviceFeeRulesListReducer, initialListState);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [modal, setModal] = useState<ServiceFeeRulesPageModal>(null);
  
  // States for toggle confirm
  const [toggleTarget, setToggleTarget] = useState<ServiceFeeRule | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);

  const pageOneBased = useMemo(() => parsePageOneBased(searchParams.get('page')), [searchParams]);
  const urlSearch = searchParams.get('search') ?? '';
  const isActiveFilter = useMemo(
    () => isActiveFromParams(searchParams.get('isActive')),
    [searchParams],
  );
  const feeTargetFilter = useMemo(
    () => (searchParams.get('feeTarget') as FeeTarget | null) ?? undefined,
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
      feeTarget: feeTargetFilter,
      refreshNonce,
    }),
    [pageOneBased, debouncedSearch, isActiveFilter, feeTargetFilter, refreshNonce],
  );

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_BEGIN' });

    void fetchServiceFeeRules({
      page: queryKey.pageZero,
      size: ADMIN_SERVICE_FEE_RULES_PAGE_SIZE,
      search: queryKey.search.length > 0 ? queryKey.search : undefined,
      isActive: queryKey.isActive,
    })
      .then((page) => {
        if (cancelled) return;
        
        // Filter by feeTarget locally if supported/necessary, or simulate api filter
        let content = page.content;
        if (queryKey.feeTarget) {
          content = content.filter(r => r.feeTarget === queryKey.feeTarget);
        }

        dispatch({
          type: 'FETCH_OK',
          payload: {
            ...page,
            content,
            totalElements: queryKey.feeTarget ? content.length : page.totalElements,
          },
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError) {
          dispatch({ type: 'FETCH_ERR', payload: error.message });
        } else if (error instanceof Error) {
          dispatch({ type: 'FETCH_ERR', payload: error.message });
        } else {
          dispatch({ type: 'FETCH_ERR', payload: 'No se pudo cargar el listado de reglas.' });
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

  const setFeeTargetFilter = useCallback(
    (value: 'all' | FeeTarget) => {
      const next = new URLSearchParams(searchParams);
      if (value === 'all') {
        next.delete('feeTarget');
      } else {
        next.set('feeTarget', value);
      }
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const activeSelectValue =
    isActiveFilter === true ? 'true' : isActiveFilter === false ? 'false' : 'all';

  const feeTargetSelectValue = feeTargetFilter ?? 'all';

  const data = listState.data;
  const loading = listState.loading;
  const showSkeleton = loading && !data;
  const totalPages =
    data != null ? Math.max(1, Math.ceil((data.totalElements || 0) / Math.max(1, data.size))) : 1;
  const hasSearch = debouncedSearch.trim().length > 0;

  const handleToggleConfirm = useCallback(async () => {
    if (!toggleTarget) return;
    setToggleBusy(true);
    const nextState = !toggleTarget.isActive;
    try {
      await toggleServiceFeeRuleStatus(toggleTarget.id, nextState);
      setToggleTarget(null);
      success(
        nextState
          ? `Regla "${toggleTarget.name}" activada correctamente.`
          : `Regla "${toggleTarget.name}" desactivada correctamente.`
      );
      bumpList();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else if (err instanceof Error) {
        showError(err.message);
      } else {
        showError('No se pudo cambiar el estado de la regla.');
      }
    } finally {
      setToggleBusy(false);
    }
  }, [toggleTarget, bumpList, success, showError]);

  const columns: DataColumn<ServiceFeeRule>[] = useMemo(
    (): DataColumn<ServiceFeeRule>[] => [
      {
        id: 'name',
        header: 'Regla',
        wrap: true,
        cell: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-[var(--text-primary)]">{row.name}</span>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">ID: {row.id}</span>
          </div>
        ),
      },
      {
        id: 'feeTarget',
        header: 'Ámbito / Destino',
        cell: (row) => {
          let label = '';
          let theme = '';
          if (row.feeTarget === 'BUYER_SHIPPING') {
            label = 'Comprador (Envío)';
            theme = 'bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400';
          } else if (row.feeTarget === 'BUYER_ORDER') {
            label = 'Comprador (Pedido)';
            theme = 'bg-purple-500/10 text-purple-500 dark:bg-purple-400/10 dark:text-purple-400';
          } else if (row.feeTarget === 'SELLER_COMMISSION') {
            label = 'Comisión Tienda';
            theme = 'bg-amber-500/10 text-amber-500 dark:bg-amber-400/10 dark:text-amber-400';
          }
          return (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', theme)}>
              {label}
            </span>
          );
        },
      },
      {
        id: 'feeValue',
        header: 'Tarifa',
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-[var(--text-primary)]">
              {row.feeType === 'PERCENTAGE' ? `${row.feeValue}%` : formatCurrency(row.feeValue)}
            </span>
            {row.shippingMethod ? (
              <span className="text-xs text-[var(--text-muted)] mt-0.5">
                Método: {row.shippingMethod === 'RETIRO_EN_PUNTO' ? 'Retiro en punto' : 'Envío correo'}
              </span>
            ) : row.feeTarget !== 'SELLER_COMMISSION' ? (
              <span className="text-xs text-[var(--text-muted)] mt-0.5">Todos los envíos</span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'minOrderAmount',
        header: 'Min. Compra',
        cell: (row) => <span className="text-[var(--text-secondary)]">{formatCurrency(row.minOrderAmount)}</span>,
      },
      {
        id: 'priority',
        header: 'Prioridad',
        align: 'center',
        cell: (row) => (
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]">
            {row.priority}
          </span>
        ),
      },
      {
        id: 'validity',
        header: 'Vigencia',
        className: 'hidden md:table-cell',
        cell: (row) => (
          <span className="text-xs text-[var(--text-secondary)] whitespace-normal max-w-xs block">
            {getValidityText(row.validFrom, row.validUntil)}
          </span>
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
        id: 'actions',
        header: 'Acciones',
        align: 'right',
        cell: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              aria-label="Editar regla"
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-brand transition"
              onClick={() => setModal({ kind: 'edit', rule: row })}
            >
              <Pencil className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={row.isActive ? 'Desactivar regla' : 'Activar regla'}
              className={cn(
                'rounded-lg p-2 transition hover:bg-[var(--bg-hover)]',
                row.isActive ? 'text-danger hover:text-danger-hover' : 'text-success hover:text-success-hover',
              )}
              onClick={() => setToggleTarget(row)}
            >
              {row.isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const handleModalSuccess = useCallback(
    (message: string) => {
      setModal(null);
      success(message);
      bumpList();
    },
    [bumpList, success],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-[var(--text-primary)] flex items-center gap-3">
            Tarifas y Comisiones
            {data != null ? (
              <span className="text-lg font-semibold text-[var(--text-muted)]">
                ({data.totalElements})
              </span>
            ) : null}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Establecé las reglas de cobro de servicio para compradores (tarifas de envío y orden) y comisiones de plataforma cobradas a tiendas comerciales.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90 shadow-sm"
          onClick={() => setModal({ kind: 'create' })}
        >
          <Plus className="size-4" aria-hidden />
          Nueva regla de cobro
        </button>
      </header>

      {/* Grid Resumen Informativo */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex items-center gap-4">
          <div className="rounded-lg bg-blue-500/10 p-3 text-blue-500">
            <Percent className="size-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Tarifas Envío (Comprador)</span>
            <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">BUYER_SHIPPING</span>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex items-center gap-4">
          <div className="rounded-lg bg-purple-500/10 p-3 text-purple-500">
            <Tag className="size-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Costo Gestión (Comprador)</span>
            <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">BUYER_ORDER</span>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex items-center gap-4">
          <div className="rounded-lg bg-amber-500/10 p-3 text-amber-500">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Comisión Ventas (Tiendas)</span>
            <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">SELLER_COMMISSION</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        {/* Controles de Filtros */}
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[min(100%,18rem)] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            />
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Buscar regla por nombre..."
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <select
                value={feeTargetSelectValue}
                onChange={(e) => setFeeTargetFilter(e.target.value as 'all' | FeeTarget)}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                aria-label="Filtrar por ámbito"
              >
                <option value="all">Todos los ámbitos</option>
                <option value="BUYER_SHIPPING">Comprador (Envío)</option>
                <option value="BUYER_ORDER">Comprador (Pedido)</option>
                <option value="SELLER_COMMISSION">Comisión de Local</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <select
                value={activeSelectValue}
                onChange={(e) => setActiveFilter(e.target.value as 'all' | 'true' | 'false')}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                aria-label="Filtrar por estado"
              >
                <option value="all">Todos los estados</option>
                <option value="true">Activas</option>
                <option value="false">Inactivas</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {listState.errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger font-medium"
            >
              {listState.errorMessage}
            </p>
          ) : null}

          {showSkeleton ? <ServiceFeeRulesTableSkeleton /> : null}

          {!loading && data && data.content.length === 0 ? (
            <EmptyState
              title={
                hasSearch || feeTargetFilter || isActiveFilter !== undefined
                  ? 'No se encontraron reglas con esos criterios de búsqueda'
                  : 'No hay reglas de tarifas de servicio registradas'
              }
            />
          ) : null}

          {data != null && data.content.length > 0 ? (
            <>
              <DataTable<ServiceFeeRule>
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
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)] font-medium">
              <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
              Actualizando listado…
            </div>
          ) : null}
        </div>
      </section>

      {/* Form Modals */}
      {modal?.kind === 'create' ? (
        <ServiceFeeRuleFormModal
          open
          mode="create"
          onClose={() => setModal(null)}
          onSuccess={() => handleModalSuccess('Regla de tarifa creada correctamente.')}
        />
      ) : null}

      {modal?.kind === 'edit' ? (
        <ServiceFeeRuleFormModal
          open
          mode="edit"
          rule={modal.rule}
          onClose={() => setModal(null)}
          onSuccess={() => handleModalSuccess('Cambios guardados correctamente.')}
        />
      ) : null}

      {/* Toggle Activation Confirm Dialog */}
      <ConfirmDialog
        open={toggleTarget != null}
        title={toggleTarget?.isActive ? 'Desactivar regla de tarifa' : 'Activar regla de tarifa'}
        description={
          toggleTarget ? (
            <>
              ¿Estás seguro de que deseas {toggleTarget.isActive ? 'desactivar' : 'activar'} la regla{' '}
              <span className="font-semibold text-[var(--text-primary)]">"{toggleTarget.name}"</span>?
              {toggleTarget.isActive ? (
                <span className="block mt-2 text-sm text-[var(--text-muted)]">
                  Al desactivarla, dejará de aplicarse a los nuevos cálculos de pedidos.
                </span>
              ) : (
                <span className="block mt-2 text-sm text-[var(--text-muted)]">
                  Al activarla, entrará en vigencia inmediatamente según su prioridad y fechas.
                </span>
              )}
            </>
          ) : null
        }
        confirmLabel={toggleTarget?.isActive ? 'Desactivar' : 'Activar'}
        busy={toggleBusy}
        onClose={() => {
          if (!toggleBusy) setToggleTarget(null);
        }}
        onConfirm={handleToggleConfirm}
      />
    </div>
  );
}
