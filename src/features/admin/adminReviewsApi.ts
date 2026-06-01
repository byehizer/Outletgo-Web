import {
  ADMIN_REVIEWS_API_PATH,
  ADMIN_REVIEWS_PAGE_SIZE,
} from '../../lib/constants';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import type { Page } from '../../types/api';
import type {
  AdminReview,
  BuyerReviewEntry,
  BuyerReviewHistory,
  ToggleReviewVisibilityDTO,
} from '../../types/admin-review';

type JsonRecord = Record<string, unknown>;

/** Filtra reseñas de tienda (`store`) o de producto (`product`) por FK explícita. */
export type AdminReviewScope = 'store' | 'product';

export type FetchAdminReviewsParams = {
  page: number;
  size: number;
  reviewScope?: AdminReviewScope;
  storeId?: string;
  productId?: string;
  buyerSearch?: string;
  rating?: number;
  isVisible?: boolean;
};

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function pickNumber(v: unknown): number {
  const n =
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : typeof v === 'string' && Number.isFinite(Number.parseFloat(v))
        ? Number.parseFloat(v)
        : NaN;
  return Number.isFinite(n) ? n : 0;
}

function pickBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') {
    return v;
  }
  if (v === 'true') {
    return true;
  }
  if (v === 'false') {
    return false;
  }
  return false;
}

function pickNullableString(v: unknown): string | null {
  if (v === null || v === undefined) {
    return null;
  }
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s : null;
}

function devIsoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function devDelay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function mockClone<T>(v: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(v);
  }
  return JSON.parse(JSON.stringify(v)) as T;
}

function clampRating(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

function coerceAdminReview(payload: unknown): AdminReview | undefined {
  const o = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : null;
  if (!o) {
    return undefined;
  }

  const id = pickString(o.id ?? o.reviewId);
  const createdAt = pickString(o.createdAt ?? o.created_at) ?? '';
  const comment = pickNullableString(o.comment ?? o.body);
  const isVisible = pickBoolean(o.isVisible ?? o.is_visible ?? o.visible);
  const rating = clampRating(pickNumber(o.rating));

  const storeRaw =
    typeof o.store === 'object' && o.store !== null ? (o.store as JsonRecord) : o;
  const storeId = pickString(storeRaw.id ?? storeRaw.storeId ?? storeRaw.store_id ?? o.storeId ?? o.store_id);
  const businessName =
    pickString(storeRaw.businessName ?? storeRaw.business_name ?? storeRaw.name) ?? '';

  const buyerRaw =
    typeof o.buyer === 'object' && o.buyer !== null ? (o.buyer as JsonRecord) : o;
  const buyerId = pickString(buyerRaw.id ?? buyerRaw.buyerId ?? buyerRaw.buyer_id);
  const buyerEmail = pickString(buyerRaw.email);
  const displayName = pickNullableString(
    buyerRaw.displayName ?? buyerRaw.display_name ?? buyerRaw.name,
  );

  const productIdFk = pickNullableString(o.productId ?? o.product_id);
  const productRaw =
    typeof o.product === 'object' && o.product !== null ? (o.product as JsonRecord) : null;
  const productIdNested = pickNullableString(
    productRaw?.id ?? productRaw?.productId ?? productRaw?.product_id,
  );
  const productId = productIdFk ?? productIdNested;
  const productName = pickNullableString(productRaw?.name ?? productRaw?.productName);

  let product: AdminReview['product'] = null;
  if (productId && productName) {
    product = { id: productId, name: productName };
  }

  if (!id || !storeId || !businessName || !buyerId || !buyerEmail) {
    return undefined;
  }

  return {
    id,
    rating,
    comment,
    isVisible,
    createdAt,
    storeId,
    productId,
    store: { id: storeId, businessName },
    product,
    buyer: { id: buyerId, displayName, email: buyerEmail },
  };
}

function coercePageAdminReview(payload: unknown, fallbackSize: number): Page<AdminReview> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) => coerceAdminReview(row))
    .filter((x): x is AdminReview => x !== undefined);

  return {
    content,
    totalElements: Math.floor(pickNumber(root.totalElements ?? root.total_elements)),
    number: Math.floor(pickNumber(root.number)),
    size: Math.max(1, Math.floor(pickNumber(root.size) || fallbackSize)),
  };
}

