/** Claves de localStorage (briefing). */
export const STORAGE_KEYS = {
  TOKEN: 'outletgo_token',
  USER: 'outletgo_user',
} as const;

/**
 * Rutas base. Se ampliarán en el Paso 5 (router).
 */
export const ROUTES = {
  login: '/login',
  recover: '/recover',
  authCallback: '/auth/callback',
  sellerRoot: '/seller',
  sellerProducts: '/seller/products',
  /** Pedidos del vendedor (Paso 15). */
  sellerOrders: '/seller/orders',
  /** Perfil de tienda (Paso 16). */
  sellerStore: '/seller/store',
  /** Reseñas recibidas (Paso 17). */
  sellerReviews: '/seller/reviews',
  /** Chat con compradores (Paso 18). */
  sellerChats: '/seller/chats',
  /** Soporte técnico con Admin (Paso 19). */
  sellerSupport: '/seller/support',
  /** Alta de producto (Paso 13). */
  sellerProductNew: '/seller/products/new',
  /** Paso 11 — página de prueba `ImageDropzone`; no está en sidebar. */
  sellerUploadDemo: '/seller/upload-demo',
  adminRoot: '/admin',
  adminSellers: '/admin/sellers',
  adminBuyers: '/admin/buyers',
  /** Moderación de productos (Paso 23). */
  adminProducts: '/admin/products',
  /** Moderación de reseñas (Paso 24). */
  adminReviews: '/admin/reviews',
  /** Reportes de compradores (Paso 25). */
  adminReports: '/admin/reports',
  /** Pedidos globales multitienda (Paso 26). */
  adminOrders: '/admin/orders',
  /** Bandeja de soporte Admin ↔ vendedores (Paso 27). */
  adminSupport: '/admin/support',
  /** Puntos de retiro físico OutletGo (Paso 4.6). */
  adminPickupPoints: '/admin/pickup-points',
  /** Gestión de Tarifas de Servicio y Comisiones */
  adminServiceFeeRules: '/admin/service-fee-rules',
  forbidden: '/forbidden',
} as const;

/** Listado paginado de reportes Admin (Paso 25). */
export const ADMIN_REPORTS_PAGE_SIZE = 10;

/** Reportes — panel Admin (Paso 25). */
export const ADMIN_REPORTS_API_PATH = '/api/admin/reports' as const;

/** Listado paginado de pedidos Admin (Paso 26). */
export const ADMIN_ORDERS_PAGE_SIZE = 10;

/** Pedidos globales — panel Admin (Paso 26). */
export const ADMIN_ORDERS_API_PATH = '/api/admin/orders' as const;

/** Detalle Admin: `/admin/orders/:orderId`. */
export function adminOrderDetailPath(orderId: string): string {
  return `${ROUTES.adminOrders}/${encodeURIComponent(orderId)}`;
}

/** Listado paginado de reseñas Admin (Paso 24). */
export const ADMIN_REVIEWS_PAGE_SIZE = 10;

/** Moderación de reseñas — panel Admin (Paso 24). */
export const ADMIN_REVIEWS_API_PATH = '/api/admin/reviews' as const;

/** Listado paginado de productos Admin (Paso 23). */
export const ADMIN_PRODUCTS_PAGE_SIZE = 10;

/** Moderación de productos — panel Admin (Paso 23). */
export const ADMIN_PRODUCTS_API_PATH = '/api/admin/products' as const;

/** Listado paginado de compradores Admin (Paso 22). */
export const ADMIN_BUYERS_PAGE_SIZE = 10;

/** Cuentas comprador — panel Admin (Paso 22). */
export const ADMIN_BUYERS_API_PATH = '/api/admin/buyers' as const;

/** Listado paginado de vendedores Admin (Paso 21). */
export const ADMIN_SELLERS_PAGE_SIZE = 10;

/** CRUD cuentas vendedor — panel Admin (Paso 21). */
export const ADMIN_SELLERS_API_PATH = '/api/admin/sellers' as const;

/** Detalle vendedor Admin: `/admin/sellers/:sellerId`. */
export function adminSellerDetailPath(sellerId: string): string {
  return `${ROUTES.adminSellers}/${encodeURIComponent(sellerId)}`;
}

/** Fotos máximas por producto en el panel vendedor (staging / formulario Paso 13). */
export const PRODUCT_IMAGE_MAX_COUNT = 4;

/** Listado paginado seller (Paso 12). */
export const SELLER_PRODUCTS_PAGE_SIZE = 10;

