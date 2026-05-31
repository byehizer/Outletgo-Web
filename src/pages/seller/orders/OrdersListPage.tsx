import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DataTable, type DataColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { Pagination } from '../../../components/Pagination';
import { OrderStatusBadge } from '../../../features/orders/OrderStatusBadge';
import { useSellerOrdersList } from '../../../features/orders/useSellerOrders';
import { formatARS, formatDate } from '../../../lib/format';
import { ROUTES, SELLER_ORDERS_PAGE_SIZE, sellerOrderDetailPath } from '../../../lib/constants';
import { cn } from '../../../lib/cn';
import type { SellerOrderStore } from '../../../types/order';

function parsePageOneBased(raw: string | null): number {
  const n = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return n;
}

export function OrdersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const pageOneBased = useMemo(() => parsePageOneBased(searchParams.get('page')), [searchParams]);

  const filters = useMemo(() => ({
    pageZero: pageOneBased - 1,
  }), [pageOneBased]);

  const { data, loading, errorMessage } = useSellerOrdersList(filters);

  useEffect(() => {
    if (!data || loading) {
      return;
    }
    const size = Math.max(1, data.size || SELLER_ORDERS_PAGE_SIZE);
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

  const totalPages =
    data != null ? Math.max(1, Math.ceil((data.totalElements || 0) / Math.max(1, data.size))) : 1;

  const columns: DataColumn<SellerOrderStore>[] = useMemo(
    (): DataColumn<SellerOrderStore>[] => [
      {
        id: 'id',
        header: 'Pedido',
        cell: (row) => (
          <Link
            to={sellerOrderDetailPath(row.id)}
            className="font-mono text-sm font-semibold text-[var(--text-link)] underline-offset-4 hover:underline"
          >
            {row.id}
          </Link>
        ),
      },
      {
        id: 'date',
        header: 'Fecha',
        cell: (row) => <span className="text-[var(--text-secondary)]">{formatDate(row.orderDate)}</span>,
      },
      {
        id: 'buyer',
        header: 'Comprador',
        wrap: true,
        cell: (row) => (
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {row.buyer.displayName?.trim() || 'Comprador'}
            </p>
            {row.buyer.email ?
              <p className="text-xs text-[var(--text-muted)]">{row.buyer.email}</p>
            : null}
          </div>
        ),
      },
      {
        id: 'total',
        header: 'Total',
        align: 'right',
        cell: (row) => formatARS(row.subtotalArs),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: (row) => <OrderStatusBadge status={row.status} />,
      },
    ],
    [],
  );

  const showSkeleton = loading && !data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-display-md text-[var(--text-primary)]">Pedidos</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
          Listado paginado de pedidos de tu tienda (Paso&nbsp;15). La página se guarda en la URL.
        </p>
      </header>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="mt-0">
          {errorMessage ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          {showSkeleton ? (
            <div className="flex items-center gap-3 py-14 text-[var(--text-muted)]">
              <Loader2 className="size-6 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
              <span className="text-sm">Cargando pedidos…</span>
            </div>
          ) : null}

          {!loading && data && data.content.length === 0 ? (
            <EmptyState
              title="Todavía no hay pedidos"
              description="Cuando un comprador pague, vas a verlo acá."
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
              <DataTable<SellerOrderStore>
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
        </div>
      </section>
    </div>
  );
}
