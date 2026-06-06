import { AlertTriangle, CreditCard, RefreshCw, Loader2, PackageCheck, PackageX, Truck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { Skeleton } from '../../../components/Skeleton';
import { ForceStatusModal } from '../../../features/admin/ForceStatusModal';
import { RefundModal } from '../../../features/admin/RefundModal';
import { fetchAdminOrderDetail, updateGlobalOrderStatus, forceSliceStatus } from '../../../features/admin/adminOrdersApi';
import { OrderStatusBadge } from '../../../features/orders/OrderStatusBadge';
import { useToast } from '../../../hooks/useToast';
import { ROUTES } from '../../../lib/constants';
import { cn } from '../../../lib/cn';
import { formatARS, formatDate } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import {
  ORDER_STATUS,
  ORDER_STATUS_LABEL_ES,
  ORDER_STORE_STATUS,
  getAdminOrderAggregateStatus,
  hasStockIssueForItem,
  type AdminOrder,
  type AdminOrderAggregateStatus,
  type AdminOrderStore,
  type OrderStatus,
  type OrderStoreStatus,
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
  CANCELED: {
    label: 'Cancelado',
    className: 'bg-danger/15 text-danger',
  },
};

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
  const { success, error: showError } = useToast();

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<DetailModal>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [globalStatusUpdating, setGlobalStatusUpdating] = useState(false);
  const [sliceActionBusy, setSliceActionBusy] = useState<Record<string, boolean>>({});

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

  const handleUpdateGlobalStatus = useCallback(async (newStatus: OrderStatus) => {
    if (!orderId) return;
    setGlobalStatusUpdating(true);
    try {
      await updateGlobalOrderStatus(orderId, newStatus);
      success(`Estado del pedido actualizado a: ${ORDER_STATUS_LABEL_ES[newStatus]}`);
      bumpRefresh();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else if (err instanceof Error) {
        showError(err.message);
      } else {
        showError('No se pudo actualizar el estado global del pedido.');
      }
    } finally {
      setGlobalStatusUpdating(false);
    }
  }, [orderId, success, showError, bumpRefresh]);

  const handleQuickSliceAction = useCallback(async (sliceId: string, status: OrderStoreStatus, defaultReason: string) => {
    setSliceActionBusy((prev) => ({ ...prev, [sliceId]: true }));
    try {
      await forceSliceStatus(sliceId, { status, reason: defaultReason });
      success('Estado de la tienda actualizado correctamente.');
      bumpRefresh();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else if (err instanceof Error) {
        showError(err.message);
      } else {
        showError('No se pudo actualizar el estado de la tienda.');
      }
    } finally {
      setSliceActionBusy((prev) => ({ ...prev, [sliceId]: false }));
    }
  }, [success, showError, bumpRefresh]);

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
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="flex flex-wrap items-start gap-6">
              <div>
                <h1 className="font-display text-display-md text-[var(--text-primary)]">
                  Orden #{order.id}
                </h1>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{formatDate(order.orderDate)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Estado Logístico</span>
                <div className="flex items-center gap-2">
                  <AdminOrderAggregateBadge order={order} />
                  <span className="text-xs font-medium text-[var(--text-secondary)]">({ORDER_STATUS_LABEL_ES[order.status]})</span>
                </div>
              </div>
            </div>

            {/* Selector de Estado Logístico Global */}
            <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] p-3 shadow-sm transition hover:shadow-md">
              <label htmlFor="global-order-status" className="text-xs font-bold text-[var(--text-secondary)]">
                Acción Logística Global:
              </label>
              <select
                id="global-order-status"
                value={order.status}
                disabled={globalStatusUpdating}
                onChange={(e) => void handleUpdateGlobalStatus(e.target.value as OrderStatus)}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)] disabled:opacity-50 cursor-pointer"
              >
                <option value={ORDER_STATUS.PENDING}>Pendiente de pago</option>
                <option value={ORDER_STATUS.PAID}>Pago confirmado (PAID)</option>
                <option value={ORDER_STATUS.PREPARING}>Preparando (PREPARING)</option>
                <option value={ORDER_STATUS.COLLECTING}>Recolectando (COLLECTING)</option>
                <option value={ORDER_STATUS.CONSOLIDATED}>Consolidado (CONSOLIDATED)</option>
                <option value={ORDER_STATUS.READY_FOR_PICKUP}>Listo para retirar (READY_FOR_PICKUP)</option>
                <option value={ORDER_STATUS.IN_TRANSIT}>En camino / Con Rider (IN_TRANSIT)</option>
                <option value={ORDER_STATUS.DELIVERED}>Entregado (DELIVERED)</option>
                <option value={ORDER_STATUS.CANCELED}>Cancelado (CANCELED)</option>
                <option value={ORDER_STATUS.STOCK_ISSUE}>Problema de stock (STOCK_ISSUE)</option>
              </select>
              {globalStatusUpdating ? (
                <Loader2 className="size-4 animate-spin text-brand" />
              ) : null}
            </div>
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

                      {slice.status === ORDER_STORE_STATUS.PREPARING || slice.status === ORDER_STORE_STATUS.PAID ? (
                        <>
                          <button
                            type="button"
                            disabled={sliceActionBusy[slice.id]}
                            onClick={() => void handleQuickSliceAction(slice.id, ORDER_STORE_STATUS.READY_FOR_PICKUP, 'Avance logístico estándar: Listo en local')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/15 disabled:opacity-50"
                          >
                            {sliceActionBusy[slice.id] ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <PackageCheck className="size-3.5" />
                            )}
                            Listo para Retiro
                          </button>
                          <button
                            type="button"
                            onClick={() => setModal({ kind: 'force', slice, initialStatus: ORDER_STORE_STATUS.CANCELED })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/15"
                          >
                            <PackageX className="size-3.5" />
                            Cancelar Slice
                          </button>
                        </>
                      ) : null}

                      {slice.status === ORDER_STORE_STATUS.READY_FOR_PICKUP ? (
                        <button
                          type="button"
                          disabled={sliceActionBusy[slice.id]}
                          onClick={() => void handleQuickSliceAction(slice.id, ORDER_STORE_STATUS.COLLECTED_BY_OUTLETGO, 'Recolección física en local por chofer de OutletGo')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition hover:bg-success/15 disabled:opacity-50"
                        >
                          {sliceActionBusy[slice.id] ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Truck className="size-3.5" />
                          )}
                          Recolectar
                        </button>
                      ) : null}

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

                  {/* Liquidación y Comisiones de la Tienda */}
                  {slice.grossAmount !== undefined || slice.commissionAmount !== undefined ? (
                    <div className="mt-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                        Liquidación y Comisiones de la Tienda
                      </h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 text-sm">
                        <div>
                          <span className="text-[11px] text-[var(--text-muted)] block">Venta Bruta</span>
                          <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                            {formatARS(slice.grossAmount ?? slice.subtotalArs)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[var(--text-muted)] block">Tasa de Comisión</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {slice.commissionRate !== undefined ? `${(slice.commissionRate * 100).toFixed(2)}%` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[var(--text-muted)] block">Comisión OutletGo</span>
                          <span className="font-semibold text-danger tabular-nums">
                            {slice.commissionAmount !== undefined ? `- ${formatARS(slice.commissionAmount)}` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[var(--text-muted)] block">Monto Neto a Liquidar</span>
                          <span className="font-bold text-success tabular-nums">
                            {slice.netAmount !== undefined ? formatARS(slice.netAmount) : '—'}
                          </span>
                        </div>
                      </div>
                      
                      {slice.payoutStatus ? (
                        <div className="mt-4 border-t border-[var(--border)] pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-muted)]">Estado del Payout:</span>
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2.5 py-0.5 font-semibold',
                                slice.payoutStatus === 'PAID'
                                  ? 'bg-success/15 text-success'
                                  : slice.payoutStatus === 'FAILED'
                                    ? 'bg-danger/15 text-danger'
                                    : 'bg-warning/15 text-warning'
                              )}
                            >
                              {slice.payoutStatus === 'PAID'
                                ? 'Liquidado'
                                : slice.payoutStatus === 'FAILED'
                                  ? 'Error'
                                  : 'Pendiente'}
                            </span>
                          </div>
                          {slice.paidAt ? (
                            <span className="text-[var(--text-muted)]">
                              Pagado el: {formatDate(slice.paidAt)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
              Resumen financiero global
            </h2>
            <ul className="mt-4 space-y-3 text-sm border-b border-[var(--border)] pb-4">
              <li className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Subtotal de productos:</span>
                <span className="font-medium tabular-nums">
                  {formatARS(order.productSubtotal ?? order.stores.reduce((acc, s) => acc + s.subtotalArs, 0))}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Costo de envío:</span>
                <span className="font-medium tabular-nums">{formatARS(order.shippingCost ?? 0)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Tarifa de servicio (comprador):</span>
                <span className="font-medium tabular-nums">{formatARS(order.serviceFee ?? 0)}</span>
              </li>
            </ul>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Aporte de tiendas</li>
              {order.stores.map((slice) => (
                <li
                  key={slice.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-[var(--text-secondary)]">{slice.businessName}</span>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-[var(--text-secondary)] font-mono">
                      {formatARS(slice.subtotalArs)}
                    </span>
                    <OrderStatusBadge status={slice.status} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="my-4 border-t border-[var(--border)]" />
            <div className="flex justify-between text-sm font-bold text-[var(--text-primary)]">
              <span>Total de la orden (MP)</span>
              <span className="tabular-nums text-lg">{formatARS(order.totalArs)}</span>
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
