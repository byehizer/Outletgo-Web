import type { Page } from '../../types/api';
import type {
  OrderStatus,
  SellerOrderItem,
  SellerOrderStockIssue,
  SellerOrderStore,
} from '../../types/order';
import { ORDER_STATUS, isOrderStatus } from '../../types/order';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import { SELLER_ORDERS_API_PATH, SELLER_ORDERS_PAGE_SIZE } from '../../lib/constants';

import { getNextSellerOrderStatus } from './orderStatusFlow';

type JsonRecord = Record<string, unknown>;

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
  const id =
    pickString(o.id ?? o.lineId ?? o.line_id ?? o.orderItemId ?? o.order_item_id) ??
    pickString(o.productId ?? o.product_id);
  const productName = pickString(o.productName ?? o.product_name ?? o.name ?? o.title);
  const quantity = Math.max(1, Math.floor(pickNumber(o.quantity ?? o.qty)));
  const unitPrice = pickNumber(
    o.unitPrice ??
      o.unit_price ??
      o.unitPriceArs ??
      o.unit_price_ars ??
      o.price ??
      o.amountAtUnit,
  );
  if (!id || !productName) {
    return undefined;
  }

  const size =
    pickNullableString(
      o.size ??
        o.variantSize ??
        o.variant_size ??
        vb?.size ??
        vb?.variantSize ??
        vb?.talle,
    ) ?? null;

  const color =
    pickNullableString(
      o.color ??
        o.variantColor ??
        o.variant_color ??
        vb?.color ??
        vb?.variantColor ??
        vb?.colour,
    ) ?? null;

  return {
    id,
    productName,
    size,
    color,
    quantity,
    unitPrice,
  };
}

function coerceBuyer(o: JsonRecord): SellerOrderStore['buyer'] {
  const buyerRaw =
    typeof o.buyer === 'object' && o.buyer !== null ? (o.buyer as JsonRecord) : o;

  const displayName =
    pickNullableString(
      buyerRaw.displayName ??
        buyerRaw.display_name ??
        buyerRaw.name ??
        buyerRaw.fullName ??
        buyerRaw.full_name ??
        o.buyerName ??
        o.buyer_name,
    ) ?? null;

  const email =
    pickString(
      buyerRaw.email ??
        o.buyerEmail ??
        o.buyer_email ??
        o.email,
    ) ?? '';

  return { displayName, email };
}

function coerceStockIssue(o: JsonRecord): SellerOrderStockIssue | undefined {
  const itemId = pickString(o.itemId ?? o.item_id ?? o.lineId ?? o.line_id);
  const productName = pickString(o.productName ?? o.product_name ?? o.name);
  const size = pickString(o.size ?? o.talle) ?? '—';
  const color = pickString(o.color ?? o.colour) ?? '—';
  const requestedQuantity = Math.max(
    0,
    Math.floor(pickNumber(o.requestedQuantity ?? o.requested_quantity ?? o.quantity)),
  );
  const availableQuantity = Math.max(
    0,
    Math.floor(pickNumber(o.availableQuantity ?? o.available_quantity ?? o.available)),
  );
  if (!itemId || !productName) {
    return undefined;
  }
  return { itemId, productName, size, color, requestedQuantity, availableQuantity };
}

function coerceStockIssues(payload: JsonRecord): SellerOrderStockIssue[] | undefined {
  const raw = payload.stockIssues ?? payload.stock_issues;
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const issues: SellerOrderStockIssue[] = [];
  for (const row of raw) {
    if (typeof row === 'object' && row !== null) {
      const issue = coerceStockIssue(row as JsonRecord);
      if (issue) {
        issues.push(issue);
      }
    }
  }
  return issues.length > 0 ? issues : undefined;
}

export function coerceSellerOrderStore(payload: JsonRecord): SellerOrderStore | undefined {
  const id = pickString(payload.id ?? payload.sliceId ?? payload.slice_id);
  const orderId =
    pickString(payload.orderId ?? payload.order_id ?? payload.parentOrderId) ?? id ?? '';
  const orderDate =
    pickString(
      payload.orderDate ??
        payload.order_date ??
        payload.placedAt ??
        payload.placed_at ??
        payload.createdAt ??
        payload.created_at,
    ) ?? new Date().toISOString();
  const shippingAddress =
    pickString(
      payload.shippingAddress ??
        payload.shipping_address ??
        payload.deliveryAddress ??
        payload.delivery_address,
    ) ?? '';
  const subtotalArs = pickNumber(
    payload.subtotalArs ??
      payload.subtotal_ars ??
      payload.subtotal ??
      payload.totalArs ??
      payload.total_ars ??
      payload.totalAmount ??
      payload.total_amount ??
      payload.total,
  );
  const status = coerceOrderStatus(payload.status);

  if (!id || !orderId) {
    return undefined;
  }

  const linesRaw = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.lines)
      ? payload.lines
      : Array.isArray(payload.orderItems)
        ? payload.orderItems
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
    id,
    orderId,
    status,
    subtotalArs,
    shippingAddress,
    orderDate,
    buyer: coerceBuyer(payload),
    items,
    stockIssues: coerceStockIssues(payload),
  };
}

