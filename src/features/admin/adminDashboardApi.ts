import { ADMIN_DASHBOARD_API_PATH } from '../../lib/constants';
import { apiClient } from '../../lib/http/apiClient';
import { coerceAdminOrder } from './adminOrdersApi';
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

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const raw = await apiClient.get<unknown>(ADMIN_DASHBOARD_API_PATH);
  return coerceAdminDashboardStats(raw);
}
