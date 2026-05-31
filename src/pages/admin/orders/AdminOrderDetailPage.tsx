import { AlertTriangle, CreditCard, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { Skeleton } from '../../../components/Skeleton';
import { ForceStatusModal } from '../../../features/admin/ForceStatusModal';
import { RefundModal } from '../../../features/admin/RefundModal';
import { fetchAdminOrderDetail } from '../../../features/admin/adminOrdersApi';
import { OrderStatusBadge } from '../../../features/orders/OrderStatusBadge';
import { ROUTES } from '../../../lib/constants';
import { cn } from '../../../lib/cn';
import { formatARS, formatDate } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import {
  ORDER_STATUS,
  getAdminOrderAggregateStatus,
  hasStockIssueForItem,
  type AdminOrder,
  type AdminOrderAggregateStatus,
  type AdminOrderStore,
} from '../../../types/order';

type DetailModal =
  | { kind: 'force'; slice: AdminOrderStore; initialStatus?: typeof ORDER_STATUS.CANCELED }
  | { kind: 'refund'; slice: AdminOrderStore }
  | null;

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
};

function AdminOrderAggregateBadge({ stores }: { stores: AdminOrderStore[] }) {
  const agg = getAdminOrderAggregateStatus(stores);
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

function DetailPageSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <Skeleton className="h-4 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}

function sumRefunds(order: AdminOrder): number {
  return order.stores.reduce((acc, s) => acc + (s.refund?.refundedAmount ?? 0), 0);
}

export function AdminOrderDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const orderId = rawId?.trim() ?? '';
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<DetailModal>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const backHref = useMemo(() => {
    const qs = searchParams.toString();
    return qs.length > 0 ? `${ROUTES.adminOrders}?${qs}` : ROUTES.adminOrders;
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!orderId) {
      setErrorMessage('Orden no encontrada.');
      setOrder(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAdminOrderDetail(orderId);
      setOrder(data);
    } catch (err: unknown) {
      setOrder(null);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo cargar la orden.');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load, refreshNonce]);

  const bumpRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  const totalRefunded = order ? sumRefunds(order) : 0;
  const netEffective = order ? order.totalArs - totalRefunded : 0;

  return (
    <div className="space-y-8">
      <Link
        to={backHref}
        className="inline-flex text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline"
      >
        ← Volver a pedidos
      </Link>

      {loading ?
        <DetailPageSkeleton />
      : null}

      {!loading && errorMessage ?
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </p>
      : null}

      {!loading && order ?
        <>
          <header className="flex flex-wrap items-start gap-4">
            <div>
              <h1 className="font-display text-display-md text-[var(--text-primary)]">
                Orden #{order.id}
              </h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{formatDate(order.orderDate)}</p>
            </div>
            <AdminOrderAggregateBadge stores={order.stores} />
          </header>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
              Datos del comprador
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="sr-only">Nombre</dt>
                <dd className="font-medium text-[var(--text-primary)]">
                  {order.buyer.displayName?.trim() || 'Sin nombre'}
                </dd>
                <dd className="text-[var(--text-muted)]">{order.buyer.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)]">Preferencia Mercado Pago</dt>
                <dd className="font-mono text-xs text-[var(--text-muted)]">{order.mpPreferenceId}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)]">Total de la orden</dt>
                <dd className="font-display text-2xl font-bold text-[var(--text-primary)]">
                  {formatARS(order.totalArs)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
              Slices por tienda
            </h2>
            {order.stores.map((slice) => {
              const stockCount = slice.stockIssues?.length ?? 0;
              return (
                <article
                  key={slice.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--text-primary)]">{slice.businessName}</h3>
                      <OrderStatusBadge status={slice.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-secondary)]">
                        {formatARS(slice.subtotalArs)}
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-input)]"
                        onClick={() => setModal({ kind: 'force', slice })}
                      >
                        <RefreshCw className="size-3.5" aria-hidden />
                        Cambiar estado
                      </button>
                    </div>
                  </div>

                  {stockCount > 0 ?
                    <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      Este slice tiene {stockCount} problema{stockCount === 1 ? '' : 's'} de stock. El
                      vendedor fue notificado.
                    </p>
                  : null}

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          <th className="px-3 py-2">Producto</th>
                          <th className="px-3 py-2">Talle</th>
                          <th className="px-3 py-2">Color</th>
                          <th className="px-3 py-2 text-right">Cantidad</th>
                          <th className="px-3 py-2 text-right">Precio unitario</th>
                          <th className="px-3 py-2 text-right">Subtotal ítem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {slice.items.map((item) => {
                          const hasIssue = hasStockIssueForItem(slice, item.id);
                          const lineSubtotal = item.quantity * item.unitPrice;
                          return (
                            <tr
                              key={item.id}
                              className={hasIssue ? 'bg-warning/5' : undefined}
                            >
                              <td className="px-3 py-2.5">
                                <span className="font-medium text-[var(--text-primary)]">
                                  {item.productName}
                                </span>
                                {hasIssue ?
                                  <span className="ml-2 inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                                    Sin stock
                                  </span>
                                : null}
                              </td>
                              <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                                {item.size ?? '—'}
                              </td>
                              <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                                {item.color ?? '—'}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums">
                                {formatARS(item.unitPrice)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                                {formatARS(lineSubtotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {slice.status === ORDER_STATUS.CANCELED ?
                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      {slice.refund ?
                        <div className="space-y-1 text-sm">
                          <span className="inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                            Reembolso procesado
                          </span>
                          <p className="text-[var(--text-secondary)]">
                            ID MP:{' '}
                            <span className="font-mono">{slice.refund.mpRefundId}</span>
                          </p>
                          <p className="text-[var(--text-secondary)]">
                            Monto: {formatARS(slice.refund.refundedAmount)}
                          </p>
                        </div>
                      : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                          onClick={() => setModal({ kind: 'refund', slice })}
                        >
                          <CreditCard className="size-4" aria-hidden />
                          Iniciar reembolso
                        </button>
                      )}
                    </div>
                  : null}

                  {slice.status === ORDER_STATUS.STOCK_ISSUE ?
                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/15"
                        onClick={() =>
                          setModal({
                            kind: 'force',
                            slice,
                            initialStatus: ORDER_STATUS.CANCELED,
                          })
                        }
                      >
                        Cancelar este slice
                      </button>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        Al cancelar podrás iniciar el reembolso parcial correspondiente.
                      </p>
                    </div>
                  : null}
                </article>
              );
            })}
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
              Resumen financiero
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {order.stores.map((slice) => (
                <li
                  key={slice.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="font-medium text-[var(--text-primary)]">{slice.businessName}</span>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-[var(--text-secondary)]">
                      {formatARS(slice.subtotalArs)}
                    </span>
                    <OrderStatusBadge status={slice.status} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="my-4 border-t border-[var(--border)]" />
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-[var(--text-primary)]">Total de la orden</span>
              <span className="tabular-nums">{formatARS(order.totalArs)}</span>
            </div>
            {totalRefunded > 0 ?
              <>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Total reembolsado</span>
                  <span className="font-semibold tabular-nums text-danger">
                    {formatARS(totalRefunded)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-sm font-semibold">
                  <span className="text-[var(--text-primary)]">Neto efectivo</span>
                  <span className="tabular-nums text-[var(--text-primary)]">
                    {formatARS(netEffective)}
                  </span>
                </div>
              </>
            : null}
          </section>
        </>
      : null}

      <ForceStatusModal
        open={modal?.kind === 'force'}
        slice={modal?.kind === 'force' ? modal.slice : null}
        orderId={orderId}
        initialStatus={modal?.kind === 'force' ? modal.initialStatus : undefined}
        onSuccess={bumpRefresh}
        onClose={() => setModal(null)}
      />

      <RefundModal
        open={modal?.kind === 'refund'}
        slice={modal?.kind === 'refund' ? modal.slice : null}
        orderId={orderId}
        onSuccess={bumpRefresh}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
