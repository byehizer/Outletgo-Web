/**
 * Referencia de una reseña en el panel seller (Paso 17).
 */
export type SellerReviewReferenceType = 'STORE' | 'PRODUCT';

/**
 * Reseña recibida por la tienda o un producto — sólo lectura en panel vendedor.
 */
export type SellerReview = {
  id: string;
  authorName: string;
  /** Calificación entre 1 y 5 inclusives. */
  rating: number;
  /** Puede estar vacío si el cliente no dejó texto. */
  comment: string;
  referenceType: SellerReviewReferenceType;
  /** Identificador del producto cuando `referenceType === 'PRODUCT'`. */
  productId?: string | undefined;
  /** Sólo aplica cuando `referenceType === 'PRODUCT'`. */
  productName?: string | undefined;
  /** Fecha ISO 8601. */
  createdAt: string;
};
