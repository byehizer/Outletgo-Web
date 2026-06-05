import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, DollarSign, Percent, Info, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError } from '../../lib/http/apiClient';
import { cn } from '../../lib/cn';
import type { ServiceFeeRule, ServiceFeeRuleSavePayload } from '../../types/service-fee-rule';
import { createServiceFeeRule, updateServiceFeeRule } from './serviceFeeRulesApi';

const serviceFeeRuleFormSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre de la regla es obligatorio.'),
    feeTarget: z.enum(['BUYER_SHIPPING', 'BUYER_ORDER', 'SELLER_COMMISSION']),
    feeType: z.enum(['FIXED', 'PERCENTAGE']),
    feeValue: z.coerce
      .number({ invalid_type_error: 'El valor debe ser un número válido.' })
      .min(0, 'El valor debe ser mayor o igual a 0.'),
    shippingMethod: z.string().nullable().or(z.literal('')),
    minOrderAmount: z.coerce
      .number({ invalid_type_error: 'El monto mínimo debe ser un número válido.' })
      .min(0, 'El monto mínimo debe ser mayor o igual a 0.'),
    priority: z.coerce
      .number({ invalid_type_error: 'La prioridad debe ser un entero válido.' })
      .int('La prioridad debe ser un número entero.')
      .min(0, 'La prioridad mínima es 0.'),
    validFrom: z.string().nullable().or(z.literal('')),
    validUntil: z.string().nullable().or(z.literal('')),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.feeType === 'PERCENTAGE' && data.feeValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El porcentaje de la tarifa no puede exceder el 100%.',
        path: ['feeValue'],
      });
    }

    if (data.validFrom && data.validUntil) {
      const fromTime = new Date(data.validFrom).getTime();
      const untilTime = new Date(data.validUntil).getTime();
      if (!Number.isNaN(fromTime) && !Number.isNaN(untilTime) && fromTime > untilTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La fecha de inicio no puede ser posterior a la fecha de finalización.',
          path: ['validUntil'],
        });
      }
    }
  });

type ServiceFeeRuleFormValues = z.infer<typeof serviceFeeRuleFormSchema>;

export type ServiceFeeRuleFormModalProps =
  | {
      open: boolean;
      mode: 'create';
      onSuccess: () => void;
      onClose: () => void;
    }
  | {
      open: boolean;
      mode: 'edit';
      rule: ServiceFeeRule;
      onSuccess: () => void;
      onClose: () => void;
    };

