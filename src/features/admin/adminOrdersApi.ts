import type { Page } from '../../types/api';
import type {
  AdminOrder,
  AdminOrderStore,
  ForceOrderStatusDTO,
  RefundResult,
  RefundSliceDTO,
  OrderStoreStatus,
} from '../../types/order';
import { ORDER_STATUS, isOrderStatus, ORDER_STORE_STATUS, isOrderStoreStatus } from '../../types/order';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import { ADMIN_ORDERS_API_PATH, ADMIN_ORDERS_PAGE_SIZE } from '../../lib/constants';

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

function coerceLineItem(o: JsonRecord) {
  const id = pickString(o.id ?? o.lineId);
  const productName = pickString(o.productName ?? o.product_name ?? o.name);
  if (!id || !productName) {
    return undefined;
  }
  return {
    id,
    productName,
    size: typeof o.size === 'string' ? o.size : null,
    color: typeof o.color === 'string' ? o.color : null,
    quantity: Math.max(1, Math.floor(pickNumber(o.quantity))),
    unitPrice: pickNumber(o.unitPrice ?? o.unit_price ?? o.price),
  };
}

function coerceOrderStoreStatus(raw: unknown): OrderStoreStatus {
  const s = typeof raw === 'string' ? raw : '';
  return isOrderStoreStatus(s) ? s : ORDER_STORE_STATUS.PENDING;
}

function coerceAdminOrderStore(o: JsonRecord): AdminOrderStore | undefined {
  const id = pickString(o.id ?? o.sliceId);
  const storeId = pickString(o.storeId ?? o.store_id);
  const businessName = pickString(o.businessName ?? o.business_name);
  const statusRaw = pickString(o.status ?? o.storeStatus ?? o.store_status);
  const status = coerceOrderStoreStatus(statusRaw);
  if (!id || !storeId || !businessName) {
    return undefined;
  }
  const itemsRaw = Array.isArray(o.items) ? o.items : [];
  const items = itemsRaw
    .map((row) => (typeof row === 'object' && row !== null ? coerceLineItem(row as JsonRecord) : undefined))
    .filter((x): x is NonNullable<typeof x> => x !== undefined);

  const refundRaw =
    typeof o.refund === 'object' && o.refund !== null ? (o.refund as JsonRecord) : undefined;
  const mpRefundId = refundRaw ? pickString(refundRaw.mpRefundId ?? refundRaw.mp_refund_id) : undefined;
  const refundedAmount = refundRaw ? pickNumber(refundRaw.refundedAmount ?? refundRaw.refunded_amount) : 0;

  return {
    id,
    storeId,
    businessName,
    status,
    subtotalArs: pickNumber(o.subtotalArs ?? o.subtotal_ars ?? o.subtotal),
    items,
    refund: mpRefundId ? { mpRefundId, refundedAmount } : undefined,
  };
}

function coerceAdminOrder(payload: JsonRecord): AdminOrder | undefined {
  const id = pickString(payload.id ?? payload.orderId);
  const orderDate = pickString(payload.orderDate ?? payload.order_date ?? payload.createdAt) ?? '';
  const totalArs = pickNumber(payload.totalArs ?? payload.total_ars ?? payload.total);
  const mpPreferenceId = pickString(payload.mpPreferenceId ?? payload.mp_preference_id) ?? '';
  const buyerRaw =
    typeof payload.buyer === 'object' && payload.buyer !== null
      ? (payload.buyer as JsonRecord)
      : {};
  const buyerId = pickString(buyerRaw.id) ?? '';
  const buyerEmail = pickString(buyerRaw.email) ?? '';
  const buyerDisplayName =
    typeof buyerRaw.displayName === 'string'
      ? buyerRaw.displayName
      : typeof buyerRaw.display_name === 'string'
        ? buyerRaw.display_name
        : null;

  const storesRaw = Array.isArray(payload.stores) ? payload.stores : [];
  const stores = storesRaw
    .map((row) =>
      typeof row === 'object' && row !== null ? coerceAdminOrderStore(row as JsonRecord) : undefined,
    )
    .filter((x): x is AdminOrderStore => x !== undefined);

  const statusRaw = pickString(payload.status);
  const status = statusRaw && isOrderStatus(statusRaw) ? statusRaw : ORDER_STATUS.PENDING;

  if (!id || !buyerId) {
    return undefined;
  }

  return {
    id,
    status,
    orderDate,
    totalArs,
    mpPreferenceId,
    buyer: { id: buyerId, displayName: buyerDisplayName, email: buyerEmail },
    stores,
  };
}

