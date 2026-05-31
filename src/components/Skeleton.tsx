import { cn } from '../lib/cn';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';

export type SkeletonProps = {
  variant?: SkeletonVariant;
  className?: string;
};

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded-md',
  circular: 'size-10 shrink-0 rounded-full',
  rectangular: 'h-20 w-full rounded-md',
};

/**
 * Placeholder pulsante para estados de carga (lista, tabla, texto).
 * Usá `variant` para la forma base y `className` para ajustar tamaño o ancho.
 */
export function Skeleton({ variant, className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-[var(--bg-input)] motion-reduce:animate-none',
        variant != null ? VARIANT_CLASSES[variant] : 'rounded-md',
        className,
      )}
    />
  );
}
