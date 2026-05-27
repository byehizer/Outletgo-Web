import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '../lib/cn';

export type PaginationProps = {
  /** 1-indexed */
  currentPage: number;
  totalPages: number;
  /** 1-indexed página destino */
  onPageChange: (pageOneBased: number) => void;
  disabled?: boolean;
  className?: string;
};

export function Pagination({ currentPage, totalPages, onPageChange, disabled, className }: PaginationProps) {
  const safePages = Math.max(1, totalPages);
  const page = Math.min(Math.max(1, currentPage), safePages);
  const canPrev = page > 1;
  const canNext = page < safePages;

  return (
    <nav
      className={cn('flex items-center justify-between gap-3 text-sm', className)}
      aria-label="Paginación"
    >
      <p className="text-[var(--text-muted)]">
        Página <span className="font-medium text-[var(--text-primary)]">{page}</span> de{' '}
        <span className="font-medium text-[var(--text-primary)]">{safePages}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || !canPrev}
          aria-label="Página anterior"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          disabled={disabled || !canNext}
          aria-label="Página siguiente"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
