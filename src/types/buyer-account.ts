/** Estadísticas de actividad del comprador (panel Admin, Paso 22). */
export type BuyerAccountStats = {
  totalOrders: number;
  totalReviews: number;
};

/** Cuenta comprador gestionada por Admin. */
export type BuyerAccount = {
  id: string;
  email: string;
  /** Puede ser `null` si el comprador aún no completó su perfil. */
  name: string | null;
  isActive: boolean;
  /** Fecha ISO 8601 de alta de la cuenta. */
  createdAt: string;
  stats: BuyerAccountStats;
};

/** Actualización de email desde soporte Admin. */
export type UpdateBuyerEmailDTO = {
  email: string;
};

/** Reseteo de contraseña temporal desde soporte Admin. */
export type ResetBuyerPasswordDTO = {
  temporaryPassword: string;
};

/** Desactivación de cuenta comprador (requiere motivo). */
export type DeactivateBuyerDTO = {
  reason: string;
};
