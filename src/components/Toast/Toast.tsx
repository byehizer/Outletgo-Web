import { AlertTriangle, CheckCircle, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '../../lib/cn';
import type { ToastItem, ToastVariant } from '../../types/toast';

type ToastProps = {
  item: ToastItem;
  onDismiss: (id: string) => void;
};

const VARIANT_STYLES: Record<
  ToastVariant,
  { borderClass: string; icon: typeof CheckCircle; iconClass: string }
> = {
  success: {
    borderClass: 'border-l-brand',
    icon: CheckCircle,
    iconClass: 'text-success',
  },
  error: {
    borderClass: 'border-l-danger',
    icon: XCircle,
    iconClass: 'text-danger',
  },
  warning: {
    borderClass: 'border-l-warning',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
};

export function Toast({ item, onDismiss }: ToastProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleDismiss = useCallback(() => {
    if (closing) {
      return;
    }
    setClosing(true);
    window.setTimeout(() => onDismiss(item.id), 200);
  }, [closing, item.id, onDismiss]);

  const styles = VARIANT_STYLES[item.variant];
  const Icon = styles.icon;

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-[var(--border)] border-l-[3px] bg-[var(--bg-card)] px-4 py-3 shadow-md transition-all',
        styles.borderClass,
        closing ? 'translate-x-4 opacity-0 duration-200' : (
          mounted ? 'translate-x-0 opacity-100 duration-300' : 'translate-x-4 opacity-0 duration-300'
        ),
      )}
    >
      <Icon className={cn('size-5 shrink-0', styles.iconClass)} aria-hidden />
      <p className="flex-1 text-sm text-[var(--text-primary)]">{item.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        aria-label="Cerrar notificación"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
