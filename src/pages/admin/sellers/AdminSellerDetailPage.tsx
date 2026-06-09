import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Power,
  PowerOff,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { DeactivateSellerModal } from '../../../features/admin/DeactivateSellerModal';
import { SellerFormModal } from '../../../features/admin/SellerFormModal';
import { RatingStars } from '../../../features/reviews/RatingStars';
import { Skeleton } from '../../../components/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { ROUTES } from '../../../lib/constants';
import { cn } from '../../../lib/cn';
import { formatDate, formatARS } from '../../../lib/format';
import { ApiError } from '../../../lib/http/apiClient';
import type { SellerAccount } from '../../../types/seller-account';
import type { AdminProduct } from '../../../types/moderation';
import type { AdminReview } from '../../../types/admin-review';
import { fetchSellerAccountById, toggleSellerStatus } from '../../../features/admin/sellersApi';
import { fetchAdminProducts, disableProduct, reactivateProduct } from '../../../features/admin/moderationApi';
import { fetchAdminReviews, toggleReviewVisibility, deleteReview } from '../../../features/admin/adminReviewsApi';

// Helper de labels para días
const WEEKDAY_LABELS: Record<string, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

// Generar el link de embed de maps
function mapsEmbedSrc(lat: number, lng: number): string {
  const q = `${lat},${lng}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&hl=es&output=embed`;
}

