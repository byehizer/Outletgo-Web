import {
  ADMIN_PRODUCTS_API_PATH,
  ADMIN_PRODUCTS_PAGE_SIZE,
} from '../../lib/constants';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import { MODERATION_ACTION } from '../../types/moderation';
import type {
  AdminProduct,
  DisableProductDTO,
  ModerationEntry,
} from '../../types/moderation';
import type { Page } from '../../types/api';
import { PRODUCT_STATUS, type ProductStatus } from '../../types/product';

type JsonRecord = Record<string, unknown>;

export type FetchAdminProductsParams = {
  page: number;
  size: number;
  search?: string;
  status?: ProductStatus;
  storeId?: string;
};

const DEV_ADMIN_EMAIL = 'admin@outletgo.demo';

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

function pickNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  const n = pickNumber(v);
  return Number.isFinite(n) ? n : null;
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

function coerceStatus(raw: unknown): ProductStatus | undefined {
  const s = typeof raw === 'string' ? raw : '';
  if (
    s === PRODUCT_STATUS.ACTIVE ||
    s === PRODUCT_STATUS.PAUSED_BY_SELLER ||
    s === PRODUCT_STATUS.DISABLED_BY_ADMIN
  ) {
    return s;
  }
  return undefined;
}

function coerceModerationEntry(payload: unknown): ModerationEntry | undefined {
  const o = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : null;
  if (!o) {
    return undefined;
  }
  const id = pickString(o.id);
  const actionRaw = pickString(o.action);
  const adminEmail = pickString(o.adminEmail ?? o.admin_email);
  const createdAt = pickString(o.createdAt ?? o.created_at) ?? '';
  if (!id || !adminEmail) {
    return undefined;
  }
  const action =
    actionRaw === MODERATION_ACTION.DISABLED || actionRaw === MODERATION_ACTION.REACTIVATED
      ? actionRaw
      : undefined;
  if (!action) {
    return undefined;
  }
  return {
    id,
    action,
    adminEmail,
    reason: pickNullableString(o.reason),
    createdAt,
  };
}

