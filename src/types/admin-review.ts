/** Reseña moderada por Admin (Paso 24). Relaciones explícitas vía FK y objetos anidados. */
export type AdminReview = {
  id: string;
  /** Valor entre 1 y 5. */
  rating: number;
  comment: string | null;
  isVisible: boolean;
  /** Fecha ISO 8601 de publicación. */
  createdAt: string;
  storeId: string;
  /** `null` cuando la reseña es sobre la tienda (sin producto). */
  productId: string | null;
  store: {
    id: string;
    businessName: string;
  };
  /** `null` cuando `productId` es `null`. */
  product: {
    id: string;
    name: string;
  } | null;
  buyer: {
    id: string;
    displayName: string | null;
    email: string;
  };
};

/** Reseña dirigida a un producto (FK `productId` presente). */
export function isProductAdminReview(review: AdminReview): boolean {
  return review.productId != null;
}

/** Entrada del historial de reseñas de un comprador. */
export type BuyerReviewEntry = {
  id: string;
  rating: number;
  comment: string | null;
  storeId: string;
  storeName: string;
  /** `null` si la reseña es solo de tienda. */
  productId: string | null;
  /** `null` si no hay producto asociado. */
  productName: string | null;
  isVisible: boolean;
  /** Fecha ISO 8601 de publicación. */
  createdAt: string;
};

/** Historial completo de reseñas de un comprador. */
export type BuyerReviewHistory = {
  buyerId: string;
  displayName: string | null;
  email: string;
  reviews: BuyerReviewEntry[];
};

/** Cambio de visibilidad de una reseña (Admin). */
export type ToggleReviewVisibilityDTO = {
  isVisible: boolean;
};
