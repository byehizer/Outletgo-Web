import { ORDER_STATUS, type OrderStatus } from '../../types/order';

/**
 * Progresión seller post-pago (Paso 15): preparación física hasta listo para retiro.
 */
export function getNextSellerOrderStatus(status: OrderStatus): OrderStatus | null {
  if (status === ORDER_STATUS.PAID) {
    return ORDER_STATUS.PREPARING;
  }
  if (status === ORDER_STATUS.PREPARING) {
    return ORDER_STATUS.READY_FOR_PICKUP;
  }
  return null;
}

/** El botón "Avanzar estado" sólo aplica dentro de ese subflujo. */
export function canSellerAdvanceOrderStatus(status: OrderStatus): boolean {
  return getNextSellerOrderStatus(status) !== null;
}
