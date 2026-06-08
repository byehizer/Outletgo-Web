import { apiClient } from '../../lib/http/apiClient';
import {
  SELLER_PRODUCT_REVIEWS_API_PATH,
  SELLER_STORE_REVIEWS_API_PATH,
} from '../../lib/constants';
import type { Page } from '../../types/api';
import type { SellerReview } from '../../types/review';

import { DEV_SELLER_PRODUCT_OPTIONS } from './useProductOptions';

/** Orden por `createdAt`: recientes primero (`desc`) o antiguos primero (`asc`). */
export type ReviewsCreatedAtSort = 'asc' | 'desc';

/** Parámetros listado de reseñas de tienda. */
export type FetchStoreReviewsParams = {
  page: number;
  size: number;
  rating?: number;
  /** Por defecto en API/mock: más recientes primero. */
  createdAtSort?: ReviewsCreatedAtSort;
};

/** Parámetros listado de reseñas de productos. */
export type FetchProductReviewsParams = {
  page: number;
  size: number;
  rating?: number;
  productId?: string;
  createdAtSort?: ReviewsCreatedAtSort;
  /** Búsqueda full-text cuando el backend indexe comentarios/datos del ítem (mock: autor, texto, nombre). */
  search?: string;
};

const DEV_SELLER_STORE_ID = 'store-dev-001';

const DEV_STORE_REVIEWS_SEED: SellerReview[] = [
  {
    id: 'rev-store-501',
    authorName: 'Ana Rodríguez',
    rating: 5,
    comment: 'Excelente tienda y atención rápida. Volvería sin dudarlo.',
    storeId: DEV_SELLER_STORE_ID,
    productId: null,
    productName: null,
    imageUrls: [],
    createdAt: '2024-06-02T14:22:30.000Z',
  },
  {
    id: 'rev-store-502',
    authorName: 'Martín Paz',
    rating: 5,
    comment: '',
    storeId: DEV_SELLER_STORE_ID,
    productId: null,
    productName: null,
    imageUrls: [],
    createdAt: '2024-06-03T09:15:00.000Z',
  },
  {
    id: 'rev-store-503',
    authorName: 'Lucía Méndez',
    rating: 4,
    comment: 'Buen local, llegué después de esperar una cola bastante larga.',
    storeId: DEV_SELLER_STORE_ID,
    productId: null,
    productName: null,
    imageUrls: [],
    createdAt: '2024-06-10T11:05:42.000Z',
  },
  {
    id: 'rev-store-506',
    authorName: 'Esteban Quiroga',
    rating: 3,
    comment: 'Ni muy ni tan poco. La experiencia fue aceptable.',
    storeId: DEV_SELLER_STORE_ID,
    productId: null,
    productName: null,
    imageUrls: [],
    createdAt: '2024-08-03T08:52:17.000Z',
  },
  {
    id: 'rev-store-508',
    authorName: 'Iván Colombo',
    rating: 2,
    comment: 'No recomiendo el estacionamiento cercano pero la tienda estuvo bien.',
    storeId: DEV_SELLER_STORE_ID,
    productId: null,
    productName: null,
    imageUrls: [],
    createdAt: '2024-09-05T19:07:56.000Z',
  },
];

function productNameForMock(productId: string): string | undefined {
  return DEV_SELLER_PRODUCT_OPTIONS.find((p) => p.id === productId)?.name;
}

/** Opción de catálogo mock con índice fijo (`DEV_PRODUCT_REVIEWS_SEED`). */
function devSellerProduct(ix: number): { id: string; name: string } {
  if (ix < 0 || ix >= DEV_SELLER_PRODUCT_OPTIONS.length) {
    throw new Error(`reviewsApi: índice de producto mock inválido: ${String(ix)}`);
  }
  return DEV_SELLER_PRODUCT_OPTIONS[ix]!;
}