function coerceAdminProduct(payload: unknown): AdminProduct | undefined {
  const o = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : null;
  if (!o) {
    return undefined;
  }

  const id = pickString(o.id ?? o.productId ?? o.product_id);
  const name = pickString(o.name ?? o.title);
  const description = pickString(o.description ?? o.body) ?? '';
  const basePrice = pickNumber(o.basePrice ?? o.base_price ?? o.price);
  const status = coerceStatus(o.status);
  const createdAt = pickString(o.createdAt ?? o.created_at) ?? '';
  const ratingAvg = pickNullableNumber(o.ratingAvg ?? o.rating_avg);
  const ratingCount = Math.max(
    0,
    Math.floor(pickNumber(o.ratingCount ?? o.rating_count)),
  );

  const storeRaw =
    typeof o.store === 'object' && o.store !== null ? (o.store as JsonRecord) : o;
  const storeId = pickString(storeRaw.id ?? storeRaw.storeId ?? storeRaw.store_id);
  const businessName =
    pickString(storeRaw.businessName ?? storeRaw.business_name ?? storeRaw.name) ?? '';

  const categoryRaw =
    typeof o.category === 'object' && o.category !== null ? (o.category as JsonRecord) : o;
  const categoryId = pickString(categoryRaw.id ?? categoryRaw.categoryId ?? categoryRaw.category_id);
  const categoryName =
    pickString(categoryRaw.name ?? categoryRaw.categoryName ?? categoryRaw.category_name) ?? '';

  if (!id || !name || !status || !storeId || !businessName || !categoryId || !categoryName) {
    return undefined;
  }

  const imagesRaw = Array.isArray(o.images) ? o.images : [];
  const images = imagesRaw
    .map((row, index) => {
      if (typeof row === 'string') {
        return { id: `${id}-img-${index}`, imageUrl: row };
      }
      if (typeof row !== 'object' || row === null) {
        return undefined;
      }
      const img = row as JsonRecord;
      const imageUrl = pickString(img.imageUrl ?? img.image_url ?? img.url);
      const imageId = pickString(img.id) ?? `${id}-img-${index}`;
      if (!imageUrl) {
        return undefined;
      }
      return { id: imageId, imageUrl };
    })
    .filter((x): x is AdminProduct['images'][number] => x !== undefined);

  const variationsRaw = Array.isArray(o.variations) ? o.variations : [];
  const variations = variationsRaw
    .map((row, index) => {
      if (typeof row !== 'object' || row === null) {
        return undefined;
      }
      const v = row as JsonRecord;
      const size = pickString(v.size ?? v.talle);
      const color = pickString(v.color ?? v.colour);
      const variationId = pickString(v.id) ?? `${id}-var-${index}`;
      if (!size || !color) {
        return undefined;
      }
      return {
        id: variationId,
        size,
        color,
        stock: Math.max(0, Math.floor(pickNumber(v.stock ?? v.quantity))),
      };
    })
    .filter((x): x is AdminProduct['variations'][number] => x !== undefined);

  const tagsRaw = Array.isArray(o.tags) ? o.tags : [];
  const tags = tagsRaw
    .map((row, index) => {
      if (typeof row === 'string') {
        return { id: `${id}-tag-${index}`, tagName: row };
      }
      if (typeof row !== 'object' || row === null) {
        return undefined;
      }
      const t = row as JsonRecord;
      const tagName = pickString(t.tagName ?? t.tag_name ?? t.name);
      const tagId = pickString(t.id) ?? `${id}-tag-${index}`;
      if (!tagName) {
        return undefined;
      }
      return { id: tagId, tagName };
    })
    .filter((x): x is AdminProduct['tags'][number] => x !== undefined);

  const historyRaw = Array.isArray(o.moderationHistory)
    ? o.moderationHistory
    : Array.isArray(o.moderation_history)
      ? o.moderation_history
      : [];
  const moderationHistory = historyRaw
    .map((row) => coerceModerationEntry(row))
    .filter((x): x is ModerationEntry => x !== undefined);

  return {
    id,
    name,
    description,
    basePrice,
    status,
    store: { id: storeId, businessName },
    category: { id: categoryId, name: categoryName },
    images,
    variations,
    tags,
    ratingAvg,
    ratingCount,
    createdAt,
    moderationHistory,
  };
}

function coercePageAdminProduct(payload: unknown, fallbackSize: number): Page<AdminProduct> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) => coerceAdminProduct(row))
    .filter((x): x is AdminProduct => x !== undefined);

  return {
    content,
    totalElements: Math.floor(pickNumber(root.totalElements ?? root.total_elements)),
    number: Math.floor(pickNumber(root.number)),
    size: Math.max(1, Math.floor(pickNumber(root.size) || fallbackSize)),
  };
}

