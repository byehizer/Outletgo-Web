import { cn } from '../../lib/cn';
import { PRODUCT_STATUS_LABEL_ES, type ProductStatus } from '../../types/product';

const statusBadgeClass: Record<ProductStatus, string> = {
  ACTIVE: 'bg-success/15 text-success',
  PAUSED_BY_SELLER: 'bg-warning/15 text-warning',
  DISABLED_BY_ADMIN: 'bg-danger/15 text-danger',
};

export function ProductStatusBadge({
  status,
  className,
}: {
  status: ProductStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        statusBadgeClass[status],
        className,
      )}
    >
      {PRODUCT_STATUS_LABEL_ES[status]}
    </span>
  );
}
