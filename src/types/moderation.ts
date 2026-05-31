import type { ProductStatus } from './product';

export const REPORT_STATUS = {
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export const REFERENCE_TYPE = {
  STORE: 'STORE',
  PRODUCT: 'PRODUCT',
} as const;

export type ReferenceType = (typeof REFERENCE_TYPE)[keyof typeof REFERENCE_TYPE];

/** Imagen de producto en moderación Admin. */
export type AdminProductImage = {
  id: string;
  imageUrl: string;
};

/** Variación de stock en moderación Admin. */
export type AdminProductVariation = {
  id: string;
  size: string;
  color: string;
  stock: number;
};

/** Etiqueta asociada al producto en moderación Admin. */
export type AdminProductTag = {
  id: string;
  tagName: string;
};

/** Acción registrada en el historial de moderación. */
export const MODERATION_ACTION = {
  DISABLED: 'DISABLED',
  REACTIVATED: 'REACTIVATED',
} as const;

export type ModerationAction = (typeof MODERATION_ACTION)[keyof typeof MODERATION_ACTION];

/** Entrada del historial de moderación de un producto. */
export type ModerationEntry = {
  id: string;
  action: ModerationAction;
  adminEmail: string;
  /** Motivo de inhabilitación; `null` en reactivaciones. */
  reason: string | null;
  /** Fecha ISO 8601 de la acción. */
  createdAt: string;
};

/** Producto completo para moderación Admin (Paso 23). */
export type AdminProduct = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  status: ProductStatus;
  store: {
    id: string;
    businessName: string;
  };
  category: {
    id: string;
    name: string;
  };
  images: AdminProductImage[];
  variations: AdminProductVariation[];
  tags: AdminProductTag[];
  ratingAvg: number | null;
  ratingCount: number;
  /** Fecha ISO 8601 de alta del producto. */
  createdAt: string;
  moderationHistory: ModerationEntry[];
};

/** Inhabilitación de producto por Admin (requiere motivo). */
export type DisableProductDTO = {
  reason: string;
};
