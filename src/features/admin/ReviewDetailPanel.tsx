import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Package,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useReducer, useState, type Ref } from 'react';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Skeleton } from '../../components/Skeleton';
import { RatingStars } from '../../features/reviews/RatingStars';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { ApiError } from '../../lib/http/apiClient';
import { isProductAdminReview, type AdminReview, type BuyerReviewEntry, type BuyerReviewHistory } from '../../types/admin-review';

import {
  deleteReview,
  fetchBuyerReviewHistory,
  toggleReviewVisibility,
} from './adminReviewsApi';

type HistoryUiState = {
  data: BuyerReviewHistory | null;
  loading: boolean;
  errorMessage: string | null;
};

type HistoryAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: BuyerReviewHistory }
  | { type: 'FETCH_ERR'; payload: string }
  | { type: 'RESET' };

const initialHistoryState: HistoryUiState = {
  data: null,
  loading: false,
  errorMessage: null,
};

function historyReducer(state: HistoryUiState, action: HistoryAction): HistoryUiState {
  switch (action.type) {
    case 'FETCH_BEGIN':
      return { ...state, loading: true, errorMessage: null };
    case 'FETCH_OK':
      return { data: action.payload, loading: false, errorMessage: null };
    case 'FETCH_ERR':
      return { data: null, loading: false, errorMessage: action.payload };
    case 'RESET':
      return initialHistoryState;
    default:
      return state;
  }
}

function truncateText(text: string | null, max = 60): string | null {
  if (!text?.trim()) {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}

function VisibilityBadge({ isVisible }: { isVisible: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        isVisible ? 'bg-success/15 text-success' : 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]',
      )}
    >
      {isVisible ? 'Visible' : 'Oculta'}
    </span>
  );
}

function ReviewTargetBadge({ productId }: { productId: string | null }) {
  const isProduct = productId != null;
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        isProduct ? 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]' : 'bg-brand/15 text-brand',
      )}
    >
      {isProduct ? 'Producto' : 'Tienda'}
    </span>
  );
}

function buyerReviewTargetLabel(entry: BuyerReviewEntry): string {
  return entry.productId != null && entry.productName ? entry.productName : entry.storeName;
}

function HistorySkeleton() {
  return (
    <ul className="mt-3 space-y-3" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="rounded-lg border border-[var(--border)] p-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </li>
      ))}
    </ul>
  );
}

export type ReviewDetailPanelProps = {
  review: AdminReview | null;
  panelRef?: Ref<HTMLElement>;
  onClose: () => void;
  onVisibilityChange: (updated: AdminReview, message: string) => void;
  onDelete: (reviewId: string, message: string) => void;
};

