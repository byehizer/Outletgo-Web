/** Tienda asociada a una cuenta vendedor (panel Admin, Paso 21). */
export type SellerAccountStore = {
  id: string;
  businessName: string;
  cuit: string;
  address: string;
  description: string;
  headerImageUrl: string | null;
  /** Promedio de calificación; `null` si aún no hay reseñas. */
  ratingAvg: number | null;
  ratingCount: number;
};

/** Cuenta vendedor gestionada por Admin. */
export type SellerAccount = {
  id: string;
  email: string;
  isActive: boolean;
  /** Fecha ISO 8601 de alta de la cuenta. */
  createdAt: string;
  store: SellerAccountStore;
};

/** Alta de vendedor desde Admin. */
export type CreateSellerAccountDTO = {
  email: string;
  temporaryPassword: string;
  businessName: string;
  cuit: string;
  address: string;
  description?: string;
};

/** Actualización de vendedor desde Admin. */
export type UpdateSellerAccountDTO = {
  email: string;
  businessName: string;
  cuit: string;
  address: string;
  description?: string;
  headerImageUrl?: string | null;
};

/** Desactivación de cuenta vendedor (requiere motivo). */
export type DeactivateSellerDTO = {
  reason: string;
};
