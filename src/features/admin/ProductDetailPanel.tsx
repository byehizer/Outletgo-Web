import { X } from 'lucide-react';
import { useCallback, useEffect, useReducer, useState, type Ref } from 'react';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Skeleton } from '../../components/Skeleton';
import { ProductStatusBadge } from '../../features/products/ProductStatusBadge';
import { RatingStars } from '../../features/reviews/RatingStars';
import { cn } from '../../lib/cn';
import { formatARS, formatDate } from '../../lib/format';
import { ApiError } from '../../lib/http/apiClient';
import { MODERATION_ACTION } from '../../types/moderation';
import type { AdminProduct } from '../../types/moderation';
import { PRODUCT_STATUS } from '../../types/product';

import { DisableProductModal } from './DisableProductModal';
import {
  fetchAdminProductDetail,
  reactivateProduct,
} from './moderationApi';

type DetailUiState = {
  product: AdminProduct | null;
  loading: boolean;
  errorMessage: string | null;
};

type DetailAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: AdminProduct }
  | { type: 'FETCH_ERR'; payload: string }
  | { type: 'SET_PRODUCT'; payload: AdminProduct };

const initialDetailState: DetailUiState = {
  product: null,
  loading: false,
  errorMessage: null,
};

function detailReducer(state: DetailUiState, action: DetailAction): DetailUiState {
  switch (action.type) {
    case 'FETCH_BEGIN':
      return { ...state, loading: true, errorMessage: null };
    case 'FETCH_OK':
      return { product: action.payload, loading: false, errorMessage: null };
    case 'FETCH_ERR':
      return { product: null, loading: false, errorMessage: action.payload };
    case 'SET_PRODUCT':
      return { ...state, product: action.payload, loading: false, errorMessage: null };
    default:
      return state;
  }
}

export type ProductDetailPanelProps = {
  productId: string | null;
  refreshNonce: number;
  panelRef?: Ref<HTMLElement>;
  onClose: () => void;
  onStatusChange: (message: string) => void;
};

