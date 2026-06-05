import { AlertTriangle, ChevronRight, Loader2, MessageCircle, PackageX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { OrderStatusBadge } from '../../../features/orders/OrderStatusBadge';
import { ReportItemStockModal } from '../../../features/orders/ReportItemStockModal';
import {
  advanceSellerOrder,
  cancelOrderItemSlice,
  fetchSellerOrderDetail,
  reportItemStockIssue,
} from '../../../features/orders/ordersApi';
import { canSellerAdvanceOrderStatus } from '../../../features/orders/orderStatusFlow';
import { useToast } from '../../../hooks/useToast';
import { ROUTES } from '../../../lib/constants';
import { cn } from '../../../lib/cn';
import { formatARS, formatDate } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import {
  buyerDisplayNameForSellerPanel,
  findStockIssueForItem,
  formatSellerOrderItemVariation,
  orderAllowsStockReport,
  type SellerOrderItem,
  type SellerOrderStore,
} from '../../../types/order';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [detail, setDetail] = useState<SellerOrderStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportItem, setReportItem] = useState<SellerOrderItem | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [cancelItemId, setCancelItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = orderId?.trim() ?? '';
    if (!id) {
      setErrorMessage('Pedido no encontrado.');
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const d = await fetchSellerOrderDetail(id);
      setDetail(d);
    } catch (err: unknown) {
      setDetail(null);
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo cargar el pedido.');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onAdvance = useCallback(async () => {
    const id = orderId?.trim() ?? '';
    if (!id || !detail) {
      return;
    }
    setBusy(true);
    try {
      const next = await advanceSellerOrder(id);
      setDetail(next);
      success('Estado actualizado.');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else if (err instanceof Error) {
        showError(err.message);
      } else {
        showError('No se pudo avanzar el estado.');
      }
    } finally {
      setBusy(false);
    }
  }, [detail, orderId, success, showError]);

  const onConfirmReport = useCallback(
    async (availableQuantity: number) => {
      const id = orderId?.trim() ?? '';
      if (!id || !reportItem) {
        return;
      }
      setBusy(true);
      setReportError(null);
      try {
        const next = await reportItemStockIssue(id, reportItem.id, availableQuantity);
        setDetail(next);
        setReportItem(null);
        success('Problema de stock reportado.');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setReportError(err.message);
        } else if (err instanceof Error) {
          setReportError(err.message);
        } else {
          setReportError('No se pudo reportar el problema de stock.');
        }
      } finally {
        setBusy(false);
      }
    },
    [orderId, reportItem, success],
  );

  const onCancelItem = useCallback(
    async (itemId: string) => {
      const id = orderId?.trim() ?? '';
      if (!id) {
        return;
      }
      setCancelItemId(itemId);
      setBusy(true);
      try {
        const next = await cancelOrderItemSlice(id, itemId);
        setDetail(next);
        success('Ítem cancelado del pedido.');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          showError(err.message);
        } else if (err instanceof Error) {
          showError(err.message);
        } else {
          showError('No se pudo cancelar el ítem.');
        }
      } finally {
        setBusy(false);
        setCancelItemId(null);
      }
    },
    [orderId, success, showError],
  );

  const onContactBuyer = useCallback(
    (itemId: string) => {
      const id = orderId?.trim() ?? '';
      if (!id) {
        return;
      }
      const sp = new URLSearchParams({
        openWithContext: 'true',
        orderId: id,
        item: itemId,
      });
      navigate(`${ROUTES.sellerChats}?${sp.toString()}`);
    },
    [navigate, orderId],
  );

  const showAdvance = detail != null && canSellerAdvanceOrderStatus(detail.status);
  const allowsStockActions = detail != null && orderAllowsStockReport(detail.status);

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={ROUTES.sellerOrders}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline"
        >
          ← Volver al listado
        </Link>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-display-md text-[var(--text-primary)]">
              Pedido <span className="font-mono text-lg">{orderId}</span>
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Prepará los ítems para el retiro de OutletGo; avanzá el estado cuando corresponda.
            </p>
          </div>
          {showAdvance ?
            <button
              type="button"
              disabled={busy}
              onClick={() => void onAdvance()}
              className="inline-flex items-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand shadow-sm outline-none transition hover:bg-brand/15 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ?
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              : <ChevronRight className="size-4" aria-hidden />}
              Avanzar estado
            </button>
          : null}
        </header>
      </div>

      {loading ?
        <div className="flex items-center gap-3 py-12 text-[var(--text-muted)]">
          <Loader2 className="size-6 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
          <span className="text-sm">Cargando pedido…</span>
        </div>
      : null}

      {!loading && errorMessage ?
        <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {errorMessage}
          <div className="mt-3">
            <Link to={ROUTES.sellerOrders} className="font-medium text-[var(--text-link)] underline-offset-4 hover:underline">
              Ir al listado de pedidos
            </Link>
          </div>
        </div>
      : null}

      {!loading && detail ?
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Ítems</h2>
            <ul className="mt-4 divide-y divide-[var(--border)]">
              {detail.items.map((line) => {
                const variation = formatSellerOrderItemVariation(line);
                const stockIssue = findStockIssueForItem(detail, line.id);
                const canReport =
                  allowsStockActions && stockIssue === undefined && !busy;
                const canCancel =
                  (allowsStockActions || stockIssue !== undefined) && !busy;
                const canceling = cancelItemId === line.id && busy;

                return (
                  <li key={line.id} className="py-4">
                    <div className="flex gap-3 text-sm">
                      <div className="shrink-0">
                        <div
                          aria-hidden
                          className="flex size-14 items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-input)] text-[10px] text-[var(--text-muted)]"
                        >
                          —
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text-primary)]">{line.productName}</p>
                            {variation ?
                              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{variation}</p>
                            : null}
                            <p className="text-xs text-[var(--text-muted)]">
                              {line.quantity} × {formatARS(line.unitPrice)}
                            </p>
                          </div>
                          <p className="font-semibold text-[var(--text-secondary)]">
                            {formatARS(line.quantity * line.unitPrice)}
                          </p>
                        </div>

                        {stockIssue ?
                          <div
                            className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-[var(--text-secondary)]"
                            role="status"
                          >
                            <p className="flex items-start gap-2 font-medium text-warning">
                              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                              Problema de stock reportado
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              Pedido: {stockIssue.requestedQuantity} u. · Disponible:{' '}
                              {stockIssue.availableQuantity} u.
                            </p>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onContactBuyer(line.id)}
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-link)] underline-offset-2 hover:underline disabled:opacity-60"
                            >
                              <MessageCircle className="size-3.5" aria-hidden />
                              Contactar Cliente
                            </button>
                          </div>
                        : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {canReport ?
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setReportError(null);
                                setReportItem(line);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <AlertTriangle className="size-3.5" aria-hidden />
                              Reportar falta de stock
                            </button>
                          : null}
                          {canCancel ?
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `¿Cancelar «${line.productName}» de este pedido?`,
                                  )
                                ) {
                                  void onCancelItem(line.id);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {canceling ?
                                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                              : <PackageX className="size-3.5" aria-hidden />}
                              Cancelar ítem
                            </button>
                          : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Venta Bruta (Productos)</span>
                <span className="tabular-nums font-medium">{formatARS(detail.grossAmount ?? detail.subtotalArs)}</span>
              </div>
              {detail.commissionRate !== undefined && detail.commissionAmount !== undefined ? (
                <>
                  <div className="flex justify-between text-danger">
                    <span>Comisión OutletGo ({(detail.commissionRate * 100).toFixed(1)}%)</span>
                    <span className="tabular-nums font-medium">- {formatARS(detail.commissionAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-success border-t border-dashed border-[var(--border)] pt-2 text-base">
                    <span>Monto Neto Liquidado</span>
                    <span className="tabular-nums">{formatARS(detail.netAmount ?? (detail.subtotalArs - detail.commissionAmount))}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-semibold text-[var(--text-primary)]">
                  <span>Total</span>
                  <span className="tabular-nums">{formatARS(detail.subtotalArs)}</span>
                </div>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Resumen</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--text-muted)]">Fecha</dt>
                  <dd className="font-medium text-[var(--text-primary)]">{formatDate(detail.orderDate)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Cliente</dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {buyerDisplayNameForSellerPanel(detail.buyer.displayName)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Estado</dt>
                  <dd className="mt-1">
                    <OrderStatusBadge status={detail.status} />
                  </dd>
                </div>
              </dl>
            </section>

            {detail.payoutStatus ? (
              <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">Liquidación de Venta</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-[var(--text-muted)]">Estado de Pago</dt>
                    <dd className="mt-1">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 font-semibold text-xs',
                          detail.payoutStatus === 'PAID'
                            ? 'bg-success/15 text-success'
                            : detail.payoutStatus === 'FAILED'
                              ? 'bg-danger/15 text-danger'
                              : 'bg-warning/15 text-warning'
                        )}
                      >
                        {detail.payoutStatus === 'PAID'
                          ? 'Liquidado'
                          : detail.payoutStatus === 'FAILED'
                            ? 'Error en liquidación'
                            : 'Pendiente de liquidación'}
                      </span>
                    </dd>
                  </div>
                  {detail.paidAt ? (
                    <div>
                      <dt className="text-[var(--text-muted)]">Pagado el</dt>
                      <dd className="font-medium text-[var(--text-primary)]">{formatDate(detail.paidAt)}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            <section className="rounded-xl border border-brand/25 bg-brand/5 p-6">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Logística OutletGo
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                Preparar para entregar al equipo de OutletGo. El paquete no se envía al comprador final:
                lo retira el operador logístico en tu local para armar el carrito centralizado.
              </p>
              <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Anotá en el paquete
                </p>
                <p className="mt-1 break-all font-mono text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  {detail.id}
                </p>
              </div>
            </section>
          </div>
        </div>
      : null}

      <ReportItemStockModal
        open={reportItem !== null}
        item={reportItem}
        busy={busy}
        errorMessage={reportError}
        onClose={() => {
          if (!busy) {
            setReportItem(null);
            setReportError(null);
          }
        }}
        onConfirm={(qty) => void onConfirmReport(qty)}
      />
    </div>
  );
}
