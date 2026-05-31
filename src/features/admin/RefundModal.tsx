import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { refundSlice } from './adminOrdersApi';
import { cn } from '../../lib/cn';
import { formatARS } from '../../lib/format';
import { ApiError } from '../../lib/http/apiClient';
import type { AdminOrderStore, RefundResult } from '../../types/order';

type RefundType = 'full' | 'partial';

const refundFormSchema = z.object({
  refundType: z.enum(['full', 'partial']),
  amount: z.string(),
  reason: z.string().trim().min(10, 'El motivo debe tener al menos 10 caracteres.'),
});

type RefundFormValues = z.infer<typeof refundFormSchema>;

export type RefundModalProps = {
  open: boolean;
  slice: AdminOrderStore | null;
  orderId: string;
  onSuccess: () => void;
  onClose: () => void;
};

export function RefundModal({ open, slice, orderId, onSuccess, onClose }: RefundModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<RefundResult | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: { refundType: 'full', amount: '', reason: '' },
  });

  const refundType = watch('refundType') as RefundType;
  const amountRaw = watch('amount');

  useEffect(() => {
    if (!open || !slice) {
      return;
    }
    reset({
      refundType: 'full',
      amount: String(slice.subtotalArs),
      reason: '',
    });
    setSubmitError(null);
    setSuccessResult(null);
  }, [open, slice, reset]);

  useEffect(() => {
    if (!slice || refundType !== 'full') {
      return;
    }
    setValue('amount', String(slice.subtotalArs));
  }, [refundType, slice, setValue]);

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

  const parsedAmount = Number.parseFloat(amountRaw);
  const amountValid =
    Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= slice.subtotalArs;

  const onSubmit = async (values: RefundFormValues) => {
    setSubmitError(null);
    const amount =
      values.refundType === 'full' ? slice.subtotalArs : Number.parseFloat(values.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > slice.subtotalArs) {
      setSubmitError('El monto debe ser mayor a 0 y no superar el subtotal del slice.');
      return;
    }

    try {
      const result = await refundSlice({
        sliceId: slice.id,
        amount,
        reason: values.reason.trim(),
      });
      if (!result.success) {
        setSubmitError(result.message || 'No se pudo iniciar el reembolso.');
        return;
      }
      setSuccessResult(result);
      onSuccess();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('No se pudo iniciar el reembolso.');
      }
    }
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleClose();
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
          Iniciar reembolso
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Slice de {slice.businessName} — Orden #{orderId}
        </p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Subtotal del slice: {formatARS(slice.subtotalArs)}
        </p>

        {successResult ?
          <div className="mt-5 space-y-4">
            <span className="inline-flex rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              Reembolso iniciado
            </span>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">ID de reembolso MP</dt>
                <dd className="font-mono font-medium text-[var(--text-primary)]">
                  {successResult.mpRefundId ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Monto reembolsado</dt>
                <dd className="font-semibold text-[var(--text-primary)]">
                  {formatARS(successResult.refundedAmount)}
                </dd>
              </div>
            </dl>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Cerrar
              </button>
            </div>
          </div>
        : (
          <form className="mt-5 space-y-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-[var(--text-primary)]">
                Tipo de reembolso
              </legend>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="radio"
                  value="full"
                  disabled={isSubmitting}
                  {...register('refundType')}
                  className="size-4 accent-brand"
                />
                Reembolso total del slice
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="radio"
                  value="partial"
                  disabled={isSubmitting}
                  {...register('refundType')}
                  className="size-4 accent-brand"
                />
                Reembolso parcial
              </label>
            </fieldset>

            {refundType === 'partial' ?
              <label className="block text-sm">
                <span className="font-medium text-[var(--text-primary)]">Monto a reembolsar</span>
                <input
                  type="number"
                  min={0.01}
                  max={slice.subtotalArs}
                  step={0.01}
                  disabled={isSubmitting}
                  {...register('amount')}
                  className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] disabled:opacity-60"
                />
                <span
                  className={cn(
                    'mt-1 block text-xs',
                    amountValid ? 'text-[var(--text-muted)]' : 'text-danger',
                  )}
                >
                  {amountValid ?
                    formatARS(parsedAmount)
                  : 'Ingresá un monto entre $0,01 y el subtotal del slice.'}
                </span>
              </label>
            : null}

            <label className="block text-sm">
              <span className="font-medium text-[var(--text-primary)]">Motivo del reembolso</span>
              <textarea
                {...register('reason')}
                rows={4}
                disabled={isSubmitting}
                placeholder="Ej: Cancelación por stock, acuerdo con el comprador, error en el pedido..."
                className="mt-2 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] disabled:opacity-60"
              />
              {errors.reason ?
                <span className="mt-1 block text-xs text-danger">{errors.reason.message}</span>
              : null}
            </label>

            <p className="text-xs text-[var(--text-muted)]">
              El reembolso se procesará a través de Mercado Pago. El tiempo de acreditación depende
              del banco del comprador.
            </p>

            {submitError ?
              <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                {submitError}
              </p>
            : null}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleClose}
                className="rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-input)] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (refundType === 'partial' && !amountValid)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ?
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                : null}
                Iniciar reembolso
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
