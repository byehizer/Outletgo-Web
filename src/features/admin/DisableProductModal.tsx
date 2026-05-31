import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError } from '../../lib/http/apiClient';
import { cn } from '../../lib/cn';
import type { AdminProduct, DisableProductDTO } from '../../types/moderation';

import { disableProduct } from './moderationApi';

export type DisableProductModalProduct = Pick<AdminProduct, 'id' | 'name' | 'store'>;

const disableFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'El motivo debe tener al menos 10 caracteres.'),
});

type DisableFormValues = z.infer<typeof disableFormSchema>;

export type DisableProductModalProps = {
  open: boolean;
  product: DisableProductModalProduct;
  onSuccess: () => void;
  onClose: () => void;
  /** Si se omite, usa `disableProduct` del Paso 23. */
  onDisable?: (productId: string, data: DisableProductDTO) => Promise<void>;
};

export function DisableProductModal({
  open,
  product,
  onSuccess,
  onClose,
  onDisable,
}: DisableProductModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DisableFormValues>({
    resolver: zodResolver(disableFormSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({ reason: '' });
    setSubmitError(null);
  }, [open, product.id, reset]);

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

  if (!open) {
    return null;
  }

  const onSubmit = async (values: DisableFormValues) => {
    setSubmitError(null);

    try {
      const disable = onDisable ?? ((id, data) => disableProduct(id, data));
      await disable(product.id, { reason: values.reason.trim() });
      onSuccess();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('No se pudo inhabilitar el producto.');
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
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
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl outline-none"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Inhabilitar producto
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Vas a inhabilitar{' '}
          <span className="font-medium text-[var(--text-primary)]">{product.name}</span> de{' '}
          <span className="font-medium text-[var(--text-primary)]">
            {product.store.businessName}
          </span>
          . El producto dejará de aparecer en la app y el vendedor será notificado.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <label
              htmlFor="disable-product-reason"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Motivo de inhabilitación
            </label>
            <textarea
              id="disable-product-reason"
              rows={4}
              placeholder="Ej: Contenido inapropiado, producto falsificado, descripción engañosa..."
              className={cn(
                'w-full rounded-lg border bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]',
                errors.reason ? 'border-danger' : 'border-[var(--border)]',
              )}
              {...register('reason')}
            />
            {errors.reason ? (
              <p role="alert" className="text-xs text-danger">
                {errors.reason.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-4 text-sm font-semibold text-[var(--text-primary)] outline-none transition hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (!isSubmitting) {
                  onClose();
                }
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-white outline-none transition hover:bg-danger/90 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Inhabilitando…' : 'Inhabilitar'}
            </button>
          </div>

          {submitError ? (
            <p role="alert" className="text-sm text-danger">
              {submitError}
            </p>
          ) : null}
        </form>
      </div>
    </div>,
    document.body,
  );
}
