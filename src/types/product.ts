/**
 * Estados de producto: pausa por vendedor vs. inhabilitación por admin (RF-WEB-05.3).
 */
export const PRODUCT_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED_BY_SELLER: 'PAUSED_BY_SELLER',
  DISABLED_BY_ADMIN: 'DISABLED_BY_ADMIN',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

/** Fila típica de listado seller (precio/base + stock agregado). */
export type ProductSummary = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  price: number;
  totalStock: number;
  status: ProductStatus;
};

/** Textos cortos para selects y badges en el panel. */
export const PRODUCT_STATUS_LABEL_ES: Record<ProductStatus, string> = {
  ACTIVE: 'Activo',
  PAUSED_BY_SELLER: 'Pausado (vendedor)',
  DISABLED_BY_ADMIN: 'Inhabilitado (admin)',
};

export function isProductStatus(value: string): value is ProductStatus {
  return (Object.values(PRODUCT_STATUS) as string[]).includes(value);
}

/** Variación en formulario seller (Paso 13). */
export type ProductVariationFormValue = {
  size: string;
  color: string;
  stock: number;
};

/** Producto completo para alta/edición seller. */
export type SellerProductDetail = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  tags: string[];
  basePrice: number;
  imageUrls: string[];
  status: ProductStatus;
  variations: ProductVariationFormValue[];
};
