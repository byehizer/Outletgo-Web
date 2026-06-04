import { cn } from '../../lib/cn';
import {
  ORDER_STATUS_LABEL_ES,
  ORDER_STORE_STATUS_LABEL_ES,
  type OrderStatus,
  type OrderStoreStatus,
} from '../../types/order';

const ALL_STATUS_BADGE_CLASSES: Record<OrderStatus | OrderStoreStatus, string> = {
  PENDING: 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]',
  PAID: 'bg-brand/15 text-brand',
  PREPARING: 'bg-warning/15 text-warning',
  COLLECTING: 'bg-brand/15 text-brand',
  CONSOLIDATED: 'bg-brand/15 text-brand',
  READY_FOR_PICKUP: 'bg-success/15 text-success',
  SHIPPED: 'bg-brand/15 text-brand',
  IN_TRANSIT: 'bg-brand/15 text-brand',
  DELIVERED: 'bg-success/15 text-success',
  COLLECTED_BY_OUTLETGO: 'bg-success/15 text-success',
  CANCELED: 'bg-danger/15 text-danger',
  STOCK_ISSUE: 'border border-warning/50 bg-warning/10 text-warning',
};

const ALL_STATUS_LABELS: Record<OrderStatus | OrderStoreStatus, string> = {
  ...ORDER_STATUS_LABEL_ES,
  ...ORDER_STORE_STATUS_LABEL_ES,
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus | OrderStoreStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        ALL_STATUS_BADGE_CLASSES[status],
        className,
      )}
    >
      {ALL_STATUS_LABELS[status] ?? status}
    </span>
  );
}
