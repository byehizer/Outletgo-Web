import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError } from '../../lib/http/apiClient';
import { cn } from '../../lib/cn';
import type { ReportType } from '../../types/report';

const dismissFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'El motivo debe tener al menos 10 caracteres.'),
});

type DismissFormValues = z.infer<typeof dismissFormSchema>;

export type DismissReportModalProps = {
  open: boolean;
  reportType: ReportType;
  onSuccess: () => void;
  onClose: () => void;
  onDismiss: (reason: string) => Promise<void>;
};

export function DismissReportModal({
  open,
  reportType,
  onSuccess,
  onClose,
  onDismiss,
}: DismissReportModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DismissFormValues>({
    resolver: zodResolver(dismissFormSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({ reason: '' });
    setSubmitError(null);
  }, [open, reset]);

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

  const entityLabel = reportType === 'PRODUCT' ? 'producto' : 'tienda';

  const onSubmit = async (values: DismissFormValues) => {
    setSubmitError(null);

    try {
      await onDismiss(values.reason.trim());
      onSuccess();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('No se pudo desestimar el reporte.');
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
          Desestimar reporte
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Vas a desestimar este reporte. El {entityLabel} reportado no recibirá ninguna acción
          disciplinaria.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <label
              htmlFor="dismiss-report-reason"
              className="text-xs font-medium text-[var(--text-secondary)]"
            >
              Motivo para desestimar
            </label>
            <textarea
              id="dismiss-report-reason"
              rows={4}
              placeholder="Ej: No se encontró infracción, reporte duplicado, contenido válido..."
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
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none transition hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Desestimando…' : 'Desestimar'}
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
