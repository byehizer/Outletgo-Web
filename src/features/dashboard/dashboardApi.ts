import { SELLER_DASHBOARD_API_PATH } from '../../lib/constants';
import { ApiError, apiClient } from '../../lib/http/apiClient';
import { ORDER_STATUS } from '../../types/order';
import { coerceSellerOrderStore } from '../orders/ordersApi';

import type {
  SellerDashboardCriticalVariation,
  SellerDashboardData,
  SellerDashboardKpis,
  SellerDashboardLowStockProduct,
  SellerDashboardRecentOrder,
  SellerDashboardRecentReview,
} from '../../types/dashboard';

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

const DEV_DASHBOARD: SellerDashboardData = {
  kpis: {
    pendingOrders: 3,
    monthlyRevenue: 284_600,
    lowStockProducts: 2,
    storeRatingAvg: 4.3,
    storeRatingCount: 28,
    stockIssueOrders: 1,
  },
  recentOrders: [
    {
      id: 'oss-stock-juan',
      orderId: 'ord-stock-juan',
      subtotalArs: 58_000,
      status: ORDER_STATUS.STOCK_ISSUE,
      orderDate: '2026-05-26T08:00:00.000Z',
      buyer: { displayName: 'Juan Pérez', email: 'juan.perez@ejemplo.ar' },
    },
    {
      id: 'oss-dash-501',
      orderId: 'ord-dash-501',
      subtotalArs: 18_500,
      status: ORDER_STATUS.PENDING,
      orderDate: '2026-05-27T09:12:00.000Z',
      buyer: { displayName: 'Juan Pérez', email: 'juan.perez@ejemplo.ar' },
    },
    {
      id: 'oss-202',
      orderId: 'ord-202',
      subtotalArs: 99_000,
      status: ORDER_STATUS.PREPARING,
      orderDate: '2026-05-25T15:00:00.000Z',
      buyer: { displayName: 'Carlos Benítez', email: 'cbenitez@ejemplo.ar' },
    },
    {
      id: 'oss-dash-504',
      orderId: 'ord-dash-504',
      subtotalArs: 42_800,
      status: ORDER_STATUS.PENDING,
      orderDate: '2026-05-24T18:40:00.000Z',
      buyer: { displayName: 'Mariana López', email: 'mariana.lopez@ejemplo.ar' },
    },
    {
      id: 'oss-203',
      orderId: 'ord-203',
      subtotalArs: 14_500,
      status: ORDER_STATUS.READY_FOR_PICKUP,
      orderDate: '2026-05-24T09:15:00.000Z',
      buyer: { displayName: 'Lucía Herrera', email: 'luciah@ejemplo.ar' },
    },
    {
      id: 'oss-dash-505',
      orderId: 'ord-dash-505',
      subtotalArs: 31_200,
      status: ORDER_STATUS.READY_FOR_PICKUP,
      orderDate: '2026-05-22T11:30:00.000Z',
      buyer: { displayName: 'Sofía Gómez', email: 'sofia.gomez@ejemplo.ar' },
    },
  ],
  recentReviews: [
    {
      id: 'rev-dash-1',
      authorDisplayName: 'Ana Rodríguez',
      rating: 5,
      comment: 'Excelente tienda y atención rápida. Volvería sin dudarlo.',
      createdAt: '2026-05-26T14:22:30.000Z',
    },
    {
      id: 'rev-dash-2',
      authorDisplayName: 'Martín Paz',
      rating: 4,
      comment: null,
      createdAt: '2026-05-25T09:15:00.000Z',
    },
    {
      id: 'rev-dash-3',
      authorDisplayName: 'Lucía Méndez',
      rating: 3,
      comment:
        'Buen local, llegué después de esperar una cola bastante larga pero valió la pena.',
      createdAt: '2026-05-24T11:05:42.000Z',
    },
  ],
  lowStockProducts: [
    {
      id: 'p-low-1',
      name: 'Remera Oversize Avellaneda',
      imageUrl: 'https://picsum.photos/seed/p1remera/80/80',
      criticalVariations: [
        { size: 'M', color: 'Negro', stock: 2 },
        { size: 'L', color: 'Blanco', stock: 1 },
      ],
    },
    {
      id: 'p-low-2',
      name: 'Jean Mom Rígido Local',
      imageUrl: 'https://picsum.photos/seed/p2jean/80/80',
      criticalVariations: [{ size: '38', color: 'Azul', stock: 3 }],
    },
  ],
};

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

function coerceCriticalVariation(o: JsonRecord): SellerDashboardCriticalVariation | undefined {
  const size = pickString(o.size ?? o.talle) ?? '';
  const color = pickString(o.color ?? o.colour) ?? '';
  const stock = Math.max(0, Math.floor(pickNumber(o.stock ?? o.quantity ?? o.qty)));
  if (!size && !color) {
    return undefined;
  }
  return { size, color, stock };
}

