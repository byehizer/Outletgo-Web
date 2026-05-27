import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-input)]/40 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon className="size-6" aria-hidden />
        </div>
      ) : null}
      <p className="font-display text-base font-semibold text-[var(--text-primary)]">{title}</p>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
