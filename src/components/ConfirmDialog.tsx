import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../lib/cn';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Texto del botón principal (confirmar o “Entendido”). */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Sin cancelar: modal informativo (un solo botón). */
  acknowledgeOnly?: boolean;
  /** Estilo de acción destructiva en el botón principal. */
  danger?: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

/**
 * Diálogo modal accesible (`role="dialog"`, `aria-modal`, foco inicial, Escape).
 * Paso 14 — confirmación de pausa / baja lógica.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  acknowledgeOnly = false,
  danger = false,
  busy = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.activeElement as HTMLElement | null;
    const root = panelRef.current;
    const first =
      root?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ) ?? root;
    first?.focus({ preventScroll: true });

    const onDocKeyDown = (ev: globalThis.KeyboardEvent) => {
      if (!root) {
        return;
      }
      if (ev.key === 'Escape' && !busy) {
        ev.preventDefault();
        onClose();
        return;
      }
      if (ev.key !== 'Tab') {
        return;
      }
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      if (focusables.length === 0) {
        return;
      }
      const firstEl = focusables.item(0);
      const lastEl = focusables.item(focusables.length - 1);
      if (!firstEl || !lastEl) {
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      if (ev.shiftKey) {
        if (active === firstEl || active === root || !root.contains(active)) {
          ev.preventDefault();
          lastEl.focus();
        }
      } else if (active === lastEl) {
        ev.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onDocKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onDocKeyDown);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, busy, onClose]);

  if (!open) {
    return null;
  }

  const handleConfirm = async () => {
    if (busy) {
      return;
    }
    await onConfirm();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl outline-none',
        )}
      >
        <h2 id={titleId} className="text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        {description ?
          <div className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</div>
        : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {!acknowledgeOnly ?
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none transition hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (!busy) {
                  onClose();
                }
              }}
              disabled={busy}
            >
              {cancelLabel}
            </button>
          : null}
          <button
            type="button"
            className={cn(
              'inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white outline-none transition focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50',
              danger ? 'bg-danger hover:bg-danger/90' : 'bg-brand hover:bg-brand/90',
            )}
            onClick={() => void handleConfirm()}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
