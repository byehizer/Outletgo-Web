/**
 * Estados de pedido. El diagrama de clases tenía PENDING/PAID/…;
 * RF-WEB-04.3 usa "Recibido → Preparando → Listo para retiro".
 * PREPARING y READY_FOR_PICKUP enlazan ese flujo post-pago (Paso 15).
 */
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELED',
  /** Problema de stock en negociación con el comprador. */
  STOCK_ISSUE: 'STOCK_ISSUE',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export function isOrderStatus(value: string): value is OrderStatus {
  return (Object.values(ORDER_STATUS) as string[]).includes(value);
}

/** Textos del panel seller (Pasos 15+). */
export const ORDER_STATUS_LABEL_ES: Record<OrderStatus, string> = {
  PENDING: 'Pendiente de pago',
  PAID: 'Pagado',
  PREPARING: 'Preparando',
  READY_FOR_PICKUP: 'Listo para retiro',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELED: 'Cancelado',
  STOCK_ISSUE: 'Problema de Stock',
};

export type OrderBuyer = {
  displayName: string | null;
  email: string;
};

/** Línea de pedido dentro del slice de una tienda. */
export type SellerOrderItem = {
  id: string;
  productName: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
};

/** Falta de stock reportada sobre un ítem del slice. */
export type SellerOrderStockIssue = {
  itemId: string;
  productName: string;
  size: string;
  color: string;
  requestedQuantity: number;
  /** 0 si no hay absolutamente nada disponible. */
  availableQuantity: number;
};

/**
 * Slice de una orden completa correspondiente a la tienda del seller autenticado.
 * El backend nunca mezcla ítems de otras tiendas en esta respuesta.
 */
export type SellerOrderStore = {
  /** ID del slice (OrderStore) de esta tienda. */
  id: string;
  /** ID de la orden completa del comprador (referencia cruzada con Admin). */
  orderId: string;
  status: OrderStatus;
  /** Subtotal en ARS solo de los ítems de esta tienda. */
  subtotalArs: number;
  shippingAddress: string;
  orderDate: string;
  buyer: OrderBuyer;
  items: SellerOrderItem[];
  /** Problemas de stock activos en este slice; ausente si no hay ninguno. */
  stockIssues?: SellerOrderStockIssue[];
};

/** Slice en vista Admin (incluye datos de la tienda). */
export type AdminOrderStore = {
  id: string;
  storeId: string;
  businessName: string;
  status: OrderStatus;
  subtotalArs: number;
  items: SellerOrderItem[];
  /** Problemas de stock activos en este slice; ausente si no hay ninguno. */
  stockIssues?: SellerOrderStockIssue[];
  /** Reembolso MP ya procesado (slice cancelado). */
  refund?: AdminSliceRefund;
};

/** Reembolso registrado en un slice cancelado. */
export type AdminSliceRefund = {
  mpRefundId: string;
  refundedAmount: number;
};

/** Orden completa del comprador — solo endpoint Admin. */
export type AdminOrder = {
  id: string;
  orderDate: string;
  totalArs: number;
  mpPreferenceId: string;
  buyer: OrderBuyer & { id: string };
  stores: AdminOrderStore[];
};

export type UpdateOrderStatusDTO = {
  status: OrderStatus;
};

/** Cambio de estado forzado por Admin sobre un slice. */
export type ForceOrderStatusDTO = {
  status: OrderStatus;
  /** Obligatorio — el Admin debe justificar el cambio. */
  reason: string;
};

/** Solicitud de reembolso parcial o total de un slice vía Mercado Pago. */
export type RefundSliceDTO = {
  sliceId: string;
  /** Puede ser menor a subtotalArs si el reembolso es parcial por ítem. */
  amount: number;
  reason: string;
};

/** Resultado del reembolso iniciado en Mercado Pago. */
export type RefundResult = {
  success: boolean;
  mpRefundId: string | null;
  refundedAmount: number;
  message: string;
};

/** Mensaje sugerido al contactar al comprador por falta de stock. */
export function buildStockIssueChatMessage(
  orderId: string,
  issue: SellerOrderStockIssue,
): string {
  return `Hola, tenemos un inconveniente con el stock del producto ${issue.productName} (Talle: ${issue.size}, Color: ${issue.color}) en tu pedido #${orderId}. ¿Te interesaría cambiarlo por otro talle/color o preferís el reembolso de este producto?`;
}

export function findStockIssueForItem(
  store: SellerOrderStore,
  itemId: string,
): SellerOrderStockIssue | undefined {
  return store.stockIssues?.find((issue) => issue.itemId === itemId);
}

export function orderAllowsStockReport(status: OrderStatus): boolean {
  return (
    status === ORDER_STATUS.PENDING ||
    status === ORDER_STATUS.PREPARING ||
    status === ORDER_STATUS.STOCK_ISSUE
  );
}

/** Estado agregado de una orden Admin según sus slices (Paso 26). */
export type AdminOrderAggregateStatus =
  | 'STOCK_ISSUE'
  | 'PARTIAL_CANCEL'
  | 'COMPLETED'
  | 'PENDING'
  | 'IN_PROGRESS';

export function getAdminOrderAggregateStatus(
  stores: AdminOrderStore[],
): AdminOrderAggregateStatus {
  if (stores.some((s) => s.status === ORDER_STATUS.STOCK_ISSUE)) {
    return 'STOCK_ISSUE';
  }
  if (stores.some((s) => s.status === ORDER_STATUS.CANCELED)) {
    return 'PARTIAL_CANCEL';
  }
  if (stores.length > 0 && stores.every((s) => s.status === ORDER_STATUS.DELIVERED)) {
    return 'COMPLETED';
  }
  if (stores.length > 0 && stores.every((s) => s.status === ORDER_STATUS.PENDING)) {
    return 'PENDING';
  }
  return 'IN_PROGRESS';
}

export function hasStockIssueForItem(
  store: AdminOrderStore,
  itemId: string,
): boolean {
  return store.stockIssues?.some((issue) => issue.itemId === itemId) === true;
}

/** Etiqueta única para empaque: «Talle: … · Color: …». */
export function formatSellerOrderItemVariation(item: SellerOrderItem): string | null {
  const parts: string[] = [];
  if (item.size?.trim()) {
    parts.push(`Talle: ${item.size.trim()}`);
  }
  if (item.color?.trim()) {
    parts.push(`Color: ${item.color.trim()}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Nombre corto para el panel seller (privacidad): primer nombre o placeholder genérico.
 */
export function buyerDisplayNameForSellerPanel(displayName: string | null): string {
  const t = displayName?.trim() ?? '';
  if (t.length === 0 || t === 'Comprador') {
    return 'Cliente de OutletGo';
  }
  const lower = t.toLowerCase();
  if (lower.includes('demo') || lower.includes('cancelado')) {
    return 'Cliente de OutletGo';
  }
  const first = t.split(/\s+/)[0]?.trim();
  if (!first) {
    return 'Cliente de OutletGo';
  }
  return first;
}
