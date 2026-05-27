import type { Page } from '../../types/api';
import type { OrderStatus, SellerOrderDetail, SellerOrderItem, SellerOrderSummary } from '../../types/order';
import { ORDER_STATUS, isOrderStatus } from '../../types/order';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import { SELLER_ORDERS_API_PATH, SELLER_ORDERS_PAGE_SIZE } from '../../lib/constants';

import { getNextSellerOrderStatus } from './orderStatusFlow';

type JsonRecord = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function pickFirstUrlFromImageArray(raw: unknown): string | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const first = raw[0];
  return typeof first === 'string' && first.length > 0 ? first : undefined;
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

function coerceOrderStatus(raw: unknown): OrderStatus {
  const s = typeof raw === 'string' ? raw : '';
  return isOrderStatus(s) ? s : ORDER_STATUS.PENDING;
}

function pickVariationBlock(o: JsonRecord): JsonRecord | undefined {
  const raw = o.variation ?? o.variant ?? o.productVariation;
  if (typeof raw === 'object' && raw !== null) {
    return raw as JsonRecord;
  }
  return undefined;
}

function coerceLineItem(o: JsonRecord): SellerOrderItem | undefined {
  const vb = pickVariationBlock(o);
  const productId = pickString(o.productId ?? o.product_id);
  const productName = pickString(o.productName ?? o.product_name ?? o.name ?? o.title);
  const quantity = Math.max(1, Math.floor(pickNumber(o.quantity ?? o.qty)));
  const unitPriceArs = pickNumber(
    o.unitPriceArs ?? o.unit_price_ars ?? o.unitPrice ?? o.price ?? o.amountAtUnit,
  );
  if (!productId || !productName) {
    return undefined;
  }

  const variationDescription =
    pickString(
      o.variationDescription ??
        o.variation_description ??
        o.variantSummary ??
        o.variant_label,
    ) ?? null;

  const size =
    pickString(
      o.size ??
        o.variantSize ??
        o.variant_size ??
        vb?.size ??
        vb?.variantSize ??
        vb?.talle,
    ) ?? null;

  const color =
    pickString(
      o.color ??
        o.variantColor ??
        o.variant_color ??
        vb?.color ??
        vb?.variantColor ??
        vb?.colour,
    ) ?? null;

  const thumbnailUrl =
    pickString(o.thumbnailUrl) ??
    pickString(o.thumbnail_url) ??
    pickString(o.imageUrl) ??
    pickString(o.image_url) ??
    pickFirstUrlFromImageArray(o.images) ??
    pickFirstUrlFromImageArray(o.imageUrls);

  return {
    productId,
    productName,
    quantity,
    unitPriceArs,
    thumbnailUrl: thumbnailUrl ?? null,
    size,
    color,
    variationDescription,
  };
}

export function coerceSellerOrderSummary(payload: JsonRecord): SellerOrderSummary {
  const id = pickString(payload.id ?? payload.uuid ?? payload.orderId) ?? '';
  const placedAt =
    pickString(payload.placedAt ?? payload.createdAt ?? payload.date ?? payload.ordered_at) ??
    new Date().toISOString();

  const buyerName =
    pickString(
      payload.buyerName ??
        payload.buyer_name ??
        (typeof payload.buyer === 'object' && payload.buyer !== null
          ? pickString((payload.buyer as JsonRecord).name ?? (payload.buyer as JsonRecord).fullName)
          : undefined),
    ) ?? 'Comprador';

  const buyerEmail =
    pickString(
      payload.buyerEmail ??
        payload.buyer_email ??
        payload.email ??
        (typeof payload.buyer === 'object' && payload.buyer !== null
          ? pickString((payload.buyer as JsonRecord).email)
          : undefined),
    ) ?? null;

  const totalArs = pickNumber(
    payload.totalArs ?? payload.total_ars ?? payload.total ?? payload.totalAmount ?? payload.amount,
  );

  const status = coerceOrderStatus(payload.status);

  return {
    id,
    placedAt,
    buyerName,
    buyerEmail,
    totalArs,
    status,
  };
}

function coerceSellerOrderDetailPayload(raw: unknown): SellerOrderDetail {
  const o = typeof raw === 'object' && raw !== null ? (raw as JsonRecord) : {};
  const summary = coerceSellerOrderSummary(o);

  const linesRaw = Array.isArray(o.items)
    ? o.items
    : Array.isArray(o.lines)
      ? o.lines
      : Array.isArray(o.orderItems)
        ? o.orderItems
        : [];

  const items: SellerOrderItem[] = [];
  for (const row of linesRaw) {
    if (typeof row === 'object' && row !== null) {
      const line = coerceLineItem(row as JsonRecord);
      if (line) {
        items.push(line);
      }
    }
  }

  return {
    ...summary,
    items,
  };
}

export function coercePageSellerOrderSummary(payload: unknown): Page<SellerOrderSummary> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) =>
      typeof row === 'object' && row !== null
        ? coerceSellerOrderSummary(row as JsonRecord)
        : undefined,
    )
    .filter((x): x is SellerOrderSummary => x !== undefined && x.id.length > 0);

  return {
    content,
    totalElements: pickNumber(root.totalElements ?? root.total_elements),
    number: pickNumber(root.number),
    size: pickNumber(root.size) || SELLER_ORDERS_PAGE_SIZE,
  };
}