export function ReviewDetailPanel({
  review,
  panelRef,
  onClose,
  onVisibilityChange,
  onDelete,
}: ReviewDetailPanelProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyState, dispatchHistory] = useReducer(historyReducer, initialHistoryState);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setHistoryOpen(false);
    dispatchHistory({ type: 'RESET' });
  }, [review?.id]);

  const loadHistory = useCallback((buyerId: string) => {
    dispatchHistory({ type: 'FETCH_BEGIN' });
    void fetchBuyerReviewHistory(buyerId)
      .then((payload) => {
        dispatchHistory({ type: 'FETCH_OK', payload });
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError) {
          dispatchHistory({ type: 'FETCH_ERR', payload: error.message });
        } else if (error instanceof Error) {
          dispatchHistory({ type: 'FETCH_ERR', payload: error.message });
        } else {
          dispatchHistory({ type: 'FETCH_ERR', payload: 'No se pudo cargar el historial.' });
        }
      });
  }, []);

  const toggleHistory = () => {
    if (!review) {
      return;
    }
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && !historyState.data && !historyState.loading) {
      loadHistory(review.buyer.id);
    }
  };

  const handleToggleVisibility = async () => {
    if (!review) {
      return;
    }
    setVisibilityBusy(true);
    try {
      const updated = await toggleReviewVisibility(review.id, {
        isVisible: !review.isVisible,
      });
      onVisibilityChange(updated, updated.isVisible ? 'Reseña visible' : 'Reseña ocultada');
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        onVisibilityChange(review, error.message);
      } else if (error instanceof Error) {
        onVisibilityChange(review, error.message);
      } else {
        onVisibilityChange(review, 'No se pudo actualizar la visibilidad.');
      }
    } finally {
      setVisibilityBusy(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!review) {
      return;
    }
    setDeleteBusy(true);
    try {
      await deleteReview(review.id);
      setDeleteOpen(false);
      onDelete(review.id, 'Reseña eliminada');
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        onVisibilityChange(review, error.message);
      } else if (error instanceof Error) {
        onVisibilityChange(review, error.message);
      } else {
        onVisibilityChange(review, 'No se pudo eliminar la reseña.');
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!review) {
    return null;
  }

  const otherReviews =
    historyState.data?.reviews.filter((entry) => entry.id !== review.id) ?? [];

  return (
    <>
      <section
        ref={panelRef}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
        aria-label="Detalle de la reseña"
      >
        <div className="relative border-b border-[var(--border)] p-6 pb-4">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            <X className="size-5" />
          </button>

          <RatingStars rating={review.rating} className="[&_svg]:size-4" />
          <div className="mt-3">
            <VisibilityBadge isVisible={review.isVisible} />
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{formatDate(review.createdAt)}</p>
        </div>

        <section className="space-y-2 px-6 py-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Comentario</h3>
              {review.comment?.trim() ? (
                <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                  {review.comment}
                </p>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Sin comentario</p>
              )}
            </section>

            <section className="space-y-2 border-t border-[var(--border)] px-6 py-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sobre</h3>
              {!isProductAdminReview(review) ? (
                <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <Store className="size-4 shrink-0 text-brand" aria-hidden />
                  <span>{review.store.businessName}</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <Package className="size-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
                    <span>{review.product?.name ?? 'Producto'}</span>
                  </div>
                  <p className="mt-1 pl-6 text-sm text-[var(--text-muted)]">
                    {review.store.businessName}
                  </p>
                </div>
              )}
            </section>

            <section className="space-y-3 border-t border-[var(--border)] px-6 py-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Comprador</h3>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {review.buyer.displayName?.trim() || (
                    <span className="text-[var(--text-muted)]">Sin nombre</span>
                  )}
                </p>
                <p className="text-sm text-[var(--text-muted)]">{review.buyer.email}</p>
              </div>

              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
                onClick={toggleHistory}
                aria-expanded={historyOpen}
              >
                Ver historial de reseñas
                {historyOpen ? (
                  <ChevronUp className="size-4" aria-hidden />
                ) : (
                  <ChevronDown className="size-4" aria-hidden />
                )}
              </button>

              {historyOpen ? (
                <div>
                  {historyState.loading ? <HistorySkeleton /> : null}
                  {historyState.errorMessage ? (
                    <p role="alert" className="mt-3 text-sm text-danger">
                      {historyState.errorMessage}
                    </p>
                  ) : null}
                  {!historyState.loading && historyState.data ?
                    otherReviews.length === 0 ?
                      <p className="mt-3 text-sm text-[var(--text-muted)]">
                        Este comprador no tiene otras reseñas
                      </p>
                    : <ul className="mt-3 space-y-3">
                        {otherReviews.map((entry) => {
                          const truncated = truncateText(entry.comment);
                          return (
                            <li
                              key={entry.id}
                              className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <RatingStars
                                  rating={entry.rating}
                                  className="[&_svg]:size-3.5"
                                />
                                <ReviewTargetBadge productId={entry.productId} />
                                <VisibilityBadge isVisible={entry.isVisible} />
                              </div>
                              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                                {buyerReviewTargetLabel(entry)}
                              </p>
                              <p
                                className={cn(
                                  'mt-1 text-sm',
                                  truncated
                                    ? 'text-[var(--text-secondary)]'
                                    : 'text-[var(--text-muted)]',
                                )}
                              >
                                {truncated ?? 'Sin comentario'}
                              </p>
                              <p className="mt-2 text-xs text-[var(--text-muted)]">
                                {formatDate(entry.createdAt)}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                  : null}
                </div>
              ) : null}
            </section>

        <div className="flex flex-col items-center gap-2 border-t border-[var(--border)] p-6 sm:flex-row sm:justify-center">
          {review.isVisible ? (
            <button
              type="button"
              className="inline-flex min-h-10 w-full max-w-md items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleToggleVisibility()}
              disabled={visibilityBusy || deleteBusy}
            >
              <EyeOff className="size-4" aria-hidden />
              {visibilityBusy ? 'Ocultando…' : 'Ocultar reseña'}
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex min-h-10 w-full max-w-md items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleToggleVisibility()}
              disabled={visibilityBusy || deleteBusy}
            >
              <Eye className="size-4" aria-hidden />
              {visibilityBusy ? 'Actualizando…' : 'Hacer visible'}
            </button>
          )}
          <button
            type="button"
            className="inline-flex min-h-10 w-full max-w-md items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setDeleteOpen(true)}
            disabled={visibilityBusy || deleteBusy}
          >
            <Trash2 className="size-4" aria-hidden />
            Eliminar reseña
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar reseña"
        description="¿Eliminar esta reseña? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        busy={deleteBusy}
        onClose={() => {
          if (!deleteBusy) {
            setDeleteOpen(false);
          }
        }}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