/** Sólo reseñas de producto; `productId` alineados con opciones DEV. */
const DEV_PRODUCT_REVIEWS_SEED: SellerReview[] = [
  {
    id: 'rev-prod-504',
    authorName: 'Gabriel Torres',
    rating: 4,
    comment: 'Jeans muy buenos pero el tiempo de despacho tardó más de lo esperado.',
    storeId: DEV_SELLER_STORE_ID,
    productId: devSellerProduct(0).id,
    productName: productNameForMock(devSellerProduct(0).id) ?? null,
    imageUrls: [
      'https://picsum.photos/seed/rem1/600/600'
    ],
    createdAt: '2024-07-01T16:44:21.000Z',
  },
  {
    id: 'rev-prod-505',
    authorName: 'Rocío Vega',
    rating: 3,
    comment: 'Regular. El producto no era exactamente igual al de la foto.',
    storeId: DEV_SELLER_STORE_ID,
    productId: devSellerProduct(1).id,
    productName: productNameForMock(devSellerProduct(1).id) ?? null,
    imageUrls: [
      'https://picsum.photos/seed/rem2/600/600',
      'https://picsum.photos/seed/rem3/600/600'
    ],
    createdAt: '2024-07-12T20:03:59.000Z',
  },
  {
    id: 'rev-prod-507',
    authorName: 'Laura Funes',
    rating: 2,
    comment: 'Me confundieron un talle. El cambio tardó bastante.',
    storeId: DEV_SELLER_STORE_ID,
    productId: devSellerProduct(2).id,
    productName: productNameForMock(devSellerProduct(2).id) ?? null,
    imageUrls: [],
    createdAt: '2024-08-21T13:41:09.000Z',
  },
  {
    id: 'rev-prod-509',
    authorName: 'Felipe Ramos',
    rating: 1,
    comment: 'El producto llegó con una costura suelta.',
    storeId: DEV_SELLER_STORE_ID,
    productId: devSellerProduct(3).id,
    productName: productNameForMock(devSellerProduct(3).id) ?? null,
    imageUrls: [
      'https://picsum.photos/seed/rem4/600/600'
    ],
    createdAt: '2024-09-18T10:38:03.000Z',
  },
  {
    id: 'rev-prod-510',
    authorName: 'Juana Silva',
    rating: 5,
    comment: 'Hermosa campera y calidad impecable. Envío rápido.',
    storeId: DEV_SELLER_STORE_ID,
    productId: devSellerProduct(3).id,
    productName: productNameForMock(devSellerProduct(3).id) ?? null,
    imageUrls: [
      'https://picsum.photos/seed/rem5/600/600',
      'https://picsum.photos/seed/rem6/600/600',
      'https://picsum.photos/seed/rem7/600/600'
    ],
    createdAt: '2024-10-02T07:59:41.000Z',
  },
  {
    id: 'rev-prod-511',
    authorName: 'Nicolas Dupuy',
    rating: 1,
    comment: '',
    storeId: DEV_SELLER_STORE_ID,
    productId: devSellerProduct(4).id,
    productName: productNameForMock(devSellerProduct(4).id) ?? null,
    imageUrls: [],
    createdAt: '2024-10-09T21:45:12.000Z',
  },
];

function devDelay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function sortReviewsByCreatedAt(rows: SellerReview[], order: ReviewsCreatedAtSort): SellerReview[] {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => mult * (Date.parse(a.createdAt) - Date.parse(b.createdAt)));
}

function normalizedSearchProductRow(row: SellerReview, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }
  const hay = `${row.authorName} ${row.comment} ${row.productName ?? ''}`.toLowerCase();
  return hay.includes(normalizedQuery);
}

function sliceToPage(rows: SellerReview[], pageZero: number, size: number): Page<SellerReview> {
  const sizeSafe = Math.max(1, size);
  const totalElements = rows.length;
  const computedPages =
    totalElements === 0 ? 1 : Math.max(1, Math.ceil(totalElements / sizeSafe));

  let pageSafe = Math.max(0, pageZero);
  if (pageSafe > computedPages - 1) {
    pageSafe = Math.max(0, computedPages - 1);
  }

  const start = pageSafe * sizeSafe;
  return {
    content: rows.slice(start, start + sizeSafe),
    totalElements,
    number: pageSafe,
    size: sizeSafe,
  };
}

export function buildDevStoreReviewsPage(params: FetchStoreReviewsParams): Page<SellerReview> {
  const filtered = DEV_STORE_REVIEWS_SEED.filter((r) => {
    if (typeof params.rating === 'number' && Number.isFinite(params.rating) && r.rating !== params.rating) {
      return false;
    }
    return true;
  });
  const sorted = sortReviewsByCreatedAt(filtered, params.createdAtSort ?? 'desc');
  return sliceToPage(sorted, params.page, params.size);
}

export function buildDevProductReviewsPage(params: FetchProductReviewsParams): Page<SellerReview> {
  const productFilter = params.productId?.trim();
  const qnorm = params.search?.trim().toLowerCase() ?? '';

  const filtered = DEV_PRODUCT_REVIEWS_SEED.filter((r) => {
    if (typeof params.rating === 'number' && Number.isFinite(params.rating) && r.rating !== params.rating) {
      return false;
    }
    if (
      productFilter !== undefined &&
      productFilter !== '' &&
      r.productId !== productFilter
    ) {
      return false;
    }
    if (!normalizedSearchProductRow(r, qnorm)) {
      return false;
    }
    return true;
  });
  const sorted = sortReviewsByCreatedAt(filtered, params.createdAtSort ?? 'desc');
  return sliceToPage(sorted, params.page, params.size);
}

function pickNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string') {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function pickNullableString(v: unknown): string | null {
  if (v === null || v === undefined) {
    return null;
  }
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s : null;
}

