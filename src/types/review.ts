/**
 * Reseña recibida por la tienda o un producto — sólo lectura en panel vendedor (Paso 17).
 * Relaciones explícitas: `storeId` obligatorio; `productId` nulo en reseñas de tienda.
 */
export type SellerReview = {
  id: string;
  authorName: string;
  /** Calificación entre 1 y 5 inclusives. */
  rating: number;
  /** Puede estar vacío si el cliente no dejó texto. */
  comment: string;
  storeId: string;
  /** `null` cuando la reseña es sobre la tienda (sin producto). */
  productId: string | null;
  /** Nombre denormalizado del producto; `null` si no aplica. */
  productName: string | null;
  imageUrls: string[];
  /** Fecha ISO 8601. */
  createdAt: string;
};

/** Reseña dirigida a un producto (FK `productId` presente). */
export function isProductSellerReview(review: SellerReview): boolean {
  return review.productId != null;
}