/** Estado demo mutable (DEV). */
let devAdminProducts: AdminProduct[] = [
  {
    id: 'mod-p1',
    name: 'Remera Oversize Avellaneda',
    description:
      'Remera oversize en jersey suave de algodón. Corte holgado, ideal para temporada cálida. Modelo desarrollado junto al taller local.',
    basePrice: 14500,
    status: PRODUCT_STATUS.ACTIVE,
    store: { id: 'store-001', businessName: 'Outlet Avellaneda Norte' },
    category: { id: 'cat-ropa', name: 'Ropa' },
    images: [
      { id: 'mod-p1-img-1', imageUrl: 'https://picsum.photos/seed/modp1a/400/400' },
      { id: 'mod-p1-img-2', imageUrl: 'https://picsum.photos/seed/modp1b/400/400' },
      { id: 'mod-p1-img-3', imageUrl: 'https://picsum.photos/seed/modp1c/400/400' },
    ],
    variations: [
      { id: 'mod-p1-v1', size: 'S', color: 'Negro', stock: 15 },
      { id: 'mod-p1-v2', size: 'M', color: 'Negro', stock: 20 },
      { id: 'mod-p1-v3', size: 'L', color: 'Blanco', stock: 10 },
      { id: 'mod-p1-v4', size: 'XL', color: 'Blanco', stock: 0 },
    ],
    tags: [
      { id: 'mod-p1-t1', tagName: 'remeras' },
      { id: 'mod-p1-t2', tagName: 'oversize' },
    ],
    ratingAvg: 4.5,
    ratingCount: 12,
    createdAt: devIsoDaysAgo(45),
    moderationHistory: [],
  },
  {
    id: 'mod-p2',
    name: 'Buzo Frisa Premium',
    description:
      'Buzo de frisa pesada con capucha y bolsillo canguro. Ideal para invierno urbano. Hecho en Argentina.',
    basePrice: 32000,
    status: PRODUCT_STATUS.ACTIVE,
    store: { id: 'store-002', businessName: 'Moda Flores Local' },
    category: { id: 'cat-ropa', name: 'Ropa' },
    images: [{ id: 'mod-p2-img-1', imageUrl: 'https://picsum.photos/seed/modp2/400/400' }],
    variations: [{ id: 'mod-p2-v1', size: 'M', color: 'Gris', stock: 8 }],
    tags: [{ id: 'mod-p2-t1', tagName: 'buzos' }],
    ratingAvg: null,
    ratingCount: 0,
    createdAt: devIsoDaysAgo(30),
    moderationHistory: [],
  },
  {
    id: 'mod-p3',
    name: 'Jean Mom Rígido Local',
    description: 'Jean de tiro medio con lavado rígido. Confección local; stock limitado por talle.',
    basePrice: 28000,
    status: PRODUCT_STATUS.PAUSED_BY_SELLER,
    store: { id: 'store-001', businessName: 'Outlet Avellaneda Norte' },
    category: { id: 'cat-ropa', name: 'Ropa' },
    images: [{ id: 'mod-p3-img-1', imageUrl: 'https://picsum.photos/seed/modp3/400/400' }],
    variations: [{ id: 'mod-p3-v1', size: '38', color: 'Azul', stock: 12 }],
    tags: [{ id: 'mod-p3-t1', tagName: 'jean' }],
    ratingAvg: 3.8,
    ratingCount: 4,
    createdAt: devIsoDaysAgo(60),
    moderationHistory: [],
  },
  {
    id: 'mod-p4',
    name: 'Campera inflable (replica)',
    description:
      'Producto retirado por moderación: descripción engañosa sobre materiales y origen del producto.',
    basePrice: 45000,
    status: PRODUCT_STATUS.DISABLED_BY_ADMIN,
    store: { id: 'store-004', businessName: 'Nuevo Local Palermo' },
    category: { id: 'cat-ropa', name: 'Ropa' },
    images: [
      { id: 'mod-p4-img-1', imageUrl: 'https://picsum.photos/seed/modp4a/400/400' },
      { id: 'mod-p4-img-2', imageUrl: 'https://picsum.photos/seed/modp4b/400/400' },
    ],
    variations: [{ id: 'mod-p4-v1', size: 'Único', color: 'Negro', stock: 0 }],
    tags: [{ id: 'mod-p4-t1', tagName: 'moderación' }],
    ratingAvg: 2.1,
    ratingCount: 3,
    createdAt: devIsoDaysAgo(90),
    moderationHistory: [
      {
        id: 'mod-h1',
        action: MODERATION_ACTION.DISABLED,
        adminEmail: DEV_ADMIN_EMAIL,
        reason: 'Descripción engañosa sobre materiales y origen del producto.',
        createdAt: devIsoDaysAgo(12),
      },
    ],
  },
  {
    id: 'mod-p5',
    name: 'Zapatilla urbana multicolor',
    description:
      'Zapatilla liviana con suela de goma. Disponible en varios talles y combinaciones de color.',
    basePrice: 52000,
    status: PRODUCT_STATUS.ACTIVE,
    store: { id: 'store-004', businessName: 'Nuevo Local Palermo' },
    category: { id: 'cat-calzado', name: 'Calzado' },
    images: [
      { id: 'mod-p5-img-1', imageUrl: 'https://picsum.photos/seed/modp5a/400/400' },
      { id: 'mod-p5-img-2', imageUrl: 'https://picsum.photos/seed/modp5b/400/400' },
    ],
    variations: [
      { id: 'mod-p5-v1', size: '38', color: 'Blanco/Rojo', stock: 5 },
      { id: 'mod-p5-v2', size: '39', color: 'Blanco/Rojo', stock: 3 },
      { id: 'mod-p5-v3', size: '40', color: 'Negro', stock: 0 },
      { id: 'mod-p5-v4', size: '41', color: 'Negro', stock: 7 },
      { id: 'mod-p5-v5', size: '42', color: 'Azul', stock: 2 },
      { id: 'mod-p5-v6', size: '43', color: 'Azul', stock: 0 },
    ],
    tags: [
      { id: 'mod-p5-t1', tagName: 'zapatillas' },
      { id: 'mod-p5-t2', tagName: 'urbano' },
    ],
    ratingAvg: 4.2,
    ratingCount: 9,
    createdAt: devIsoDaysAgo(20),
    moderationHistory: [],
  },
  {
    id: 'mod-p6',
    name: 'Bolso tote lino reciclado',
    description: 'Bolso tote confeccionado con lino reciclado. Edición limitada del taller.',
    basePrice: 18500,
    status: PRODUCT_STATUS.ACTIVE,
    store: { id: 'store-002', businessName: 'Moda Flores Local' },
    category: { id: 'cat-accesorios', name: 'Accesorios' },
    images: [{ id: 'mod-p6-img-1', imageUrl: 'https://picsum.photos/seed/modp6/400/400' }],
    variations: [
      { id: 'mod-p6-v1', size: 'Único', color: 'Natural', stock: 6 },
      { id: 'mod-p6-v2', size: 'Único', color: 'Terracota', stock: 0 },
    ],
    tags: [{ id: 'mod-p6-t1', tagName: 'sustentable' }],
    ratingAvg: 5,
    ratingCount: 2,
    createdAt: devIsoDaysAgo(10),
    moderationHistory: [],
  },
];

