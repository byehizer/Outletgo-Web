import { ApiError, apiClient } from '../../lib/http/apiClient';
import { PRODUCT_STATUS } from '../../types/product';
import type {
  ProductStatus,
  ProductVariationFormValue,
  SellerProductDetail,
} from '../../types/product';

import { SELLER_PRODUCTS_API_PATH } from '../../lib/constants';

type JsonRecord = Record<string, unknown>;

export type SellerProductSavePayload = {
  name: string;
  description: string;
  categoryId: string;
  tags: string[];
  basePrice: number;
  imageUrls: string[];
  variations: ProductVariationFormValue[];
  stagingSessionId?: string;
};

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' ? v.trim() || undefined : undefined;
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

function pickStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function pickImageUrls(o: JsonRecord): string[] {
  const urls =
    Array.isArray(o.imageUrls)
      ? pickStringArray(o.imageUrls)
      : Array.isArray(o.image_urls)
        ? pickStringArray(o.image_urls)
        : Array.isArray(o.images)
          ? pickStringArray(o.images)
          : [];
  return urls;
}

function pickTags(o: JsonRecord): string[] {
  const t = o.tags ?? o.keywords;
  if (Array.isArray(t)) {
    return pickStringArray(t);
  }
  if (typeof t === 'string') {
    return t
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

function coerceVariation(row: JsonRecord): ProductVariationFormValue | undefined {
  const size = pickString(row.size ?? row.talle ?? row.variantSize);
  const color = pickString(row.color ?? row.colour ?? row.variantColor);
  if (!size || !color) {
    return undefined;
  }
  const stock = Math.floor(pickNumber(row.stock ?? row.quantity ?? row.qty ?? row.inventory));
  return {
    size,
    color,
    stock,
  };
}

export function coerceSellerProductDetail(raw: unknown): SellerProductDetail {
  const o = typeof raw === 'object' && raw !== null ? (raw as JsonRecord) : {};
  const id = pickString(o.id ?? o.uuid) ?? '';

  const variationsRaw = Array.isArray(o.variations) ? o.variations : [];
  const variations = variationsRaw
    .map((row) =>
      typeof row === 'object' && row !== null ? coerceVariation(row as JsonRecord) : undefined,
    )
    .filter((x): x is ProductVariationFormValue => x !== undefined);

  return {
    id,
    name: pickString(o.name ?? o.title) ?? '',
    description: pickString(o.description ?? o.body ?? o.detail) ?? '',
    categoryId: pickString(o.categoryId ?? o.category_id ?? o.category)?.toLowerCase() ?? 'ropa',
    tags: pickTags(o),
    basePrice: pickNumber(o.basePrice ?? o.base_price ?? o.price ?? o.amount),
    imageUrls: pickImageUrls(o),
    status: coerceStatus(pickString(o.status)),
    variations,
  };
}

const DEV_MOCK_DETAILS: Record<string, SellerProductDetail> = {
  p1: {
    id: 'p1',
    name: 'Remera Oversize Avellaneda',
    description:
      'Remera oversize en jersey suave de algodón. Corte holgado, ideal para temporada cálida. Modelo desarrollado junto al taller.',
    categoryId: 'ropa',
    tags: ['remeras', 'oversize', 'urbano'],
    basePrice: 14500,
    imageUrls: ['https://picsum.photos/200/200', 'https://picsum.photos/200/201'],
    status: PRODUCT_STATUS.ACTIVE,
    variations: [
      { size: 'S', color: 'Negro', stock: 15 },
      { size: 'M', color: 'Negro', stock: 20 },
      { size: 'L', color: 'Blanco', stock: 10 },
    ],
  },
  p2: {
    id: 'p2',
    name: 'Jean Mom Rígido Local',
    description: 'Jean de tiro medio con lavado rígido. Confección local; stock limitado por talle.',
    categoryId: 'ropa',
    tags: ['jean', 'denim', 'mom'],
    basePrice: 28000,
    imageUrls: ['https://picsum.photos/seed/p2jean/200/200'],
    status: PRODUCT_STATUS.PAUSED_BY_SELLER,
    variations: [{ size: '38', color: 'Azul', stock: 12 }],
  },
  p3: {
    id: 'p3',
    name: 'Campera ejemplo (bloqueada admin)',
    description: 'Producto sólo DEMO del panel seller: permite probar inhabilitación admin (Paso 14).',
    categoryId: 'ropa',
    tags: ['moderación'],
    basePrice: 99000,
    imageUrls: ['https://picsum.photos/seed/p3camp/200/200'],
    status: PRODUCT_STATUS.DISABLED_BY_ADMIN,
    variations: [{ size: 'Único', color: 'Oliva', stock: 2 }],
  },
};

/** En DEV: alta / ediciones recientes (además de `p1`/`p2` fijos). */
const DEV_SELLER_PRODUCT_DRAFTS: Record<string, SellerProductDetail> = {};

const DEV_SELLER_SOFT_DELETED_IDS = new Set<string>();

function snapshotFromPayload(id: string, payload: SellerProductSavePayload): SellerProductDetail {
  return {
    id,
    name: payload.name,
    description: payload.description,
    categoryId: payload.categoryId,
    tags: [...payload.tags],
    basePrice: payload.basePrice,
    imageUrls: [...payload.imageUrls],
    status: PRODUCT_STATUS.ACTIVE,
    variations: payload.variations.map((v) => ({
      size: v.size.trim(),
      color: v.color.trim(),
      stock: Math.floor(v.stock),
    })),
  };
}

function devDelay<T>(value: T, ms = 160): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function mockClone(detail: SellerProductDetail): SellerProductDetail {
  if (typeof structuredClone === 'function') {
    return structuredClone(detail);
  }
  return JSON.parse(JSON.stringify(detail)) as SellerProductDetail;
}

const DEV_MERGED_LIST_PIN_IDS = ['p1', 'p2'] as const;

function stableDevDetailOrdering(a: SellerProductDetail, b: SellerProductDetail): number {
  const ia = DEV_MERGED_LIST_PIN_IDS.indexOf(a.id as 'p1' | 'p2');
  const ib = DEV_MERGED_LIST_PIN_IDS.indexOf(b.id as 'p1' | 'p2');
  if (ia !== -1 && ib !== -1) {
    return ia - ib;
  }
  if (ia !== -1) {
    return -1;
  }
  if (ib !== -1) {
    return 1;
  }
  return String(a.name).localeCompare(String(b.name), 'es');
}

function devEnumerateMergedDetails(): SellerProductDetail[] {
  const map = new Map<string, SellerProductDetail>();

  for (const baseline of Object.values(DEV_MOCK_DETAILS)) {
    if (DEV_SELLER_SOFT_DELETED_IDS.has(baseline.id)) {
      continue;
    }
    map.set(baseline.id, mockClone(baseline));
  }

  for (const draft of Object.values(DEV_SELLER_PRODUCT_DRAFTS)) {
    if (DEV_SELLER_SOFT_DELETED_IDS.has(draft.id)) {
      continue;
    }
    map.set(draft.id, mockClone(draft));
  }

  return [...map.values()].sort(stableDevDetailOrdering);
}

/**
 * Catálogo unificado lista+detail en `import.meta.env.DEV` (Paso 13–14).
 * El listado debe derivar desde acá para reflejar altas/edición/pausas/borrados lógicos.
 */
export function enumerateDevSellerProductDetailsMerged(): SellerProductDetail[] {
  return devEnumerateMergedDetails();
}

export async function devSellerPatchProductStatus(productId: string, nextStatus: ProductStatus): Promise<void> {
  await devDelay(undefined, 220);
  const id = productId.trim();
  if (!id) {
    throw new ApiError(400, null, 'ID de producto inválido.');
  }

  const baseline = DEV_SELLER_PRODUCT_DRAFTS[id] ?? DEV_MOCK_DETAILS[id];
  if (!baseline) {
    throw new ApiError(404, null, `En desarrollo no hay datos para «${id}». Probá crear uno nuevo o editar «p1» / «p2».`);
  }

  if (
    nextStatus === PRODUCT_STATUS.ACTIVE &&
    baseline.status === PRODUCT_STATUS.DISABLED_BY_ADMIN
  ) {
    throw new ApiError(
      409,
      null,
      'Solo el admin puede reactivar este producto.',
    );
  }

  DEV_SELLER_PRODUCT_DRAFTS[id] = { ...mockClone(baseline), status: nextStatus };
}

export async function devSellerSoftDeleteProduct(productId: string): Promise<void> {
  await devDelay(undefined, 220);
  const id = productId.trim();
  if (!id) {
    throw new ApiError(400, null, 'ID de producto inválido.');
  }

  DEV_SELLER_SOFT_DELETED_IDS.add(id);

  /* Evita inconsistencias si el recurso sólo vivía como borrador. */
  delete DEV_SELLER_PRODUCT_DRAFTS[id];
}

/**
 * Detalle de producto para formulario seller (GET). En `import.meta.env.DEV` usa mocks `p1` / `p2`.
 */
export async function fetchSellerProductDetail(productId: string): Promise<SellerProductDetail> {
  const id = productId.trim();
  if (id.length === 0) {
    throw new ApiError(400, null, 'ID de producto inválido.');
  }

  if (import.meta.env.DEV) {
    if (DEV_SELLER_SOFT_DELETED_IDS.has(id)) {
      await devDelay(undefined, 140);
      throw new ApiError(404, null, 'Este producto fue dado de baja.');
    }
    const mock = DEV_SELLER_PRODUCT_DRAFTS[id] ?? DEV_MOCK_DETAILS[id];
    if (!mock) {
      await devDelay(undefined, 160);
      throw new ApiError(
        404,
        null,
        `En desarrollo no hay datos para «${id}». Probá crear uno nuevo o editar «p1» / «p2».`,
      );
    }
    return devDelay(mockClone(mock));
  }

  const raw = await apiClient.get<unknown>(`${SELLER_PRODUCTS_API_PATH}/${encodeURIComponent(id)}`);
  return coerceSellerProductDetail(raw);
}

export async function createSellerProduct(payload: SellerProductSavePayload): Promise<{ id: string }> {
  const body = { ...payload };
  if (import.meta.env.DEV) {
    const newId = `p-${Date.now()}`;
    DEV_SELLER_PRODUCT_DRAFTS[newId] = snapshotFromPayload(newId, payload);
    return devDelay({ id: newId }, 220);
  }
  const raw = await apiClient.post<unknown>(SELLER_PRODUCTS_API_PATH, body);
  const rec = coerceSellerProductDetail(raw);
  if (!rec.id) {
    const id = typeof raw === 'object' && raw !== null ? pickString((raw as JsonRecord).id ?? (raw as JsonRecord).uuid) : undefined;
    if (id) {
      return { id };
    }
    throw new ApiError(500, raw, 'El servidor no devolvió el ID del producto creado.');
  }
  return { id: rec.id };
}

export async function updateSellerProduct(productId: string, payload: SellerProductSavePayload): Promise<void> {
  const id = productId.trim();
  if (id.length === 0) {
    throw new ApiError(400, null, 'ID de producto inválido.');
  }
  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const baseline = DEV_SELLER_PRODUCT_DRAFTS[id] ?? DEV_MOCK_DETAILS[id];
    if (!baseline) {
      throw new ApiError(404, null, `En desarrollo no hay datos para «${id}».`);
    }
    const next = snapshotFromPayload(id, payload);
    DEV_SELLER_PRODUCT_DRAFTS[id] = { ...next, status: baseline.status };
    return;
  }
  await apiClient.patch<unknown>(
    `${SELLER_PRODUCTS_API_PATH}/${encodeURIComponent(id)}`,
    payload,
  );
}
