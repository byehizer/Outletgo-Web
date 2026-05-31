import { cn } from '../../lib/cn';
import { ORDER_STATUS_LABEL_ES, type OrderStatus } from '../../types/order';

const statusBadgeClass: Record<OrderStatus, string> = {
  PENDING: 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]',
  PAID: 'bg-brand/15 text-brand',
  PREPARING: 'bg-warning/15 text-warning',
  READY_FOR_PICKUP: 'bg-success/15 text-success',
  SHIPPED: 'bg-brand/15 text-brand',
  DELIVERED: 'bg-success/15 text-success',
  CANCELED: 'bg-danger/15 text-danger',
  STOCK_ISSUE:
    'border border-warning/50 bg-warning/10 text-warning',
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        statusBadgeClass[status],
        className,
      )}
    >
      {ORDER_STATUS_LABEL_ES[status]}
    </span>
  );
}
