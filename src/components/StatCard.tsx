import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '../lib/cn';

import { Skeleton } from './Skeleton';

export type StatCardIconColor = 'blue' | 'green' | 'yellow' | 'red';

const iconColorClasses: Record<
  StatCardIconColor,
  { wrap: string; icon: string }
> = {
  blue: { wrap: 'bg-brand/10', icon: 'text-brand' },
  green: { wrap: 'bg-success/15', icon: 'text-success' },
  yellow: { wrap: 'bg-warning/15', icon: 'text-warning' },
  red: { wrap: 'bg-danger/15', icon: 'text-danger' },
};

export type StatCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: StatCardIconColor;
  trend?: string;
  trendPositive?: boolean;
  /** Pulso suave en el ícono (ej. alertas activas). */
  iconPulse?: boolean;
  /** Contenido opcional debajo del valor (ej. estrellas, subtítulo). */
  footer?: ReactNode;
  isLoading?: boolean;
  /** Si se define, toda la card navega a esta ruta al hacer click. */
  to?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  trend,
  trendPositive,
  iconPulse = false,
  footer,
  isLoading = false,
  to,
  className,
}: StatCardProps) {
  const colors = iconColor ? iconColorClasses[iconColor] : null;

  const cardClassName = cn(
    'rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5',
    to ? 'block transition-colors hover:bg-[var(--bg-hover)]/60 cursor-pointer' : '',
    className,
  );

  if (isLoading) {
    return (
      <div className={cardClassName} aria-hidden>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            {footer != null ? <Skeleton className="h-3 w-32" /> : null}
            {trend !== undefined ? <Skeleton className="h-3 w-32" /> : null}
          </div>
          {Icon ? <Skeleton className="size-11 shrink-0 rounded-xl" /> : null}
        </div>
      </div>
    );
  }

  const content = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
        <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[var(--text-primary)]">
          {value}
        </p>
        {footer ? <div className="mt-2">{footer}</div> : null}
        {trend ? (
          <p
            className={cn(
              'mt-2 text-xs font-medium',
              trendPositive === true
                ? 'text-success'
                : trendPositive === false
                  ? 'text-danger'
                  : 'text-[var(--text-muted)]',
            )}
          >
            {trend}
          </p>
        ) : null}
      </div>
      {Icon && colors ? (
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            colors.wrap,
          )}
        >
          <Icon
            className={cn(
              'size-5',
              colors.icon,
              iconPulse ? 'animate-pulse motion-reduce:animate-none' : '',
            )}
            aria-hidden
          />
        </div>
      ) : null}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
