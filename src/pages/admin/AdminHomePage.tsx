import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Percent,
  Coins,
  ShoppingCart,
  AlertTriangle,
  CreditCard,
  MessageSquare,
  Flag,
  Eye,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatARS, formatDate } from '../../lib/format';
import { cn } from '../../lib/cn';
import { ApiError } from '../../lib/http/apiClient';
import { fetchAdminDashboardStats, type AdminDashboardStats } from '../../features/admin/adminDashboardApi';
import {
  getAdminOrderAggregateStatus,
  type AdminOrder,
  type AdminOrderAggregateStatus,
} from '../../types/order';

const AGGREGATE_BADGE: Record<
  AdminOrderAggregateStatus,
  { label: string; className: string }
> = {
  STOCK_ISSUE: {
    label: 'Problema de stock',
    className: 'border border-warning/50 bg-warning/10 text-warning',
  },
  PARTIAL_CANCEL: {
    label: 'Cancelación parcial',
    className: 'bg-danger/15 text-danger',
  },
  COMPLETED: {
    label: 'Completado',
    className: 'bg-success/15 text-success',
  },
  PENDING: {
    label: 'Pendiente',
    className: 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]',
  },
  IN_PROGRESS: {
    label: 'En progreso',
    className: 'bg-brand/15 text-brand',
  },
  CANCELED: {
    label: 'Cancelado',
    className: 'bg-danger/15 text-danger',
  },
};

