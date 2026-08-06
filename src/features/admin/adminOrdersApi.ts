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
  const id = pickString(o.id ?? o.sliceId ?? o.orderStoreId) ?? `slice-${Math.random().toString(36).substring(2, 7)}`;
  const storeId = pickString(o.storeId ?? o.store_id) ?? 'unknown-store';
  const businessName = pickString(o.businessName ?? o.business_name ?? o.storeName ?? o.store_name) ?? 'Tienda';
  const statusRaw = pickString(o.status ?? o.storeStatus ?? o.store_status);
  const status = coerceOrderStoreStatus(statusRaw);

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
    storeName: pickString(o.storeName ?? o.store_name) ?? businessName,
    grossAmount: o.grossAmount !== undefined ? pickNumber(o.grossAmount) : undefined,
    commissionRate: o.commissionRate !== undefined ? pickNumber(o.commissionRate) : undefined,
    commissionAmount: o.commissionAmount !== undefined ? pickNumber(o.commissionAmount) : undefined,
    netAmount: o.netAmount !== undefined ? pickNumber(o.netAmount) : undefined,
    payoutStatus: (pickString(o.payoutStatus ?? o.payout_status) ?? 'PENDING') as any,
    paidAt: pickString(o.paidAt ?? o.paid_at) ?? null,
    subtotalArs: pickNumber(o.subtotalArs ?? o.subtotal_ars ?? o.subtotalAmount ?? o.subtotal_amount ?? o.subtotal),
    items,
    refund: mpRefundId ? { mpRefundId, refundedAmount } : undefined,
  };
}

export function coerceAdminOrder(payload: JsonRecord): AdminOrder | undefined {
  const id = pickString(payload.id ?? payload.orderId);
  const orderDate = pickString(payload.orderDate ?? payload.order_date ?? payload.createdAt) ?? '';
  const productSubtotal = payload.productSubtotal !== undefined ? pickNumber(payload.productSubtotal) : undefined;
  const shippingCost = payload.shippingCost !== undefined ? pickNumber(payload.shippingCost) : undefined;
  const serviceFee = payload.serviceFee !== undefined ? pickNumber(payload.serviceFee) : undefined;
  const totalArs = pickNumber(payload.totalArs ?? payload.total_ars ?? payload.total);
  const mpPreferenceId = pickString(payload.mpPreferenceId ?? payload.mp_preference_id) ?? '';
  const mpPaymentId = pickString(payload.mpPaymentId ?? payload.mp_payment_id) ?? null;
  const buyerRaw =
    typeof payload.buyer === 'object' && payload.buyer !== null
      ? (payload.buyer as JsonRecord)
      : {};
  const buyerId = pickString(buyerRaw.id) ?? 'buyer-id';
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

  if (!id) {
    return undefined;
  }

  return {
    id,
    status,
    orderDate,
    productSubtotal,
    shippingCost,
    serviceFee,
    totalArs,
    mpPreferenceId,
    mpPaymentId,
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

  const raw = await apiClient.get<unknown>(`${ADMIN_ORDERS_API_PATH}/${encodeURIComponent(id)}`);
  console.log('📦 [ADMIN ORDER API] Raw payload from backend:', raw);

  const order =
    typeof raw === 'object' && raw !== null ? coerceAdminOrder(raw as JsonRecord) : undefined;

  console.log('📦 [ADMIN ORDER API] Coerced AdminOrder object:', order);
  console.log('🏬 [ADMIN ORDER API] Stores/Slices count:', order?.stores?.length, order?.stores);

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

  const raw = await apiClient.post<unknown>(`${ADMIN_ORDERS_API_PATH}/refunds`, data);
  const root = typeof raw === 'object' && raw !== null ? (raw as JsonRecord) : {};
  return {
    success: root.success === true,
    mpRefundId: pickString(root.mpRefundId ?? root.mp_refund_id) ?? null,
    refundedAmount: pickNumber(root.refundedAmount ?? root.refunded_amount),
    message: pickString(root.message) ?? 'Operación completada.',
  };
}

export async function refundTotalOrder(orderId: string, reason?: string): Promise<RefundResult> {
  const id = orderId.trim();
  if (!id) {
    throw new ApiError(400, null, 'ID de orden inválido.');
  }

  const raw = await apiClient.post<unknown>(
    `${ADMIN_ORDERS_API_PATH}/${encodeURIComponent(id)}/refund-total`,
    { reason: reason || 'Reembolso total del pedido' },
  );
  const root = typeof raw === 'object' && raw !== null ? (raw as JsonRecord) : {};
  return {
    success: root.success === true,
    mpRefundId: pickString(root.mpRefundId ?? root.mp_refund_id) ?? null,
    refundedAmount: pickNumber(root.refundedAmount ?? root.refunded_amount),
    message: pickString(root.message) ?? 'Reembolso total procesado correctamente.',
  };
}

export async function updateGlobalOrderStatus(
  orderId: string,
  status: typeof ORDER_STATUS[keyof typeof ORDER_STATUS],
): Promise<AdminOrder> {
  const id = orderId.trim();
  if (!id) {
    throw new ApiError(400, null, 'ID de orden inválido.');
  }

  const raw = await apiClient.patch<unknown>(
    `${ADMIN_ORDERS_API_PATH}/${encodeURIComponent(id)}/status`,
    { status },
  );
  const order =
    typeof raw === 'object' && raw !== null ? coerceAdminOrder(raw as JsonRecord) : undefined;
  if (!order) {
    throw new ApiError(502, null, 'Respuesta de orden inválida.');
  }
  return order;
}