/** Catálogo en memoria sólo desarrollo — avanzá estados desde el detalle. */
const DEV_ORDERS: Record<string, SellerOrderDetail> = {
  'ord-201': {
    id: 'ord-201',
    placedAt: '2026-05-26T10:30:00.000Z',
    buyerName: 'Mariana López',
    buyerEmail: 'mariana.lopez@ejemplo.ar',
    totalArs: 42800,
    status: ORDER_STATUS.PAID,
    items: [
      {
        productId: 'p1',
        productName: 'Remera Oversize Avellaneda',
        quantity: 2,
        unitPriceArs: 14500,
        thumbnailUrl: 'https://picsum.photos/seed/p1remera/96/96',
        size: 'L',
        color: 'Negro',
        variationDescription: null,
      },
      {
        productId: 'p2',
        productName: 'Jean Mom Rígido Local',
        quantity: 1,
        unitPriceArs: 13800,
        thumbnailUrl: 'https://picsum.photos/seed/p2jean/96/96',
        size: '38',
        color: 'Azul',
        variationDescription: null,
      },
    ],
  },
  'ord-202': {
    id: 'ord-202',
    placedAt: '2026-05-25T15:00:00.000Z',
    buyerName: 'Carlos Benítez',
    buyerEmail: 'cbenitez@ejemplo.ar',
    totalArs: 99000,
    status: ORDER_STATUS.PREPARING,
    items: [
      {
        productId: 'p3',
        productName: 'Campera ejemplo (bloqueada admin)',
        quantity: 1,
        unitPriceArs: 99000,
        thumbnailUrl: 'https://picsum.photos/seed/p3camp/96/96',
        size: 'Único',
        color: 'Oliva',
        variationDescription: null,
      },
    ],
  },
  'ord-203': {
    id: 'ord-203',
    placedAt: '2026-05-24T09:15:00.000Z',
    buyerName: 'Lucía Herrera',
    buyerEmail: 'luciah@ejemplo.ar',
    totalArs: 14500,
    status: ORDER_STATUS.READY_FOR_PICKUP,
    items: [
      {
        productId: 'p1',
        productName: 'Remera Oversize Avellaneda',
        quantity: 1,
        unitPriceArs: 14500,
        thumbnailUrl: 'https://picsum.photos/seed/p1remeraw/96/96',
        size: 'M',
        color: 'Blanco',
        variationDescription: null,
      },
    ],
  },
  'ord-199': {
    id: 'ord-199',
    placedAt: '2026-05-20T12:00:00.000Z',
    buyerName: 'Pedido cancelado (demo)',
    buyerEmail: null,
    totalArs: 2000,
    status: ORDER_STATUS.CANCELED,
    items: [
      {
        productId: 'demo',
        productName: 'Producto demo cancelado',
        quantity: 1,
        unitPriceArs: 2000,
        thumbnailUrl: null,
        size: null,
        color: null,
        variationDescription: 'Talle: S | Color: Mostaza (ej. sólo texto backend)',
      },
    ],
  },
};

function devDelay<T>(value: T, ms = 160): Promise<T> {
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

function devSummariesSortedDesc(): SellerOrderSummary[] {
  return Object.values(DEV_ORDERS)
    .map((d) => ({ ...d }))
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

function buildDevOrdersPage(pageZero: number, size: number): Page<SellerOrderSummary> {
  const rows = devSummariesSortedDesc();
  const start = pageZero * size;
  const slice = rows.slice(start, start + size);
  return coercePageSellerOrderSummary({
    content: slice,
    totalElements: rows.length,
    number: pageZero,
    size,
  });
}

export type FetchSellerOrdersParams = {
  page: number;
  size: number;
};

export async function fetchSellerOrders(params: FetchSellerOrdersParams): Promise<Page<SellerOrderSummary>> {
  const sp = new URLSearchParams();
  sp.set('page', String(Math.max(0, params.page)));
  sp.set('size', String(Math.max(1, params.size)));
  const raw = await apiClient.get<unknown>(`${SELLER_ORDERS_API_PATH}?${sp.toString()}`);
  return coercePageSellerOrderSummary(raw);
}

export async function fetchSellerOrderDetail(orderId: string): Promise<SellerOrderDetail> {
  const id = orderId.trim();
  if (!id) {
    throw new ApiError(400, null, 'ID de pedido inválido.');
  }

  if (import.meta.env.DEV) {
    const row = DEV_ORDERS[id];
    if (!row) {
      await devDelay(undefined, 120);
      throw new ApiError(404, null, `No hay pedido «${id}» en desarrollo.`);
    }
    return devDelay(mockClone(row));
  }

  const raw = await apiClient.get<unknown>(`${SELLER_ORDERS_API_PATH}/${encodeURIComponent(id)}`);
  return coerceSellerOrderDetailPayload(raw);
}

/**
 * Avanza un paso en el flujo seller: PAID → PREPARING → READY_FOR_PICKUP.
 * Backend esperado: `POST /api/seller/orders/{id}/advance` devolviendo el pedido actualizado.
 */
export async function advanceSellerOrder(orderId: string): Promise<SellerOrderDetail> {
  const id = orderId.trim();
  if (!id) {
    throw new ApiError(400, null, 'ID de pedido inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 200);
    const current = DEV_ORDERS[id];
    if (!current) {
      throw new ApiError(404, null, `No hay pedido «${id}» en desarrollo.`);
    }
    const next = getNextSellerOrderStatus(current.status);
    if (!next) {
      throw new ApiError(400, null, 'Este pedido no admite avanzar estado desde el panel.');
    }
    const updated: SellerOrderDetail = { ...current, status: next };
    DEV_ORDERS[id] = updated;
    return mockClone(updated);
  }

  const raw = await apiClient.post<unknown>(`${SELLER_ORDERS_API_PATH}/${encodeURIComponent(id)}/advance`);
  return coerceSellerOrderDetailPayload(raw);
}

/** Usado por el hook de listado en modo DEV. */
export function buildDevSellerOrdersPageForHook(pageZero: number, size: number): Page<SellerOrderSummary> {
  return buildDevOrdersPage(pageZero, size);
}
