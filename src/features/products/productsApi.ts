import type { Page } from '../../types/api';
import type { ProductStatus, ProductSummary, SellerProductDetail } from '../../types/product';
import { PRODUCT_STATUS } from '../../types/product';
import { apiClient } from '../../lib/http/apiClient';

import {
  SELLER_PRODUCTS_API_PATH,
  SELLER_PRODUCTS_PAGE_SIZE,
  sellerProductLogicalDeleteApiPath,
  sellerProductStatusApiPath,
} from '../../lib/constants';
import { devSellerPatchProductStatus, devSellerSoftDeleteProduct } from './productDetailApi';

type JsonRecord = Record<string, unknown>;

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

function coerceStatus(raw: unknown): ProductStatus {
  const s = typeof raw === 'string' ? raw : '';
  if (s === PRODUCT_STATUS.ACTIVE || s === PRODUCT_STATUS.PAUSED_BY_SELLER || s === PRODUCT_STATUS.DISABLED_BY_ADMIN) {
    return s;
  }
  return PRODUCT_STATUS.ACTIVE;
}

function pickFirstUrlFromImageArray(raw: unknown): string | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const first = raw[0];
  return typeof first === 'string' && first.length > 0 ? first : undefined;
}

function coerceSummary(o: JsonRecord): ProductSummary {
  const id = pickString(o.id ?? o.uuid) ?? '';
  const name = pickString(o.name ?? o.title) ?? '';

  const thumb =
    pickString(o.thumbnailUrl) ??
    pickString(o.thumbnail_url) ??
    pickString(o.imageUrl) ??
    pickString(o.image_url) ??
    pickString(o.images) ??
    pickFirstUrlFromImageArray(o.images) ??
    pickString(o.imageUrls) ??
    pickFirstUrlFromImageArray(o.imageUrls) ??
    pickString(o.images_urls) ??
    pickFirstUrlFromImageArray(o.images_urls);

  const price = pickNumber(o.price ?? o.basePrice ?? o.base_price ?? o.amount);
  const totalStock = pickNumber(o.totalStock ?? o.total_stock ?? o.stock ?? o.quantity);

  const statusRaw = pickString(o.status) ?? PRODUCT_STATUS.ACTIVE;

  return {
    id,
    name,
    thumbnailUrl: thumb ?? null,
    price,
    totalStock,
    status: coerceStatus(statusRaw),
  };
}

/** Payload compatible con `coerceSummary()` para armar filas desde el detalle seller (DEV unificado Paso 13–14). */
export function sellerProductDetailAsListingPayload(detail: SellerProductDetail): Record<string, unknown> {
  const totalStock = detail.variations.reduce((acc, v) => acc + Math.floor(Number.isFinite(v.stock) ? v.stock : 0), 0);
  return {
    id: detail.id,
    name: detail.name,
    basePrice: detail.basePrice,
    price: detail.basePrice,
    totalStock,
    status: detail.status,
    images: detail.imageUrls,
  };
}

export function summarizeSellerProductDetail(detail: SellerProductDetail): ProductSummary {
  return coerceSummary(sellerProductDetailAsListingPayload(detail) as JsonRecord);
}

export function coercePageProductSummary(payload: unknown): Page<ProductSummary> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) =>
      typeof row === 'object' && row !== null ? coerceSummary(row as JsonRecord) : undefined,
    )
    .filter((x): x is ProductSummary => x !== undefined && x.id.length > 0);

  return {
    content,
    totalElements: pickNumber(root.totalElements ?? root.total_elements),
    number: pickNumber(root.number),
    size: pickNumber(root.size) || SELLER_PRODUCTS_PAGE_SIZE,
  };
}

export type FetchSellerProductsParams = {
  page: number;
  size: number;
  name?: string;
  status?: ProductStatus;
};

export type SellerProductStatusPatchPayload = {
  status: ProductStatus;
};

/** Pausar / reactivar desde el panel seller (Paso 14). */
export async function patchSellerProductStatus(productId: string, payload: SellerProductStatusPatchPayload): Promise<void> {
  const id = productId.trim();
  if (id.length === 0) {
    throw new Error('ID de producto inválido.');
  }

  if (import.meta.env.DEV) {
    await devSellerPatchProductStatus(id, payload.status);
    return;
  }

  await apiClient.patch<unknown>(sellerProductStatusApiPath(id), payload);
}

/** Baja lógica (Paso 14). */
export async function deleteSellerProductLogical(productId: string): Promise<void> {
  const id = productId.trim();
  if (id.length === 0) {
    throw new Error('ID de producto inválido.');
  }

  if (import.meta.env.DEV) {
    await devSellerSoftDeleteProduct(id);
    return;
  }

  await apiClient.delete<unknown>(sellerProductLogicalDeleteApiPath(id));
}

/** Listado seller paginado (Spring Page). */
export async function fetchSellerProducts(params: FetchSellerProductsParams): Promise<Page<ProductSummary>> {
  const sp = new URLSearchParams();
  sp.set('page', String(Math.max(0, params.page)));
  sp.set('size', String(Math.max(1, params.size)));
  const name = params.name?.trim();
  if (name) {
    sp.set('name', name);
  }
  if (params.status) {
    sp.set('status', params.status);
  }

  const raw = await apiClient.get<unknown>(`${SELLER_PRODUCTS_API_PATH}?${sp.toString()}`);
  return coercePageProductSummary(raw);
}