function coercePageAdminOrders(payload: unknown): Page<AdminOrder> {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const contentRaw = Array.isArray(root.content) ? root.content : [];
  const content = contentRaw
    .map((row) =>
      typeof row === 'object' && row !== null ? coerceAdminOrder(row as JsonRecord) : undefined,
    )
    .filter((x): x is AdminOrder => x !== undefined);

  return {
    content,
    totalElements: pickNumber(root.totalElements ?? root.total_elements),
    number: pickNumber(root.number),
    size: pickNumber(root.size) || ADMIN_ORDERS_PAGE_SIZE,
  };
}

/** Orden 1: dos tiendas, ambas PREPARING. */
const DEV_ORDER_1: AdminOrder = {
  id: 'ord-admin-001',
  status: ORDER_STATUS.PREPARING,
  orderDate: '2026-05-27T14:30:00.000Z',
  totalArs: 71_300,
  mpPreferenceId: 'MP-PREF-001-7788',
  buyer: {
    id: 'buyer-101',
    displayName: 'Mariana López',
    email: 'mariana.lopez@ejemplo.ar',
  },
  stores: [
    {
      id: 'aos-001a',
      storeId: 'store-001',
      businessName: 'Outlet Avellaneda Norte',
      status: ORDER_STORE_STATUS.PREPARING,
      subtotalArs: 42_800,
      items: [
        {
          id: 'line-a1',
          productName: 'Remera Oversize Avellaneda',
          size: 'L',
          color: 'Negro',
          quantity: 2,
          unitPrice: 14_500,
        },
        {
          id: 'line-a2',
          productName: 'Jean Mom Rígido Local',
          size: '38',
          color: 'Azul',
          quantity: 1,
          unitPrice: 13_800,
        },
      ],
    },
    {
      id: 'aos-001b',
      storeId: 'store-002',
      businessName: 'Moda Flores Local',
      status: ORDER_STORE_STATUS.PREPARING,
      subtotalArs: 28_500,
      items: [
        {
          id: 'line-b1',
          productName: 'Vestido midi estampado',
          size: 'M',
          color: 'Floral',
          quantity: 1,
          unitPrice: 28_500,
        },
      ],
    },
  ],
};

/** Orden 2: DELIVERED + STOCK_ISSUE. */
const DEV_ORDER_2: AdminOrder = {
  id: 'ord-admin-002',
  status: ORDER_STATUS.STOCK_ISSUE,
  orderDate: '2026-05-26T10:00:00.000Z',
  totalArs: 86_300,
  mpPreferenceId: 'MP-PREF-002-9912',
  buyer: {
    id: 'buyer-102',
    displayName: 'Carlos Benítez',
    email: 'cbenitez@ejemplo.ar',
  },
  stores: [
    {
      id: 'aos-002a',
      storeId: 'store-001',
      businessName: 'Outlet Avellaneda Norte',
      status: ORDER_STORE_STATUS.READY_FOR_PICKUP,
      subtotalArs: 14_500,
      items: [
        {
          id: 'line-c1',
          productName: 'Remera Oversize Avellaneda',
          size: 'M',
          color: 'Blanco',
          quantity: 1,
          unitPrice: 14_500,
        },
      ],
    },
    {
      id: 'aos-002b',
      storeId: 'store-005',
      businessName: 'Jean & Remera Outlet',
      status: ORDER_STORE_STATUS.STOCK_ISSUE,
      subtotalArs: 71_800,
      items: [
        {
          id: 'line-c2',
          productName: 'Campera ejemplo',
          size: 'Único',
          color: 'Oliva',
          quantity: 1,
          unitPrice: 71_800,
        },
      ],
      stockIssues: [
        {
          itemId: 'line-c2',
          productName: 'Campera ejemplo',
          size: 'Único',
          color: 'Oliva',
          requestedQuantity: 1,
          availableQuantity: 0,
        },
      ],
    },
  ],
};

/** Orden 3: una tienda CANCELED con reembolso procesado. */
const DEV_ORDER_3: AdminOrder = {
  id: 'ord-admin-003',
  status: ORDER_STATUS.CANCELED,
  orderDate: '2026-05-20T16:45:00.000Z',
  totalArs: 99_000,
  mpPreferenceId: 'MP-PREF-003-4455',
  buyer: {
    id: 'buyer-103',
    displayName: 'Lucía Herrera',
    email: 'luciah@ejemplo.ar',
  },
  stores: [
    {
      id: 'aos-003a',
      storeId: 'store-002',
      businessName: 'Moda Flores Local',
      status: ORDER_STORE_STATUS.CANCELED,
      subtotalArs: 99_000,
      items: [
        {
          id: 'line-d1',
          productName: 'Abrigo largo premium',
          size: 'L',
          color: 'Gris',
          quantity: 1,
          unitPrice: 99_000,
        },
      ],
      refund: {
        mpRefundId: 'MP-REF-88321',
        refundedAmount: 99_000,
      },
    },
  ],
};

