/**
 * Representa un punto de retiro físico de OutletGo (Paso 4.6).
 * Sincronizado con la firma de datos del modelo mobile y de la base de datos (DER v2).
 */
export type PickupPoint = {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
  /** Horario de atención en texto libre. */
  businessHours: string;
  /** Indica si está activo y disponible para ser seleccionado por compradores. */
  isActive: boolean;
};

/**
 * Payload requerido para dar de alta o actualizar un punto de retiro.
 */
export type PickupPointSavePayload = Omit<PickupPoint, 'id'>;
