import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError } from '../../lib/http/apiClient';
import { cn } from '../../lib/cn';
import type { PickupPoint, PickupPointSavePayload } from '../../types/pickup-point';
import { createPickupPoint, updatePickupPoint } from './pickupPointsApi';

const pickupPointFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  address: z.string().trim().min(1, 'La dirección es obligatoria.'),
  neighborhood: z.string().trim().min(1, 'El barrio es obligatorio.'),
  city: z.string().trim().min(1, 'La localidad es obligatoria.'),
  lat: z.coerce
    .number({ invalid_type_error: 'La latitud debe ser un número decimal válido.' })
    .min(-90, 'La latitud mínima es -90.')
    .max(90, 'La latitud máxima es 90.'),
  lng: z.coerce
    .number({ invalid_type_error: 'La longitud debe ser un número decimal válido.' })
    .min(-180, 'La longitud mínima es -180.')
    .max(180, 'La longitud máxima es 180.'),
  businessHours: z.string().trim().min(1, 'El horario de atención es obligatorio.'),
  isActive: z.boolean().default(true),
});

type PickupPointFormValues = z.infer<typeof pickupPointFormSchema>;

export type PickupPointFormModalProps =
  | {
      open: boolean;
      mode: 'create';
      onSuccess: () => void;
      onClose: () => void;
    }
  | {
      open: boolean;
      mode: 'edit';
      pickupPoint: PickupPoint;
      onSuccess: () => void;
      onClose: () => void;
    };

function createDefaultValues(): PickupPointFormValues {
  return {
    name: '',
    address: '',
    neighborhood: '',
    city: '',
    lat: 0,
    lng: 0,
    businessHours: '',
    isActive: true,
  };
}

function editDefaultValues(point: PickupPoint): PickupPointFormValues {
  return {
    name: point.name,
    address: point.address,
    neighborhood: point.neighborhood,
    city: point.city,
    lat: point.lat,
    lng: point.lng,
    businessHours: point.businessHours,
    isActive: point.isActive,
  };
}

const inputClass = (invalid: boolean) =>
  cn(
    'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]',
    invalid ? 'border-danger' : 'border-[var(--border)]',
  );

export function PickupPointFormModal(props: PickupPointFormModalProps) {
  const { open, mode, onSuccess, onClose } = props;
  const point = mode === 'edit' ? props.pickupPoint : undefined;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isCreate = mode === 'create';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PickupPointFormValues>({
    resolver: zodResolver(pickupPointFormSchema),
    defaultValues: isCreate ? createDefaultValues() : point ? editDefaultValues(point) : createDefaultValues(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setSubmitError(null);
    if (isCreate) {
      reset(createDefaultValues());
    } else if (point) {
      reset(editDefaultValues(point));
    }
  }, [open, isCreate, point, reset]);

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

  if (!isCreate && !point) {
    return null;
  }

  const onSubmit = async (values: PickupPointFormValues) => {
    setSubmitError(null);

    const payload: PickupPointSavePayload = {
      name: values.name.trim(),
      address: values.address.trim(),
      neighborhood: values.neighborhood.trim(),
      city: values.city.trim(),
      lat: values.lat,
      lng: values.lng,
      businessHours: values.businessHours.trim(),
      isActive: values.isActive,
    };

    try {
      if (isCreate) {
        await createPickupPoint(payload);
      } else if (point) {
        await updatePickupPoint(point.id, payload);
      }
      onSuccess();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('No se pudo guardar el punto de retiro.');
      }
    }
  };

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
        tabIndex={-1}
        className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl outline-none"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {isCreate ? 'Nuevo punto de retiro' : 'Editar punto de retiro'}
        </h2>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <label htmlFor="pp-form-name" className="text-xs font-medium text-[var(--text-secondary)]">
              Nombre
            </label>
            <input
              id="pp-form-name"
              type="text"
              className={inputClass(Boolean(errors.name))}
              placeholder="Ej: Punto de Retiro Avellaneda Centro"
              {...register('name')}
            />
            {errors.name ? (
              <p role="alert" className="text-xs text-danger">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="pp-form-address" className="text-xs font-medium text-[var(--text-secondary)]">
              Dirección
            </label>
            <input
              id="pp-form-address"
              type="text"
              className={inputClass(Boolean(errors.address))}
              placeholder="Ej: Av. Mitre 1234"
              {...register('address')}
            />
            {errors.address ? (
              <p role="alert" className="text-xs text-danger">
                {errors.address.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="pp-form-neighborhood" className="text-xs font-medium text-[var(--text-secondary)]">
                Barrio
              </label>
              <input
                id="pp-form-neighborhood"
                type="text"
                className={inputClass(Boolean(errors.neighborhood))}
                placeholder="Ej: Avellaneda"
                {...register('neighborhood')}
              />
              {errors.neighborhood ? (
                <p role="alert" className="text-xs text-danger">
                  {errors.neighborhood.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="pp-form-city" className="text-xs font-medium text-[var(--text-secondary)]">
                Localidad / Provincia
              </label>
              <input
                id="pp-form-city"
                type="text"
                className={inputClass(Boolean(errors.city))}
                placeholder="Ej: GBA Sur / Buenos Aires"
                {...register('city')}
              />
              {errors.city ? (
                <p role="alert" className="text-xs text-danger">
                  {errors.city.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="pp-form-lat" className="text-xs font-medium text-[var(--text-secondary)]">
                Latitud
              </label>
              <input
                id="pp-form-lat"
                type="text"
                inputMode="decimal"
                className={inputClass(Boolean(errors.lat))}
                placeholder="Ej: -34.6621"
                {...register('lat')}
              />
              {errors.lat ? (
                <p role="alert" className="text-xs text-danger">
                  {errors.lat.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="pp-form-lng" className="text-xs font-medium text-[var(--text-secondary)]">
                Longitud
              </label>
              <input
                id="pp-form-lng"
                type="text"
                inputMode="decimal"
                className={inputClass(Boolean(errors.lng))}
                placeholder="Ej: -58.3648"
                {...register('lng')}
              />
              {errors.lng ? (
                <p role="alert" className="text-xs text-danger">
                  {errors.lng.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="pp-form-hours" className="text-xs font-medium text-[var(--text-secondary)]">
              Horario de atención
            </label>
            <input
              id="pp-form-hours"
              type="text"
              className={inputClass(Boolean(errors.businessHours))}
              placeholder="Ej: Lunes a Viernes de 9:00 a 19:30hs"
              {...register('businessHours')}
            />
            {errors.businessHours ? (
              <p role="alert" className="text-xs text-danger">
                {errors.businessHours.message}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
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
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white outline-none transition hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
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