/** Orden 4: tres tiendas, todas PENDING. */
const DEV_ORDER_4: AdminOrder = {
  id: 'ord-admin-004',
  status: ORDER_STATUS.PENDING,
  orderDate: '2026-05-28T09:00:00.000Z',
  totalArs: 156_400,
  mpPreferenceId: 'MP-PREF-004-1122',
  buyer: {
    id: 'buyer-104',
    displayName: 'Sofía Gómez',
    email: 'sofia.gomez@ejemplo.ar',
  },
  stores: [
    {
      id: 'aos-004a',
      storeId: 'store-001',
      businessName: 'Outlet Avellaneda Norte',
      status: ORDER_STORE_STATUS.PENDING,
      subtotalArs: 29_000,
      items: [
        {
          id: 'line-e1',
          productName: 'Remera Oversize Avellaneda',
          size: 'M',
          color: 'Negro',
          quantity: 2,
          unitPrice: 14_500,
        },
      ],
    },
    {
      id: 'aos-004b',
      storeId: 'store-004',
      businessName: 'Nuevo Local Palermo',
      status: ORDER_STORE_STATUS.PENDING,
      subtotalArs: 52_000,
      items: [
        {
          id: 'line-e2',
          productName: 'Zapatilla urbana multicolor',
          size: '42',
          color: 'Multicolor',
          quantity: 1,
          unitPrice: 52_000,
        },
      ],
    },
    {
      id: 'aos-004c',
      storeId: 'store-005',
      businessName: 'Jean & Remera Outlet',
      status: ORDER_STORE_STATUS.PENDING,
      subtotalArs: 75_400,
      items: [
        {
          id: 'line-e3',
          productName: 'Jean wide leg',
          size: '40',
          color: 'Negro',
          quantity: 2,
          unitPrice: 37_700,
        },
      ],
    },
  ],
};

/** Orden 5: una tienda READY_FOR_PICKUP. */
const DEV_ORDER_5: AdminOrder = {
  id: 'ord-admin-005',
  status: ORDER_STATUS.READY_FOR_PICKUP,
  orderDate: '2026-05-24T11:15:00.000Z',
  totalArs: 13_800,
  mpPreferenceId: 'MP-PREF-005-6677',
  buyer: {
    id: 'buyer-105',
    displayName: 'Juan Pérez',
    email: 'juan.perez@ejemplo.ar',
  },
  stores: [
    {
      id: 'aos-005a',
      storeId: 'store-001',
      businessName: 'Outlet Avellaneda Norte',
      status: ORDER_STORE_STATUS.READY_FOR_PICKUP,
      subtotalArs: 13_800,
      items: [
        {
          id: 'line-f1',
          productName: 'Jean Mom Rígido Local',
          size: '36',
          color: 'Azul',
          quantity: 1,
          unitPrice: 13_800,
        },
      ],
    },
  ],
};

/** Orden 6: DELIVERED + CANCELED (sin reembolso aún). */
const DEV_ORDER_6: AdminOrder = {
  id: 'ord-admin-006',
  status: ORDER_STATUS.DELIVERED,
  orderDate: '2026-05-22T18:20:00.000Z',
  totalArs: 57_300,
  mpPreferenceId: 'MP-PREF-006-3344',
  buyer: {
    id: 'buyer-106',
    displayName: 'Ana Rodríguez',
    email: 'ana.rodriguez@ejemplo.ar',
  },
  stores: [
    {
      id: 'aos-006a',
      storeId: 'store-004',
      businessName: 'Nuevo Local Palermo',
      status: ORDER_STORE_STATUS.COLLECTED_BY_OUTLETGO,
      subtotalArs: 28_500,
      items: [
        {
          id: 'line-g1',
          productName: 'Vestido midi estampado',
          size: 'S',
          color: 'Floral',
          quantity: 1,
          unitPrice: 28_500,
        },
      ],
    },
    {
      id: 'aos-006b',
      storeId: 'store-002',
      businessName: 'Moda Flores Local',
      status: ORDER_STORE_STATUS.CANCELED,
      subtotalArs: 28_800,
      items: [
        {
          id: 'line-g2',
          productName: 'Blusa seda premium',
          size: 'M',
          color: 'Crema',
          quantity: 1,
          unitPrice: 28_800,
        },
      ],
    },
  ],
};