export function coercePageSellerOrderStore(payload: unknown): Page<SellerOrderStore> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) =>
      typeof row === 'object' && row !== null
        ? coerceSellerOrderStore(row as JsonRecord)
        : undefined,
    )
    .filter((x): x is SellerOrderStore => x !== undefined);

  return {
    content,
    totalElements: pickNumber(root.totalElements ?? root.total_elements),
    number: pickNumber(root.number),
    size: pickNumber(root.size) || SELLER_ORDERS_PAGE_SIZE,
  };
}

const DEV_SHIPPING_ADDRESS = 'Retiro OutletGo — Av. Mitre 1234, Avellaneda';

/**
 * Slice de otra tienda en una orden multitienda (ord-300).
 * No se expone al seller autenticado — documenta el modelo cross-store.
 */
export const DEV_OTHER_STORE_ORDER_SLICE: SellerOrderStore = {
  id: 'oss-300b',
  orderId: 'ord-300',
  status: ORDER_STATUS.PREPARING,
  subtotalArs: 52_000,
  shippingAddress: 'Retiro OutletGo — Av. Rivadavia 4500, CABA',
  orderDate: '2026-05-27T11:00:00.000Z',
  buyer: {
    displayName: 'Sofía Gómez',
    email: 'sofia.gomez@ejemplo.ar',
  },
  items: [
    {
      id: 'line-300b-1',
      productName: 'Zapatilla urbana multicolor',
      quantity: 1,
      unitPrice: 52_000,
      size: '42',
      color: 'Multicolor',
    },
  ],
};

