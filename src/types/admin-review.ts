import type { ReferenceType } from './moderation';

/** Reseña moderada por Admin (Paso 24). */
export type AdminReview = {
  id: string;
  /** Valor entre 1 y 5. */
  rating: number;
  comment: string | null;
  isVisible: boolean;
  /** Fecha ISO 8601 de publicación. */
  createdAt: string;
  referenceType: ReferenceType;
  store: {
    id: string;
    businessName: string;
  };
  /** `null` cuando `referenceType` es `STORE`. */
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

/** Entrada del historial de reseñas de un comprador. */
export type BuyerReviewEntry = {
  id: string;
  rating: number;
  comment: string | null;
  referenceType: ReferenceType;
  /** Nombre de la tienda o del producto según el tipo. */
  referenceName: string;
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
