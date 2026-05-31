import type { SellerOrderStore } from './order';

/** KPIs agregados del panel seller (Paso 20). */
export type SellerDashboardKpis = {
  /** Pedidos con status PENDING o PREPARING. */
  pendingOrders: number;
  /** Suma de subtotalArs de pedidos DELIVERED en los últimos 30 días. */
  monthlyRevenue: number;
  /** Productos con stock total ≤ 3 en al menos una variación. */
  lowStockProducts: number;
  /** Promedio de calificación de la tienda; `null` si aún no hay reseñas. */
  storeRatingAvg: number | null;
  /** Cantidad total de reseñas recibidas por la tienda. */
  storeRatingCount: number;
  /** Pedidos con status STOCK_ISSUE (problema de stock en negociación). */
  stockIssueOrders: number;
};

/** Pedido reciente en el dashboard — slice de la tienda del seller. */
export type SellerDashboardRecentOrder = Pick<
  SellerOrderStore,
  'id' | 'orderId' | 'status' | 'subtotalArs' | 'orderDate' | 'buyer'
>;

/** Variación con stock crítico (≤ 3 unidades). */
export type SellerDashboardCriticalVariation = {
  size: string;
  color: string;
  stock: number;
};

/** Producto con al menos una variación en stock bajo. */
export type SellerDashboardLowStockProduct = {
  id: string;
  name: string;
  /** Primera imagen del producto; placeholder si no hay. */
  imageUrl: string;
  /** Solo variaciones con stock ≤ 3. */
  criticalVariations: SellerDashboardCriticalVariation[];
};

/** Reseña reciente en el dashboard. */
export type SellerDashboardRecentReview = {
  id: string;
  authorDisplayName: string;
  /** Calificación entre 1 y 5 inclusives. */
  rating: number;
  comment: string | null;
  /** Fecha ISO 8601. */
  createdAt: string;
};

/** Respuesta de `GET /api/seller/dashboard` (Paso 20). */
export type SellerDashboardData = {
  kpis: SellerDashboardKpis;
  /** Hasta 5 pedidos accionables (PENDING, PREPARING, READY_FOR_PICKUP). */
  recentOrders: SellerDashboardRecentOrder[];
  /** Hasta 5 productos con stock bajo. */
  lowStockProducts: SellerDashboardLowStockProduct[];
  /** Últimas 3 reseñas recibidas. */
  recentReviews: SellerDashboardRecentReview[];
};