function toLocalDatetimeString(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoStringOrNull(localString: string | null | undefined): string | null {
  if (!localString) return null;
  const d = new Date(localString);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function createDefaultValues(): ServiceFeeRuleFormValues {
  return {
    name: '',
    feeTarget: 'BUYER_SHIPPING',
    feeType: 'FIXED',
    feeValue: 0,
    shippingMethod: '',
    minOrderAmount: 0,
    priority: 1,
    validFrom: '',
    validUntil: '',
    isActive: true,
  };
}

function editDefaultValues(rule: ServiceFeeRule): ServiceFeeRuleFormValues {
  return {
    name: rule.name,
    feeTarget: rule.feeTarget,
    feeType: rule.feeType,
    feeValue: rule.feeValue,
    shippingMethod: rule.shippingMethod ?? '',
    minOrderAmount: rule.minOrderAmount,
    priority: rule.priority,
    validFrom: toLocalDatetimeString(rule.validFrom),
    validUntil: toLocalDatetimeString(rule.validUntil),
    isActive: rule.isActive,
  };
}

const inputClass = (invalid: boolean) =>
  cn(
    'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition duration-150 placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]',
    invalid ? 'border-danger focus:border-danger focus:ring-danger' : 'border-[var(--border)]',
  );

export function ServiceFeeRuleFormModal(props: ServiceFeeRuleFormModalProps) {
  const { open, mode, onSuccess, onClose } = props;
  const rule = mode === 'edit' ? props.rule : undefined;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isCreate = mode === 'create';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFeeRuleFormValues>({
    resolver: zodResolver(serviceFeeRuleFormSchema),
    defaultValues: isCreate ? createDefaultValues() : rule ? editDefaultValues(rule) : createDefaultValues(),
  });

  const watchedFeeTarget = watch('feeTarget');
  const watchedFeeType = watch('feeType');

  // Reset shipping method when target changes to something where shipping isn't applicable
  useEffect(() => {
    if (watchedFeeTarget === 'SELLER_COMMISSION') {
      setValue('shippingMethod', '');
    }
  }, [watchedFeeTarget, setValue]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSubmitError(null);
    if (isCreate) {
      reset(createDefaultValues());
    } else if (rule) {
      reset(editDefaultValues(rule));
    }
  }, [open, isCreate, rule, reset]);

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

  if (!isCreate && !rule) {
    return null;
  }

  const onSubmit = async (values: ServiceFeeRuleFormValues) => {
    setSubmitError(null);

    const formattedPayload: ServiceFeeRuleSavePayload = {
      name: values.name.trim(),
      feeTarget: values.feeTarget,
      feeType: values.feeType,
      feeValue: values.feeValue,
      shippingMethod:
        values.feeTarget !== 'SELLER_COMMISSION' && values.shippingMethod
          ? (values.shippingMethod as 'RETIRO_EN_PUNTO' | 'ENVIO_CORREO')
          : null,
      minOrderAmount: values.minOrderAmount,
      priority: values.priority,
      validFrom: toIsoStringOrNull(values.validFrom),
      validUntil: toIsoStringOrNull(values.validUntil),
      isActive: values.isActive,
    };

    try {
      if (isCreate) {
        await createServiceFeeRule(formattedPayload);
      } else if (rule) {
        await updateServiceFeeRule(rule.id, formattedPayload);
      }
      onSuccess();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Ocurrió un error al guardar la regla.');
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm p-4 sm:items-center transition-opacity"
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
        className="max-h-[min(94vh,760px)] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <h2 id={titleId} className="font-display text-lg font-bold text-[var(--text-primary)]">
            {isCreate ? 'Crear Regla de Tarifa / Comisión' : 'Editar Regla de Tarifa / Comisión'}
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition"
            aria-label="Cerrar"
            onClick={() => {
              if (!isSubmitting) onClose();
            }}
          >
            <X className="size-5" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Nombre de la Regla */}
          <div className="space-y-1.5">
            <label htmlFor="sfr-name" className="text-xs font-semibold text-[var(--text-secondary)]">
              Nombre de la Regla
            </label>
            <input
              id="sfr-name"
              type="text"
              className={inputClass(Boolean(errors.name))}
              placeholder="Ej: Comisión General de Tiendas (10%)"
              {...register('name')}
            />
            {errors.name ? (
              <p role="alert" className="text-xs text-danger font-medium mt-1">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Ámbito / Target */}
            <div className="space-y-1.5">
              <label htmlFor="sfr-feeTarget" className="text-xs font-semibold text-[var(--text-secondary)]">
                Ámbito de Aplicación
              </label>
              <select
                id="sfr-feeTarget"
                className={inputClass(Boolean(errors.feeTarget))}
                {...register('feeTarget')}
              >
                <option value="BUYER_SHIPPING">Tarifa Comprador: Por Envío (BUYER_SHIPPING)</option>
                <option value="BUYER_ORDER">Tarifa Comprador: Por Pedido (BUYER_ORDER)</option>
                <option value="SELLER_COMMISSION">Comisión del Local (SELLER_COMMISSION)</option>
              </select>
              {errors.feeTarget ? (
                <p role="alert" className="text-xs text-danger font-medium mt-1">
                  {errors.feeTarget.message}
                </p>
              ) : null}
            </div>

            {/* Tipo de Valor */}
            <div className="space-y-1.5">
              <label htmlFor="sfr-feeType" className="text-xs font-semibold text-[var(--text-secondary)]">
                Tipo de Tarifa
              </label>
              <select
                id="sfr-feeType"
                className={inputClass(Boolean(errors.feeType))}
                {...register('feeType')}
              >
                <option value="FIXED">Monto Fijo ($)</option>
                <option value="PERCENTAGE">Porcentual (%)</option>
              </select>
              {errors.feeType ? (
                <p role="alert" className="text-xs text-danger font-medium mt-1">
                  {errors.feeType.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Valor de la Tarifa */}
            <div className="space-y-1.5">
              <label htmlFor="sfr-feeValue" className="text-xs font-semibold text-[var(--text-secondary)]">
                Valor de la Tarifa
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)]">
                  {watchedFeeType === 'PERCENTAGE' ? (
                    <Percent className="size-4" />
                  ) : (
                    <span className="text-sm font-semibold">$</span>
                  )}
                </div>
                <input
                  id="sfr-feeValue"
                  type="text"
                  inputMode="decimal"
                  className={cn(inputClass(Boolean(errors.feeValue)), 'pl-8')}
                  placeholder={watchedFeeType === 'PERCENTAGE' ? 'Ej: 10' : 'Ej: 150'}
                  {...register('feeValue')}
                />
              </div>
              {errors.feeValue ? (
                <p role="alert" className="text-xs text-danger font-medium mt-1">
                  {errors.feeValue.message}
                </p>
              ) : null}
            </div>

            {/* Prioridad */}
            <div className="space-y-1.5">
              <label htmlFor="sfr-priority" className="text-xs font-semibold text-[var(--text-secondary)]">
                Prioridad de la Regla
              </label>
              <input
                id="sfr-priority"
                type="number"
                min="0"
                className={inputClass(Boolean(errors.priority))}
                placeholder="Ej: 10 (mayor número gana)"
                {...register('priority')}
              />
              {errors.priority ? (
                <p role="alert" className="text-xs text-danger font-medium mt-1">
                  {errors.priority.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Método de Envío (Condicional) */}
            {watchedFeeTarget !== 'SELLER_COMMISSION' ? (
              <div className="space-y-1.5">
                <label htmlFor="sfr-shippingMethod" className="text-xs font-semibold text-[var(--text-secondary)]">
                  Restringido a Método de Envío
                </label>
                <select
                  id="sfr-shippingMethod"
                  className={inputClass(Boolean(errors.shippingMethod))}
                  {...register('shippingMethod')}
                >
                  <option value="">Todos los métodos (Sin restricción)</option>
                  <option value="RETIRO_EN_PUNTO">Retiro en Punto Físico</option>
                  <option value="ENVIO_CORREO">Envío por Correo</option>
                </select>
                {errors.shippingMethod ? (
                  <p role="alert" className="text-xs text-danger font-medium mt-1">
                    {errors.shippingMethod.message}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] opacity-50">
                  Restringido a Método de Envío
                </label>
                <input
                  type="text"
                  disabled
                  value="No aplica a comisiones"
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 text-sm text-[var(--text-muted)] outline-none cursor-not-allowed opacity-60"
                />
              </div>
            )}

            {/* Monto de Compra Mínimo */}
            <div className="space-y-1.5">
              <label htmlFor="sfr-minOrderAmount" className="text-xs font-semibold text-[var(--text-secondary)]">
                Monto Mínimo de Pedido/Venta ($)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)]">
                  <DollarSign className="size-4" />
                </div>
                <input
                  id="sfr-minOrderAmount"
                  type="text"
                  inputMode="decimal"
                  className={cn(inputClass(Boolean(errors.minOrderAmount)), 'pl-8')}
                  placeholder="Ej: 5000 (0 para cualquiera)"
                  {...register('minOrderAmount')}
                />
              </div>
              {errors.minOrderAmount ? (
                <p role="alert" className="text-xs text-danger font-medium mt-1">
                  {errors.minOrderAmount.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* Vigencia (Fechas) */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Calendar className="size-4 text-brand" /> Período de Vigencia (Opcional)
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="sfr-validFrom" className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Desde (Fecha/Hora de Inicio)
                </label>
                <input
                  id="sfr-validFrom"
                  type="datetime-local"
                  className={inputClass(Boolean(errors.validFrom))}
                  {...register('validFrom')}
                />
                {errors.validFrom ? (
                  <p role="alert" className="text-xs text-danger font-medium mt-1">
                    {errors.validFrom.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label htmlFor="sfr-validUntil" className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Hasta (Fecha/Hora de Vencimiento)
                </label>
                <input
                  id="sfr-validUntil"
                  type="datetime-local"
                  className={inputClass(Boolean(errors.validUntil))}
                  {...register('validUntil')}
                />
                {errors.validUntil ? (
                  <p role="alert" className="text-xs text-danger font-medium mt-1">
                    {errors.validUntil.message}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] p-2.5 rounded-lg border border-[var(--border)]">
              <Info className="size-4 shrink-0 text-brand mt-0.5" />
              <p>
                Si se dejan en blanco, la regla se aplicará permanentemente a partir de su activación.
              </p>
            </div>
          </div>

          {/* Estado Activo */}
          <div className="flex items-center gap-3 py-2">
            <input
              id="sfr-isActive"
              type="checkbox"
              className="size-4 rounded border-[var(--border)] text-brand focus:ring-brand cursor-pointer"
              {...register('isActive')}
            />
            <label htmlFor="sfr-isActive" className="text-sm font-semibold text-[var(--text-primary)] cursor-pointer selection:bg-transparent">
              Regla Activa y Habilitada
            </label>
          </div>

          {submitError ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-5 text-sm font-semibold text-[var(--text-primary)] outline-none transition hover:bg-[var(--bg-hover)] focus:ring-2 focus:ring-brand/45 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (!isSubmitting) onClose();
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white outline-none transition hover:bg-brand/90 focus:ring-2 focus:ring-brand/45 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
