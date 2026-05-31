import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export type DataColumn<T> = {
  id: string;
  header: ReactNode;
  /** Clases opcionales en `<th>` y `<td>` de la misma columna */
  align?: 'left' | 'right' | 'center';
  wrap?: boolean;
  className?: string;
  cell: (row: T, rowIndex: number) => ReactNode;
};

type DataTableProps<T> = {
  columns: readonly DataColumn<T>[];
  data: readonly T[];
  getRowKey: (row: T, rowIndex: number) => string;
  empty?: ReactNode;
  className?: string;
  onRowClick?: (row: T, rowIndex: number) => void;
  getRowClassName?: (row: T, rowIndex: number) => string | undefined;
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

/**
 * Tabla genérica tema panel (sticky header opcional vía clase en padre overflow).
 */
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  empty,
  className,
  onRowClick,
  getRowClassName,
}: DataTableProps<T>) {
  if (data.length === 0 && empty !== undefined) {
    return empty;
  }

  return (
    <div
      className={cn(
        'w-full max-w-full overflow-x-auto overscroll-x-contain',
        className,
      )}
    >
      <table className="min-w-[36rem] w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]',
                  alignClasses[col.align ?? 'left'],
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.map((row, rowIndex) => (
            <tr
              key={getRowKey(row, rowIndex)}
              className={cn(
                'bg-[var(--bg-card)] transition-colors hover:bg-[var(--bg-hover)]/60',
                onRowClick ? 'cursor-pointer' : '',
                getRowClassName?.(row, rowIndex),
              )}
              onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={cn(
                    'px-4 py-3 text-[var(--text-primary)]',
                    alignClasses[col.align ?? 'left'],
                    col.wrap ? '' : 'whitespace-nowrap',
                    col.className,
                  )}
                >
                  {col.cell(row, rowIndex)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
