import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MapPin } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';

import { ImageDropzone } from '../../../components/ImageDropzone';
import { SocialLinksField } from '../../../features/store/SocialLinksField';
import {
  fetchSellerStoreProfile,
  sellerStoreProfileToFormValues,
  updateSellerStoreProfile,
  type SellerStoreProfile,
} from '../../../features/store/storeApi';
import {
  STORE_WEEKDAY_LABELS,
  STORE_WEEKDAYS_ORDER,
  storeProfileFormDefaults,
  storeProfileFormSchema,
  type StoreProfileFormValues,
} from '../../../features/store/storeSchema';
import {
  firstValidationErrorPath,
  smoothScrollIntoView,
  smoothScrollWindowTop,
} from '../../../lib/formScroll';
import { cn } from '../../../lib/cn';
import { ApiError } from '../../../lib/http/apiClient';
import { backendImageUploader } from '../../../lib/uploads/backendImageUploader';
import { devMockImageUploader } from '../../../lib/uploads/devMockImageUploader';

import { scrollToStoreProfileFieldPath } from './storeProfileFormScroll';

function newStagingSession(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ?
      crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapsEmbedSrc(lat: number, lng: number): string {
  const q = `${lat},${lng}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&hl=es&output=embed`;
}

/**
 * Perfil de tienda seller (Paso 16): datos del local, header, redes y mapa (lat/lng desde backend).
 */
export function StoreProfilePage() {
  const [stagingHeaderSession] = useState(newStagingSession);
  const [stagingLogoSession] = useState(newStagingSession);
  const [profile, setProfile] = useState<SellerStoreProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);

  const uploader = import.meta.env.DEV ? devMockImageUploader : backendImageUploader;

  const methods = useForm<StoreProfileFormValues>({
    resolver: zodResolver(storeProfileFormSchema),
    defaultValues: storeProfileFormDefaults(),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = methods;

  const resetRef = useRef(reset);
  resetRef.current = reset;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const p = await fetchSellerStoreProfile();
        if (cancelled) return;
        setProfile(p);
        resetRef.current(sellerStoreProfileToFormValues(p));
      } catch (err: unknown) {
        if (cancelled) return;
        setProfile(null);
        if (err instanceof ApiError) {
          setLoadError(err.message);
        } else if (err instanceof Error) {
          setLoadError(err.message);
        } else {
          setLoadError('No se pudo cargar el perfil de la tienda.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleHeaderUrlsChange = useCallback(
    (urls: string[]) => {
      setValue('headerImageUrl', urls[0] ?? '', {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const handleLogoUrlsChange = useCallback(
    (urls: string[]) => {
      setValue('logoUrl', urls[0] ?? '', {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const handleDropzoneError = useCallback((msg: string) => {
    setBanner({ variant: 'error', text: msg });
  }, []);

  const onValidSubmit = useCallback(
    async (values: StoreProfileFormValues) => {
      setBanner(null);
      try {
        const next = await updateSellerStoreProfile(values);
        setProfile(next);
        reset(sellerStoreProfileToFormValues(next));
        setBanner({ variant: 'success', text: 'Perfil guardado correctamente.' });
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setBanner({ variant: 'error', text: err.message });
        } else if (err instanceof Error) {
          setBanner({ variant: 'error', text: err.message });
        } else {
          setBanner({ variant: 'error', text: 'No se pudieron guardar los cambios.' });
        }
      }
    },
    [reset],
  );

  const onInvalidSubmit = useCallback((formErrors: FieldErrors<StoreProfileFormValues>) => {
    queueMicrotask(() => {
      scrollToStoreProfileFieldPath(firstValidationErrorPath(formErrors));
    });
  }, []);

  useEffect(() => {
    if (!banner) {
      return;
    }
    if (banner.variant === 'success') {
      queueMicrotask(() => smoothScrollWindowTop());
      return;
    }
    queueMicrotask(() => {
      smoothScrollIntoView(document.getElementById('store-profile-save-feedback'), 'center');
    });
  }, [banner]);

  useEffect(() => {
    if (!loadError || loading) {
      return;
    }
    queueMicrotask(() => {
      smoothScrollIntoView(document.getElementById('store-profile-load-error'), 'center');
    });
  }, [loadError, loading]);

  const headerUrl = watch('headerImageUrl');
  const logoUrl = watch('logoUrl');
  const businessHoursRows = watch('businessHours');
  const bannerPreview =
    typeof headerUrl === 'string' && headerUrl.trim().length > 0 ? headerUrl.trim() : null;
  const logoPreview =
    typeof logoUrl === 'string' && logoUrl.trim().length > 0 ? logoUrl.trim() : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-display-md text-[var(--text-primary)]">Mi tienda</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
          Datos del local, cabecera, redes y mapa de referencia (Paso&nbsp;16). Coordenadas: equipo OutletGo.
        </p>
      </header>

      {banner ?
        <p
          id="store-profile-save-feedback"
          role={banner.variant === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            banner.variant === 'error'
              ? 'border-danger/40 bg-danger/10 text-danger'
              : 'border-success/40 bg-success/10 text-[var(--text-secondary)]',
          )}
        >
          {banner.text}
        </p>
      : null}

      {loading ?
        <div className="flex items-center gap-3 py-12 text-[var(--text-muted)]">
          <Loader2 className="size-6 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
          <span className="text-sm">Cargando perfil…</span>
        </div>
      : null}

      {!loading && loadError ?
        <div
          id="store-profile-load-error"
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {loadError}
        </div>
      : null}

      {!loading && !loadError && profile ?
        <FormProvider {...methods}>
          <form
            className="space-y-8"
            noValidate
            onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}
          >
            <section
              id="store-section-header-image"
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
            >
              <div className="relative aspect-[3/1] min-h-[140px] w-full bg-[var(--bg-input)]">
                {bannerPreview ?
                  <img src={bannerPreview} alt="" className="size-full object-cover" />
                : (
                  <div className="flex size-full items-center justify-center text-sm text-[var(--text-muted)]">
                    Sin imagen de cabecera
                  </div>
                )}
              </div>
              <div className="border-t border-[var(--border)] p-6">
                <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  Imagen de cabecera
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Una sola imagen ancha (recomendado 1200×400 aprox.).
                </p>
                <div className="mt-4">
                  <ImageDropzone
                    uploader={uploader}
                    maxFiles={1}
                    stagingSessionId={stagingHeaderSession}
                    onUrlsChange={handleHeaderUrlsChange}
                    onError={handleDropzoneError}
                    className="max-w-xl"
                  />
                  {errors.headerImageUrl ?
                    <p role="alert" className="mt-2 text-sm text-danger">
                      {errors.headerImageUrl.message}
                    </p>
                  : null}
                </div>
              </div>
            </section>

            <section
              id="store-section-logo"
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
            >
              <div className="p-6">
                <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  Logo de la tienda
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Cuadrado, se muestra tipo avatar en listados y comunicaciones (recomendado 512×512px).
                </p>
                <div className="mt-6 flex flex-wrap items-start gap-8">
                  <div
                    className="flex size-[7.5rem] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--bg-input)] shadow-inner ring-4 ring-[var(--bg-card)]"
                    aria-hidden
                  >
                    {logoPreview ?
                      <img src={logoPreview} alt="" className="size-full object-cover" />
                    : (
                      <span className="px-4 text-center text-xs text-[var(--text-muted)]">
                        Sin logo
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <ImageDropzone
                      uploader={uploader}
                      maxFiles={1}
                      stagingSessionId={stagingLogoSession}
                      onUrlsChange={handleLogoUrlsChange}
                      onError={handleDropzoneError}
                      className="max-w-sm"
                    />
                    {errors.logoUrl ?
                      <p role="alert" className="mt-2 text-sm text-danger">
                        {errors.logoUrl.message}
                      </p>
                    : null}
                  </div>
                </div>
              </div>
            </section>

            <section
              id="store-section-general"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            >
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">Datos del local</h2>
              <div className="mt-6 grid gap-5 sm:max-w-xl">
                <div className="space-y-1.5">
                  <label htmlFor="store-field-name" className="text-xs font-medium text-[var(--text-secondary)]">
                    Nombre de la tienda
                  </label>
                  <input
                    id="store-field-name"
                    type="text"
                    autoComplete="organization"
                    className={cn(
                      'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]',
                      errors.name ? 'border-danger' : 'border-[var(--border)]',
                    )}
                    {...register('name')}
                  />
                  {errors.name ?
                    <p role="alert" className="text-xs text-danger">
                      {errors.name.message}
                    </p>
                  : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="store-field-cuit" className="text-xs font-medium text-[var(--text-secondary)]">
                    CUIT
                  </label>
                  <input
                    id="store-field-cuit"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="30-76123451-9"
                    className={cn(
                      'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]',
                      errors.taxIdCuit ? 'border-danger' : 'border-[var(--border)]',
                    )}
                    {...register('taxIdCuit')}
                  />
                  {errors.taxIdCuit ?
                    <p role="alert" className="text-xs text-danger">
                      {errors.taxIdCuit.message}
                    </p>
                  : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="store-field-address" className="text-xs font-medium text-[var(--text-secondary)]">
                    Dirección del local
                  </label>
                  <textarea
                    id="store-field-address"
                    rows={3}
                    className={cn(
                      'w-full rounded-lg border bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]',
                      errors.streetAddress ? 'border-danger' : 'border-[var(--border)]',
                    )}
                    {...register('streetAddress')}
                  />
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    El pin en el mapa se actualizará automáticamente luego de guardar los cambios.
                  </p>
                  {errors.streetAddress ?
                    <p role="alert" className="text-xs text-danger">
                      {errors.streetAddress.message}
                    </p>
                  : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="store-field-phone" className="text-xs font-medium text-[var(--text-secondary)]">
                    Teléfono de contacto{' '}
                    <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
                  </label>
                  <input
                    id="store-field-phone"
                    type="text"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Ej. +54 11 2345-6789"
                    className={cn(
                      'h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]',
                      errors.phone ? 'border-danger' : 'border-[var(--border)]',
                    )}
                    {...register('phone')}
                  />
                  {errors.phone ?
                    <p role="alert" className="text-xs text-danger">
                      {errors.phone.message}
                    </p>
                  : null}
                </div>
              </div>
            </section>

            <section
              id="store-section-business-hours"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            >
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Horarios de atención
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-[var(--text-muted)]">
                Marcá día cerrado o indicá hora de apertura y cierre (formato 24 h según tu navegador).
              </p>
              <div className="mt-5 overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-input)]">
                      <th scope="col" className="px-4 py-3 font-semibold text-[var(--text-secondary)]">
                        Día
                      </th>
                      <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--text-secondary)]">
                        Cerrado
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-[var(--text-secondary)]">
                        Apertura
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-[var(--text-secondary)]">
                        Cierre
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {STORE_WEEKDAYS_ORDER.map((weekdayKey, index) => {
                      const closed = Boolean(businessHoursRows?.[index]?.isClosed);
                      const dhErrOpen = errors.businessHours?.[index]?.openTime;
                      const dhErrClose = errors.businessHours?.[index]?.closeTime;
                      const rowLabel = STORE_WEEKDAY_LABELS[weekdayKey];

                      return (
                        <tr key={weekdayKey} id={`store-hours-row-${index}`} className="bg-[var(--bg-card)]">
                          <th
                            scope="row"
                            className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]"
                          >
                            {rowLabel}
                            <input type="hidden" {...register(`businessHours.${index}.day`)} />
                          </th>
                          <td className="px-4 py-3">
                            <label className="inline-flex cursor-pointer items-center justify-center">
                              <input
                                type="checkbox"
                                aria-label={`${rowLabel}: cerrado`}
                                className="size-4 rounded border-[var(--border)] accent-brand"
                                {...register(`businessHours.${index}.isClosed`)}
                              />
                            </label>
                          </td>
                          <td className="min-w-[7.5rem] px-4 py-2">
                            {!closed ?
                              <>
                                <input
                                  type="time"
                                  step={60}
                                  className={cn(
                                    'h-9 w-full min-w-[6.25rem] rounded-md border bg-[var(--bg-input)] px-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] sm:max-w-[8.75rem]',
                                    dhErrOpen ? 'border-danger' : 'border-[var(--border)]',
                                  )}
                                  {...register(`businessHours.${index}.openTime`)}
                                />
                                {dhErrOpen ?
                                  <p className="mt-1 text-xs text-danger">{dhErrOpen.message}</p>
                                : null}
                              </>
                            : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className="min-w-[7.5rem] px-4 py-2">
                            {!closed ?
                              <>
                                <input
                                  type="time"
                                  step={60}
                                  className={cn(
                                    'h-9 w-full min-w-[6.25rem] rounded-md border bg-[var(--bg-input)] px-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] sm:max-w-[8.75rem]',
                                    dhErrClose ? 'border-danger' : 'border-[var(--border)]',
                                  )}
                                  {...register(`businessHours.${index}.closeTime`)}
                                />
                                {dhErrClose ?
                                  <p className="mt-1 text-xs text-danger">{dhErrClose.message}</p>
                                : null}
                              </>
                            : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {typeof errors.businessHours?.message === 'string' ?
                <p role="alert" className="mt-2 text-sm text-danger">
                  {errors.businessHours.message}
                </p>
              : null}
            </section>

            <section
              id="store-section-social"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            >
              <SocialLinksField />
            </section>

            <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              <div className="flex items-start gap-2 border-b border-[var(--border)] px-6 py-4">
                <MapPin className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                <div>
                  <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                    Ubicación en mapa
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Referencia ({profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)})
                  </p>
                </div>
              </div>
              <iframe
                title="Mapa de la tienda"
                className="h-[min(360px,50vw)] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={mapsEmbedSrc(profile.latitude, profile.longitude)}
              />
            </section>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ?
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    Guardando…
                  </>
                : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </FormProvider>
      : null}
    </div>
  );
}
