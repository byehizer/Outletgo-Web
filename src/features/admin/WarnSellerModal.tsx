import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError } from '../../lib/http/apiClient';
import { cn } from '../../lib/cn';
import type { ReportType } from '../../types/report';

const warnFormSchema = z.object({
  message: z
    .string()
    .trim()
    .min(20, 'El mensaje debe tener al menos 20 caracteres.')
    .max(500, 'El mensaje no puede superar 500 caracteres.'),
});

type WarnFormValues = z.infer<typeof warnFormSchema>;

export type WarnSellerModalProps = {
  open: boolean;
  reportType: ReportType;
  entityName: string;
  onSuccess: () => void;
  onClose: () => void;
  onWarn: (message: string) => Promise<void>;
};

export function WarnSellerModal({
  open,
  reportType,
  entityName,
  onSuccess,
  onClose,
  onWarn,
}: WarnSellerModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WarnFormValues>({
    resolver: zodResolver(warnFormSchema),
    defaultValues: { message: '' },
  });

  const messageValue = watch('message') ?? '';
  const charCount = messageValue.length;

  const placeholder =
    reportType === 'PRODUCT'
      ? `Ej: Revisamos el reporte sobre tu producto ${entityName}. Por favor actualizá las imágenes o la descripción para cumplir con nuestras normas.`
      : `Ej: Recibimos un reporte sobre tu tienda ${entityName}. Por favor revisá el contenido publicado para cumplir con nuestras normas.`;

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({ message: '' });
    setSubmitError(null);
  }, [open, entityName, reset]);

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

  const onSubmit = async (values: WarnFormValues) => {
    setSubmitError(null);

    try {
      await onWarn(values.message.trim());
      onSuccess();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('No se pudo enviar la advertencia.');
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
          Enviar advertencia
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
          El vendedor recibirá este mensaje en su panel. Su{' '}
          {reportType === 'PRODUCT' ? 'producto' : 'tienda'} no será sancionado.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <label
              htmlFor="warn-seller-message"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Mensaje para el vendedor
            </label>
            <textarea
              id="warn-seller-message"
              rows={5}
              maxLength={500}
              placeholder={placeholder}
              className={cn(
                'w-full rounded-lg border bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]',
                errors.message ? 'border-danger' : 'border-[var(--border)]',
              )}
              {...register('message')}
            />
            <div className="flex items-center justify-between gap-2">
              {errors.message ? (
                <p role="alert" className="text-xs text-danger">
                  {errors.message.message}
                </p>
              ) : (
                <span />
              )}
              <p className="text-xs text-[var(--text-muted)]">{charCount} / 500</p>
            </div>
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
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-warning px-4 text-sm font-semibold text-white outline-none transition hover:bg-warning/90 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando…' : 'Enviar advertencia'}
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