function PanelSkeleton() {
  return (
    <div className="space-y-6 p-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="size-[120px] shrink-0 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

export function ProductDetailPanel({
  productId,
  refreshNonce,
  panelRef,
  onClose,
  onStatusChange,
}: ProductDetailPanelProps) {
  const [detailState, dispatch] = useReducer(detailReducer, initialDetailState);
  const [disableOpen, setDisableOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reactivateBusy, setReactivateBusy] = useState(false);

  const loadDetail = useCallback((id: string) => {
    dispatch({ type: 'FETCH_BEGIN' });
    void fetchAdminProductDetail(id)
      .then((product) => {
        dispatch({ type: 'FETCH_OK', payload: product });
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError) {
          dispatch({ type: 'FETCH_ERR', payload: error.message });
        } else if (error instanceof Error) {
          dispatch({ type: 'FETCH_ERR', payload: error.message });
        } else {
          dispatch({ type: 'FETCH_ERR', payload: 'No se pudo cargar el detalle del producto.' });
        }
      });
  }, []);

  useEffect(() => {
    if (!productId) {
      return;
    }
    loadDetail(productId);
  }, [productId, refreshNonce, loadDetail]);

  useEffect(() => {
    if (!productId) {
      setDisableOpen(false);
      setReactivateOpen(false);
    }
  }, [productId]);

  if (!productId) {
    return null;
  }

  const product = detailState.product;
  const allOutOfStock =
    product != null &&
    product.variations.length > 0 &&
    product.variations.every((v) => v.stock <= 0);

  const sortedHistory =
    product != null
      ? [...product.moderationHistory].sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
        )
      : [];

  const handleDisableSuccess = () => {
    setDisableOpen(false);
    onStatusChange('Producto inhabilitado');
  };

  const handleReactivateConfirm = async () => {
    if (!product) {
      return;
    }
    setReactivateBusy(true);
    try {
      const updated = await reactivateProduct(product.id);
      dispatch({ type: 'SET_PRODUCT', payload: updated });
      setReactivateOpen(false);
      onStatusChange('Producto reactivado');
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        onStatusChange(error.message);
      } else if (error instanceof Error) {
        onStatusChange(error.message);
      } else {
        onStatusChange('No se pudo reactivar el producto.');
      }
    } finally {
      setReactivateBusy(false);
    }
  };

  return (
    <>
      <section
        ref={panelRef}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
        aria-label="Detalle del producto"
      >
        {detailState.loading && !product ? (
          <PanelSkeleton />
        ) : detailState.errorMessage ? (
          <div className="p-6">
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                onClick={onClose}
                aria-label="Cerrar detalle"
              >
                <X className="size-5" />
              </button>
            </div>
            <p role="alert" className="mt-4 text-sm text-danger">
              {detailState.errorMessage}
            </p>
          </div>
        ) : product ? (
          <>
            <div className="relative border-b border-[var(--border)] p-6 pb-4">
              <button
                type="button"
                className="absolute right-4 top-4 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                onClick={onClose}
                aria-label="Cerrar detalle"
              >
                <X className="size-5" />
              </button>

              <h2 className="pr-10 font-display text-lg font-semibold text-[var(--text-primary)]">
                {product.name}
              </h2>
              <div className="mt-2">
                <ProductStatusBadge status={product.status} />
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{product.store.businessName}</p>
            </div>

            <section className="px-6 py-6">
              <h3 className="sr-only">Galería de imágenes</h3>
              {product.images.length > 0 ? (
                <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((img) => (
                    <a
                      key={img.id}
                      href={img.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 overflow-hidden rounded-lg border border-[var(--border)]"
                    >
                      <img
                        src={img.imageUrl}
                        alt=""
                        width={120}
                        height={120}
                        className="size-[120px] object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Sin imágenes</p>
              )}
            </section>

            <section className="space-y-3 border-t border-[var(--border)] px-6 py-6">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Información general
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-[var(--text-muted)]">Precio base</dt>
                      <dd className="font-medium text-[var(--text-primary)]">
                        {formatARS(product.basePrice)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Categoría</dt>
                      <dd className="text-[var(--text-secondary)]">{product.category.name}</dd>
                    </div>
                    {product.tags.length > 0 ? (
                      <div>
                        <dt className="mb-1.5 text-[var(--text-muted)]">Tags</dt>
                        <dd className="flex flex-wrap gap-1.5">
                          {product.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-input)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
                            >
                              {tag.tagName}
                            </span>
                          ))}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-[var(--text-muted)]">Calificación</dt>
                      <dd className="mt-1">
                        {product.ratingAvg != null ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <RatingStars rating={Math.round(product.ratingAvg)} />
                            <span className="text-xs text-[var(--text-muted)]">
                              ({product.ratingCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-secondary)]">Sin reseñas</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Descripción</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-[var(--text-secondary)]">
                        {product.description || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Creado</dt>
                      <dd className="text-[var(--text-secondary)]">{formatDate(product.createdAt)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="space-y-3 border-t border-[var(--border)] px-6 py-6">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Variaciones</h3>
                  {allOutOfStock ? (
                    <span className="inline-flex rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
                      Sin stock
                    </span>
                  ) : null}
                  {product.variations.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                              Talle
                            </th>
                            <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                              Color
                            </th>
                            <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                              Stock
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {product.variations.map((v) => (
                            <tr key={v.id}>
                              <td className="px-2 py-2 text-[var(--text-secondary)]">{v.size}</td>
                              <td className="px-2 py-2 text-[var(--text-secondary)]">{v.color}</td>
                              <td
                                className={cn(
                                  'px-2 py-2 text-right tabular-nums',
                                  v.stock <= 0 ? 'font-semibold text-danger' : 'text-[var(--text-secondary)]',
                                )}
                              >
                                {v.stock}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">Sin variaciones</p>
                  )}
                </section>

                <section className="space-y-3 border-t border-[var(--border)] px-6 py-6">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Historial de moderación
                  </h3>
                  {sortedHistory.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      Sin acciones de moderación previas
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {sortedHistory.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3"
                        >
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              entry.action === MODERATION_ACTION.DISABLED
                                ? 'bg-danger/15 text-danger'
                                : 'bg-success/15 text-success',
                            )}
                          >
                            {entry.action === MODERATION_ACTION.DISABLED
                              ? 'Inhabilitado'
                              : 'Reactivado'}
                          </span>
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            {entry.adminEmail}
                          </p>
                          {entry.reason ? (
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              {entry.reason}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            {formatDate(entry.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

            <div className="flex justify-center border-t border-[var(--border)] p-6">
              {product.status === PRODUCT_STATUS.ACTIVE ? (
                <button
                  type="button"
                  className="inline-flex min-h-10 w-full max-w-md items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger/90"
                  onClick={() => setDisableOpen(true)}
                >
                  Inhabilitar producto
                </button>
              ) : null}
              {product.status === PRODUCT_STATUS.PAUSED_BY_SELLER ? (
                <p className="text-center text-sm text-[var(--text-muted)]">
                  El vendedor pausó este producto. No hay acciones de moderación disponibles.
                </p>
              ) : null}
              {product.status === PRODUCT_STATUS.DISABLED_BY_ADMIN ? (
                <button
                  type="button"
                  className="inline-flex min-h-10 w-full max-w-md items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90"
                  onClick={() => setReactivateOpen(true)}
                >
                  Reactivar producto
                </button>
              ) : null}
            </div>

            {detailState.loading ? (
              <div className="border-t border-[var(--border)] px-6 py-2 text-xs text-[var(--text-muted)]">
                Actualizando…
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {disableOpen && product ? (
        <DisableProductModal
          open
          product={product}
          onClose={() => setDisableOpen(false)}
          onSuccess={handleDisableSuccess}
        />
      ) : null}

      <ConfirmDialog
        open={reactivateOpen && product != null}
        title="Reactivar producto"
        description={
          product ?
            <>
              ¿Reactivar{' '}
              <span className="font-medium text-[var(--text-primary)]">{product.name}</span>? Volverá
              a aparecer en la app.
            </>
          : null
        }
        confirmLabel="Reactivar"
        busy={reactivateBusy}
        onClose={() => {
          if (!reactivateBusy) {
            setReactivateOpen(false);
          }
        }}
        onConfirm={handleReactivateConfirm}
      />
    </>
  );
}