/**
 * Listado / CRUD seller (Paso 12–13). Cambiá sólo si el backend usa otra ruta.
 */
export const SELLER_PRODUCTS_API_PATH = '/api/seller/products' as const;

/**
 * PATCH `{ status }` — Pausar/reactivar (Paso 14, contrato plan / Spring).
 * Ajustá si tu backend agrupa rutas bajo `/api/seller/...`.
 */
export function sellerProductStatusApiPath(productId: string): string {
  const id = productId.trim();
  return `${SELLER_PRODUCTS_API_PATH}/${encodeURIComponent(id)}/status`;
}

/**
 * Baja lógica — Paso 14. `DELETE` idempotente; el backend marca `deleted`/similar.
 */
export function sellerProductLogicalDeleteApiPath(productId: string): string {
  const id = productId.trim();
  return `${SELLER_PRODUCTS_API_PATH}/${encodeURIComponent(id)}`;
}

/** Ruta absoluta para editar un producto (segmento `id` codificado). */
export function sellerProductEditPath(productId: string): string {
  return `/seller/products/${encodeURIComponent(productId)}/edit`;
}

/** Listado paginado de pedidos seller (Paso 15). */
export const SELLER_ORDERS_PAGE_SIZE = 10;

/** Pedidos seller (GET listado/detalle). Ajustá si tu backend usa otra convención. */
export const SELLER_ORDERS_API_PATH = '/api/seller/orders' as const;

/** Detalle `/seller/orders/:orderId`. */
export function sellerOrderDetailPath(orderId: string): string {
  return `${ROUTES.sellerOrders}/${encodeURIComponent(orderId)}`;
}

/** Perfil de tienda seller (Paso 16). */
export const SELLER_STORE_API_PATH = '/api/seller/store' as const;

/** Listado paginado de reseñas seller (Paso 17). */
export const SELLER_REVIEWS_PAGE_SIZE = 5;

/** Reseñas sobre la tienda seller (Paso 17). */
export const SELLER_STORE_REVIEWS_API_PATH = '/api/seller/reviews/store' as const;

/** Reseñas sobre productos seller (Paso 17). */
export const SELLER_PRODUCT_REVIEWS_API_PATH = '/api/seller/reviews/products' as const;

/** Detalle de chat seller: `/seller/chats/:conversationId`. */
export function sellerChatRoomPath(conversationId: string): string {
  return `${ROUTES.sellerChats}/${encodeURIComponent(conversationId)}`;
}

/** Listado y mensajes de chat seller (Paso 18). Ajustá si el backend usa otra convención. */
export const SELLER_CHATS_API_PATH = '/api/seller/chats' as const;

/** Paginado GET conversaciones de chat seller (Spring `Page`). */
export const SELLER_CHATS_CONVERSATIONS_PAGE_SIZE = 20;

/** Paginado GET mensajes de chat seller (Spring `Page`). */
export const SELLER_CHAT_MESSAGES_PAGE_SIZE = 100;

/** Resumen del panel seller — home `/seller` (Paso 20). */
export const SELLER_DASHBOARD_API_PATH = '/api/seller/dashboard' as const;

/** Mensajes del canal seller ↔ admin (Paso 19). */
export const SUPPORT_MESSAGES_API_PATH = '/api/support/messages' as const;

/** Bandeja de soporte Admin (Paso 27). */
export const ADMIN_SUPPORT_API_PATH = '/api/admin/support' as const;

/** Paginado GET conversaciones de soporte Admin (Spring `Page`). */
export const ADMIN_SUPPORT_CONVERSATIONS_PAGE_SIZE = 50;

/** Paginado GET soporte (supuesto Spring `Page`). */
export const SUPPORT_MESSAGES_PAGE_SIZE = 20;

/** Listado paginado de puntos de retiro Admin (Paso 4.6). */
export const ADMIN_PICKUP_POINTS_PAGE_SIZE = 10;

/** Puntos de retiro — panel Admin (Paso 4.6). */
export const ADMIN_PICKUP_POINTS_API_PATH = '/api/admin/shipping/pickup-points' as const;

/** Listado paginado de reglas de tarifas de servicio Admin */
export const ADMIN_SERVICE_FEE_RULES_PAGE_SIZE = 10;

/** API path para las reglas de tarifas de servicio Admin */
export const ADMIN_SERVICE_FEE_RULES_API_PATH = '/api/admin/service-fee-rules' as const;