function AdminOrderAggregateBadge({ order }: { order: AdminOrder }) {
  const agg = getAdminOrderAggregateStatus(order.stores, order.status);
  const cfg = AGGREGATE_BADGE[agg];
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-36 mt-2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mt-3" />
          ))}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <Skeleton className="h-6 w-36 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mt-3" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      setLoading(true);
      try {
        const data = await fetchAdminDashboardStats();
        if (!cancelled) {
          setStats(data);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          showError(err.message);
        } else if (err instanceof Error) {
          showError(err.message);
        } else {
          showError('No se pudieron cargar las estadísticas del dashboard.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [showError]);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-display-md text-[var(--text-primary)]">Resumen administrativo</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Cargando métricas de la plataforma...</p>
        </header>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-[var(--text-primary)]">
            Resumen administrativo
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Sesión: <span className="font-medium text-[var(--text-secondary)]">{user?.email}</span>
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
          <TrendingUp className="size-4 text-success" />
          Operando en modo de simulación (DEV)
        </div>
      </header>

      {/* Grid de KPIs principales */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* GMV */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Venta Bruta (GMV)</span>
            <div className="rounded-lg bg-success/10 p-2 text-success">
              <DollarSign className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {formatARS(stats.totalGmv)}
            </span>
            <span className="block mt-1 text-[11px] text-[var(--text-muted)]">Volumen de pedidos activos</span>
          </div>
        </div>

        {/* Comisiones */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Comisiones Totales</span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500 dark:text-purple-400">
              <Percent className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {formatARS(stats.totalCommissions)}
            </span>
            <span className="block mt-1 text-[11px] text-[var(--text-muted)]">Retenido por locales</span>
          </div>
        </div>

        {/* Tarifas de Servicio */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Tarifas Comprador</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500 dark:text-blue-400">
              <Coins className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {formatARS(stats.totalServiceFees)}
            </span>
            <span className="block mt-1 text-[11px] text-[var(--text-muted)]">Tarifas de envío y pedido</span>
          </div>
        </div>

        {/* Órdenes Totales */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Pedidos Totales</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500 dark:text-amber-400">
              <ShoppingCart className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {stats.totalOrdersCount}
            </span>
            <span className="block mt-1 text-[11px] text-[var(--text-muted)]">Órdenes totales registradas</span>
          </div>
        </div>
      </section>

      {/* Grid Secundario: Pedidos Recientes vs Alertas */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna Izquierda: Pedidos Recientes */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <h2 className="font-display text-base font-bold text-[var(--text-primary)]">Pedidos Recientes</h2>
            <Link
              to="/admin/orders"
              className="text-xs font-semibold text-[var(--text-link)] hover:underline flex items-center gap-0.5"
            >
              Ver todos <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm text-left">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-2.5">Pedido</th>
                  <th className="py-2.5">Comprador</th>
                  <th className="py-2.5">Total</th>
                  <th className="py-2.5">Estado</th>
                  <th className="py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="py-3 font-semibold text-[var(--text-primary)]">
                      <div>
                        <span>#{order.id.slice(-6)}</span>
                        <span className="block text-[11px] font-normal text-[var(--text-muted)]">
                          {formatDate(order.orderDate)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-[var(--text-secondary)]">
                      <div>
                        <span className="block font-medium text-[var(--text-primary)]">
                          {order.buyer.displayName || 'Sin nombre'}
                        </span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          {order.buyer.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-[var(--text-primary)] tabular-nums">
                      {formatARS(order.totalArs)}
                    </td>
                    <td className="py-3">
                      <AdminOrderAggregateBadge order={order} />
                    </td>
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition"
                        title="Ver detalle"
                      >
                        <Eye className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna Derecha: Alertas Operativas */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-4">
            Operaciones y Alertas
          </h2>
          <div className="space-y-3">
            {/* Problema de Stock */}
            <div
              className={cn(
                'p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition',
                stats.stockIssuesCount > 0
                  ? 'border-warning/30 bg-warning/5 hover:bg-warning/10'
                  : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]'
              )}
              onClick={() => navigate('/admin/orders?status=STOCK_ISSUE')}
            >
              <div className="flex items-center gap-3">
                <div className={cn('rounded-lg p-2', stats.stockIssuesCount > 0 ? 'bg-warning/15 text-warning' : 'bg-[var(--bg-input)] text-[var(--text-muted)]')}>
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] block">Problemas de Stock</span>
                  <span className="text-xs text-[var(--text-muted)]">Slices pendientes de resolución</span>
                </div>
              </div>
              <span className={cn('text-lg font-bold tabular-nums', stats.stockIssuesCount > 0 ? 'text-warning' : 'text-[var(--text-primary)]')}>
                {stats.stockIssuesCount}
              </span>
            </div>

            {/* Reembolsos Pendientes */}
            <div
              className={cn(
                'p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition',
                stats.pendingRefundsCount > 0
                  ? 'border-danger/30 bg-danger/5 hover:bg-danger/10'
                  : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]'
              )}
              onClick={() => navigate('/admin/orders')}
            >
              <div className="flex items-center gap-3">
                <div className={cn('rounded-lg p-2', stats.pendingRefundsCount > 0 ? 'bg-danger/15 text-danger' : 'bg-[var(--bg-input)] text-[var(--text-muted)]')}>
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] block">Reembolsos Pendientes</span>
                  <span className="text-xs text-[var(--text-muted)]">Slices cancelados por liquidar</span>
                </div>
              </div>
              <span className={cn('text-lg font-bold tabular-nums', stats.pendingRefundsCount > 0 ? 'text-danger' : 'text-[var(--text-primary)]')}>
                {stats.pendingRefundsCount}
              </span>
            </div>

            {/* Soporte de Tiendas */}
            <div
              className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--bg-hover)] transition"
              onClick={() => navigate('/admin/support')}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500 dark:text-blue-400">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] block">Soporte a Tiendas</span>
                  <span className="text-xs text-[var(--text-muted)]">Conversaciones sin responder</span>
                </div>
              </div>
              <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                {stats.unreadSupportConversationsCount}
              </span>
            </div>

            {/* Denuncias de Moderación */}
            <div
              className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--bg-hover)] transition"
              onClick={() => navigate('/admin/reports')}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2 text-red-500">
                  <Flag className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] block">Reportes de Moderación</span>
                  <span className="text-xs text-[var(--text-muted)]">Denuncias activas pendientes</span>
                </div>
              </div>
              <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                {stats.pendingReportsCount}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