const DEV_ORDERS: Record<string, AdminOrder> = {
  [DEV_ORDER_1.id]: DEV_ORDER_1,
  [DEV_ORDER_2.id]: DEV_ORDER_2,
  [DEV_ORDER_3.id]: DEV_ORDER_3,
  [DEV_ORDER_4.id]: DEV_ORDER_4,
  [DEV_ORDER_5.id]: DEV_ORDER_5,
  [DEV_ORDER_6.id]: DEV_ORDER_6,
};

function devAllOrdersSorted(): AdminOrder[] {
  return Object.values(DEV_ORDERS)
    .map((o) => mockClone(o))
    .sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate));
}

function orderMatchesSearch(order: AdminOrder, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) {
    return true;
  }
  if (order.id.toLowerCase().includes(q)) {
    return true;
  }
  if (order.buyer.email.toLowerCase().includes(q)) {
    return true;
  }
  const name = order.buyer.displayName?.toLowerCase() ?? '';
  if (name.includes(q)) {
    return true;
  }
  return order.stores.some((s) => s.businessName.toLowerCase().includes(q));
}

function orderMatchesStatus(order: AdminOrder, status: string): boolean {
  return order.stores.some((s) => s.status === status);
}

function orderMatchesStore(order: AdminOrder, storeId: string): boolean {
  return order.stores.some((s) => s.storeId === storeId);
}

function orderMatchesDateRange(order: AdminOrder, startDate?: string, endDate?: string): boolean {
  const ts = Date.parse(order.orderDate);
  if (!Number.isFinite(ts)) {
    return true;
  }
  if (startDate) {
    const start = Date.parse(`${startDate}T00:00:00.000Z`);
    if (Number.isFinite(start) && ts < start) {
      return false;
    }
  }
  if (endDate) {
    const end = Date.parse(`${endDate}T23:59:59.999Z`);
    if (Number.isFinite(end) && ts > end) {
      return false;
    }
  }
  return true;
}

function filterDevOrders(params: FetchAdminOrdersParams): AdminOrder[] {
  return devAllOrdersSorted().filter((order) => {
    if (params.search && !orderMatchesSearch(order, params.search)) {
      return false;
    }
    if (params.status && !orderMatchesStatus(order, params.status)) {
      return false;
    }
    if (params.storeId && !orderMatchesStore(order, params.storeId)) {
      return false;
    }
    if (!orderMatchesDateRange(order, params.startDate, params.endDate)) {
      return false;
    }
    return true;
  });
}

function findSliceInDevOrders(sliceId: string): { order: AdminOrder; slice: AdminOrderStore } | undefined {
  for (const order of Object.values(DEV_ORDERS)) {
    const slice = order.stores.find((s) => s.id === sliceId);
    if (slice) {
      return { order, slice };
    }
  }
  return undefined;
}

export type FetchAdminOrdersParams = {
  page: number;
  size: number;
  search?: string;
  status?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
};

export async function fetchAdminOrders(
  params: FetchAdminOrdersParams,
): Promise<Page<AdminOrder>> {
  const pageZero = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  if (import.meta.env.DEV) {
    await devDelay(undefined);
    const filtered = filterDevOrders(params);
    const start = pageZero * size;
    const slice = filtered.slice(start, start + size);
    return {
      content: slice,
      totalElements: filtered.length,
      number: pageZero,
      size,
    };
  }

  const sp = new URLSearchParams();
  sp.set('page', String(pageZero));
  sp.set('size', String(size));
  if (params.search?.trim()) {
    sp.set('search', params.search.trim());
  }
  if (params.status?.trim()) {
    sp.set('status', params.status.trim());
  }
  if (params.storeId?.trim()) {
    sp.set('storeId', params.storeId.trim());
  }
  if (params.startDate?.trim()) {
    sp.set('startDate', params.startDate.trim());
  }
  if (params.endDate?.trim()) {
    sp.set('endDate', params.endDate.trim());
  }

  const raw = await apiClient.get<unknown>(`${ADMIN_ORDERS_API_PATH}?${sp.toString()}`);
  return coercePageAdminOrders(raw);
}