function toBuyerReviewEntry(review: AdminReview): BuyerReviewEntry {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    storeId: review.storeId,
    storeName: review.store.businessName,
    productId: review.productId,
    productName: review.product?.name ?? null,
    isVisible: review.isVisible,
    createdAt: review.createdAt,
  };
}

function matchesReviewScope(review: AdminReview, scope?: AdminReviewScope): boolean {
  if (!scope) {
    return true;
  }
  if (scope === 'product') {
    return review.productId != null;
  }
  return review.productId == null;
}

/** Estado demo mutable (DEV). */
let devAdminReviews: AdminReview[] = [
  {
    id: 'rev-001',
    rating: 5,
    comment: 'Excelente atención y buenos precios. Volvería sin dudas.',
    isVisible: true,
    createdAt: devIsoDaysAgo(2),
    storeId: 'store-001',
    productId: null,
    store: { id: 'store-001', businessName: 'Outlet Avellaneda Norte' },
    product: null,
    buyer: {
      id: 'buyer-001',
      displayName: 'Juan Pérez',
      email: 'juan.perez@ejemplo.ar',
    },
  },
  {
    id: 'rev-002',
    rating: 2,
    comment: 'La tienda tardó mucho en responder por chat.',
    isVisible: false,
    createdAt: devIsoDaysAgo(8),
    storeId: 'store-002',
    productId: null,
    store: { id: 'store-002', businessName: 'Moda Flores Local' },
    product: null,
    buyer: {
      id: 'buyer-002',
      displayName: 'Mariana López',
      email: 'mariana.lopez@ejemplo.ar',
    },
  },
  {
    id: 'rev-003',
    rating: 4,
    comment: null,
    isVisible: true,
    createdAt: devIsoDaysAgo(12),
    storeId: 'store-004',
    productId: null,
    store: { id: 'store-004', businessName: 'Nuevo Local Palermo' },
    product: null,
    buyer: {
      id: 'buyer-003',
      displayName: 'Carlos Benítez',
      email: 'carlos.benitez@ejemplo.ar',
    },
  },
  {
    id: 'rev-004',
    rating: 5,
    comment: 'La remera es tal cual las fotos, muy buena calidad.',
    isVisible: true,
    createdAt: devIsoDaysAgo(5),
    storeId: 'store-001',
    productId: 'mod-p1',
    store: { id: 'store-001', businessName: 'Outlet Avellaneda Norte' },
    product: { id: 'mod-p1', name: 'Remera Oversize Avellaneda' },
    buyer: {
      id: 'buyer-001',
      displayName: 'Juan Pérez',
      email: 'juan.perez@ejemplo.ar',
    },
  },
  {
    id: 'rev-005',
    rating: 3,
    comment: 'Buen buzo pero el talle M me quedó un poco justo.',
    isVisible: true,
    createdAt: devIsoDaysAgo(15),
    storeId: 'store-002',
    productId: 'mod-p2',
    store: { id: 'store-002', businessName: 'Moda Flores Local' },
    product: { id: 'mod-p2', name: 'Buzo Frisa Premium' },
    buyer: {
      id: 'buyer-004',
      displayName: null,
      email: 'nuevo.usuario@ejemplo.ar',
    },
  },
  {
    id: 'rev-006',
    rating: 1,
    comment: 'Las zapatillas llegaron con un defecto en la suela.',
    isVisible: false,
    createdAt: devIsoDaysAgo(20),
    storeId: 'store-004',
    productId: 'mod-p5',
    store: { id: 'store-004', businessName: 'Nuevo Local Palermo' },
    product: { id: 'mod-p5', name: 'Zapatilla urbana multicolor' },
    buyer: {
      id: 'buyer-002',
      displayName: 'Mariana López',
      email: 'mariana.lopez@ejemplo.ar',
    },
  },
  {
    id: 'rev-007',
    rating: 4,
    comment: 'Muy cómodas para uso diario, recomendadas.',
    isVisible: true,
    createdAt: devIsoDaysAgo(25),
    storeId: 'store-004',
    productId: 'mod-p5',
    store: { id: 'store-004', businessName: 'Nuevo Local Palermo' },
    product: { id: 'mod-p5', name: 'Zapatilla urbana multicolor' },
    buyer: {
      id: 'buyer-006',
      displayName: 'Sofía Gómez',
      email: 'sofia.gomez@ejemplo.ar',
    },
  },
  {
    id: 'rev-008',
    rating: 5,
    comment: 'Siempre encuentro buenas ofertas en esta tienda.',
    isVisible: true,
    createdAt: devIsoDaysAgo(30),
    storeId: 'store-002',
    productId: null,
    store: { id: 'store-002', businessName: 'Moda Flores Local' },
    product: null,
    buyer: {
      id: 'buyer-002',
      displayName: 'Mariana López',
      email: 'mariana.lopez@ejemplo.ar',
    },
  },
  {
    id: 'rev-009',
    rating: 2,
    comment: 'El producto pausado no debería aparecer en búsquedas.',
    isVisible: true,
    createdAt: devIsoDaysAgo(35),
    storeId: 'store-001',
    productId: 'mod-p3',
    store: { id: 'store-001', businessName: 'Outlet Avellaneda Norte' },
    product: { id: 'mod-p3', name: 'Jean Mom Rígido Local' },
    buyer: {
      id: 'buyer-001',
      displayName: 'Juan Pérez',
      email: 'juan.perez@ejemplo.ar',
    },
  },
];

