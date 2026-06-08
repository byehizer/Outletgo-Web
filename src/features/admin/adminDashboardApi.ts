import { ADMIN_DASHBOARD_API_PATH } from '../../lib/constants';
import { apiClient } from '../../lib/http/apiClient';
import { DEV_ORDERS, coerceAdminOrder } from './adminOrdersApi';
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

type JsonRecord = Record<string, unknown>;

function pickNumber(v: unknown): number {
  const n =
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : typeof v === 'string' && Number.isFinite(Number.parseFloat(v))
        ? Number.parseFloat(v)
        : NaN;
  return Number.isFinite(n) ? n : 0;
}

function coerceAdminDashboardStats(payload: unknown): AdminDashboardStats {
  const root = typeof payload === 'object' && payload !== null ? (payload as JsonRecord) : {};

  const totalGmv = pickNumber(root.totalGmv ?? root.total_gmv ?? root.gmv);
  const totalCommissions = pickNumber(root.totalCommissions ?? root.total_commissions ?? root.commissions);
  const totalServiceFees = pickNumber(root.totalServiceFees ?? root.total_service_fees ?? root.serviceFees);
  const totalOrdersCount = Math.max(0, Math.floor(pickNumber(root.totalOrdersCount ?? root.total_orders_count ?? root.ordersCount ?? root.totalOrders)));
  const activeStoresCount = Math.max(0, Math.floor(pickNumber(root.activeStoresCount ?? root.active_stores_count ?? root.storesCount ?? root.activeStores)));
  const pendingReportsCount = Math.max(0, Math.floor(pickNumber(root.pendingReportsCount ?? root.pending_reports_count ?? root.reportsCount ?? root.pendingReports)));
  const pendingRefundsCount = Math.max(0, Math.floor(pickNumber(root.pendingRefundsCount ?? root.pending_refunds_count ?? root.refundsCount ?? root.pendingRefunds)));
  const stockIssuesCount = Math.max(0, Math.floor(pickNumber(root.stockIssuesCount ?? root.stock_issues_count ?? root.stockIssues)));
  const unreadSupportConversationsCount = Math.max(0, Math.floor(pickNumber(root.unreadSupportConversationsCount ?? root.unread_support_conversations_count ?? root.unreadSupportConversations)));

  const recentRaw = root.recentOrders ?? root.recent_orders ?? root.orders;
  const recentOrders: AdminOrder[] = [];
  if (Array.isArray(recentRaw)) {
    for (const row of recentRaw) {
      if (typeof row === 'object' && row !== null) {
        const o = coerceAdminOrder(row as JsonRecord);
        if (o) {
          recentOrders.push(o);
        }
      }
    }
  }

  return {
    totalGmv,
    totalCommissions,
    totalServiceFees,
    totalOrdersCount,
    activeStoresCount,
    pendingReportsCount,
    pendingRefundsCount,
    stockIssuesCount,
    unreadSupportConversationsCount,
    recentOrders,
  };
}

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
    // Asegurarnos de que DEV_ORDERS está definido
    if (!DEV_ORDERS) {
      console.error('DEV_ORDERS no está definido. Posible dependencia circular.');
      throw new Error('No se pudieron cargar los datos mockeados.');
    }

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
  const raw = await apiClient.get<unknown>(ADMIN_DASHBOARD_API_PATH);
  return coerceAdminDashboardStats(raw);
}
