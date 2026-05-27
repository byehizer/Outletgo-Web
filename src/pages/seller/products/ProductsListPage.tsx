import { Filter, Loader2, Pause, Play, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { ConfirmDialog } from '../../../components/ConfirmDialog';import { DataTable, type DataColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { Pagination } from '../../../components/Pagination';
import { SELLER_PRODUCTS_PAGE_SIZE } from '../../../lib/constants';
import { deleteSellerProductLogical, patchSellerProductStatus } from '../../../features/products/productsApi';
import { useSellerProductList } from '../../../features/products/useProducts';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { cn } from '../../../lib/cn';
import { ROUTES, sellerProductEditPath } from '../../../lib/constants';
import { ApiError } from '../../../lib/http/apiClient';
import { formatARS } from '../../../lib/format';
import {
  PRODUCT_STATUS,
  PRODUCT_STATUS_LABEL_ES,
  type ProductStatus,
  type ProductSummary,
  isProductStatus,
} from '../../../types/product';

import type { SellerProductsListLocationState } from './sellerProductsListLocationState';

function parsePageOneBased(raw: string | null): number {
  const n = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return n;
}

function statusFromParams(statusParam: string | null): ProductStatus | undefined {
  if (!statusParam || !isProductStatus(statusParam)) {
    return undefined;
  }
  return statusParam;
}

const statusBadgeClass: Record<ProductSummary['status'], string> = {
  ACTIVE: 'bg-success/15 text-success',
  PAUSED_BY_SELLER: 'bg-warning/15 text-warning',
  DISABLED_BY_ADMIN: 'bg-danger/15 text-danger',
};

type ProductListDialog =
  | { kind: 'pause'; product: ProductSummary }
  | { kind: 'resume'; product: ProductSummary }
  | { kind: 'delete'; product: ProductSummary }
  | { kind: 'blocked'; product: ProductSummary };

export function ProductsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [createdFlash, setCreatedFlash] = useState<string | null>(null);
  const [listRefresh, setListRefresh] = useState(0);
  const [dialog, setDialog] = useState<ProductListDialog | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const bumpList = useCallback(() => setListRefresh((n) => n + 1), []);

  const openDialogClean = useCallback((next: ProductListDialog) => {
    setActionError(null);
    setDialog(next);
  }, []);

  const pageOneBased = useMemo(() => parsePageOneBased(searchParams.get('page')), [searchParams]);
  const urlName = searchParams.get('name') ?? '';
  const statusFilter = statusFromParams(searchParams.get('status'));

  const [nameDraft, setNameDraft] = useState(urlName);

  useEffect(() => {
    setNameDraft(urlName);
  }, [urlName]);

  const debouncedName = useDebouncedValue(nameDraft, 380);

  useEffect(() => {
    const trimmedUrl = urlName.trim();
    const trimmedDebounced = debouncedName.trim();
    if (trimmedDebounced === trimmedUrl) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (trimmedDebounced.length > 0) {
      next.set('name', trimmedDebounced);
    } else {
      next.delete('name');
    }
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [debouncedName, searchParams, setSearchParams, urlName]);

  const filters = useMemo(
    () => ({
      /** Índice 0-based que espera la API paginada. */
      pageZero: pageOneBased - 1,
      name: debouncedName,
      status: statusFilter,
      refreshNonce: listRefresh,
    }),
    [pageOneBased, debouncedName, statusFilter, listRefresh],
  );

  const { data, loading, errorMessage } = useSellerProductList(filters);

  useEffect(() => {
    const state = location.state as SellerProductsListLocationState | null | undefined;
    if (state?.sellerFlash !== 'product-created') {
      return;
    }
    setCreatedFlash('Producto creado con éxito.');
    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: null },
    );
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!createdFlash) {
      return;
    }
    const t = window.setTimeout(() => setCreatedFlash(null), 6500);
    return () => window.clearTimeout(t);
  }, [createdFlash]);

  useEffect(() => {
    if (!data || loading) {
      return;
    }
    const size = Math.max(1, data.size || SELLER_PRODUCTS_PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil((data.totalElements || 0) / size));
    if (pageOneBased <= totalPages) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set('page', String(totalPages));
    setSearchParams(next, { replace: true });
  }, [data, loading, pageOneBased, searchParams, setSearchParams]);

  const goPage = useCallback(
    (p: number) => {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(p));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const onStatusChange = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value === '' || value === '__all__') {
        next.delete('status');
      } else if (isProductStatus(value)) {
        next.set('status', value);
      }
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const totalPages =
    data != null ? Math.max(1, Math.ceil((data.totalElements || 0) / Math.max(1, data.size))) : 1;

  const closeDialog = useCallback(() => setDialog(null), []);

  const execPause = useCallback(
    async (product: ProductSummary) => {
      setBusyProductId(product.id);
      setActionError(null);
      try {
        await patchSellerProductStatus(product.id, { status: PRODUCT_STATUS.PAUSED_BY_SELLER });
        bumpList();
        closeDialog();
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setActionError(err.message);
        } else if (err instanceof Error) {
          setActionError(err.message);
        } else {
          setActionError('No se pudo pausar el producto.');
        }
      } finally {
        setBusyProductId(null);
      }
    },
    [bumpList, closeDialog],
  );

  const execResume = useCallback(
    async (product: ProductSummary) => {
      setBusyProductId(product.id);
      setActionError(null);
      try {
        await patchSellerProductStatus(product.id, { status: PRODUCT_STATUS.ACTIVE });
        bumpList();
        closeDialog();
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setActionError(err.message);
        } else if (err instanceof Error) {
          setActionError(err.message);
        } else {
          setActionError('No se pudo reactivar el producto.');
        }
      } finally {
        setBusyProductId(null);
      }
    },
    [bumpList, closeDialog],
  );

  const execDeleteLogical = useCallback(
    async (product: ProductSummary) => {
      setBusyProductId(product.id);
      setActionError(null);
      try {
        await deleteSellerProductLogical(product.id);
        bumpList();
        closeDialog();
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setActionError(err.message);
        } else if (err instanceof Error) {
          setActionError(err.message);
        } else {
          setActionError('No se pudo dar de baja el producto.');
        }
      } finally {
        setBusyProductId(null);
      }
    },
    [bumpList, closeDialog],
  );

  const dialogConfirmBusy =
    dialog != null &&
    dialog.kind !== 'blocked' &&
    busyProductId !== null &&
    busyProductId === dialog.product.id;

  const columns: DataColumn<ProductSummary>[] = useMemo(
    (): DataColumn<ProductSummary>[] => [
    {
      id: 'image',
      header: '',
      align: 'center',
      className: 'w-[72px]',
      cell: (row) =>
        row.thumbnailUrl ? (
          <img
            src={row.thumbnailUrl}
            alt=""
            className="mx-auto size-12 rounded-md border border-[var(--border)] object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="mx-auto flex size-12 items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-input)] text-[10px] text-[var(--text-muted)]"
          >
            —
          </div>
        ),
    },
    {
      id: 'name',
      header: 'Producto',
      wrap: true,
      cell: (row) => <span className="font-medium">{row.name || 'Sin nombre'}</span>,
    },
    {
      id: 'price',
      header: 'Precio',
      align: 'right',
      cell: (row) => formatARS(row.price),
    },
    {
      id: 'stock',
      header: 'Stock',
      align: 'right',
      cell: (row) => Math.floor(row.totalStock).toLocaleString('es-AR'),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (row) => (
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
            statusBadgeClass[row.status],
          )}
        >
          {PRODUCT_STATUS_LABEL_ES[row.status]}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      align: 'center',
      cell: (row) => {
        const busy = busyProductId === row.id;
        return (
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Link
              to={sellerProductEditPath(row.id)}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] underline-offset-4 hover:bg-[var(--bg-hover)]"
            >
              Editar
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {row.status === PRODUCT_STATUS.ACTIVE ?
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-warning/35 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/15 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => openDialogClean({ kind: 'pause', product: row })}
                  disabled={busy}
                >
                  <Pause className="size-3.5 shrink-0" aria-hidden />
                  Pausar
                </button>
              : null}

              {row.status === PRODUCT_STATUS.PAUSED_BY_SELLER ?
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-success/35 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => openDialogClean({ kind: 'resume', product: row })}
                  disabled={busy}
                >
                  <Play className="size-3.5 shrink-0" aria-hidden />
                  Reactivar
                </button>
              : null}

              {row.status === PRODUCT_STATUS.DISABLED_BY_ADMIN ?
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => openDialogClean({ kind: 'blocked', product: row })}
                  disabled={busy}
                >
                  <Play className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  Reactivar
                </button>
              : null}

              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/35 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => openDialogClean({ kind: 'delete', product: row })}
                disabled={busy}
              >
                <Trash2 className="size-3.5 shrink-0" aria-hidden />
                Eliminar
              </button>
            </div>
          </div>
        );
      },
    },
    ],
    [busyProductId, openDialogClean],
  );

  async function handleDialogConfirm(): Promise<void> {
    const d = dialog;
    if (!d) {
      return;
    }
    switch (d.kind) {
      case 'blocked': {
        closeDialog();
        return;
      }
      case 'pause': {
        await execPause(d.product);
        return;
      }
      case 'resume': {
        await execResume(d.product);
        return;
      }
      case 'delete': {
        await execDeleteLogical(d.product);
        return;
      }
      default: {
        return;
      }
    }
  }

  const dlg = dialog;
  const confirmTitle =
    dlg == null
      ? ''
      : dlg.kind === 'blocked'
        ? 'No podés reactivar este producto'
        : dlg.kind === 'pause'
          ? `¿Pausar «${dlg.product.name}»?`
          : dlg.kind === 'resume'
            ? `¿Reactivar «${dlg.product.name}»?`
            : `¿Dar de baja «${dlg.product.name}»?`;

  const confirmDescription =
    dlg == null
      ? undefined
      : dlg.kind === 'blocked'
        ? 'Solo el admin puede reactivar este producto.'
        : dlg.kind === 'pause'
          ? 'El producto pasará a «Pausado (vendedor)» hasta que lo reactives desde esta lista.'
          : dlg.kind === 'resume'
            ? 'Volverá a estado «Activo» y podrá mostrarse a compradores.'
            : 'Se aplicará una baja lógica: el producto dejará de listarse en tu catálogo.';

  const confirmLabel =
    dlg == null
      ? 'Confirmar'
      : dlg.kind === 'blocked'
        ? 'Entendido'
        : dlg.kind === 'pause'
          ? 'Pausar'
          : dlg.kind === 'resume'
            ? 'Reactivar'
            : 'Eliminar';

  const showSkeleton = loading && !data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-[var(--text-primary)]">Productos</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
            Listado paginado con pausa/reactivación y baja lógica (Pasos&nbsp;12–14). Filtros y página quedan en la URL.
          </p>
        </div>
        <Link
          to={ROUTES.sellerProductNew}
          className="inline-flex items-center rounded-lg border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand shadow-sm outline-none transition hover:bg-brand/15 focus-visible:ring-2 focus-visible:ring-brand"
        >
          Nuevo producto
        </Link>
      </header>

      {createdFlash ?
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-[var(--text-secondary)]"
        >
          <span>{createdFlash}</span>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-[var(--text-muted)] hover:bg-success/15 hover:text-[var(--text-primary)]"
            aria-label="Cerrar aviso"
            onClick={() => setCreatedFlash(null)}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      : null}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-[min(100%,260px)] max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            />
            <input
              type="search"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Buscar por nombre…"
              autoComplete="off"
              aria-label="Buscar productos por nombre"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]"
            />
          </div>
          <label className="flex min-w-[200px] shrink-0 items-center gap-2 text-sm">
            <Filter className="size-4 text-[var(--text-muted)]" aria-hidden />
            <span className="sr-only">Filtrar por estado</span>
            <select
              aria-label="Estado del producto"
              className={cn(
                'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] lg:w-auto',
              )}
              value={statusFilter ?? '__all__'}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="__all__">Todos los estados</option>
              <option value={PRODUCT_STATUS.ACTIVE}>{PRODUCT_STATUS_LABEL_ES.ACTIVE}</option>
              <option value={PRODUCT_STATUS.PAUSED_BY_SELLER}>{PRODUCT_STATUS_LABEL_ES.PAUSED_BY_SELLER}</option>
              <option value={PRODUCT_STATUS.DISABLED_BY_ADMIN}>{PRODUCT_STATUS_LABEL_ES.DISABLED_BY_ADMIN}</option>
            </select>
          </label>
        </div>

        <div className="mt-6">
          {(errorMessage || actionError) ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {actionError ?? errorMessage}
            </p>
          ) : null}

          {showSkeleton ? (
            <div className="flex items-center gap-3 py-14 text-[var(--text-muted)]">
              <Loader2 className="size-6 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
              <span className="text-sm">Cargando productos…</span>
            </div>
          ) : null}

          {!loading && data && data.content.length === 0 ? (
            <EmptyState
              title="No encontramos productos con esos criterios"
              description={
                filters.name.trim() || statusFilter ? 'Probá otros filtros o vaciá el buscador.' : undefined
              }
              action={
                <Link
                  to={ROUTES.sellerRoot}
                  className="text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline"
                >
                  Volver al resumen
                </Link>
              }
            />
          ) : null}

          {data != null && data.content.length > 0 ? (
            <>
              <DataTable<ProductSummary>
                columns={columns}
                data={data.content}
                getRowKey={(row) => row.id}
                className="-mx-2"
              />

              <div className="mt-6">
                <Pagination
                  disabled={loading}
                  currentPage={pageOneBased}
                  totalPages={totalPages}
                  onPageChange={goPage}
                />
              </div>
            </>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        open={dialog != null}
        acknowledgeOnly={dialog?.kind === 'blocked'}
        danger={dialog?.kind === 'delete'}
        busy={dialogConfirmBusy}
        title={confirmTitle || 'Acción'}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        cancelLabel="Cancelar"
        onClose={() => {
          if (!dialogConfirmBusy) {
            closeDialog();
          }
        }}
        onConfirm={() => handleDialogConfirm()}
      />
    </div>
  );
}
