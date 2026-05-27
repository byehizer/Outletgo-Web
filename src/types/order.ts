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
};

/** Fila típica de listado `/seller/orders` (Spring page `content`). */
export type SellerOrderSummary = {
  id: string;
  placedAt: string;
  buyerName: string;
  buyerEmail: string | null;
  totalArs: number;
  status: OrderStatus;
};

/**
 * Ítem comprado en un pedido — alineado al modelo de variaciones del catálogo (talle/color, Paso 13).
 * Spring puede mapear `size`/`color` desde la entidad de línea o snapshot de variación.
 */
export type SellerOrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceArs: number;
  /** Portada al momento de la compra (snapshot en línea). */
  thumbnailUrl: string | null;
  /** Talle vendido; `null` si no aplica o dato legacy. */
  size: string | null;
  /** Color vendido; `null` si no aplica o dato legacy. */
  color: string | null;
  /**
   * Texto ya compuesto desde backend (ej. etiqueta de SKU); si viene informado, tiene prioridad en UI
   * sobre armar el texto desde `size`/`color`.
   */
  variationDescription: string | null;
};

/** Etiqueta única para empaque: descripción libre o «Talle: … · Color: …». */
export function formatSellerOrderItemVariation(item: SellerOrderItem): string | null {
  const desc = item.variationDescription?.trim();
  if (desc) {
    return desc;
  }
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
export function buyerDisplayNameForSellerPanel(buyerName: string): string {
  const t = buyerName.trim();
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

/**
 * Detalle en vista vendedor: fulfillment centralizado (OutletGo retira en el local).
 * Sin domicilio del comprador final.
 */
export type SellerOrderDetail = SellerOrderSummary & {
  items: SellerOrderItem[];
};