export async function fetchAdminOrderDetail(orderId: string): Promise<AdminOrder> {
  const id = orderId.trim();
  if (!id) {
    throw new ApiError(400, null, 'ID de orden inválido.');
  }

  if (import.meta.env.DEV) {
    const row = DEV_ORDERS[id];
    if (!row) {
      await devDelay(undefined, 120);
      throw new ApiError(404, null, `No hay orden «${id}» en desarrollo.`);
    }
    return devDelay(mockClone(row));
  }

  const raw = await apiClient.get<unknown>(`${ADMIN_ORDERS_API_PATH}/${encodeURIComponent(id)}`);
  const order =
    typeof raw === 'object' && raw !== null ? coerceAdminOrder(raw as JsonRecord) : undefined;
  if (!order) {
    throw new ApiError(502, null, 'Respuesta de orden inválida.');
  }
  return order;
}

export async function forceSliceStatus(
  sliceId: string,
  data: ForceOrderStatusDTO,
): Promise<AdminOrderStore> {
  const id = sliceId.trim();
  const reason = data.reason.trim();
  if (!id) {
    throw new ApiError(400, null, 'ID de slice inválido.');
  }
  if (reason.length < 10) {
    throw new ApiError(400, null, 'El motivo debe tener al menos 10 caracteres.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 220);
    const found = findSliceInDevOrders(id);
    if (!found) {
      throw new ApiError(404, null, `No hay slice «${id}» en desarrollo.`);
    }
    const { order, slice } = found;
    const updatedSlice: AdminOrderStore = {
      ...slice,
      status: data.status,
      stockIssues: data.status === ORDER_STORE_STATUS.CANCELED ? undefined : slice.stockIssues,
    };
    const updatedOrder: AdminOrder = {
      ...order,
      stores: order.stores.map((s) => (s.id === id ? updatedSlice : s)),
    };
    DEV_ORDERS[order.id] = updatedOrder;
    return mockClone(updatedSlice);
  }

  const raw = await apiClient.post<unknown>(
    `${ADMIN_ORDERS_API_PATH}/slices/${encodeURIComponent(id)}/force-status`,
    data,
  );
  const store =
    typeof raw === 'object' && raw !== null
      ? coerceAdminOrderStore(raw as JsonRecord)
      : undefined;
  if (!store) {
    throw new ApiError(502, null, 'Respuesta de slice inválida.');
  }
  return store;
}

let devRefundCounter = 12_345;

export async function refundSlice(data: RefundSliceDTO): Promise<RefundResult> {
  const sliceId = data.sliceId.trim();
  const reason = data.reason.trim();
  const amount = data.amount;
  if (!sliceId) {
    throw new ApiError(400, null, 'ID de slice inválido.');
  }
  if (reason.length < 10) {
    throw new ApiError(400, null, 'El motivo debe tener al menos 10 caracteres.');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, null, 'Monto de reembolso inválido.');
  }

  if (import.meta.env.DEV) {
    await devDelay(undefined, 280);
    const found = findSliceInDevOrders(sliceId);
    if (!found) {
      throw new ApiError(404, null, `No hay slice «${sliceId}» en desarrollo.`);
    }
    const { order, slice } = found;
    if (slice.status !== ORDER_STORE_STATUS.CANCELED) {
      throw new ApiError(400, null, 'Solo se puede reembolsar un slice cancelado.');
    }
    if (slice.refund) {
      throw new ApiError(409, null, 'Este slice ya tiene un reembolso procesado.');
    }
    if (amount > slice.subtotalArs) {
      throw new ApiError(400, null, 'El monto no puede superar el subtotal del slice.');
    }

    devRefundCounter += 1;
    const mpRefundId = `MP-REF-${String(devRefundCounter)}`;
    const updatedSlice: AdminOrderStore = {
      ...slice,
      refund: { mpRefundId, refundedAmount: amount },
    };
    DEV_ORDERS[order.id] = {
      ...order,
      stores: order.stores.map((s) => (s.id === sliceId ? updatedSlice : s)),
    };

    return {
      success: true,
      mpRefundId,
      refundedAmount: amount,
      message: 'Reembolso iniciado correctamente en Mercado Pago.',
    };
  }

  const raw = await apiClient.post<unknown>(`${ADMIN_ORDERS_API_PATH}/refunds`, data);
  const root = typeof raw === 'object' && raw !== null ? (raw as JsonRecord) : {};
  return {
    success: root.success === true,
    mpRefundId: pickString(root.mpRefundId ?? root.mp_refund_id) ?? null,
    refundedAmount: pickNumber(root.refundedAmount ?? root.refunded_amount),
    message: pickString(root.message) ?? 'Operación completada.',
  };
}
