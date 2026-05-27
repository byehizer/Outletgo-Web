import { cn } from '../lib/cn';

export type SkeletonProps = {
  className?: string;
};

/**
 * Placeholder pulsante para estados de carga (lista, tabla, texto).
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-[var(--bg-input)]', className)}
    />
  );
}
