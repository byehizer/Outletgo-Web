import {
  AlertTriangle,
  Check,
  ShoppingCart,
  Star,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useReducer } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { DataTable, type DataColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { Skeleton } from '../../../components/Skeleton';
import { StatCard } from '../../../components/StatCard';
import { fetchSellerDashboard } from '../../../features/dashboard/dashboardApi';
import { OrderStatusBadge } from '../../../features/orders/OrderStatusBadge';
import { RatingStars } from '../../../features/reviews/RatingStars';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../lib/http/apiClient';
import { ROUTES, sellerOrderDetailPath, sellerProductEditPath } from '../../../lib/constants';
import { cn } from '../../../lib/cn';
import { formatARS, formatDate } from '../../../lib/format';

import type {
  SellerDashboardCriticalVariation,
  SellerDashboardData,
  SellerDashboardLowStockProduct,
  SellerDashboardRecentOrder,
  SellerDashboardRecentReview,
} from '../../../types/dashboard';
import { ORDER_STATUS, type OrderStatus } from '../../../types/order';

type DashboardUiState = {
  data: SellerDashboardData | null;
  initialLoading: boolean;
  loadError: string | null;
};

type DashboardAction =
  | { type: 'FETCH_BEGIN' }
  | { type: 'FETCH_OK'; payload: SellerDashboardData }
  | { type: 'FETCH_ERR'; payload: string };

const initialState: DashboardUiState = {
  data: null,
  initialLoading: true,
  loadError: null,
};

function dashboardReducer(state: DashboardUiState, action: DashboardAction): DashboardUiState {
  switch (action.type) {
    case 'FETCH_BEGIN':
      return { ...state, initialLoading: true, loadError: null };
    case 'FETCH_OK':
      return {
        data: action.payload,
        initialLoading: false,
        loadError: null,
      };
    case 'FETCH_ERR':
      return {
        data: null,
        initialLoading: false,
        loadError: action.payload,
      };
    default:
      return state;
  }
}

function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) {
    return 'Buen día';
  }
  if (hour >= 12 && hour < 20) {
    return 'Buenas tardes';
  }
  return 'Buenas noches';
}

function formatCriticalVariationChip(v: SellerDashboardCriticalVariation): string {
  return `T: ${v.size} / C: ${v.color} — ${v.stock} u.`;
}

const DASHBOARD_ACTIONABLE_STATUSES = new Set<OrderStatus>([
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY_FOR_PICKUP,
  ORDER_STATUS.STOCK_ISSUE,
]);

const DASHBOARD_ORDER_SORT_PRIORITY: Partial<Record<OrderStatus, number>> = {
  [ORDER_STATUS.STOCK_ISSUE]: -1,
  [ORDER_STATUS.PENDING]: 0,
  [ORDER_STATUS.PREPARING]: 1,
  [ORDER_STATUS.READY_FOR_PICKUP]: 2,
};

function selectDashboardOrders(orders: SellerDashboardRecentOrder[]): SellerDashboardRecentOrder[] {
  return orders
    .filter((o) => DASHBOARD_ACTIONABLE_STATUSES.has(o.status))
    .sort((a, b) => {
      const pa = DASHBOARD_ORDER_SORT_PRIORITY[a.status] ?? 99;
      const pb = DASHBOARD_ORDER_SORT_PRIORITY[b.status] ?? 99;
      if (pa !== pb) {
        return pa - pb;
      }
      return Date.parse(b.orderDate) - Date.parse(a.orderDate);
    })
    .slice(0, 5);
}

function formatReviewComment(comment: string | null): { text: string; muted: boolean } {
  const trimmed = comment?.trim();
  if (!trimmed) {
    return { text: 'Sin comentario', muted: true };
  }
  if (trimmed.length <= 80) {
    return { text: trimmed, muted: false };
  }
  return { text: `${trimmed.slice(0, 80)}…`, muted: false };
}

function SectionHeader({
  title,
  linkLabel,
  linkTo,
}: {
  title: string;
  linkLabel: string;
  linkTo: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <Link
        to={linkTo}
        className="text-sm font-medium text-[var(--text-link)] underline-offset-4 hover:underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

function OrdersTableSkeleton() {
  return (
    <div className="-mx-1 overflow-x-auto" aria-hidden>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {['Cliente', 'Total', 'Estado', 'Fecha'].map((col) => (
              <th
                key={col}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i} className="bg-[var(--bg-card)]">
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-5 w-24 rounded-full" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewsListSkeleton() {
  return (
    <ul className="divide-y divide-[var(--border)]" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-full max-w-md" />
        </li>
      ))}
    </ul>
  );
}

function RecentReviewItem({ review }: { review: SellerDashboardRecentReview }) {
  const comment = formatReviewComment(review.comment);

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <RatingStars rating={review.rating} />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {review.authorDisplayName}
          </span>
        </div>
        <time
          dateTime={review.createdAt}
          className="shrink-0 text-xs text-[var(--text-muted)]"
        >
          {formatDate(review.createdAt)}
        </time>
      </div>
      <p
        className={cn(
          'mt-2 text-sm',
          comment.muted ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-secondary)]',
        )}
      >
        {comment.text}
      </p>
    </li>
  );
}