function coerceLowStockProduct(o: JsonRecord): SellerDashboardLowStockProduct | undefined {
  const id = pickString(o.id ?? o.productId ?? o.product_id);
  const name = pickString(o.name ?? o.productName ?? o.product_name ?? o.title);
  const imageUrl =
    pickString(o.imageUrl ?? o.image_url ?? o.thumbnailUrl ?? o.thumbnail_url) ?? '';
  const varsRaw = o.criticalVariations ?? o.critical_variations ?? o.variations;
  const criticalVariations: SellerDashboardCriticalVariation[] = [];
  if (Array.isArray(varsRaw)) {
    for (const row of varsRaw) {
      if (typeof row === 'object' && row !== null) {
        const v = coerceCriticalVariation(row as JsonRecord);
        if (v) {
          criticalVariations.push(v);
        }
      }
    }
  }
  if (!id || !name) {
    return undefined;
  }
  return { id, name, imageUrl, criticalVariations };
}

function coerceRecentOrder(o: JsonRecord): SellerDashboardRecentOrder | undefined {
  const store = coerceSellerOrderStore(o);
  if (!store) {
    return undefined;
  }
  return {
    id: store.id,
    orderId: store.orderId,
    subtotalArs: store.subtotalArs,
    status: store.status,
    orderDate: store.orderDate,
    buyer: store.buyer,
  };
}

function coerceRecentReview(o: JsonRecord): SellerDashboardRecentReview | undefined {
  const id = pickString(o.id ?? o.reviewId ?? o.review_id);
  const authorDisplayName =
    pickString(
      o.authorDisplayName ??
        o.author_display_name ??
        o.authorName ??
        o.author_name,
    ) ?? '';
  const rating = Math.min(
    5,
    Math.max(1, Math.round(pickNumber(o.rating))),
  );
  const commentRaw = o.comment ?? o.text ?? o.body;
  const comment =
    commentRaw === null || commentRaw === undefined
      ? null
      : typeof commentRaw === 'string'
        ? commentRaw
        : null;
  const createdAt =
    pickString(o.createdAt ?? o.created_at ?? o.date) ?? '';
  if (!id || !authorDisplayName) {
    return undefined;
  }
  return { id, authorDisplayName, rating, comment, createdAt };
}

function pickNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  const n = pickNumber(v);
  return Number.isFinite(n) ? n : null;
}

function coerceKpis(o: JsonRecord): SellerDashboardKpis {
  return {
    pendingOrders: Math.max(
      0,
      Math.floor(pickNumber(o.pendingOrders ?? o.pending_orders)),
    ),
    monthlyRevenue: Math.max(
      0,
      pickNumber(o.monthlyRevenue ?? o.monthly_revenue),
    ),
    lowStockProducts: Math.max(
      0,
      Math.floor(pickNumber(o.lowStockProducts ?? o.low_stock_products)),
    ),
    storeRatingAvg: pickNullableNumber(o.storeRatingAvg ?? o.store_rating_avg),
    storeRatingCount: Math.max(
      0,
      Math.floor(pickNumber(o.storeRatingCount ?? o.store_rating_count)),
    ),
    stockIssueOrders: Math.max(
      0,
      Math.floor(pickNumber(o.stockIssueOrders ?? o.stock_issue_orders)),
    ),
  };
}

function coerceSellerDashboardPayload(payload: unknown): SellerDashboardData {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};
  const kpisRaw =
    typeof root.kpis === 'object' && root.kpis !== null ? (root.kpis as JsonRecord) : root;

  const recentRaw = root.recentOrders ?? root.recent_orders ?? root.orders;
  const recentOrders: SellerDashboardRecentOrder[] = [];
  if (Array.isArray(recentRaw)) {
    for (const row of recentRaw) {
      if (typeof row === 'object' && row !== null) {
        const order = coerceRecentOrder(row as JsonRecord);
        if (order) {
          recentOrders.push(order);
        }
      }
    }
  }

  const lowStockRaw = root.lowStockProducts ?? root.low_stock_products ?? root.products;
  const lowStockProducts: SellerDashboardLowStockProduct[] = [];
  if (Array.isArray(lowStockRaw)) {
    for (const row of lowStockRaw) {
      if (typeof row === 'object' && row !== null) {
        const product = coerceLowStockProduct(row as JsonRecord);
        if (product) {
          lowStockProducts.push(product);
        }
      }
    }
  }

  const reviewsRaw = root.recentReviews ?? root.recent_reviews ?? root.reviews;
  const recentReviews: SellerDashboardRecentReview[] = [];
  if (Array.isArray(reviewsRaw)) {
    for (const row of reviewsRaw) {
      if (typeof row === 'object' && row !== null) {
        const review = coerceRecentReview(row as JsonRecord);
        if (review) {
          recentReviews.push(review);
        }
      }
    }
  }

  return {
    kpis: coerceKpis(kpisRaw),
    recentOrders,
    lowStockProducts,
    recentReviews,
  };
}

export async function fetchSellerDashboard(): Promise<SellerDashboardData> {
  if (import.meta.env.DEV) {
    return devDelay(mockClone(DEV_DASHBOARD));
  }

  const raw = await apiClient.get<unknown>(SELLER_DASHBOARD_API_PATH);
  const data = coerceSellerDashboardPayload(raw);
  if (!data.kpis) {
    throw new ApiError(500, raw, 'El servidor no devolvió un dashboard válido.');
  }
  return data;
}
