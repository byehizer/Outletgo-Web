import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { forceSliceStatus } from './adminOrdersApi';
import { cn } from '../../lib/cn';
import { ApiError } from '../../lib/http/apiClient';
import {
  ORDER_STATUS,
  ORDER_STATUS_LABEL_ES,
  type AdminOrderStore,
  type OrderStatus,
} from '../../types/order';

const forceStatusSchema = z.object({
  status: z.string().min(1, 'Seleccioná un estado.'),
  reason: z.string().trim().min(10, 'El motivo debe tener al menos 10 caracteres.'),
});

type ForceStatusFormValues = z.infer<typeof forceStatusSchema>;

const ADMIN_FORCE_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: ORDER_STATUS.PENDING, label: 'Pendiente' },
  { value: ORDER_STATUS.PREPARING, label: 'Preparando' },
  { value: ORDER_STATUS.READY_FOR_PICKUP, label: 'Listo para retiro' },
  { value: ORDER_STATUS.DELIVERED, label: 'Entregado' },
  { value: ORDER_STATUS.CANCELED, label: 'Cancelado' },
  { value: ORDER_STATUS.STOCK_ISSUE, label: 'Problema de stock' },
];

export type ForceStatusModalProps = {
  open: boolean;
  slice: AdminOrderStore | null;
  orderId: string;
  /** Estado pre-seleccionado (ej. cancelar desde STOCK_ISSUE). */
  initialStatus?: OrderStatus;
  onSuccess: () => void;
  onClose: () => void;
};

export function ForceStatusModal({
  open,
  slice,
  orderId,
  initialStatus,
  onSuccess,
  onClose,
}: ForceStatusModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const statusOptions = useMemo(() => {
    if (!slice) {
      return ADMIN_FORCE_STATUS_OPTIONS;
    }
    return ADMIN_FORCE_STATUS_OPTIONS.filter((opt) => opt.value !== slice.status);
  }, [slice]);

  const defaultStatus = initialStatus ?? statusOptions[0]?.value ?? ORDER_STATUS.PREPARING;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ForceStatusFormValues>({
    resolver: zodResolver(forceStatusSchema),
    defaultValues: { status: defaultStatus, reason: '' },
  });

  const selectedStatus = watch('status');

  useEffect(() => {
    if (!open || !slice) {
      return;
    }
    const opts = ADMIN_FORCE_STATUS_OPTIONS.filter((opt) => opt.value !== slice.status);
    const pre =
      initialStatus && initialStatus !== slice.status && opts.some((o) => o.value === initialStatus)
        ? initialStatus
        : (opts[0]?.value ?? ORDER_STATUS.PREPARING);
    reset({ status: pre, reason: '' });
    setSubmitError(null);
  }, [open, slice, initialStatus, reset]);

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
      if (ev.key === 'Escape' && !isSubmitting) {
        ev.preventDefault();
        onClose();
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
  }, [open, isSubmitting, onClose]);

  if (!open || !slice) {
    return null;
  }

  const onSubmit = async (values: ForceStatusFormValues) => {
    setSubmitError(null);
    const status = values.status as OrderStatus;

    try {
      await forceSliceStatus(slice.id, { status, reason: values.reason.trim() });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('No se pudo cambiar el estado.');
      }
    }
  };

  const showCancelWarning = selectedStatus === ORDER_STATUS.CANCELED;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Cambiar estado — {slice.businessName}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Slice #{slice.id} de la Orden #{orderId}
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Estado actual: {ORDER_STATUS_LABEL_ES[slice.status]}
        </p>

        <form className="mt-5 space-y-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <label className="block text-sm">
            <span className="font-medium text-[var(--text-primary)]">Nuevo estado</span>
            <select
              {...register('status')}
              disabled={isSubmitting}
              className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] disabled:opacity-60"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.status ?
              <span className="mt-1 block text-xs text-danger">{errors.status.message}</span>
            : null}
          </label>

          {showCancelWarning ?
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              Al cancelar este slice el Admin deberá decidir si iniciar el reembolso manualmente
              desde el detalle del pedido.
            </p>
          : null}

          <label className="block text-sm">
            <span className="font-medium text-[var(--text-primary)]">Motivo del cambio forzado</span>
            <textarea
              {...register('reason')}
              rows={4}
              disabled={isSubmitting}
              placeholder="Ej: Error del sistema, acuerdo con el comprador, corrección operativa..."
              className="mt-2 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] disabled:opacity-60"
            />
            {errors.reason ?
              <span className="mt-1 block text-xs text-danger">{errors.reason.message}</span>
            : null}
          </label>

          {submitError ?
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {submitError}
            </p>
          : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-input)] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {isSubmitting ?
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              : null}
              Confirmar cambio
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
