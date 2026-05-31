import { Loader2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/cn';
import type { SellerOrderItem } from '../../types/order';

export type ReportItemStockModalProps = {
  open: boolean;
  item: SellerOrderItem | null;
  busy?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (availableQuantity: number) => void;
};

export function ReportItemStockModal({
  open,
  item,
  busy = false,
  errorMessage = null,
  onClose,
  onConfirm,
}: ReportItemStockModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [availableQuantity, setAvailableQuantity] = useState('0');

  useEffect(() => {
    if (!open || !item) {
      return;
    }
    setAvailableQuantity('0');
  }, [open, item]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.activeElement as HTMLElement | null;
    const root = panelRef.current;
    const first =
      root?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled])',
      ) ?? root;
    first?.focus({ preventScroll: true });

    const onDocKeyDown = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === 'Escape' && !busy) {
        ev.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('keydown', onDocKeyDown);
      previous?.focus({ preventScroll: true });
    };
  }, [open, busy, onClose]);

  if (!open || !item) {
    return null;
  }

  const requested = item.quantity;
  const parsed = Number.parseInt(availableQuantity, 10);
  const validQty = Number.isFinite(parsed) && parsed >= 0 && parsed < requested;

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!validQty || busy) {
      return;
    }
    onConfirm(parsed);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Reportar falta de stock
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">{item.productName}</span>
          {' · '}
          pedido: {requested} u.
        </p>
        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            <span className="font-medium text-[var(--text-primary)]">
              ¿Cuántas unidades podés entregar?
            </span>
            <input
              type="number"
              min={0}
              max={requested - 1}
              step={1}
              value={availableQuantity}
              disabled={busy}
              onChange={(ev) => setAvailableQuantity(ev.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] disabled:opacity-60"
            />
            <span className="mt-1 block text-xs text-[var(--text-muted)]">
              Debe ser menor a {requested} (0 si no hay stock).
            </span>
          </label>

          {errorMessage ?
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {errorMessage}
            </p>
          : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-input)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!validQty || busy}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-warning px-4 py-2 text-sm font-semibold text-white transition-opacity hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {busy ?
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              : null}
              Confirmar reporte
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