function matchesBuyerSearch(review: AdminReview, buyerSearch?: string): boolean {
  const q = buyerSearch?.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const name = review.buyer.displayName?.toLowerCase() ?? '';
  return name.includes(q) || review.buyer.email.toLowerCase().includes(q);
}

function buildDevAdminReviewsPage(params: FetchAdminReviewsParams): Page<AdminReview> {
  const size = Math.max(1, params.size);
  const pageZero = Math.max(0, params.page);
  const filtered = devAdminReviews
    .filter((row) => matchesReviewScope(row, params.reviewScope))
    .filter((row) => {
      const storeId = params.storeId?.trim();
      return !storeId || row.storeId === storeId;
    })
    .filter((row) => {
      const productId = params.productId?.trim();
      if (!productId) {
        return true;
      }
      return row.productId === productId;
    })
    .filter((row) => matchesBuyerSearch(row, params.buyerSearch))
    .filter((row) =>
      params.rating === undefined ? true : row.rating === clampRating(params.rating),
    )
    .filter((row) =>
      params.isVisible === undefined ? true : row.isVisible === params.isVisible,
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const start = pageZero * size;
  const slice = filtered.slice(start, start + size).map((row) => mockClone(row));
  return {
    content: slice,
    totalElements: filtered.length,
    number: pageZero,
    size,
  };
}

function findDevAdminReviewOrThrow(id: string): AdminReview {
  const row = devAdminReviews.find((review) => review.id === id);
  if (!row) {
    throw new ApiError(404, null, `No hay reseña «${id}» en desarrollo.`);
  }
  return row;
}

export async function fetchAdminReviews(
  params: FetchAdminReviewsParams,
): Promise<Page<AdminReview>> {
  const body: FetchAdminReviewsParams = {
    ...params,
    page: Math.max(0, params.page),
    size: Math.max(1, params.size),
  };

  if (import.meta.env.DEV) {
    return devDelay(buildDevAdminReviewsPage(body));
  }

  const sp = new URLSearchParams();
  sp.set('page', String(body.page));
  sp.set('size', String(body.size));
  if (body.reviewScope) {
    sp.set('reviewScope', body.reviewScope);
  }
  const storeId = body.storeId?.trim();
  if (storeId) {
    sp.set('storeId', storeId);
  }
  const productId = body.productId?.trim();
  if (productId) {
    sp.set('productId', productId);
  }
  const buyerSearch = body.buyerSearch?.trim();
  if (buyerSearch) {
    sp.set('buyerSearch', buyerSearch);
  }
  if (body.rating !== undefined) {
    sp.set('rating', String(clampRating(body.rating)));
  }
  if (body.isVisible !== undefined) {
    sp.set('isVisible', String(body.isVisible));
  }

  const raw = await apiClient.get<unknown>(`${ADMIN_REVIEWS_API_PATH}?${sp.toString()}`);
  return coercePageAdminReview(raw, body.size);
}

export async function fetchBuyerReviewHistory(buyerId: string): Promise<BuyerReviewHistory> {
  const id = buyerId.trim();
  if (!id) {
    throw new ApiError(400, null, 'ID de comprador inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const reviews = devAdminReviews
      .filter((row) => row.buyer.id === id)
      .map((row) => toBuyerReviewEntry(row))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const sample = devAdminReviews.find((row) => row.buyer.id === id);
    if (!sample) {
      throw new ApiError(404, null, `No hay reseñas del comprador «${id}» en desarrollo.`);
    }
    return mockClone({
      buyerId: id,
      displayName: sample.buyer.displayName,
      email: sample.buyer.email,
      reviews,
    });
  }

  const raw = await apiClient.get<unknown>(
    `${ADMIN_REVIEWS_API_PATH}/buyers/${encodeURIComponent(id)}/history`,
  );
  const o = typeof raw === 'object' && raw !== null ? (raw as JsonRecord) : {};
  const reviewsRaw = Array.isArray(o.reviews) ? o.reviews : [];
  const reviews = reviewsRaw
    .map((row) => {
      const entry = typeof row === 'object' && row !== null ? (row as JsonRecord) : null;
      if (!entry) {
        return undefined;
      }
      const reviewId = pickString(entry.id);
      const storeId = pickString(entry.storeId ?? entry.store_id);
      const storeName = pickString(entry.storeName ?? entry.store_name);
      const productId = pickNullableString(entry.productId ?? entry.product_id);
      const productName = pickNullableString(entry.productName ?? entry.product_name);
      const createdAt = pickString(entry.createdAt ?? entry.created_at) ?? '';
      if (!reviewId || !storeId || !storeName) {
        return undefined;
      }
      return {
        id: reviewId,
        rating: clampRating(pickNumber(entry.rating)),
        comment: pickNullableString(entry.comment),
        storeId,
        storeName,
        productId,
        productName,
        isVisible: pickBoolean(entry.isVisible ?? entry.is_visible),
        createdAt,
      } satisfies BuyerReviewEntry;
    })
    .filter((x): x is BuyerReviewEntry => x !== undefined);

  const email = pickString(o.email);
  if (!email) {
    throw new ApiError(500, raw, 'El servidor no devolvió el historial del comprador.');
  }

  return {
    buyerId: pickString(o.buyerId ?? o.buyer_id) ?? id,
    displayName: pickNullableString(o.displayName ?? o.display_name),
    email,
    reviews,
  };
}

export async function toggleReviewVisibility(
  id: string,
  data: ToggleReviewVisibilityDTO,
): Promise<AdminReview> {
  const reviewId = id.trim();
  if (!reviewId) {
    throw new ApiError(400, null, 'ID de reseña inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 180);
    const current = findDevAdminReviewOrThrow(reviewId);
    const updated: AdminReview = { ...current, isVisible: data.isVisible };
    devAdminReviews = devAdminReviews.map((row) => (row.id === reviewId ? updated : row));
    return mockClone(updated);
  }

  const raw = await apiClient.patch<unknown>(
    `${ADMIN_REVIEWS_API_PATH}/${encodeURIComponent(reviewId)}/visibility`,
    data,
  );
  const review = coerceAdminReview(raw);
  if (!review) {
    throw new ApiError(500, raw, 'El servidor no devolvió la reseña actualizada.');
  }
  return review;
}

export async function deleteReview(id: string): Promise<void> {
  const reviewId = id.trim();
  if (!reviewId) {
    throw new ApiError(400, null, 'ID de reseña inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 180);
    if (!devAdminReviews.some((row) => row.id === reviewId)) {
      throw new ApiError(404, null, `No hay reseña «${reviewId}» en desarrollo.`);
    }
    devAdminReviews = devAdminReviews.filter((row) => row.id !== reviewId);
    return;
  }

  await apiClient.delete(`${ADMIN_REVIEWS_API_PATH}/${encodeURIComponent(reviewId)}`);
}

export { ADMIN_REVIEWS_PAGE_SIZE };