function coerceSellerReview(raw: unknown): SellerReview | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = pickString(o.id);
  const authorName = pickString(o.authorName ?? o.author_name);
  const rating = pickNumber(o.rating);
  const commentRaw = typeof o.comment === 'string' ? o.comment : '';
  const storeId = pickString(o.storeId ?? o.store_id);
  const productRaw = o.product;
  const productNested =
    typeof productRaw === 'object' && productRaw !== null ? (productRaw as Record<string, unknown>) : null;
  const productId =
    pickNullableString(o.productId ?? o.product_id) ??
    pickNullableString(productNested?.id ?? productNested?.productId);
  const productName =
    pickNullableString(o.productName ?? o.product_name) ?? pickNullableString(productNested?.name);
  const createdAt = pickString(o.createdAt ?? o.created_at);
  if (!id || !authorName || rating === undefined || rating < 1 || rating > 5 || !storeId || !createdAt) {
    return null;
  }

  const imageUrlsRaw = o.imageUrls ?? o.image_urls;
  const imageUrls: string[] = [];
  // Las imágenes son únicamente de productos (productId no es nulo)
  if (productId && Array.isArray(imageUrlsRaw)) {
    for (const url of imageUrlsRaw) {
      if (typeof url === 'string' && url.trim().length > 0) {
        imageUrls.push(url.trim());
      }
    }
  }

  return {
    id,
    authorName,
    rating: Math.round(rating),
    comment: commentRaw,
    storeId,
    productId,
    productName,
    imageUrls,
    createdAt,
  };
}

function coerceSellerReviewsPage(payload: unknown, fallbackSize: number): Page<SellerReview> {
  if (typeof payload !== 'object' || payload === null) {
    return { content: [], totalElements: 0, number: 0, size: fallbackSize };
  }
  const root = payload as Record<string, unknown>;
  const contentRaw = Array.isArray(root.content) ? root.content : [];

  const content: SellerReview[] = [];
  for (const item of contentRaw) {
    const r = coerceSellerReview(item);
    if (r) {
      content.push(r);
    }
  }

  const totalElements =
    pickNumber(root.totalElements ?? root.total_elements) ?? pickNumber(root.total) ?? content.length;

  const rawPageIdx = pickNumber(root.number ?? root.page) ?? 0;
  const rawSize = pickNumber(root.size) ?? fallbackSize;

  const total =
    typeof totalElements === 'number' && Number.isFinite(totalElements) ? Math.floor(totalElements) : content.length;
  const pg =
    typeof rawPageIdx === 'number' && Number.isFinite(rawPageIdx) ? Math.floor(rawPageIdx) : 0;
  const sz =
    typeof rawSize === 'number' && Number.isFinite(rawSize) && rawSize > 0 ? Math.floor(rawSize) : fallbackSize;

  return {
    content,
    totalElements: total,
    number: pg,
    size: sz,
  };
}

export async function fetchStoreReviews(params: FetchStoreReviewsParams): Promise<Page<SellerReview>> {
  const size = Math.max(1, params.size);
  const body: FetchStoreReviewsParams = {
    ...params,
    page: Math.max(0, params.page),
    size,
  };

  if (import.meta.env.DEV) {
    return devDelay(buildDevStoreReviewsPage(body));
  }

  const qs = new URLSearchParams();
  qs.set('page', String(body.page));
  qs.set('size', String(size));
  if (typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5) {
    qs.set('rating', String(body.rating));
  }
  qs.set(
    'sortCreatedAt',
    body.createdAtSort === 'asc' ? 'ASC' : 'DESC',
  );

  const raw = await apiClient.get<unknown>(`${SELLER_STORE_REVIEWS_API_PATH}?${qs.toString()}`);
  return coerceSellerReviewsPage(raw, size);
}

export async function fetchProductReviews(params: FetchProductReviewsParams): Promise<Page<SellerReview>> {
  const size = Math.max(1, params.size);
  const body: FetchProductReviewsParams = {
    ...params,
    page: Math.max(0, params.page),
    size,
  };

  if (import.meta.env.DEV) {
    return devDelay(buildDevProductReviewsPage(body));
  }

  const qs = new URLSearchParams();
  qs.set('page', String(body.page));
  qs.set('size', String(size));
  if (typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5) {
    qs.set('rating', String(body.rating));
  }
  const pid = body.productId?.trim();
  if (pid && pid.length > 0) {
    qs.set('productId', pid);
  }
  qs.set(
    'sortCreatedAt',
    body.createdAtSort === 'asc' ? 'ASC' : 'DESC',
  );
  const s = body.search?.trim();
  if (s && s.length > 0) {
    qs.set('search', s);
  }

  const raw = await apiClient.get<unknown>(`${SELLER_PRODUCT_REVIEWS_API_PATH}?${qs.toString()}`);
  return coerceSellerReviewsPage(raw, size);
}
