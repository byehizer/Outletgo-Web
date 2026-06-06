import { DEV_ORDERS } from './adminOrdersApi';
import type { AdminOrder } from '../../types/order';

export type AdminDashboardStats = {
  totalGmv: number;
  totalCommissions: number;
  totalServiceFees: number;
  totalOrdersCount: number;
  activeStoresCount: number;
  pendingReportsCount: number;
  pendingRefundsCount: number;
  stockIssuesCount: number;
  unreadSupportConversationsCount: number;
  recentOrders: AdminOrder[];
};

function devDelay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function mockClone<T>(v: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(v);
  }
  return JSON.parse(JSON.stringify(v)) as T;
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  if (import.meta.env.DEV) {
    const orders = Object.values(DEV_ORDERS);

    // Métricas financieras basadas en órdenes activas (no canceladas)
    const activeOrders = orders.filter((o) => o.status !== 'CANCELED');
    const totalGmv = activeOrders.reduce((sum, o) => sum + o.totalArs, 0);
    const totalServiceFees = activeOrders.reduce((sum, o) => sum + (o.serviceFee ?? 0), 0);

    // Sumar comisiones de todos los slices no cancelados
    let totalCommissions = 0;
    for (const order of activeOrders) {
      for (const slice of order.stores) {
        if (slice.status !== 'CANCELED') {
          totalCommissions += slice.commissionAmount ?? 0;
        }
      }
    }

    // Alertas operacionales dinámicas
    const stockIssuesCount = orders.reduce(
      (sum, o) => sum + o.stores.filter((s) => s.status === 'STOCK_ISSUE').length,
      0,
    );
    const pendingRefundsCount = orders.reduce(
      (sum, o) => sum + o.stores.filter((s) => s.status === 'CANCELED' && !s.refund).length,
      0,
    );

    // Métricas estáticas / mockeadas complementarias
    const activeStoresCount = 5;
    const pendingReportsCount = 3;
    const unreadSupportConversationsCount = 2;

    // Obtener los 5 pedidos más recientes
    const recentOrders = [...orders]
      .sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate))
      .slice(0, 5)
      .map((o) => mockClone(o));

    return devDelay({
      totalGmv,
      totalCommissions,
      totalServiceFees,
      totalOrdersCount: orders.length,
      activeStoresCount,
      pendingReportsCount,
      pendingRefundsCount,
      stockIssuesCount,
      unreadSupportConversationsCount,
      recentOrders,
    });
  }

  // Integración real con endpoints del backend en producción
  // En producción, el backend consolidaría estas métricas en un único endpoint
  throw new Error('Endpoint de dashboard no configurado en producción.');
}
