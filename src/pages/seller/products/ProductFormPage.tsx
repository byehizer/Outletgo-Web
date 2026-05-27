import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ImagesField } from '../../../features/products/ImagesField';
import {
  createSellerProduct,
  fetchSellerProductDetail,
  updateSellerProduct,
} from '../../../features/products/productDetailApi';
import {
  PRODUCT_FORM_CATEGORIES,
  detailToFormValues,
  productFormDefaults,
  productFormSchema,
  productFormValuesToSavePayload,
  type ProductFormValues,
} from '../../../features/products/productSchema';
import { VariationsField } from '../../../features/products/VariationsField';
import { cn } from '../../../lib/cn';
import { PRODUCT_IMAGE_MAX_COUNT, ROUTES } from '../../../lib/constants';
import { ApiError } from '../../../lib/http/apiClient';

import {
  firstValidationErrorPath,
  scrollToProductFormFieldPath,
  smoothScrollIntoView,
  smoothScrollWindowTop,
} from './productFormScroll';
import type { SellerProductsListLocationState } from './sellerProductsListLocationState';

function newStagingSession(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ?
      crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ProductFormPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId?: string }>();
  const isCreate = productId === undefined;

  const [stagingSessionId] = useState(newStagingSession);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(!isCreate);
  /** Solo edición / errores en el mismo paso de guardado (el alta navega al listado). */
  const [saveBanner, setSaveBanner] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);

  const methods = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: productFormDefaults(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (isCreate) {
      reset(productFormDefaults());
      setDetailLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    const id = productId!;
    setDetailLoading(true);
    setLoadError(null);

    void fetchSellerProductDetail(id)
      .then((detail) => {
        if (cancelled) {
          return;
        }
        reset(detailToFormValues(detail));
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else if (error instanceof Error) {
          setLoadError(error.message);
        } else {
          setLoadError('No se pudo cargar el producto.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isCreate, productId, reset]);

  const onSubmit = useCallback(
    async (values: ProductFormValues) => {
      setSaveBanner(null);
      const payload = productFormValuesToSavePayload(values, stagingSessionId);
      try {
        if (isCreate) {
          await createSellerProduct(payload);
          navigate(ROUTES.sellerProducts, {
            replace: true,
            state: { sellerFlash: 'product-created' } satisfies SellerProductsListLocationState,
          });
          return;
        }
        await updateSellerProduct(productId!, payload);
        setSaveBanner({ variant: 'success', text: 'Cambios guardados.' });
      } catch (error: unknown) {
        if (error instanceof ApiError) {
          setSaveBanner({ variant: 'error', text: error.message });
        } else if (error instanceof Error) {
          setSaveBanner({ variant: 'error', text: error.message });
        } else {
          setSaveBanner({ variant: 'error', text: 'No se pudo guardar el producto.' });
        }
      }
    },
    [isCreate, navigate, productId, stagingSessionId],
  );

  const onInvalidSubmit = useCallback((formErrors: FieldErrors<ProductFormValues>) => {
    queueMicrotask(() => {
      scrollToProductFormFieldPath(firstValidationErrorPath(formErrors));
    });
  }, []);

  const busy = detailLoading || isSubmitting;

  useEffect(() => {
    if (!saveBanner) {
      return;
    }
    if (saveBanner.variant === 'success') {
      queueMicrotask(() => smoothScrollWindowTop());
      const t = window.setTimeout(() => setSaveBanner(null), 6000);
      return () => window.clearTimeout(t);
    }
    queueMicrotask(() => {
      smoothScrollIntoView(document.getElementById('product-save-feedback'), 'center');
    });
  }, [saveBanner]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Link
            to={ROUTES.sellerProducts}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver al listado
          </Link>
          <div>
            <h1 className="font-display text-display-md text-[var(--text-primary)]">
              {isCreate ? 'Nuevo producto' : 'Editar producto'}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
              Variaciones, fotos (hasta {PRODUCT_IMAGE_MAX_COUNT}) y datos generales. Paso&nbsp;13.
            </p>
          </div>
        </div>
      </header>

      {loadError ?
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {loadError}
        </p>
      : null}

      {!loadError ?
        detailLoading ?
          <p className="text-sm text-[var(--text-muted)]">Cargando datos del producto…</p>
        : <FormProvider {...methods}>
            <form className="space-y-10" onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} noValidate>
              {saveBanner ?
                <p
                  id="product-save-feedback"
                  role={saveBanner.variant === 'error' ? 'alert' : 'status'}
                  className={cn(
                    'rounded-lg border px-4 py-3 text-sm',
                    saveBanner.variant === 'error' ?
                      'border-danger/40 bg-danger/10 text-danger'
                    : 'border-success/40 bg-success/10 text-[var(--text-secondary)]',
                  )}
                >
                  {saveBanner.text}
                </p>
              : null}

              <section
                id="product-form-general"
                className="grid gap-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 lg:grid-cols-2"
              >
                <div className="space-y-2 lg:col-span-2">
                  <label htmlFor="product-name" className="text-sm font-semibold text-[var(--text-primary)]">
                    Nombre
                  </label>
                  <input
                    id="product-name"
                    type="text"
                    autoComplete="off"
                    className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                    {...register('name')}
                  />
                  <p role="alert" className="text-xs text-danger">{errors.name?.message}</p>
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label htmlFor="product-desc" className="text-sm font-semibold text-[var(--text-primary)]">
                    Descripción
                  </label>
                  <textarea
                    id="product-desc"
                    rows={4}
                    className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                    {...register('description')}
                  />
                  <p role="alert" className="text-xs text-danger">{errors.description?.message}</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="product-category" className="text-sm font-semibold text-[var(--text-primary)]">
                    Categoría
                  </label>
                  <select
                    id="product-category"
                    className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                    {...register('categoryId')}
                  >
                    {PRODUCT_FORM_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <p role="alert" className="text-xs text-danger">{errors.categoryId?.message}</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="product-price" className="text-sm font-semibold text-[var(--text-primary)]">
                    Precio base (ARS)
                  </label>
                  <input
                    id="product-price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                    {...register('basePrice')}
                  />
                  <p role="alert" className="text-xs text-danger">{errors.basePrice?.message}</p>
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label htmlFor="product-tags" className="text-sm font-semibold text-[var(--text-primary)]">
                    Etiquetas
                  </label>
                  <input
                    id="product-tags"
                    type="text"
                    placeholder="Ej.: remeras, oversize"
                    autoComplete="off"
                    className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                    {...register('tags')}
                  />
                  <p className="text-xs text-[var(--text-muted)]">Separadas por comas.</p>
                </div>
              </section>

              <section
                id="product-images-section"
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
              >
                <ImagesField stagingSessionId={stagingSessionId} disabled={busy} />
              </section>

              <section
                id="product-variations-section"
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
              >
                <VariationsField disabled={busy} />
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white shadow-brand/25 outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Guardando…' : 'Guardar'}
                </button>
                <Link
                  to={ROUTES.sellerProducts}
                  className={cn(
                    'inline-flex h-11 items-center rounded-lg border px-5 text-sm font-medium outline-none transition',
                    isDirty ?
                      'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-brand/40 hover:text-brand'
                    : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--border-focus)]',
                  )}
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </FormProvider>
      : null}
    </div>
  );
}