/** Slices visibles para el seller demo (store-001). */
const DEV_ORDERS: Record<string, SellerOrderStore> = {
  'oss-201': {
    id: 'oss-201',
    orderId: 'ord-201',
    status: ORDER_STATUS.PAID,
    subtotalArs: 42_800,
    shippingAddress: DEV_SHIPPING_ADDRESS,
    orderDate: '2026-05-26T10:30:00.000Z',
    buyer: {
      displayName: 'Mariana López',
      email: 'mariana.lopez@ejemplo.ar',
    },
    items: [
      {
        id: 'line-201-1',
        productName: 'Remera Oversize Avellaneda',
        quantity: 2,
        unitPrice: 14_500,
        size: 'L',
        color: 'Negro',
      },
      {
        id: 'line-201-2',
        productName: 'Jean Mom Rígido Local',
        quantity: 1,
        unitPrice: 13_800,
        size: '38',
        color: 'Azul',
      },
    ],
  },
  'oss-202': {
    id: 'oss-202',
    orderId: 'ord-202',
    status: ORDER_STATUS.PREPARING,
    subtotalArs: 99_000,
    shippingAddress: DEV_SHIPPING_ADDRESS,
    orderDate: '2026-05-25T15:00:00.000Z',
    buyer: {
      displayName: 'Carlos Benítez',
      email: 'cbenitez@ejemplo.ar',
    },
    items: [
      {
        id: 'line-202-1',
        productName: 'Campera ejemplo (bloqueada admin)',
        quantity: 1,
        unitPrice: 99_000,
        size: 'Único',
        color: 'Oliva',
      },
    ],
  },
  'oss-203': {
    id: 'oss-203',
    orderId: 'ord-203',
    status: ORDER_STATUS.READY_FOR_PICKUP,
    subtotalArs: 14_500,
    shippingAddress: DEV_SHIPPING_ADDRESS,
    orderDate: '2026-05-24T09:15:00.000Z',
    buyer: {
      displayName: 'Lucía Herrera',
      email: 'luciah@ejemplo.ar',
    },
    items: [
      {
        id: 'line-203-1',
        productName: 'Remera Oversize Avellaneda',
        quantity: 1,
        unitPrice: 14_500,
        size: 'M',
        color: 'Blanco',
      },
    ],
  },
  'oss-199': {
    id: 'oss-199',
    orderId: 'ord-199',
    status: ORDER_STATUS.CANCELED,
    subtotalArs: 2_000,
    shippingAddress: DEV_SHIPPING_ADDRESS,
    orderDate: '2026-05-20T12:00:00.000Z',
    buyer: {
      displayName: 'Pedido cancelado (demo)',
      email: 'inactivo.demo@ejemplo.ar',
    },
    items: [
      {
        id: 'line-199-1',
        productName: 'Producto demo cancelado',
        quantity: 1,
        unitPrice: 2_000,
        size: 'S',
        color: 'Mostaza',
      },
    ],
  },
  'oss-300a': {
    id: 'oss-300a',
    orderId: 'ord-300',
    status: ORDER_STATUS.PAID,
    subtotalArs: 29_000,
    shippingAddress: DEV_SHIPPING_ADDRESS,
    orderDate: '2026-05-27T11:00:00.000Z',
    buyer: {
      displayName: 'Sofía Gómez',
      email: 'sofia.gomez@ejemplo.ar',
    },
    items: [
      {
        id: 'line-300a-1',
        productName: 'Remera Oversize Avellaneda',
        quantity: 2,
        unitPrice: 14_500,
        size: 'M',
        color: 'Negro',
      },
    ],
  },
  'oss-stock-juan': {
    id: 'oss-stock-juan',
    orderId: 'ord-stock-juan',
    status: ORDER_STATUS.STOCK_ISSUE,
    subtotalArs: 58_000,
    shippingAddress: DEV_SHIPPING_ADDRESS,
    orderDate: '2026-05-26T08:00:00.000Z',
    buyer: {
      displayName: 'Juan Pérez',
      email: 'juan.perez@ejemplo.ar',
    },
    items: [
      {
        id: 'line-stock-1',
        productName: 'Jean Mom Rígido Local',
        quantity: 2,
        unitPrice: 13_800,
        size: '38',
        color: 'Azul',
      },
      {
        id: 'line-stock-2',
        productName: 'Remera Oversize Avellaneda',
        quantity: 2,
        unitPrice: 14_500,
        size: 'L',
        color: 'Negro',
      },
    ],
    stockIssues: [
      {
        itemId: 'line-stock-1',
        productName: 'Jean Mom Rígido Local',
        size: '38',
        color: 'Azul',
        requestedQuantity: 2,
        availableQuantity: 0,
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

function devSlicesSortedDesc(): SellerOrderStore[] {
  return Object.values(DEV_ORDERS)
    .map((d) => mockClone(d))
    .sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate));
}

function buildDevOrdersPage(pageZero: number, size: number): Page<SellerOrderStore> {
  const rows = devSlicesSortedDesc();
  const start = pageZero * size;
  const slice = rows.slice(start, start + size);
  return coercePageSellerOrderStore({
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

export async function fetchSellerOrders(
  params: FetchSellerOrdersParams,
): Promise<Page<SellerOrderStore>> {
  const sp = new URLSearchParams();
  sp.set('page', String(Math.max(0, params.page)));
  sp.set('size', String(Math.max(1, params.size)));
  const raw = await apiClient.get<unknown>(`${SELLER_ORDERS_API_PATH}?${sp.toString()}`);
  return coercePageSellerOrderStore(raw);
}

export async function fetchSellerOrderDetail(sliceId: string): Promise<SellerOrderStore> {
  const id = sliceId.trim();
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
  const store =
    typeof raw === 'object' && raw !== null
      ? coerceSellerOrderStore(raw as JsonRecord)
      : undefined;
  if (!store) {
    throw new ApiError(502, null, 'Respuesta de pedido inválida.');
  }
  return store;
}

/**
 * Avanza un paso en el flujo seller: PAID → PREPARING → READY_FOR_PICKUP.
 * Backend esperado: `POST /api/seller/orders/{sliceId}/advance`.
 */
export async function advanceSellerOrder(sliceId: string): Promise<SellerOrderStore> {
  const id = sliceId.trim();
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
    const updated: SellerOrderStore = { ...current, status: next };
    DEV_ORDERS[id] = updated;
    return mockClone(updated);
  }

  const raw = await apiClient.post<unknown>(
    `${SELLER_ORDERS_API_PATH}/${encodeURIComponent(id)}/advance`,
  );
  const store =
    typeof raw === 'object' && raw !== null
      ? coerceSellerOrderStore(raw as JsonRecord)
      : undefined;
  if (!store) {
    throw new ApiError(502, null, 'Respuesta de pedido inválida.');
  }
  return store;
}

function devGetSliceOrThrow(id: string): SellerOrderStore {
  const current = DEV_ORDERS[id];
  if (!current) {
    throw new ApiError(404, null, `No hay pedido «${id}» en desarrollo.`);
  }
  return current;
}

function devPersistSlice(updated: SellerOrderStore): SellerOrderStore {
  DEV_ORDERS[updated.id] = updated;
  return mockClone(updated);
}

function stockIssueLabel(value: string | null): string {
  const t = value?.trim();
  return t && t.length > 0 ? t : '—';
}

/**
 * Reporta falta de stock en un ítem del slice.
 * Backend esperado: `POST /api/seller/orders/{sliceId}/items/{itemId}/stock-issue`.
 */
export async function reportItemStockIssue(
  sliceId: string,
  itemId: string,
  availableQuantity: number,
): Promise<SellerOrderStore> {
  const id = sliceId.trim();
  const lineId = itemId.trim();
  if (!id || !lineId) {
    throw new ApiError(400, null, 'Pedido o ítem inválido.');
  }
  const qty = Math.floor(availableQuantity);
  if (!Number.isFinite(qty) || qty < 0) {
    throw new ApiError(400, null, 'Cantidad disponible inválida.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 220);
    const current = devGetSliceOrThrow(id);
    const line = current.items.find((row) => row.id === lineId);
    if (!line) {
      throw new ApiError(404, null, 'Ítem no encontrado en este pedido.');
    }
    if (qty >= line.quantity) {
      throw new ApiError(
        400,
        null,
        'La cantidad disponible debe ser menor a la pedida.',
      );
    }
    const issue: SellerOrderStockIssue = {
      itemId: line.id,
      productName: line.productName,
      size: stockIssueLabel(line.size),
      color: stockIssueLabel(line.color),
      requestedQuantity: line.quantity,
      availableQuantity: qty,
    };
    const stockIssues = [...(current.stockIssues ?? []).filter((s) => s.itemId !== lineId), issue];
    return devPersistSlice({
      ...current,
      status: ORDER_STATUS.STOCK_ISSUE,
      stockIssues,
    });
  }

  const raw = await apiClient.post<unknown>(
    `${SELLER_ORDERS_API_PATH}/${encodeURIComponent(id)}/items/${encodeURIComponent(lineId)}/stock-issue`,
    { availableQuantity: qty },
  );
  const store =
    typeof raw === 'object' && raw !== null
      ? coerceSellerOrderStore(raw as JsonRecord)
      : undefined;
  if (!store) {
    throw new ApiError(502, null, 'Respuesta de pedido inválida.');
  }
  return store;
}

/**
 * Cancela un ítem del slice (reembolso parcial / quita la línea).
 * Backend esperado: `POST /api/seller/orders/{sliceId}/items/{itemId}/cancel`.
 */
export async function cancelOrderItemSlice(
  sliceId: string,
  itemId: string,
): Promise<SellerOrderStore> {
  const id = sliceId.trim();
  const lineId = itemId.trim();
  if (!id || !lineId) {
    throw new ApiError(400, null, 'Pedido o ítem inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 220);
    const current = devGetSliceOrThrow(id);
    const lineIndex = current.items.findIndex((row) => row.id === lineId);
    if (lineIndex < 0) {
      throw new ApiError(404, null, 'Ítem no encontrado en este pedido.');
    }
    const line = current.items[lineIndex];
    if (!line) {
      throw new ApiError(404, null, 'Ítem no encontrado en este pedido.');
    }
    const items = current.items.filter((row) => row.id !== lineId);
    const stockIssues = current.stockIssues?.filter((s) => s.itemId !== lineId);
    const subtotalArs = Math.max(0, current.subtotalArs - line.quantity * line.unitPrice);

    let status = current.status;
    if (items.length === 0) {
      status = ORDER_STATUS.CANCELED;
    } else if (
      status === ORDER_STATUS.STOCK_ISSUE &&
      (stockIssues === undefined || stockIssues.length === 0)
    ) {
      status = ORDER_STATUS.PREPARING;
    }

    return devPersistSlice({
      ...current,
      items,
      subtotalArs,
      status,
      stockIssues: stockIssues && stockIssues.length > 0 ? stockIssues : undefined,
    });
  }

  const raw = await apiClient.post<unknown>(
    `${SELLER_ORDERS_API_PATH}/${encodeURIComponent(id)}/items/${encodeURIComponent(lineId)}/cancel`,
  );
  const store =
    typeof raw === 'object' && raw !== null
      ? coerceSellerOrderStore(raw as JsonRecord)
      : undefined;
  if (!store) {
    throw new ApiError(502, null, 'Respuesta de pedido inválida.');
  }
  return store;
}

/** Usado por el hook de listado en modo DEV. */
export function buildDevSellerOrdersPageForHook(
  pageZero: number,
  size: number,
): Page<SellerOrderStore> {
  return buildDevOrdersPage(pageZero, size);
}