export function AdminSellerDetailPage() {
  const { sellerId: rawSellerId } = useParams<{ sellerId: string }>();
  const sellerId = rawSellerId?.trim() ?? '';
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  // Estados de datos principales
  const [seller, setSeller] = useState<SellerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Estados de modales
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
  const [reactivateBusy, setReactivateBusy] = useState(false);

  // Estados de pestañas inferiores (Products vs Reviews)
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');

  // Pestaña Productos
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productPage, setProductPage] = useState(0);
  const [productTotalElements, setProductTotalElements] = useState(0);
  const [productActionBusyId, setProductActionBusyId] = useState<string | null>(null);

  // Pestaña Reseñas
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewTotalElements, setReviewTotalElements] = useState(0);
  const [reviewActionBusyId, setReviewActionBusyId] = useState<string | null>(null);

  const bumpRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  // Cargar datos del vendedor
  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);

    fetchSellerAccountById(sellerId)
      .then((data) => {
        if (!cancelled) {
          setSeller(data);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSeller(null);
        if (err instanceof ApiError) {
          setErrorMsg(err.message);
        } else if (err instanceof Error) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg('No se pudo cargar la información del vendedor.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sellerId, refreshNonce]);

  // Cargar productos de la tienda
  const loadProducts = useCallback(() => {
    if (!sellerId) return;
    setProductsLoading(true);
    fetchAdminProducts({
      page: productPage,
      size: 6,
      storeId: seller?.store.id ?? sellerId,
    })
      .then((page) => {
        setProducts(page.content);
        setProductTotalElements(page.totalElements);
      })
      .catch((err) => {
        console.error('Error al cargar productos del vendedor:', err);
      })
      .finally(() => {
        setProductsLoading(false);
      });
  }, [sellerId, seller?.store.id, productPage]);

  // Cargar reseñas de la tienda
  const loadReviews = useCallback(() => {
    if (!sellerId) return;
    setReviewsLoading(true);
    fetchAdminReviews({
      page: reviewPage,
      size: 6,
      storeId: seller?.store.id ?? sellerId,
    })
      .then((page) => {
        setReviews(page.content);
        setReviewTotalElements(page.totalElements);
      })
      .catch((err) => {
        console.error('Error al cargar reseñas del vendedor:', err);
      })
      .finally(() => {
        setReviewsLoading(false);
      });
  }, [sellerId, seller?.store.id, reviewPage]);

  // Ejecutar cargas de pestañas
  useEffect(() => {
    if (activeTab === 'products' && seller) {
      loadProducts();
    }
  }, [activeTab, seller, loadProducts]);

  useEffect(() => {
    if (activeTab === 'reviews' && seller) {
      loadReviews();
    }
  }, [activeTab, seller, loadReviews]);

  // Reactivar cuenta
  const handleReactivateConfirm = useCallback(async () => {
    if (!seller) return;
    setReactivateBusy(true);
    try {
      await toggleSellerStatus(seller.id, true, { reason: '' });
      setShowReactivateConfirm(false);
      success('La cuenta del vendedor ha sido reactivada.');
      bumpRefresh();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else {
        showError('No se pudo reactivar la cuenta.');
      }
    } finally {
      setReactivateBusy(false);
    }
  }, [seller, bumpRefresh, success, showError]);

  // Deshabilitar/Habilitar Producto
  const handleToggleProductStatus = useCallback(async (product: AdminProduct) => {
    setProductActionBusyId(product.id);
    try {
      if (product.status === 'DISABLED_BY_ADMIN') {
        await reactivateProduct(product.id);
        success('Producto habilitado correctamente.');
      } else {
        await disableProduct(product.id, { reason: 'Infracción de normativas detectada por administración.' });
        success('Producto inhabilitado correctamente.');
      }
      loadProducts();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else {
        showError('No se pudo modificar el estado del producto.');
      }
    } finally {
      setProductActionBusyId(null);
    }
  }, [loadProducts, success, showError]);

  // Ocultar/Mostrar Reseña
  const handleToggleReviewVisibility = useCallback(async (review: AdminReview) => {
    setReviewActionBusyId(review.id);
    try {
      await toggleReviewVisibility(review.id, { isVisible: !review.isVisible });
      success(review.isVisible ? 'Reseña oculta' : 'Reseña visible');
      loadReviews();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else {
        showError('No se pudo modificar la visibilidad.');
      }
    } finally {
      setReviewActionBusyId(null);
    }
  }, [loadReviews, success, showError]);

  // Eliminar Reseña
  const handleDeleteReview = useCallback(async (reviewId: string) => {
    if (!window.confirm('¿Confirmás la eliminación permanente de esta reseña?')) return;
    setReviewActionBusyId(reviewId);
    try {
      await deleteReview(reviewId);
      success('Reseña eliminada permanentemente.');
      loadReviews();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else {
        showError('No se pudo eliminar la reseña.');
      }
    } finally {
      setReviewActionBusyId(null);
    }
  }, [loadReviews, success, showError]);

  // Renders de carga y errores
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="w-full md:w-80">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg || !seller) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(ROUTES.adminSellers)}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="size-4" /> Volver a Vendedores
        </button>
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-6 text-center text-danger">
          <p className="font-semibold">Ocurrió un error</p>
          <p className="text-sm mt-1">{errorMsg || 'Vendedor no encontrado.'}</p>
        </div>
      </div>
    );
  }

  const store = seller.store;
  const logoInitial = store.businessName ? store.businessName.trim().charAt(0).toUpperCase() : '?';

  return (
    <div className="space-y-8">
      {/* Botón Volver */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate(ROUTES.adminSellers)}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="size-4" /> Volver a Vendedores
          </button>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="font-display text-display-sm text-[var(--text-primary)]">
              {store.businessName}
            </h1>
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                seller.isActive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
              )}
            >
              {seller.isActive ? 'Activo' : 'Suspendido'}
            </span>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
          >
            <Pencil className="size-4" /> Editar Datos
          </button>
          {seller.isActive ? (
            <button
              type="button"
              onClick={() => setShowDeactivateModal(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger/90"
            >
              <PowerOff className="size-4" /> Suspender
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowReactivateConfirm(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-success px-4 text-sm font-semibold text-white transition hover:bg-success/90"
            >
              <Power className="size-4" /> Reactivar
            </button>
          )}
        </div>
      </header>

      {/* Grid General */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card de Identidad y Cuenta */}
        <section className="md:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Logo de la tienda */}
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt=""
                className="size-24 rounded-2xl border border-[var(--border)] object-cover bg-white"
              />
            ) : (
              <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-brand/10 text-3xl font-display font-bold text-brand">
                {logoInitial}
              </div>
            )}

            {/* Metadatos Básicos */}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Mail className="size-4 text-[var(--text-muted)]" /> {seller.email}
              </p>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                <Calendar className="size-4" /> Registrado el {formatDate(seller.createdAt)}
              </p>
              {store.ratingAvg != null ? (
                <div className="flex items-center gap-2 mt-1">
                  <RatingStars rating={Math.round(store.ratingAvg)} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {store.ratingAvg.toFixed(1)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    ({store.ratingCount} reseñas)
                  </span>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic">Sin calificaciones aún</p>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-6 grid gap-6 sm:grid-cols-2">
            {/* Información fiscal y comercial */}
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">CUIT</p>
                <p className="mt-1 font-mono text-sm font-semibold text-[var(--text-primary)]">{store.cuit}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Teléfono</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">{store.phone || 'No especificado'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Dirección</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">{store.address}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Descripción</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)] italic">
                  {store.description || 'Sin descripción provista.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Geolocalización y Redes */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center gap-2">
            <MapPin className="size-4 text-brand" />
            <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">Ubicación</h2>
          </div>
          <div className="flex-1 min-h-[200px] relative">
            {store.latitude !== undefined && store.longitude !== undefined ? (
              <iframe
                title="Mapa de la tienda"
                className="absolute inset-0 size-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={mapsEmbedSrc(store.latitude, store.longitude)}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-[var(--text-muted)]">
                Mapa no disponible
              </div>
            )}
          </div>
          <div className="p-4 border-t border-[var(--border)] space-y-3 bg-[var(--bg-surface)]">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Redes y Contacto</h3>
            <div className="flex flex-wrap gap-2">
              {store.social?.instagram && (
                <a
                  href={store.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-primary)] hover:border-brand/40"
                >
                  <Globe className="size-3 text-pink-500" /> Instagram
                </a>
              )}
              {store.social?.facebook && (
                <a
                  href={store.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-primary)] hover:border-brand/40"
                >
                  <Globe className="size-3 text-blue-600" /> Facebook
                </a>
              )}
              {store.social?.tiktok && (
                <a
                  href={store.social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-primary)] hover:border-brand/40"
                >
                  <Globe className="size-3 text-black" /> TikTok
                </a>
              )}
              {store.social?.website && (
                <a
                  href={store.social.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-primary)] hover:border-brand/40"
                >
                  <ExternalLink className="size-3" /> Web Oficial
                </a>
              )}
              {!store.social?.instagram && !store.social?.facebook && !store.social?.tiktok && !store.social?.website && (
                <span className="text-xs text-[var(--text-muted)] italic">Sin redes configuradas</span>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Horarios de Atención */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="font-display text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Clock className="size-5 text-[var(--text-muted)]" /> Horarios de Atención
        </h2>
        {store.businessHours && store.businessHours.length > 0 ? (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 md:grid-cols-7">
            {store.businessHours.map((h) => (
              <div
                key={h.day}
                className={cn(
                  'rounded-lg border p-3 text-center transition-all',
                  h.isClosed
                    ? 'bg-danger/5 border-danger/25 text-danger'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-primary)]',
                )}
              >
                <p className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">
                  {WEEKDAY_LABELS[h.day] ?? h.day}
                </p>
                <p className="text-sm font-semibold mt-1.5">
                  {h.isClosed ? 'Cerrado' : `${h.openTime} - ${h.closeTime}`}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] italic">No se especificaron horarios.</p>
        )}
      </section>

      {/* Tabs Inferiores: Gestión Cruzada */}
      <div className="space-y-4">
        {/* Selector de pestañas */}
        <div className="flex border-b border-[var(--border)]">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={cn(
              'px-6 py-3 text-sm font-semibold transition border-b-2 -mb-px focus:outline-none',
              activeTab === 'products'
                ? 'border-brand text-brand'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            Catálogo de Productos ({productTotalElements})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={cn(
              'px-6 py-3 text-sm font-semibold transition border-b-2 -mb-px focus:outline-none',
              activeTab === 'reviews'
                ? 'border-brand text-brand'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            Reseñas de Clientes ({reviewTotalElements})
          </button>
        </div>

        {/* Contenido Pestañas */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          {activeTab === 'products' ? (
            <div className="p-6">
              {productsLoading ? (
                <div className="flex justify-center py-12" aria-hidden>
                  <Loader2 className="size-8 animate-spin text-brand" />
                </div>
              ) : products.length === 0 ? (
                <p className="text-center py-12 text-sm text-[var(--text-muted)] italic">
                  Esta tienda aún no tiene productos registrados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        <th scope="col" className="pb-3 pr-4">Producto</th>
                        <th scope="col" className="pb-3 px-4">Categoría</th>
                        <th scope="col" className="pb-3 px-4">Precio</th>
                        <th scope="col" className="pb-3 px-4">Stock</th>
                        <th scope="col" className="pb-3 px-4">Estado</th>
                        <th scope="col" className="pb-3 pl-4 text-right">Moderación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {products.map((p) => {
                        const totalStock = p.variations.reduce((sum, v) => sum + v.stock, 0);
                        const isDisabled = p.status === 'DISABLED_BY_ADMIN';
                        return (
                          <tr key={p.id} className="hover:bg-[var(--bg-hover)]/20">
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-3">
                                {p.images[0]?.imageUrl ? (
                                  <img
                                    src={p.images[0].imageUrl}
                                    alt=""
                                    className="size-10 rounded border border-[var(--border)] object-cover bg-white"
                                  />
                                ) : (
                                  <div className="size-10 rounded border border-[var(--border)] bg-[var(--bg-input)]" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">{p.name}</p>
                                  <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{p.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-[var(--text-secondary)]">{p.category.name}</td>
                            <td className="py-4 px-4 font-medium text-[var(--text-primary)]">{formatARS(p.basePrice)}</td>
                            <td className="py-4 px-4 text-[var(--text-secondary)]">{totalStock} unidades</td>
                            <td className="py-4 px-4">
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                                  p.status === 'ACTIVE'
                                    ? 'bg-success/15 text-success'
                                    : p.status === 'PAUSED_BY_SELLER'
                                    ? 'bg-warning/15 text-warning'
                                    : 'bg-danger/15 text-danger',
                                )}
                              >
                                {p.status === 'ACTIVE'
                                  ? 'Activo'
                                  : p.status === 'PAUSED_BY_SELLER'
                                  ? 'Pausado'
                                  : 'Inhabilitado'}
                              </span>
                            </td>
                            <td className="py-4 pl-4 text-right">
                              <button
                                type="button"
                                disabled={productActionBusyId === p.id}
                                onClick={() => handleToggleProductStatus(p)}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                                  isDisabled
                                    ? 'bg-success/10 text-success hover:bg-success/20'
                                    : 'bg-danger/10 text-danger hover:bg-danger/20',
                                  productActionBusyId === p.id && 'opacity-50 cursor-wait',
                                )}
                              >
                                {isDisabled ? (
                                  <>
                                    <ShieldCheck className="size-3" /> Habilitar
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="size-3" /> Inhabilitar
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Paginación simple de productos */}
              {productTotalElements > 6 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border)] text-sm">
                  <button
                    type="button"
                    disabled={productPage === 0 || productsLoading}
                    onClick={() => setProductPage((p) => p - 1)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-[var(--text-muted)]">
                    Página {productPage + 1} de {Math.ceil(productTotalElements / 6)}
                  </span>
                  <button
                    type="button"
                    disabled={(productPage + 1) * 6 >= productTotalElements || productsLoading}
                    onClick={() => setProductPage((p) => p + 1)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              {reviewsLoading ? (
                <div className="flex justify-center py-12" aria-hidden>
                  <Loader2 className="size-8 animate-spin text-brand" />
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-center py-12 text-sm text-[var(--text-muted)] italic">
                  Esta tienda aún no tiene reseñas de clientes.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        <th scope="col" className="pb-3 pr-4">Reseña</th>
                        <th scope="col" className="pb-3 px-4">Calificación</th>
                        <th scope="col" className="pb-3 px-4">Comprador</th>
                        <th scope="col" className="pb-3 px-4">Fecha</th>
                        <th scope="col" className="pb-3 px-4">Visibilidad</th>
                        <th scope="col" className="pb-3 pl-4 text-right">Moderación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {reviews.map((r) => (
                        <tr key={r.id} className="hover:bg-[var(--bg-hover)]/20">
                          <td className="py-4 pr-4">
                            <div className="max-w-[280px]">
                              <p className="text-[var(--text-primary)] font-medium line-clamp-2">
                                {r.comment || <span className="text-[var(--text-muted)] italic">Sin comentario</span>}
                              </p>
                              {r.product && (
                                <p className="text-[10px] text-brand font-semibold mt-1">
                                  Prod: {r.product.name}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <Star className="size-4 fill-warning text-warning" />
                              <span className="font-semibold text-[var(--text-primary)]">{r.rating}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-[var(--text-primary)]">{r.buyer.displayName || 'Anónimo'}</p>
                            <p className="text-xs text-[var(--text-muted)]">{r.buyer.email}</p>
                          </td>
                          <td className="py-4 px-4 text-[var(--text-secondary)]">{formatDate(r.createdAt)}</td>
                          <td className="py-4 px-4">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                                r.isVisible ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                              )}
                            >
                              {r.isVisible ? 'Visible' : 'Oculta'}
                            </span>
                          </td>
                          <td className="py-4 pl-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={reviewActionBusyId === r.id}
                                onClick={() => handleToggleReviewVisibility(r)}
                                className={cn(
                                  'rounded-lg p-2 transition hover:bg-[var(--bg-hover)]',
                                  r.isVisible ? 'text-[var(--text-muted)] hover:text-danger' : 'text-[var(--text-muted)] hover:text-success',
                                  reviewActionBusyId === r.id && 'opacity-50 cursor-wait',
                                )}
                                title={r.isVisible ? 'Ocultar Reseña' : 'Hacer Visible'}
                              >
                                {r.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </button>
                              <button
                                type="button"
                                disabled={reviewActionBusyId === r.id}
                                onClick={() => handleDeleteReview(r.id)}
                                className={cn(
                                  'rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-danger',
                                  reviewActionBusyId === r.id && 'opacity-50 cursor-wait',
                                )}
                                title="Eliminar Reseña"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Paginación simple de reseñas */}
              {reviewTotalElements > 6 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border)] text-sm">
                  <button
                    type="button"
                    disabled={reviewPage === 0 || reviewsLoading}
                    onClick={() => setReviewPage((p) => p - 1)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-[var(--text-muted)]">
                    Página {reviewPage + 1} de {Math.ceil(reviewTotalElements / 6)}
                  </span>
                  <button
                    type="button"
                    disabled={(reviewPage + 1) * 6 >= reviewTotalElements || reviewsLoading}
                    onClick={() => setReviewPage((p) => p + 1)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Edición del vendedor */}
      {showEditModal && seller && (
        <SellerFormModal
          open
          mode="edit"
          seller={seller}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            success('Información del vendedor actualizada.');
            bumpRefresh();
          }}
        />
      )}

      {/* MODAL: Desactivación / Suspensión */}
      {showDeactivateModal && seller && (
        <DeactivateSellerModal
          open
          seller={seller}
          onClose={() => setShowDeactivateModal(false)}
          onSuccess={() => {
            setShowDeactivateModal(false);
            success('Cuenta del vendedor suspendida.');
            bumpRefresh();
          }}
        />
      )}

      {/* CONFIRMACIÓN: Reactivación */}
      <ConfirmDialog
        open={showReactivateConfirm}
        title="Reactivar cuenta de vendedor"
        description={
          <>
            ¿Confirmás la reactivación de la cuenta de{' '}
            <span className="font-semibold text-[var(--text-primary)]">{seller.email}</span>
            ? Su tienda volverá a ser visible y activa en la aplicación móvil de los compradores.
          </>
        }
        confirmLabel="Reactivar"
        busy={reactivateBusy}
        onClose={() => {
          if (!reactivateBusy) {
            setShowReactivateConfirm(false);
          }
        }}
        onConfirm={handleReactivateConfirm}
      />
    </div>
  );
}