function matchesSearch(product: AdminProduct, search?: string): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return product.name.toLowerCase().includes(q);
}

function matchesStatusFilter(product: AdminProduct, status?: ProductStatus): boolean {
  if (status === undefined) {
    return true;
  }
  return product.status === status;
}

function matchesStoreFilter(product: AdminProduct, storeId?: string): boolean {
  const id = storeId?.trim();
  if (!id) {
    return true;
  }
  return product.store.id === id;
}

function buildDevAdminProductsPage(params: FetchAdminProductsParams): Page<AdminProduct> {
  const size = Math.max(1, params.size);
  const pageZero = Math.max(0, params.page);
  const filtered = devAdminProducts
    .filter((row) => matchesSearch(row, params.search))
    .filter((row) => matchesStatusFilter(row, params.status))
    .filter((row) => matchesStoreFilter(row, params.storeId))
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

function findDevAdminProductOrThrow(id: string): AdminProduct {
  const row = devAdminProducts.find((p) => p.id === id);
  if (!row) {
    throw new ApiError(404, null, `No hay producto «${id}» en desarrollo.`);
  }
  return row;
}

function nextModerationEntryId(): string {
  return `mod-h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function fetchAdminProducts(
  params: FetchAdminProductsParams,
): Promise<Page<AdminProduct>> {
  const body: FetchAdminProductsParams = {
    ...params,
    page: Math.max(0, params.page),
    size: Math.max(1, params.size),
  };

  if (import.meta.env.DEV) {
    return devDelay(buildDevAdminProductsPage(body));
  }

  const sp = new URLSearchParams();
  sp.set('page', String(body.page));
  sp.set('size', String(body.size));
  const search = body.search?.trim();
  if (search) {
    sp.set('search', search);
  }
  if (body.status) {
    sp.set('status', body.status);
  }
  const storeId = body.storeId?.trim();
  if (storeId) {
    sp.set('storeId', storeId);
  }

  const raw = await apiClient.get<unknown>(`${ADMIN_PRODUCTS_API_PATH}?${sp.toString()}`);
  return coercePageAdminProduct(raw, body.size);
}

export async function fetchAdminProductDetail(id: string): Promise<AdminProduct> {
  const productId = id.trim();
  if (!productId) {
    throw new ApiError(400, null, 'ID de producto inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    return mockClone(findDevAdminProductOrThrow(productId));
  }

  const raw = await apiClient.get<unknown>(
    `${ADMIN_PRODUCTS_API_PATH}/${encodeURIComponent(productId)}`,
  );
  const product = coerceAdminProduct(raw);
  if (!product) {
    throw new ApiError(500, raw, 'El servidor no devolvió el producto.');
  }
  return product;
}

export async function disableProduct(
  id: string,
  data: DisableProductDTO,
): Promise<AdminProduct> {
  const productId = id.trim();
  if (!productId) {
    throw new ApiError(400, null, 'ID de producto inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 220);
    const current = findDevAdminProductOrThrow(productId);
    if (current.status !== PRODUCT_STATUS.ACTIVE) {
      throw new ApiError(409, null, 'Solo se pueden inhabilitar productos activos.');
    }
    const reason = data.reason.trim();
    if (reason.length < 10) {
      throw new ApiError(400, null, 'El motivo debe tener al menos 10 caracteres.');
    }
    const entry: ModerationEntry = {
      id: nextModerationEntryId(),
      action: MODERATION_ACTION.DISABLED,
      adminEmail: DEV_ADMIN_EMAIL,
      reason,
      createdAt: new Date().toISOString(),
    };
    const updated: AdminProduct = {
      ...current,
      status: PRODUCT_STATUS.DISABLED_BY_ADMIN,
      moderationHistory: [entry, ...current.moderationHistory],
    };
    devAdminProducts = devAdminProducts.map((row) => (row.id === productId ? updated : row));
    return mockClone(updated);
  }

  const raw = await apiClient.post<unknown>(
    `${ADMIN_PRODUCTS_API_PATH}/${encodeURIComponent(productId)}/disable`,
    data,
  );
  const product = coerceAdminProduct(raw);
  if (!product) {
    throw new ApiError(500, raw, 'El servidor no devolvió el producto actualizado.');
  }
  return product;
}

export async function reactivateProduct(id: string): Promise<AdminProduct> {
  const productId = id.trim();
  if (!productId) {
    throw new ApiError(400, null, 'ID de producto inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const current = findDevAdminProductOrThrow(productId);
    if (current.status !== PRODUCT_STATUS.DISABLED_BY_ADMIN) {
      throw new ApiError(409, null, 'Solo se pueden reactivar productos inhabilitados por admin.');
    }
    const entry: ModerationEntry = {
      id: nextModerationEntryId(),
      action: MODERATION_ACTION.REACTIVATED,
      adminEmail: DEV_ADMIN_EMAIL,
      reason: null,
      createdAt: new Date().toISOString(),
    };
    const updated: AdminProduct = {
      ...current,
      status: PRODUCT_STATUS.ACTIVE,
      moderationHistory: [entry, ...current.moderationHistory],
    };
    devAdminProducts = devAdminProducts.map((row) => (row.id === productId ? updated : row));
    return mockClone(updated);
  }

  const raw = await apiClient.post<unknown>(
    `${ADMIN_PRODUCTS_API_PATH}/${encodeURIComponent(productId)}/reactivate`,
    {},
  );
  const product = coerceAdminProduct(raw);
  if (!product) {
    throw new ApiError(500, raw, 'El servidor no devolvió el producto actualizado.');
  }
  return product;
}

export { ADMIN_PRODUCTS_PAGE_SIZE };