function LowStockListSkeleton() {
  return (
    <ul className="space-y-4" aria-hidden>
      {Array.from({ length: 2 }, (_, i) => (
        <li key={i} className="flex gap-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-36 rounded-full" />
              <Skeleton className="h-5 w-32 rounded-full" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LowStockProductItem({ product }: { product: SellerDashboardLowStockProduct }) {
  return (
    <li>
      <Link
        to={sellerProductEditPath(product.id)}
        className="-mx-2 flex cursor-pointer gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--bg-hover)]/60"
      >
        <img
          src={product.imageUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {product.name}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {product.criticalVariations.map((v, ix) => (
              <span
                key={`${v.size}-${v.color}-${String(ix)}`}
                className="inline-flex rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger"
              >
                {formatCriticalVariationChip(v)}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </li>
  );
}

function LowStockSuccessEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-input)]/40 px-6 py-10 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-success/15 text-success">
        <Check className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)]">
        Todos tus productos tienen stock suficiente
      </p>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  useEffect(() => {
    let cancelled = false;

    dispatch({ type: 'FETCH_BEGIN' });

    void fetchSellerDashboard()
      .then((payload) => {
        if (!cancelled) {
          dispatch({ type: 'FETCH_OK', payload });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError) {
          dispatch({ type: 'FETCH_ERR', payload: error.message });
        } else if (error instanceof Error) {
          dispatch({ type: 'FETCH_ERR', payload: error.message });
        } else {
          dispatch({ type: 'FETCH_ERR', payload: 'No se pudo cargar el resumen.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = getTimeGreeting();
  const sellerName = user?.name?.trim() || 'vendedor';
  const loading = state.initialLoading;
  const kpis = state.data?.kpis;
  const recentOrders = useMemo(
    () => selectDashboardOrders(state.data?.recentOrders ?? []),
    [state.data?.recentOrders],
  );
  const recentReviews = state.data?.recentReviews ?? [];
  const lowStockProducts = state.data?.lowStockProducts ?? [];

  const orderColumns: DataColumn<SellerDashboardRecentOrder>[] = useMemo(
    (): DataColumn<SellerDashboardRecentOrder>[] => [
      {
        id: 'client',
        header: 'Cliente',
        wrap: true,
        cell: (row) => (
          <span className="font-medium text-[var(--text-primary)]">
            {row.buyer.displayName?.trim() || 'Comprador'}
          </span>
        ),
      },
      {
        id: 'total',
        header: 'Total',
        align: 'right',
        cell: (row) => formatARS(row.subtotalArs),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: (row) => <OrderStatusBadge status={row.status} />,
      },
      {
        id: 'date',
        header: 'Fecha',
        cell: (row) => (
          <span className="text-[var(--text-secondary)]">{formatDate(row.orderDate)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-display-md text-[var(--text-primary)]">
          {greeting}, {sellerName}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Resumen rápido de tu tienda
        </p>
      </header>

      {state.loadError ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {state.loadError}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pedidos pendientes"
          value={kpis?.pendingOrders ?? 0}
          icon={ShoppingCart}
          iconColor="blue"
          isLoading={loading}
          to={ROUTES.sellerOrders}
          footer={
            !loading && (kpis?.stockIssueOrders ?? 0) > 0 ?
              <p className="text-xs font-medium text-warning">
                ⚠️ {kpis?.stockIssueOrders} con problemas de stock
              </p>
            : undefined
          }
        />
        <StatCard
          label="Ventas del mes"
          value={kpis != null ? formatARS(kpis.monthlyRevenue) : formatARS(0)}
          icon={TrendingUp}
          iconColor="green"
          isLoading={loading}
        />
        <StatCard
          label="Productos con stock bajo"
          value={kpis?.lowStockProducts ?? 0}
          icon={AlertTriangle}
          iconColor="yellow"
          iconPulse={!loading && (kpis?.lowStockProducts ?? 0) > 0}
          isLoading={loading}
          to={ROUTES.sellerProducts}
        />
        <StatCard
          label="Rating de mi tienda"
          value={
            kpis?.storeRatingAvg != null ? kpis.storeRatingAvg.toFixed(1) : '—'
          }
          icon={Star}
          iconColor="yellow"
          isLoading={loading}
          to={ROUTES.sellerReviews}
          footer={
            <p className="text-xs text-[var(--text-muted)]">
              basado en {kpis?.storeRatingCount ?? 0} reseñas
            </p>
          }
        />
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <SectionHeader
          title="Últimas reseñas"
          linkLabel="Ver todas"
          linkTo={ROUTES.sellerReviews}
        />

        {loading ? (
          <ReviewsListSkeleton />
        ) : recentReviews.length === 0 ? (
          <EmptyState title="Todavía no recibís reseñas" />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {recentReviews.slice(0, 3).map((review) => (
              <RecentReviewItem key={review.id} review={review} />
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div
          className={cn(
            'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 lg:col-span-3',
          )}
        >
          <SectionHeader
            title="Últimos pedidos"
            linkLabel="Ver todos"
            linkTo={ROUTES.sellerOrders}
          />

          {loading ? (
            <OrdersTableSkeleton />
          ) : recentOrders.length === 0 ? (
            <EmptyState title="Todavía no recibiste pedidos" />
          ) : (
            <DataTable<SellerDashboardRecentOrder>
              columns={orderColumns}
              data={recentOrders}
              getRowKey={(row) => row.id}
              className="-mx-1"
              onRowClick={(row) => navigate(sellerOrderDetailPath(row.id))}
            />
          )}
        </div>

        <div
          className={cn(
            'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 lg:col-span-2',
          )}
        >
          <SectionHeader
            title="Stock bajo"
            linkLabel="Ver productos"
            linkTo={ROUTES.sellerProducts}
          />

          {loading ? (
            <LowStockListSkeleton />
          ) : lowStockProducts.length === 0 ? (
            <LowStockSuccessEmpty />
          ) : (
            <ul className="space-y-4">
              {lowStockProducts.map((product) => (
                <LowStockProductItem key={product.id} product={product} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
