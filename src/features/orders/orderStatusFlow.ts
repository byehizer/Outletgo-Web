import { ORDER_STORE_STATUS, type OrderStoreStatus } from '../../types/order';

/**
 * Progresión seller post-pago (Paso 15): preparación física hasta listo para retiro.
 */
export function getNextSellerOrderStatus(status: OrderStoreStatus): OrderStoreStatus | null {
  if (status === ORDER_STORE_STATUS.PAID) {
    return ORDER_STORE_STATUS.PREPARING;
  }
  if (status === ORDER_STORE_STATUS.PREPARING) {
    return ORDER_STORE_STATUS.READY_FOR_PICKUP;
  }
  return null;
}

/** El botón "Avanzar estado" sólo aplica dentro de ese subflujo. */
export function canSellerAdvanceOrderStatus(status: OrderStoreStatus): boolean {
  return getNextSellerOrderStatus(status) !== null;
}
