import { Star } from 'lucide-react';

import { cn } from '../../lib/cn';

export type RatingStarsProps = {
  /** Valor entre 1 y 5. */
  rating: number;
  className?: string;
};

const clampRating = (n: number): number =>
  Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 1;

/**
 * Indicador visual de calificación (sin interacción).
 */
export function RatingStars({ rating, className }: RatingStarsProps) {
  const value = clampRating(rating);
  const label = `Calificación ${value} de 5 estrellas`;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < value;
        return (
          <Star
            key={i}
            aria-hidden
            className={cn(
              'size-4 shrink-0',
              filled ? 'fill-amber-400 text-amber-400' : 'fill-none text-[var(--text-muted)] opacity-50',
            )}
          />
        );
      })}
    </div>
  );
}
