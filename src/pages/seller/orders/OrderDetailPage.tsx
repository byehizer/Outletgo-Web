import { ChevronRight, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { OrderStatusBadge } from '../../../features/orders/OrderStatusBadge';
import { advanceSellerOrder, fetchSellerOrderDetail } from '../../../features/orders/ordersApi';
import { canSellerAdvanceOrderStatus } from '../../../features/orders/orderStatusFlow';
import { ROUTES } from '../../../lib/constants';
import { formatARS, formatDate } from '../../../lib/format';
import { cn } from '../../../lib/cn';
import { ApiError } from '../../../lib/http/apiClient';
import { buyerDisplayNameForSellerPanel, formatSellerOrderItemVariation, type SellerOrderDetail } from '../../../types/order';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const [detail, setDetail] = useState<SellerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);

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
    setToast(null);
    try {
      const next = await advanceSellerOrder(id);
      setDetail(next);
      setToast({ variant: 'success', text: 'Estado actualizado.' });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setToast({ variant: 'error', text: err.message });
      } else if (err instanceof Error) {
        setToast({ variant: 'error', text: err.message });
      } else {
        setToast({ variant: 'error', text: 'No se pudo avanzar el estado.' });
      }
    } finally {
      setBusy(false);
    }
  }, [detail, orderId]);

  const showAdvance = detail != null && canSellerAdvanceOrderStatus(detail.status);

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

      {toast ?
        <p
          role="status"
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            toast.variant === 'error' ?
              'border-danger/40 bg-danger/10 text-danger'
            : 'border-success/40 bg-success/10 text-[var(--text-secondary)]',
          )}
        >
          {toast.text}
        </p>
      : null}

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
              {detail.items.map((line, idx) => {
                const variation = formatSellerOrderItemVariation(line);
                return (
                  <li
                    key={`${line.productId}-${idx}`}
                    className="flex gap-3 py-3 text-sm"
                  >
                    <div className="shrink-0">
                      {line.thumbnailUrl ?
                        <img
                          src={line.thumbnailUrl}
                          alt=""
                          className="size-14 rounded-md border border-[var(--border)] object-cover"
                        />
                      : (
                        <div
                          aria-hidden
                          className="flex size-14 items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-input)] text-[10px] text-[var(--text-muted)]"
                        >
                          —
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text-primary)]">{line.productName}</p>
                        {variation ?
                          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{variation}</p>
                        : null}
                        <p className="text-xs text-[var(--text-muted)]">
                          {line.quantity} × {formatARS(line.unitPriceArs)}
                        </p>
                      </div>
                      <p className="font-semibold text-[var(--text-secondary)]">
                        {formatARS(line.quantity * line.unitPriceArs)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-between border-t border-[var(--border)] pt-4 text-sm">
              <span className="font-semibold text-[var(--text-primary)]">Total</span>
              <span className="font-semibold text-[var(--text-primary)]">{formatARS(detail.totalArs)}</span>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Resumen</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--text-muted)]">Fecha</dt>
                  <dd className="font-medium text-[var(--text-primary)]">{formatDate(detail.placedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Cliente</dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {buyerDisplayNameForSellerPanel(detail.buyerName)}
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
    </div>
  );
}
