import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { cn } from '../../lib/cn';

import type { ProductFormValues } from './productSchema';

type VariationsFieldProps = {
  disabled?: boolean;
  className?: string;
};

export function VariationsField({ disabled, className }: VariationsFieldProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variations',
  });

  const canRemoveRow = fields.length > 1;

  return (
    <fieldset disabled={disabled} className={cn('space-y-3', className)}>
      <legend className="text-sm font-semibold text-[var(--text-primary)]">Variaciones</legend>
      <p className="text-xs text-[var(--text-muted)]">
        Talle, color y stock por combinación (mínimo una fila).
      </p>
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:grid-cols-[1fr_1fr_120px_auto]"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]" htmlFor={`v-size-${field.id}`}>
                Talle
              </label>
              <input
                id={`v-size-${field.id}`}
                type="text"
                autoComplete="off"
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                {...register(`variations.${index}.size` as const)}
              />
              <p role="alert" className="mt-1 min-h-[1rem] text-xs text-danger">
                {errors.variations?.[index]?.size?.message}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]" htmlFor={`v-color-${field.id}`}>
                Color
              </label>
              <input
                id={`v-color-${field.id}`}
                type="text"
                autoComplete="off"
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                {...register(`variations.${index}.color` as const)}
              />
              <p role="alert" className="mt-1 min-h-[1rem] text-xs text-danger">
                {errors.variations?.[index]?.color?.message}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]" htmlFor={`v-stock-${field.id}`}>
                Stock
              </label>
              <input
                id={`v-stock-${field.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                {...register(`variations.${index}.stock` as const)}
              />
              <p role="alert" className="mt-1 min-h-[1rem] text-xs text-danger">
                {errors.variations?.[index]?.stock?.message}
              </p>
            </div>
            <div className="flex items-end justify-end pb-1 sm:justify-center">
              <button
                type="button"
                aria-label={`Eliminar variación ${index + 1}`}
                disabled={!canRemoveRow || disabled}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm outline-none transition',
                  !canRemoveRow || disabled
                    ? 'cursor-not-allowed border-[var(--border)] bg-transparent text-[var(--text-muted)] opacity-60'
                    : 'border-danger/35 bg-danger/10 text-danger hover:bg-danger/15 focus:border-danger',
                )}
                onClick={() => {
                  if (!canRemoveRow) {
                    return;
                  }
                  remove(index);
                }}
              >
                <Trash2 className="size-4" aria-hidden />
                <span className="hidden sm:inline">Quitar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => append({ size: '', color: '', stock: 1 })}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] outline-none hover:border-brand/40 hover:text-brand focus:border-[var(--border-focus)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="size-4" aria-hidden />
        Agregar variación
      </button>

    </fieldset>
  );
}
